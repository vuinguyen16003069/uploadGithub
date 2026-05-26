const axios = require('axios');
const path = require('node:path');
const { readConfig } = require('./envHelper');

/**
 * Hàm tải lên một tệp tin lên GitHub Repository từ Buffer
 * @param {object} param0 Tham số tải lên
 * @param {Buffer} param0.fileBuffer Buffer nội dung tệp
 * @param {string} param0.fileName Tên tệp tin duy nhất
 * @param {object} param0.configOverrides Cấu hình ghi đè nếu có
 * @returns {Promise<object>} Đối tượng chứa cả 2 liên kết xem trực tiếp và tải xuống
 */
async function uploadToGithub({ fileBuffer, fileName, configOverrides = {} }) {
  const baseConfig = readConfig();
  const config = { ...baseConfig, ...configOverrides };

  const { token, owner, repo, branch = 'main', path: configPath } = config;

  if (!token || !owner || !repo) {
    throw new Error('Thiếu cấu hình GitHub (Token, Owner hoặc Repo). Vui lòng cập nhật cài đặt.');
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

  const finalPath = `${targetDir}/${fileName}`.replace(/\/+/g, '/');
  const base64Content = fileBuffer.toString('base64');
  const uploadUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${finalPath}`;

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await axios({
        method: 'PUT',
        url: uploadUrl,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Imgur-To-GitHub-Converter',
        },
        data: {
          message: `Upload media via GitHub Media Uploader Web App: ${fileName}`,
          content: base64Content,
          branch: branch,
        },
      });

      const lowercaseOwner = owner.toLowerCase();
      const viewUrl = `https://${lowercaseOwner}.github.io/${repo}/${finalPath}`;
      const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${finalPath}`;
      
      return { viewUrl, downloadUrl };
    } catch (err) {
      attempt++;
      const isConflict = err.response?.status === 409;
      if (isConflict && attempt < maxRetries) {
        const delay = Math.floor(Math.random() * 1500) + 500 * attempt;
        console.warn(`[!] Xung đột GitHub API (409) khi tải lên ${fileName}. Đang thử lại lần ${attempt}/${maxRetries} sau ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const errorDetails = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        throw new Error(`Lỗi GitHub API: ${errorDetails}`);
      }
    }
  }
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
      configOverrides: config
    });
    return result.viewUrl;
  } catch (err) {
    throw new Error(`Thất bại khi chuyển đổi video: ${err.message}`);
  }
}

module.exports = {
  uploadToGithub,
  convertImgurToGithub
};
