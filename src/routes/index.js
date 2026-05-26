const express = require('express');
const multer = require('multer');
const { getConfig, updateConfig, uploadUrls, uploadFiles } = require('../controllers/upload');

const router = express.Router();

// Cấu hình multer lưu tệp vào bộ nhớ tạm (Buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Giới hạn 50MB
});

// Định nghĩa các endpoints
router.get('/config', getConfig);
router.post('/config', updateConfig);

// Hỗ trợ cả tải đơn và tải hàng loạt các liên kết URL
router.post('/upload-url', uploadUrls);

// Hỗ trợ tải hàng loạt tệp cục bộ (tên input là 'mediaFiles', tối đa 500 file cùng lúc)
router.post('/upload-file', upload.array('mediaFiles', 500), uploadFiles);

module.exports = router;
