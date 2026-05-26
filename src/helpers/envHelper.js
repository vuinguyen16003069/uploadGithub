const fs = require('node:fs');
const path = require('node:path');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');

/**
 * Đọc cấu hình từ tệp .env động
 * @returns {object} Cấu hình GitHub
 */
function readConfig() {
  const config = {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    path: 'assets/media',
    defaultLinkFormat: 'cdn',
  };
  try {
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

          const trimmedVal = val.trim();
          if (key === 'GITHUB_TOKEN') config.token = trimmedVal;
          else if (key === 'GITHUB_OWNER') config.owner = trimmedVal;
          else if (key === 'GITHUB_REPO') config.repo = trimmedVal;
          else if (key === 'GITHUB_BRANCH') config.branch = trimmedVal;
          else if (key === 'GITHUB_PATH') config.path = trimmedVal;
          else if (key === 'GITHUB_DEFAULT_LINK_FORMAT') config.defaultLinkFormat = trimmedVal;
        }
      });
    }
  } catch (err) {
    console.error('Lỗi khi đọc file .env:', err.message);
  }
  return config;
}

/**
 * Ghi cấu hình vào tệp .env và đồng bộ biến môi trường hiện tại
 * @param {object} config Cấu hình GitHub mới
 * @returns {boolean} Thành công hay thất bại
 */
function writeConfig(config) {
  try {
    const content = `GITHUB_TOKEN=${config.token}
GITHUB_OWNER=${config.owner}
GITHUB_REPO=${config.repo}
GITHUB_BRANCH=${config.branch}
GITHUB_PATH=${config.path}
GITHUB_DEFAULT_LINK_FORMAT=${config.defaultLinkFormat || 'cdn'}
`;
    fs.writeFileSync(ENV_PATH, content, 'utf8');

    // Đồng bộ lại process.env hiện tại
    process.env.GITHUB_TOKEN = config.token;
    process.env.GITHUB_OWNER = config.owner;
    process.env.GITHUB_REPO = config.repo;
    process.env.GITHUB_BRANCH = config.branch;
    process.env.GITHUB_PATH = config.path;
    process.env.GITHUB_DEFAULT_LINK_FORMAT = config.defaultLinkFormat || 'cdn';
    return true;
  } catch (err) {
    console.error('Lỗi khi ghi file .env:', err.message);
    return false;
  }
}

module.exports = {
  readConfig,
  writeConfig,
  ENV_PATH,
};
