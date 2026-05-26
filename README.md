# 🚀 GitHub Media Uploader (Pro Edition)

Ứng dụng web chuyên nghiệp, giao diện Glassmorphism đỉnh cao giúp bạn tải hình ảnh, video **HÀNG LOẠT song song** lên kho lưu trữ GitHub của mình và lấy ngay liên kết xem trực tuyến `github.io` tốc độ cao cùng liên kết tải xuống `raw.githubusercontent.com`.

---

## ✨ Tính năng nổi bật mới

*   **🎨 Chế độ Sáng/Tối (Light & Dark Theme Toggle)**: Chuyển đổi theme Sun/Moon mượt mà, lưu trạng thái lựa chọn qua LocalStorage giúp cá nhân hóa giao diện.
*   **🔗 Tải nhiều liên kết song song (Bulk URL Upload)**: Dán danh sách liên kết ảnh/video (mỗi dòng một link) vào ô nhập văn bản lớn. Máy chủ Node.js sẽ tải về song song bằng `Promise.allSettled` và tải lên GitHub cực nhanh.
*   **💻 Kéo thả đa tệp cục bộ (Bulk File Upload)**: Cho phép kéo thả hoặc chọn hàng loạt tệp cùng lúc từ máy tính (tối đa 15 tệp/lượt, hỗ trợ 50MB mỗi tệp), theo dõi thanh tiến trình tải lên chi tiết của từng tệp thời gian thực.
*   **📋 Hộp sao chép thông minh hàng loạt**: Hiển thị danh sách kết quả trực quan kèm nút copy riêng lẻ hoặc hai nút **"Copy Tất Cả Link Xem (.io)"** và **"Copy Tất Cả Link Tải (.raw)"** hàng loạt chỉ với một cú nhấp.
*   **🏢 Kiến trúc Modular chuyên nghiệp**: Dự án được tái cấu trúc thành cấu trúc chuẩn dễ bảo trì (controllers, routes, helpers, config).
*   **📜 Lịch sử thông minh**: Đọc và giải mã ngược tự động tệp tin từ lịch sử LocalStorage, nhấp đúp vào lịch sử cũ sẽ tự động khôi phục cả hai liên kết xem và tải lên màn hình chính.

---

## 📁 Cấu trúc thư mục dự án chuẩn Enterprise

```text
├── src/
│   ├── config/             # Cấu hình môi trường (dotenv)
│   ├── helpers/            # Các dịch vụ độc lập
│   │   ├── envHelper.js    # Quản lý đọc/ghi biến cấu hình trong tệp .env
│   │   └── github.js       # Gọi REST API của GitHub & tải ảnh CLI demo
│   ├── controllers/        # Điều phối logic API
│   │   └── upload.js       # Logic cấu hình và xử lý tải song song hàng loạt
│   ├── routes/             # Khai báo các endpoints định tuyến
│   │   └── index.js        # Gắn controller và cấu hình Multer đa tệp
│   ├── public/             # Giao diện Frontend
│   │   ├── index.html      # Khung giao diện đa tệp & Theme Toggle
│   │   ├── style.css       # Biến theme CSS Variables & giao diện Bulk Upload
│   │   └── app.js          # Logic kéo thả đa tệp, theme switcher, song song
│   └── index.js            # Khởi chạy Express server (Entry Point & CLI demo)
├── .env                    # Tệp cấu hình môi trường chứa Token bí mật (Cực kỳ quan trọng)
├── .gitignore              # Ngăn việc đưa .env và node_modules lên Git
├── package.json            # Thư viện phụ thuộc của Node.js
└── README.md               # Tài liệu hướng dẫn sử dụng chuyên nghiệp
```

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### 1. Cài đặt các thư viện
Mở terminal tại thư mục gốc và chạy lệnh sau để tải các thư viện cần thiết:
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo một tệp đặt tên là `.env` ở thư mục gốc của dự án (cùng cấp với `package.json`) với nội dung sau:
```env
GITHUB_TOKEN=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
GITHUB_OWNER=YOUR_GITHUB_USERNAME
GITHUB_REPO=YOUR_REPOSITORY_NAME
GITHUB_BRANCH=main
GITHUB_PATH=assets/media
```
*(Bạn cũng có thể để trống và điền trực tiếp thông qua form **Cài Đặt GitHub** ngay trên giao diện Web, hệ thống sẽ tự động lưu lại vào `.env`)*

### 3. Khởi chạy máy chủ Web
Chạy lệnh sau trong terminal để khởi động:
```bash
npm start
```
Khi thấy thông báo khởi chạy thành công, hãy mở trình duyệt và truy cập:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📝 Cách lấy các thông tin cấu hình GitHub

1.  **GITHUB_OWNER**: Tên tài khoản GitHub của bạn (ví dụ: `vui124123`).
2.  **GITHUB_REPO**: Tên kho lưu trữ chứa ảnh/video (ví dụ: `media`). Kho này phải ở chế độ **Công khai (Public)** để dùng được GitHub Pages.
3.  **GITHUB_TOKEN** (Personal Access Token - PAT):
    *   Vào **Settings** tài khoản GitHub -> chọn **Developer settings** ở góc trái dưới cùng.
    *   Chọn **Personal access tokens** -> **Tokens (classic)**.
    *   Bấm **Generate new token** -> **Generate new token (classic)**.
    *   Đặt tên ở phần Note (ví dụ: `media`) và tích chọn duy nhất hộp quyền **`repo`**.
    *   Kéo xuống bấm **Generate token**, sao chép đoạn mã `ghp_...` nhận được và dán vào `.env`.

---

## 🌐 Hướng dẫn kích hoạt GitHub Pages (Bắt buộc để có Link Xem Trực Tiếp)

Đường dẫn xem trực tuyến (`github.io`) hoạt động dựa trên tính năng **GitHub Pages** của Repository. Bạn cần kích hoạt tính năng này một lần duy nhất theo các bước sau:

1. Truy cập vào Repository chứa ảnh/video của bạn trên GitHub (ví dụ: `vui124123/media`).
2. Chọn mục **Settings** (Cài đặt) ở thanh menu trên cùng của repository.
3. Ở menu thanh bên trái, chọn mục **Pages**.
4. Tại phần **Build and deployment**:
   * **Source**: Chọn `Deploy from a branch`.
   * **Branch**: Chọn nhánh **`main`** (hoặc nhánh đích của bạn) và chọn thư mục **`/ (root)`**.
   * Nhấp nút **Save** (Lưu).
5. Đợi khoảng **1 - 2 phút** để GitHub biên dịch và xuất bản (Bạn có thể bấm vào tab **Actions** trên cùng để xem tiến trình `pages-build-deployment` chuyển sang màu xanh lá cây là thành công!).

---

## 🚀 Tính năng chạy CLI (Demo cũ)
Nếu bạn muốn chạy thử nghiệm nhanh qua terminal:
```bash
node src/index.js demo
```
Script sẽ tự động lấy link Imgur mẫu để tải lên GitHub và in ra đường dẫn xem trực tuyến ngay tại terminal!
