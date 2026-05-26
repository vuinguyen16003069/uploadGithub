document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const settingsCard = document.getElementById('settings-card');
  const configForm = document.getElementById('config-form');
  const statusBanner = document.getElementById('status-banner');

  const githubToken = document.getElementById('github-token');
  const toggleTokenVisibility = document.getElementById('toggle-token-visibility');
  const githubOwner = document.getElementById('github-owner');
  const githubRepo = document.getElementById('github-repo');
  const githubBranch = document.getElementById('github-branch');
  const githubPath = document.getElementById('github-path');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // URL Upload
  const urlUploadForm = document.getElementById('url-upload-form');
  const mediaUrlsTextarea = document.getElementById('media-urls');
  const customFilenameInput = document.getElementById('custom-filename');
  const singleUrlField = document.querySelector('.single-url-only-field');
  const urlSubmitBtn = document.getElementById('url-submit-btn');

  // File Upload
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const selectedFilesContainer = document.getElementById('selected-files-container');
  const selectedFilesCount = document.getElementById('selected-files-count');
  const selectedFilesList = document.getElementById('selected-files-list');
  const fileSubmitBtn = document.getElementById('file-submit-btn');
  const dragDropContent = document.querySelector('.drag-drop-content');

  // Progress Bar
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressPercent = document.getElementById('progress-percent');
  const progressItemsList = document.getElementById('progress-items-list');

  // Result Card
  const resultCard = document.getElementById('result-card');
  const bulkActionsContainer = document.getElementById('bulk-actions-container');
  const bulkResultsList = document.getElementById('bulk-results-list');
  const copyAllViewBtn = document.getElementById('copy-all-view-btn');
  const copyAllDownloadBtn = document.getElementById('copy-all-download-btn');
  const copyAllJsonBtn = document.getElementById('copy-all-json-btn');

  // History
  const historyList = document.getElementById('history-list');
  const emptyHistoryPlaceholder = document.getElementById('empty-history-placeholder');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  const toastContainer = document.getElementById('toast-container');

  // State Variables
  let selectedFiles = [];
  let hasValidConfig = false;
  let progressInterval = null;

  /* ==========================================================================
     THEME TOGGLE SYSTEM (LIGHT & DARK THEME)
     ========================================================================== */
  function initTheme() {
    const currentTheme = localStorage.getItem('gh_uploader_theme') || 'dark';
    if (currentTheme === 'light') {
      document.body.classList.add('light-theme');
      themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.body.classList.remove('light-theme');
      themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');

    if (isLight) {
      themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
      localStorage.setItem('gh_uploader_theme', 'light');
      showToast('Đã chuyển sang Chế độ Sáng!', 'info');
    } else {
      themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
      localStorage.setItem('gh_uploader_theme', 'dark');
      showToast('Đã chuyển sang Chế độ Tối!', 'info');
    }
  });

  /* ==========================================================================
     TOAST SYSTEM
     ========================================================================== */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  }

  /* ==========================================================================
     SETTINGS & CONFIG
     ========================================================================== */
  // Tải cấu hình từ backend
  async function loadConfig() {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();

      if (data.success && data.config) {
        const conf = data.config;
        githubToken.value = conf.tokenMasked || '';
        githubOwner.value = conf.owner || '';
        githubRepo.value = conf.repo || '';
        githubBranch.value = conf.branch || 'main';
        githubPath.value = conf.path || 'assets/media';

        if (conf.token && conf.owner && conf.repo) {
          hasValidConfig = true;
          statusBanner.className = 'status-banner glass-card success';
          statusBanner.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Đã kết nối thành công kho lưu trữ: <strong>${conf.owner}/${conf.repo}</strong> (${conf.branch})</span>
          `;
        } else {
          hasValidConfig = false;
          statusBanner.className = 'status-banner glass-card warning';
          statusBanner.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>Thiếu thông tin cấu hình GitHub. Vui lòng nhấp vào <strong>Cài Đặt GitHub</strong> để nhập token.</span>
          `;
        }
      }
    } catch (_err) {
      showToast('Không thể tải thông tin cấu hình.', 'error');
    }
  }

  // Mở/Đóng thẻ cấu hình
  toggleSettingsBtn.addEventListener('click', () => {
    settingsCard.classList.toggle('hidden');
    if (!settingsCard.classList.contains('hidden')) {
      settingsCard.scrollIntoView({ behavior: 'smooth' });
    }
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsCard.classList.add('hidden');
  });

  // Toggle ẩn/hiện token
  toggleTokenVisibility.addEventListener('click', () => {
    if (githubToken.type === 'password') {
      githubToken.type = 'text';
      toggleTokenVisibility.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      githubToken.type = 'password';
      toggleTokenVisibility.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });

  // Lưu cấu hình
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-config-btn');
    const originalText = saveBtn.innerHTML;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

    const formData = {
      token: githubToken.value,
      owner: githubOwner.value.trim(),
      repo: githubRepo.value.trim(),
      branch: githubBranch.value.trim() || 'main',
      path: githubPath.value.trim() || 'assets/media'
    };

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (data.success) {
        showToast('Đã lưu cấu hình thành công!', 'success');
        settingsCard.classList.add('hidden');
        await loadConfig();
      } else {
        showToast(data.error || 'Gặp lỗi khi lưu cấu hình.', 'error');
      }
    } catch (_err) {
      showToast('Không thể kết nối máy chủ để lưu cấu hình.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  });

  /* ==========================================================================
     TABS CONTROL
     ========================================================================== */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');

      resultCard.classList.add('hidden');
    });
  });

  /* ==========================================================================
     URL MULTIPLE INPUT MANAGEMENT
     ========================================================================== */
  mediaUrlsTextarea.addEventListener('input', () => {
    const urls = parseUrls();
    // Ẩn trường custom filename nếu nhập từ 2 URL trở lên
    if (urls.length > 1) {
      singleUrlField.classList.add('hidden');
      urlSubmitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Tải ${urls.length} Liên Kết Song Song`;
    } else {
      singleUrlField.classList.remove('hidden');
      urlSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Bắt đầu Tải Lên';
    }
  });

  function parseUrls() {
    const text = mediaUrlsTextarea.value.trim();
    if (!text) return [];

    // 1. Thử phân tích cú pháp dạng mảng JSON thuần túy
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(item => typeof item === 'string' ? item.trim() : '')
          .filter(item => item.length > 0 && (item.startsWith('http://') || item.startsWith('https://')));
      }
    } catch (_e) {
      // Bỏ qua lỗi và tiếp tục phân tích dòng thường
    }

    // 2. Phân tích từng dòng và làm sạch các ký tự JSON thừa (ngoặc vuông, dấu phẩy, dấu nháy)
    return text.split('\n')
      .map(line => {
        let cleaned = line.trim();
        // Loại bỏ dấu phẩy ở cuối dòng
        if (cleaned.endsWith(',')) cleaned = cleaned.slice(0, -1).trim();
        // Loại bỏ dấu nháy kép ở đầu/cuối
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1).trim();
        // Loại bỏ dấu nháy đơn ở đầu/cuối
        if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1).trim();
        // Loại bỏ dấu ngoặc vuông ở đầu/cuối
        if (cleaned.startsWith('[') || cleaned.startsWith(']')) cleaned = '';

        return cleaned.trim();
      })
      .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));
  }

  /* ==========================================================================
     DRAG & DROP MULTIPLE FILES
     ========================================================================== */
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  });

  // Drag Events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFilesSelected(Array.from(files));
    }
  });

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
  }

  function handleFilesSelected(files) {
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showToast(`Tệp "${file.name}" không đúng định dạng Ảnh/Video. Bị bỏ qua.`, 'error');
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        showToast(`Tệp "${file.name}" vượt quá 50MB. Bị bỏ qua.`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Giới hạn tối đa 500 file
    const totalFiles = [...selectedFiles, ...validFiles];
    if (totalFiles.length > 500) {
      showToast('Chỉ cho phép tải lên tối đa 500 tệp cùng lúc.', 'warning');
      selectedFiles = totalFiles.slice(0, 500);
    } else {
      selectedFiles = totalFiles;
    }

    renderSelectedFiles();
  }

  function renderSelectedFiles() {
    selectedFilesList.innerHTML = '';

    if (selectedFiles.length === 0) {
      resetFileSelection();
      return;
    }

    selectedFilesCount.textContent = selectedFiles.length;
    dragDropContent.classList.add('hidden');
    selectedFilesContainer.classList.remove('hidden');
    fileSubmitBtn.classList.remove('hidden');

    selectedFiles.forEach((file, idx) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'selected-file-item';

      const isVideo = file.type.startsWith('video/');
      const iconClass = isVideo ? 'fa-file-video text-accent' : 'fa-file-image text-primary';

      itemRow.innerHTML = `
        <div class="selected-file-item-left">
          <i class="fas ${iconClass} selected-file-icon"></i>
          <div class="selected-file-details">
            <span class="selected-file-name" title="${file.name}">${file.name}</span>
            <span class="selected-file-size">${formatBytes(file.size)}</span>
          </div>
        </div>
        <button type="button" class="remove-btn" data-index="${idx}" title="Xóa tệp này">&times;</button>
      `;

      itemRow.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const removeIdx = Number.parseInt(e.target.getAttribute('data-index'));
        selectedFiles.splice(removeIdx, 1);
        renderSelectedFiles();
      });

      selectedFilesList.appendChild(itemRow);
    });

    fileSubmitBtn.scrollIntoView({ behavior: 'smooth' });
  }

  function resetFileSelection() {
    selectedFiles = [];
    fileInput.value = '';
    dragDropContent.classList.remove('hidden');
    selectedFilesContainer.classList.add('hidden');
    fileSubmitBtn.classList.add('hidden');
    resultCard.classList.add('hidden');
  }

  /* ==========================================================================
     UPLOAD LOGIC (PARALLEL & DETAILED PROGRESS)
     ========================================================================== */

  // Tiến trình giả lập cho URL
  function startFakeProgress(urls) {
    progressContainer.classList.remove('hidden');
    resultCard.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    progressItemsList.innerHTML = '';

    // Tạo danh sách tiến trình con
    urls.forEach((url, idx) => {
      const fileName = url.substring(url.lastIndexOf('/') + 1) || `Link ${idx + 1}`;
      const itemRow = document.createElement('div');
      itemRow.className = 'progress-item-row';
      itemRow.setAttribute('data-url-idx', idx);
      itemRow.innerHTML = `
        <span class="progress-item-name"><i class="fas fa-link"></i> ${fileName}</span>
        <span class="progress-item-status running"><i class="fas fa-spinner fa-spin"></i> Đang tải...</span>
      `;
      progressItemsList.appendChild(itemRow);
    });

    let currentPercent = 0;
    progressInterval = setInterval(() => {
      if (currentPercent < 85) {
        currentPercent += Math.floor(Math.random() * 6) + 1;
        if (currentPercent > 85) currentPercent = 85;
        progressBar.style.width = `${currentPercent}%`;
        progressPercent.textContent = `${currentPercent}%`;
      }
    }, 250);
  }

  function endProgressSuccess() {
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';

    setTimeout(() => {
      progressContainer.classList.add('hidden');
    }, 500);
  }

  function resetProgress() {
    clearInterval(progressInterval);
    progressContainer.classList.add('hidden');
  }

  // 1. TẢI LÊN QUA DANH SÁCH LIÊN KẾT (BULK URL UPLOAD)
  urlUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!hasValidConfig) {
      showToast('Vui lòng hoàn thành Cấu hình GitHub trước khi tải lên.', 'warning');
      settingsCard.classList.remove('hidden');
      settingsCard.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const urls = parseUrls();
    const customFileName = customFilenameInput.value.trim();

    if (urls.length === 0) {
      showToast('Vui lòng nhập ít nhất một liên kết hợp lệ.', 'error');
      return;
    }

    urlSubmitBtn.disabled = true;
    startFakeProgress(urls);

    try {
      const response = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, customFileName })
      });
      const data = await response.json();

      if (data.success && data.results) {
        endProgressSuccess();

        let successCount = 0;
        let failCount = 0;

        data.results.forEach(res => {
          if (res.success) {
            successCount++;
            addToHistory(res.fileName, res.githubUrl);
          } else {
            failCount++;
          }
        });

        if (failCount === 0) {
          showToast(`Đã tải lên thành công cả ${successCount} liên kết!`, 'success');
        } else {
          showToast(`Tải lên hoàn tất. Thành công: ${successCount}, Thất bại: ${failCount}`, 'warning');
        }

        displayResults(data.results);
        mediaUrlsTextarea.value = '';
        customFilenameInput.value = '';
      } else {
        resetProgress();
        showToast(data.error || 'Lỗi tải lên từ máy chủ.', 'error');
      }
    } catch (_err) {
      resetProgress();
      showToast('Không thể kết nối máy chủ để tải lên.', 'error');
    } finally {
      urlSubmitBtn.disabled = false;
    }
  });

  // 2. TẢI LÊN DANH SÁCH FILE CỤC BỘ (BULK FILE UPLOAD)
  fileSubmitBtn.addEventListener('click', () => {
    if (selectedFiles.length === 0) return;
    if (!hasValidConfig) {
      showToast('Vui lòng cấu hình GitHub trước khi tải lên.', 'warning');
      settingsCard.classList.remove('hidden');
      settingsCard.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    fileSubmitBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    resultCard.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    progressItemsList.innerHTML = '';

    // Khởi tạo danh sách tiến trình con cho từng file
    selectedFiles.forEach((file, idx) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'progress-item-row';
      itemRow.setAttribute('data-file-idx', idx);
      itemRow.innerHTML = `
        <span class="progress-item-name"><i class="fas fa-file"></i> ${file.name}</span>
        <span class="progress-item-status running"><i class="fas fa-spinner fa-spin"></i> Đang tải lên...</span>
      `;
      progressItemsList.appendChild(itemRow);
    });

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('mediaFiles', file);
    });

    const xhr = new XMLHttpRequest();

    // Theo dõi tiến trình tải lên tổng thể của Payload dữ liệu lên server
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // Tải từ browser lên server Node chiếm 60% tiến trình tổng thể
        const percentComplete = Math.round((e.loaded / e.total) * 60);
        progressBar.style.width = `${percentComplete}%`;
        progressPercent.textContent = `${percentComplete}%`;
      }
    });

    // Giả lập 40% tiến trình còn lại khi Node server tải song song lên GitHub API
    let gitUploadInterval;
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === 2) {
        let currentPercent = 60;
        gitUploadInterval = setInterval(() => {
          if (currentPercent < 95) {
            currentPercent += 1;
            progressBar.style.width = `${currentPercent}%`;
            progressPercent.textContent = `${currentPercent}%`;
          }
        }, 180);
      }
    });

    xhr.addEventListener('load', () => {
      clearInterval(gitUploadInterval);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success && data.results) {
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';

            setTimeout(() => {
              progressContainer.classList.add('hidden');

              let successCount = 0;
              let failCount = 0;

              data.results.forEach(res => {
                if (res.success) {
                  successCount++;
                  addToHistory(res.fileName, res.githubUrl);
                } else {
                  failCount++;
                }
              });

              if (failCount === 0) {
                showToast(`Tải lên thành công toàn bộ ${successCount} tệp tin!`, 'success');
              } else {
                showToast(`Đã tải lên xong. Thành công: ${successCount}, Thất bại: ${failCount}`, 'warning');
              }

              displayResults(data.results);
              resetFileSelection();
            }, 400);
          } else {
            progressContainer.classList.add('hidden');
            showToast(data.error || 'Lỗi tải lên tệp.', 'error');
            fileSubmitBtn.disabled = false;
          }
        } catch (_err) {
          progressContainer.classList.add('hidden');
          showToast('Không thể phân tích phản hồi từ máy chủ.', 'error');
          fileSubmitBtn.disabled = false;
        }
      } else {
        clearInterval(gitUploadInterval);
        progressContainer.classList.add('hidden');
        try {
          const errData = JSON.parse(xhr.responseText);
          showToast(errData.error || 'Lỗi máy chủ khi tải lên tệp.', 'error');
        } catch (_) {
          showToast('Lỗi máy chủ khi tải lên tệp.', 'error');
        }
        fileSubmitBtn.disabled = false;
      }
    });

    xhr.addEventListener('error', () => {
      clearInterval(gitUploadInterval);
      progressContainer.classList.add('hidden');
      showToast('Lỗi mạng không thể kết nối tới máy chủ.', 'error');
      fileSubmitBtn.disabled = false;
    });

    xhr.open('POST', '/api/upload-file');
    xhr.send(formData);
  });

  /* ==========================================================================
     DISPLAY RESULTS & PREVIEWS (WOW BULK RESULTS)
     ========================================================================== */

  // Hàm phụ trợ giải mã ngược từ github.io về raw.githubusercontent.com
  function getDownloadUrlFromViewUrl(viewUrl) {
    try {
      const urlParsed = new URL(viewUrl);
      const host = urlParsed.hostname;
      const owner = host.split('.')[0];
      const pathSegments = urlParsed.pathname.split('/').filter(Boolean);
      const repo = pathSegments[0];
      const remainingPath = pathSegments.slice(1).join('/');

      const branch = githubBranch.value.trim() || 'main';
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${remainingPath}`;
    } catch (_err) {
      return '';
    }
  }

  function displayResults(results) {
    bulkResultsList.innerHTML = '';
    resultCard.classList.remove('hidden');

    const successfulResults = results.filter(r => r.success);

    // Hiển thị nút copy hàng loạt nếu có từ 2 kết quả thành công trở lên
    if (successfulResults.length > 1) {
      bulkActionsContainer.classList.remove('hidden');

      // Gán sự kiện cho Copy All View Links
      copyAllViewBtn.onclick = () => {
        const allViewLinks = successfulResults.map(r => r.githubUrl).join('\n');
        navigator.clipboard.writeText(allViewLinks).then(() => {
          showToast(`Đã copy ${successfulResults.length} link Xem Trực Tiếp!`, 'success');
        });
      };

      // Gán sự kiện cho Copy All Download Links
      copyAllDownloadBtn.onclick = () => {
        const allDownloadLinks = successfulResults.map(r => r.downloadUrl).join('\n');
        navigator.clipboard.writeText(allDownloadLinks).then(() => {
          showToast(`Đã copy ${successfulResults.length} link Tải Trực Tiếp!`, 'success');
        });
      };

      // Gán sự kiện cho Copy Dạng JSON (Mảng, phân dòng từng hàng)
      copyAllJsonBtn.onclick = () => {
        const allJsonLinks = JSON.stringify(successfulResults.map(r => r.githubUrl), null, 2);
        navigator.clipboard.writeText(allJsonLinks).then(() => {
          showToast(`Đã copy ${successfulResults.length} link dưới dạng mảng JSON!`, 'success');
        });
      };
    } else {
      bulkActionsContainer.classList.add('hidden');
    }

    // Đổ danh sách kết quả chi tiết từng file
    results.forEach((res, idx) => {
      const itemCard = document.createElement('div');
      itemCard.className = `bulk-result-item ${res.success ? '' : 'failed-item'}`;

      if (res.success) {
        const ext = res.fileName.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
        const isVideo = ['mp4', 'mov', 'webm', 'ogg', 'mkv'].includes(ext);

        let mediaPreviewHtml = '';
        if (isImage) {
          mediaPreviewHtml = `<img src="${res.githubUrl}" alt="${res.fileName}" loading="lazy">`;
        } else if (isVideo) {
          mediaPreviewHtml = `<video src="${res.githubUrl}" preload="metadata"></video>`;
        } else {
          mediaPreviewHtml = `<i class="fas fa-file-archive"></i>`;
        }

        itemCard.innerHTML = `
          <div class="bulk-result-item-header">
            <span class="bulk-result-file-title" title="${res.fileName}"><i class="fas fa-check-circle text-success"></i> ${res.fileName}</span>
            <span class="bulk-result-status-badge success">Thành công</span>
          </div>
          <div class="bulk-result-grid">
            <div class="bulk-result-item-media" data-url="${res.githubUrl}" data-name="${res.fileName}">
              ${mediaPreviewHtml}
            </div>
            <div class="bulk-result-links">
              <div class="form-group">
                <div class="copy-input-group">
                  <input type="text" class="view-link-input" readonly value="${res.githubUrl}">
                  <button type="button" class="btn btn-primary btn-copy-view" title="Copy link xem trực tiếp">
                    <i class="fas fa-copy"></i> <span>Copy Xem</span>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <div class="copy-input-group">
                  <input type="text" class="download-link-input" readonly value="${res.downloadUrl}">
                  <button type="button" class="btn btn-secondary shadow-btn btn-copy-download" title="Copy link tải xuống">
                    <i class="fas fa-copy"></i> <span>Copy Tải</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        // Gán sự kiện click copy cho từng kết quả nhỏ
        const viewInput = itemCard.querySelector('.view-link-input');
        const copyViewBtn = itemCard.querySelector('.btn-copy-view');
        copyViewBtn.addEventListener('click', () => {
          viewInput.select();
          document.execCommand('copy');
          showToast('Đã copy link Xem trực tuyến!', 'success');
        });

        const downloadInput = itemCard.querySelector('.download-link-input');
        const copyDownloadBtn = itemCard.querySelector('.btn-copy-download');
        copyDownloadBtn.addEventListener('click', () => {
          downloadInput.select();
          document.execCommand('copy');
          showToast('Đã copy link Tải xuống trực tiếp!', 'success');
        });

        // Bấm vào thumbnail preview để hiển thị trình phát video lớn nếu cần
        itemCard.querySelector('.bulk-result-item-media').addEventListener('click', () => {
          if (isVideo) {
            // Render video dạng điều khiển đầy đủ khi muốn xem
            const mediaBox = itemCard.querySelector('.bulk-result-item-media');
            mediaBox.innerHTML = `<video src="${res.githubUrl}" controls autoplay></video>`;
          }
        });

      } else {
        // Trường hợp bị lỗi
        const fallbackName = res.fileName || res.originalUrl || `Tệp ${idx + 1}`;
        itemCard.innerHTML = `
          <div class="bulk-result-item-header">
            <span class="bulk-result-file-title" title="${fallbackName}"><i class="fas fa-times-circle text-danger"></i> ${fallbackName}</span>
            <span class="bulk-result-status-badge error">Thất bại</span>
          </div>
          <div class="bulk-result-error-msg mt-2">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Lỗi: ${res.error || 'Lỗi xử lý tài nguyên trên máy chủ.'}</span>
          </div>
        `;
      }

      bulkResultsList.appendChild(itemCard);
    });

    resultCard.scrollIntoView({ behavior: 'smooth' });
  }

  /* ==========================================================================
     HISTORY SYSTEM (LOCAL STORAGE)
     ========================================================================== */
  function getHistory() {
    return JSON.parse(localStorage.getItem('gh_uploader_history') || '[]');
  }

  function saveHistory(history) {
    localStorage.setItem('gh_uploader_history', JSON.stringify(history));
  }

  function addToHistory(fileName, url) {
    const history = getHistory();
    // Tránh trùng lặp đường dẫn xem
    if (history.some(item => item.url === url)) return;

    const newItem = {
      id: Date.now().toString() + Math.random().toString().substring(2, 6),
      fileName,
      url,
      timestamp: new Date().toISOString(),
    };

    history.unshift(newItem);
    if (history.length > 30) history.pop();

    saveHistory(history);
    renderHistory();
  }

  function deleteHistoryItem(id) {
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    saveHistory(history);
    renderHistory();
    showToast('Đã xóa mục lịch sử.', 'info');
  }

  function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
      emptyHistoryPlaceholder.classList.remove('hidden');
      clearHistoryBtn.classList.add('hidden');
      return;
    }

    emptyHistoryPlaceholder.classList.add('hidden');
    clearHistoryBtn.classList.remove('hidden');

    history.forEach(item => {
      const ext = item.fileName.split('.').pop().toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
      const isVideo = ['mp4', 'mov', 'webm', 'ogg', 'mkv'].includes(ext);

      const dateStr = new Date(item.timestamp).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const historyCard = document.createElement('div');
      historyCard.className = 'history-item';
      historyCard.setAttribute('data-id', item.id);

      let previewHtml = '';
      if (isImage) {
        previewHtml = `<img src="${item.url}" alt="${item.fileName}" loading="lazy">`;
      } else if (isVideo) {
        previewHtml = `<i class="fas fa-video"></i>`;
      } else {
        previewHtml = `<i class="fas fa-file-invoice"></i>`;
      }

      historyCard.innerHTML = `
        <div class="history-item-left">
          <div class="history-media-preview">
            ${previewHtml}
          </div>
          <div class="history-details">
            <span class="history-name" title="${item.fileName}">${item.fileName}</span>
            <span class="history-time"><i class="far fa-clock"></i> ${dateStr}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="btn-circle btn-copy-history" title="Sao chép liên kết xem trực tuyến">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn-circle btn-delete-history" title="Xóa">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;

      // Copy Action cho lịch sử
      historyCard.querySelector('.btn-copy-history').addEventListener('click', () => {
        navigator.clipboard.writeText(item.url).then(() => {
          showToast('Đã sao chép liên kết lịch sử vào Clipboard!', 'success');
        });
      });

      // Delete Action cho lịch sử
      historyCard.querySelector('.btn-delete-history').addEventListener('click', () => {
        deleteHistoryItem(item.id);
      });

      // Nhấp đúp vào mục lịch sử để hiển thị lại kết quả preview chính
      historyCard.addEventListener('dblclick', () => {
        const downloadUrl = getDownloadUrlFromViewUrl(item.url);
        displayResults([{
          success: true,
          fileName: item.fileName,
          githubUrl: item.url,
          downloadUrl: downloadUrl
        }]);
      });

      historyList.appendChild(historyCard);
    });
  }

  // Clear tất cả lịch sử
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tải lên gần đây không?')) {
      saveHistory([]);
      renderHistory();
      showToast('Đã xóa sạch lịch sử tải lên.', 'success');
    }
  });

  /* ==========================================================================
     INIT APP
     ========================================================================== */
  initTheme();
  loadConfig();
  renderHistory();
});
