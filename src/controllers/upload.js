const axios = require('axios');
const path = require('node:path');
const { uploadMultipleToGithub } = require('../helpers/github');
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
  const { token, owner, repo, branch, path: configPath, defaultLinkFormat } = req.body;
  const currentConfig = readConfig();
  const updatedToken = token?.startsWith('github_pat_...') ? currentConfig.token : token;

  const newConfig = {
    token: updatedToken || currentConfig.token || '',
    owner: owner || '',
    repo: repo || '',
    branch: branch || 'main',
    path: configPath || 'assets/media',
    defaultLinkFormat: defaultLinkFormat || currentConfig.defaultLinkFormat || 'cdn',
  };

  if (writeConfig(newConfig)) {
    res.json({ success: true, message: 'Đã lưu cấu hình thành công!' });
  } else {
    res.status(500).json({ success: false, error: 'Không thể ghi tệp tin cấu hình .env.' });
  }
}

// Hàm phụ trợ tải file từ URL về bộ nhớ đệm (RAM)
async function downloadFileFromUrl(url) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });

  const fileBuffer = Buffer.from(response.data);

  // Xác định tên file
  let fileName = '';
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

  const extName = path.extname(fileName);
  const randomHash = Math.random().toString(36).substring(2, 8);
  const uniqueFileName = `${randomHash}${extName}`;

  return { fileBuffer, uniqueFileName };
}

// 3. Tải lên bằng danh sách Link (URL Upload - Hỗ trợ hàng loạt tối đa 500)
async function uploadUrls(req, res) {
  const { url, urls } = req.body;

  let urlList = [];
  if (urls && Array.isArray(urls)) {
    urlList = urls.filter((u) => u?.trim());
  } else if (url && typeof url === 'string') {
    urlList = [url];
  }

  if (urlList.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: 'Đường dẫn liên kết (URL) không được để trống.' });
  }

  const boundedUrls = urlList.slice(0, 500);

  // BƯỚC 1: Tải song song tất cả các tệp từ URL về bộ nhớ đệm (RAM) của Server (CỰC KỲ NHANH)
  console.log(`[+] Đang tải song song ${boundedUrls.length} file từ nguồn về RAM Server...`);
  const downloadPromises = boundedUrls.map(async (targetUrl) => {
    try {
      const downloaded = await downloadFileFromUrl(targetUrl.trim());
      return { success: true, originalUrl: targetUrl, ...downloaded };
    } catch (err) {
      return { success: false, originalUrl: targetUrl, error: err.message };
    }
  });

  const downloadedItems = await Promise.all(downloadPromises);

  // BƯỚC 2: Tải lên GitHub bằng duy nhất 1 commit (Tránh lỗi 409 tuyệt đối)
  const successfulDownloads = downloadedItems.filter((i) => i.success);
  let uploadResults = [];

  if (successfulDownloads.length > 0) {
    try {
      const filesToUpload = successfulDownloads.map((item) => ({
        fileBuffer: item.fileBuffer,
        fileName: item.uniqueFileName,
      }));

      console.log(
        `[+] Bắt đầu đẩy ${filesToUpload.length} tệp lên GitHub trong 1 commit duy nhất...`
      );
      const urlsResult = await uploadMultipleToGithub(filesToUpload);

      uploadResults = downloadedItems.map((item) => {
        if (!item.success) {
          return {
            success: false,
            originalUrl: item.originalUrl,
            error: `Lỗi tải file nguồn: ${item.error}`,
          };
        }
        const fileUrls = urlsResult[item.uniqueFileName];
        return {
          success: true,
          originalUrl: item.originalUrl,
          fileName: item.uniqueFileName,
          githubUrl: fileUrls.viewUrl,
          downloadUrl: fileUrls.downloadUrl,
          cdnUrl: fileUrls.cdnUrl,
        };
      });
    } catch (err) {
      uploadResults = downloadedItems.map((item) => {
        if (!item.success) {
          return {
            success: false,
            originalUrl: item.originalUrl,
            error: `Lỗi tải file nguồn: ${item.error}`,
          };
        }
        return {
          success: false,
          originalUrl: item.originalUrl,
          error: `Lỗi đẩy lên GitHub: ${err.message}`,
        };
      });
    }
  } else {
    uploadResults = downloadedItems.map((item) => ({
      success: false,
      originalUrl: item.originalUrl,
      error: `Lỗi tải file nguồn: ${item.error}`,
    }));
  }

  res.json({ success: true, results: uploadResults });
}

// 4. Tải lên danh sách tệp cục bộ (File Upload - Hỗ trợ hàng loạt tối đa 500)
async function uploadFiles(req, res) {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Không có tệp nào được tải lên.' });
  }

  // Giới hạn tối đa 500 tệp
  const boundedFiles = files.slice(0, 500);
  console.log(
    `[+] Đang chuẩn bị tải lên ${boundedFiles.length} tệp cục bộ lên GitHub trong 1 commit...`
  );

  const filesToUpload = boundedFiles.map((file) => {
    const extName = path.extname(file.originalname);
    const randomHash = Math.random().toString(36).substring(2, 8);
    const uniqueFileName = `${randomHash}${extName}`;
    return {
      fileBuffer: file.buffer,
      fileName: uniqueFileName,
      originalName: file.originalname,
    };
  });

  let uploadResults = [];
  try {
    const urlsResult = await uploadMultipleToGithub(
      filesToUpload.map((f) => ({
        fileBuffer: f.fileBuffer,
        fileName: f.fileName,
      }))
    );

    uploadResults = filesToUpload.map((f) => {
      const fileUrls = urlsResult[f.fileName];
      return {
        success: true,
        fileName: f.fileName,
        githubUrl: fileUrls.viewUrl,
        downloadUrl: fileUrls.downloadUrl,
        cdnUrl: fileUrls.cdnUrl,
      };
    });
  } catch (err) {
    uploadResults = filesToUpload.map((f) => ({
      success: false,
      fileName: f.originalName,
      error: err.message,
    }));
  }

  res.json({ success: true, results: uploadResults });
}

module.exports = {
  getConfig,
  updateConfig,
  uploadUrls,
  uploadFiles,
};
