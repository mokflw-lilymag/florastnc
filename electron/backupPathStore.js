const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

const DEFAULT_BASE = path.join(os.homedir(), 'Documents', 'Floxync');
const IMAGE_DOWNLOAD_SUBDIR = 'ImageDownload';

function pathsFile() {
  return path.join(app.getPath('userData'), 'tenant-backup-paths.json');
}

function readAll() {
  try {
    const file = pathsFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.warn('[BackupPathStore] read failed:', err);
  }
  return {};
}

function setTenantBackupPath(tenantId, customPath) {
  if (!tenantId) return;
  const all = readAll();
  const trimmed = String(customPath || '').trim();
  if (trimmed) {
    all[tenantId] = trimmed;
  } else {
    delete all[tenantId];
  }
  fs.mkdirSync(path.dirname(pathsFile()), { recursive: true });
  fs.writeFileSync(pathsFile(), JSON.stringify(all, null, 2));
}

function getTenantBackupPath(tenantId) {
  if (tenantId) {
    const custom = readAll()[tenantId];
    if (custom) return custom;
  }
  return DEFAULT_BASE;
}

function getImageDownloadDir(tenantId) {
  return path.join(getTenantBackupPath(tenantId), IMAGE_DOWNLOAD_SUBDIR);
}

module.exports = {
  DEFAULT_BASE,
  IMAGE_DOWNLOAD_SUBDIR,
  setTenantBackupPath,
  getTenantBackupPath,
  getImageDownloadDir,
};
