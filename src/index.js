const express = require('express');
const path = require('node:path');

// Nạp các biến môi trường từ .env ở thư mục gốc
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiRouter = require('./routes');
const { convertImgurToGithub } = require('./helpers/github');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Gắn các định tuyến API
app.use('/api', apiRouter);

// ====================================================
// HƯỚNG DẪN CHẠY THỬ NGHIỆM (DEMO CLI)
// ====================================================
// Nếu được gọi trực tiếp bằng CLI (ví dụ: node src/index.js demo)
if (process.argv[2] === 'demo') {
  const myConfig = {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || 'main',
    path: process.env.GITHUB_PATH || 'assets/media'
  };
  const imgurLink = 'https://i.imgur.com/abcdef.mp4';

  convertImgurToGithub(imgurLink, myConfig)
    .then(rawUrl => {
      console.log('👉 Link GitHub User Content (Xem trực tuyến) của bạn:\n', rawUrl);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Lỗi:', err.message);
      process.exit(1);
    });
} else {
  // Khởi động Express Server
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Server đã khởi chạy tại: http://localhost:${PORT}`);
    console.log('====================================================');
  });
}

module.exports = { convertImgurToGithub };
