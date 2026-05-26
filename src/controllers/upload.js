const axios = require('axios');
const path = require('node:path');
const { uploadToGithub } = require('../helpers/github');
const { readConfig, writeConfig } = require('../helpers/envHelper');

// 1. Lấy thông tin cấu hình hiện tại
function getConfig(_req, res) {
  const config = readConfig();
  const maskedConfig = { ...config };
  
  if (maskedConfig.token && maskedConfig.token.length > 8) {
    maskedConfig.tokenMasked = `github_pat_...${maskedConfig.token.slice(-4)}`;
  } else if (maskedConfig.token) {
    maskedConfig.tokenMasked = '***';
  } else {
    maskedConfig.tokenMasked = '';
  }
  
  res.json({ success: true, config: maskedConfig });
}

// 2. Cập nhật thông tin cấu hình
function updateConfig(req, res) {
  const { token, owner, repo, branch, path: configPath } = req.body;
  const currentConfig = readConfig();
  const updatedToken = (token?.startsWith('github_pat_...')) ? currentConfig.token : token;

  const newConfig = {
    token: updatedToken || currentConfig.token || '',
    owner: owner || '',
    repo: repo || '',
    branch: branch || 'main',
    path: configPath || 'assets/media'
  };

  if (writeConfig(newConfig)) {
    res.json({ success: true, message: 'Đã lưu cấu hình thành công!' });
  } else {
    res.status(500).json({ success: false, error: 'Không thể ghi tệp tin cấu hình .env.' });
  }
}

// Hàm phụ trợ xử lý tải lên đơn lẻ từ 1 URL
async function handleSingleUrlUpload(url, customFileName) {
  // 1. Tải tệp từ URL
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });

  const fileBuffer = Buffer.from(response.data);

  // 2. Xác định tên file
  let fileName = customFileName ? customFileName.trim() : '';
  if (!fileName) {
    const urlParsed = new URL(url);
    const pathname = urlParsed.pathname;
    const baseName = path.basename(pathname);
    if (baseName?.includes('.')) {
      fileName = baseName;
    } else {
      const contentType = response.headers['content-type'] || '';
      let ext = 'bin';
      if (contentType.includes('image/jpeg')) ext = 'jpg';
      else if (contentType.includes('image/png')) ext = 'png';
      else if (contentType.includes('image/gif')) ext = 'gif';
      else if (contentType.includes('video/mp4')) ext = 'mp4';
      else if (contentType.includes('image/webp')) ext = 'webp';
      
      fileName = `media_${Date.now()}.${ext}`;
    }
  }

  // 3. Đảm bảo tên file duy nhất
  const extName = path.extname(fileName);
  const baseNameWithoutExt = path.basename(fileName, extName);
  const uniqueFileName = `${baseNameWithoutExt}_${Math.random().toString(36).substring(2, 6)}${extName}`;

  // 4. Upload lên GitHub
  const urls = await uploadToGithub({
    fileBuffer,
    fileName: uniqueFileName
  });

  return {
    success: true,
    originalUrl: url,
    fileName: uniqueFileName,
    githubUrl: urls.viewUrl,
    downloadUrl: urls.downloadUrl
  };
}

// Hàm chạy các Promise theo lô (batch) song song để tránh tràn socket và lỗi API rate-limit
async function runInBatches(tasks, batchSize = 10) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(task => task()));
    results.push(...batchResults);
  }
  return results;
}

// 3. Tải lên bằng danh sách Link (URL Upload - Hỗ trợ hàng loạt tối đa 500)
async function uploadUrls(req, res) {
  const { url, urls, customFileName } = req.body;

  let urlList = [];
  if (urls && Array.isArray(urls)) {
    urlList = urls.filter(u => u?.trim());
  } else if (url && typeof url === 'string') {
    urlList = [url];
  }

  if (urlList.length === 0) {
    return res.status(400).json({ success: false, error: 'Đường dẫn liên kết (URL) không được để trống.' });
  }

  // Giới hạn tối đa 500 liên kết cùng lúc để đáp ứng quy mô lớn
  const boundedUrls = urlList.slice(0, 500);
  console.log(`[+] Tải lên ${boundedUrls.length} link theo lô 5 song song...`);

  // Chạy theo từng lô 5 link song song
  const results = [];
  for (let i = 0; i < boundedUrls.length; i += 5) {
    const batch = boundedUrls.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map((targetUrl) => {
        const nameOverride = (boundedUrls.length === 1) ? customFileName : null;
        return handleSingleUrlUpload(targetUrl.trim(), nameOverride);
      })
    );
    results.push(...batchResults.map((r, j) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      return {
        success: false,
        originalUrl: batch[j],
        error: r.reason.message
      };
    }));
  }

  res.json({ success: true, results });
}

// 4. Tải lên danh sách tệp cục bộ (File Upload - Hỗ trợ hàng loạt tối đa 500)
async function uploadFiles(req, res) {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Không có tệp nào được tải lên.' });
  }

  // Giới hạn tối đa 500 tệp
  const boundedFiles = files.slice(0, 500);
  console.log(`[+] Tải lên ${boundedFiles.length} tệp theo lô 5 song song...`);

  const results = [];
  for (let i = 0; i < boundedFiles.length; i += 5) {
    const batch = boundedFiles.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(async (file) => {
        const fileBuffer = file.buffer;
        const originalName = file.originalname;
        const extName = path.extname(originalName);
        const baseNameWithoutExt = path.basename(originalName, extName);
        const uniqueFileName = `${baseNameWithoutExt}_${Math.random().toString(36).substring(2, 6)}${extName}`;
        const urls = await uploadToGithub({ fileBuffer, fileName: uniqueFileName });
        return { success: true, fileName: uniqueFileName, githubUrl: urls.viewUrl, downloadUrl: urls.downloadUrl };
      })
    );
    results.push(...batchResults.map((r, j) => {
      if (r.status === 'fulfilled') return r.value;
      return { success: false, fileName: batch[j].originalname, error: r.reason.message };
    }));
  }

  res.json({ success: true, results });
}

module.exports = {
  getConfig,
  updateConfig,
  uploadUrls,
  uploadFiles
};
