const axios = require('axios');
const path = require('node:path');
const { readConfig } = require('./envHelper');

/**
 * Hàm tải lên nhiều tệp tin lên GitHub Repository trong DUY NHẤT 1 commit dùng low-level Git Data API
 * @param {Array<object>} files Mảng các đối tượng tệp tin: [{ fileBuffer, fileName }]
 * @param {object} configOverrides Cấu hình ghi đè nếu có
 * @returns {Promise<object>} Đối tượng ánh xạ fileName -> { viewUrl, downloadUrl, cdnUrl }
 */
async function uploadMultipleToGithub(files, configOverrides = {}) {
  const baseConfig = readConfig();
  const config = { ...baseConfig, ...configOverrides };

  const { token, owner, repo, branch = 'main', path: configPath } = config;

  if (!token || !owner || !repo) {
    throw new Error('Thiếu cấu hình GitHub (Token, Owner hoặc Repo). Vui lòng cập nhật cài đặt.');
  }

  if (!files || files.length === 0) {
    return {};
  }

  // Phân tích thư mục lưu trữ từ configPath
  let targetDir = 'assets';
  if (configPath) {
    if (configPath.includes('/')) {
      const lastSlashIndex = configPath.lastIndexOf('/');
      const lastPart = configPath.substring(lastSlashIndex + 1);
      if (lastPart.includes('.')) {
        targetDir = configPath.substring(0, lastSlashIndex);
      } else {
        targetDir = configPath;
      }
    } else if (!configPath.includes('.')) {
      targetDir = configPath;
    }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Imgur-To-GitHub-Converter',
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // BƯỚC 1: Lấy SHA commit mới nhất của nhánh
      const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
      const refRes = await axios.get(refUrl, { headers });
      const latestCommitSha = refRes.data.object.sha;

      // BƯỚC 2: Tạo Blobs song song cho tất cả các file (Không gây 409)
      console.log(`[+] Đang tạo ${files.length} Git blobs song song...`);
      const blobPromises = files.map(async (file) => {
        const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs`;
        const blobRes = await axios.post(
          blobUrl,
          {
            content: file.fileBuffer.toString('base64'),
            encoding: 'base64',
          },
          { headers }
        );
        return { fileName: file.fileName, sha: blobRes.data.sha };
      });

      const blobs = await Promise.all(blobPromises);

      // BƯỚC 3: Tạo một Tree mới chứa tất cả các blobs
      console.log('[+] Đang tạo Git tree mới...');
      const treeItems = blobs.map((blob) => {
        const finalPath = `${targetDir}/${blob.fileName}`.replace(/\/+/g, '/');
        return {
          path: finalPath,
          mode: '100644', // Normal file mode
          type: 'blob',
          sha: blob.sha,
        };
      });

      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees`;
      const treeRes = await axios.post(
        treeUrl,
        {
          base_tree: latestCommitSha,
          tree: treeItems,
        },
        { headers }
      );
      const newTreeSha = treeRes.data.sha;

      // BƯỚC 4: Tạo một Commit mới
      console.log('[+] Đang tạo Git commit mới...');
      const commitUrl = `https://api.github.com/repos/${owner}/${repo}/git/commits`;
      const commitRes = await axios.post(
        commitUrl,
        {
          message: `Upload ${files.length} media files via GitHub Media Uploader`,
          tree: newTreeSha,
          parents: [latestCommitSha],
        },
        { headers }
      );
      const newCommitSha = commitRes.data.sha;

      // BƯỚC 5: Cập nhật nhánh trỏ tới commit mới (Gây 409 nếu có conflict, nhưng chỉ chạy 1 lần duy nhất)
      console.log('[+] Đang cập nhật tham chiếu nhánh HEAD...');
      await axios.patch(
        refUrl,
        {
          sha: newCommitSha,
          force: false,
        },
        { headers }
      );

      // Xây dựng đối tượng kết quả trả về
      const results = {};
      const lowercaseOwner = owner.toLowerCase();
      for (const file of files) {
        const finalPath = `${targetDir}/${file.fileName}`.replace(/\/+/g, '/');
        results[file.fileName] = {
          viewUrl: `https://${lowercaseOwner}.github.io/${repo}/${finalPath}`,
          downloadUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${finalPath}`,
          cdnUrl: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${finalPath}`,
        };
      }

      console.log(`[+] Đã tải lên thành công ${files.length} file trong 1 commit duy nhất!`);
      return results;
    } catch (err) {
      attempt++;
      const isConflict = err.response?.status === 409 || err.message.includes('409');
      if (isConflict && attempt < maxRetries) {
        const delay = Math.floor(Math.random() * 1500) + 1000 * attempt;
        console.warn(
          `[!] Xung đột hoặc khóa nhánh (409) khi cập nhật commit. Đang thử lại toàn bộ lô lần ${attempt}/${maxRetries} sau ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        const errorDetails = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        throw new Error(`Thất bại khi đẩy commit lên GitHub: ${errorDetails}`);
      }
    }
  }
}

/**
 * Hàm tải lên một tệp tin duy nhất lên GitHub Repository từ Buffer
 * @param {object} param0 Tham số tải lên
 * @param {Buffer} param0.fileBuffer Buffer nội dung tệp
 * @param {string} param0.fileName Tên tệp tin duy nhất
 * @param {object} param0.configOverrides Cấu hình ghi đè nếu có
 * @returns {Promise<object>} Đối tượng chứa cả 2 liên kết xem trực tiếp và tải xuống
 */
async function uploadToGithub({ fileBuffer, fileName, configOverrides = {} }) {
  const result = await uploadMultipleToGithub([{ fileBuffer, fileName }], configOverrides);
  return result[fileName];
}

/**
 * Hàm chuyển đổi link Imgur/Media sang GitHub User Content (Để tương thích CLI cũ)
 * @param {string} imgurUrl Đường dẫn link media
 * @param {object} config Cấu hình GitHub
 * @returns {Promise<string>} Đường dẫn xem trực tiếp của tệp
 */
async function convertImgurToGithub(imgurUrl, config) {
  try {
    console.log(`[+] Đang tải video từ Imgur: ${imgurUrl}`);
    const imgurRes = await axios({
      method: 'GET',
      url: imgurUrl,
      responseType: 'arraybuffer',
    });
    const fileBuffer = Buffer.from(imgurRes.data);

    const fileName = path.basename(new URL(imgurUrl).pathname) || `media_${Date.now()}.mp4`;
    const result = await uploadToGithub({
      fileBuffer,
      fileName,
      configOverrides: config,
    });

    const format = config.defaultLinkFormat || 'view';
    if (format === 'cdn') return result.cdnUrl;
    if (format === 'download') return result.downloadUrl;
    return result.viewUrl;
  } catch (err) {
    throw new Error(`Thất bại khi chuyển đổi video: ${err.message}`);
  }
}

module.exports = {
  uploadToGithub,
  uploadMultipleToGithub,
  convertImgurToGithub,
};
