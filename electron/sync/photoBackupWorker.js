/**
 * photoBackupWorker.js
 * Worker Thread: 사진 백업 전용 (로컬 캐시 우선 참조 + 폴백 다운로드 + ZIP 생성)
 */
const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    const handleResponse = (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    };

    client.get(url, handleResponse).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

async function run() {
  const {
    deliveryItems,
    receiptItems,
    deliveryBackupDir,
    receiptBackupDir,
    deliveryZipPath,
    receiptZipPath,
    deliveryCacheDir,
    receiptCacheDir,
    folderName,
  } = workerData;

  const needDeliveryBackup = deliveryBackupDir && deliveryZipPath && !fs.existsSync(deliveryZipPath);
  const needReceiptBackup = receiptBackupDir && receiptZipPath && !fs.existsSync(receiptZipPath);

  const AdmZip = require('adm-zip');

  // ── 1. 배송 사진 백업 (로컬 캐시 우선) ──
  if (needDeliveryBackup) {
    const tempDir = path.join(deliveryBackupDir, `_tmp_del_${folderName}_${Date.now()}`);
    try {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      let count = 0;
      let cachedCount = 0;
      let downloadedCount = 0;

      for (const item of (deliveryItems || [])) {
        try {
          const cachedFilePath = path.join(deliveryCacheDir, item.fileName);
          const dest = path.join(tempDir, item.fileName);

          // 1순위: 로컬 캐시 폴더에 이미 다운로드된 이미지가 있는지 확인
          if (fs.existsSync(cachedFilePath)) {
            fs.copyFileSync(cachedFilePath, dest);
            cachedCount++;
          } else {
            // 2순위: 캐시가 없으면(포맷 등) 안전하게 직접 다운로드
            await downloadFile(item.url, dest);
            downloadedCount++;
          }
          count++;
        } catch (e) {
          parentPort.postMessage({ type: 'warn', msg: `배송 사진 처리 실패 URL=${item.url}: ${e.message}` });
        }
      }

      if (!fs.existsSync(deliveryBackupDir)) fs.mkdirSync(deliveryBackupDir, { recursive: true });
      const zip = new AdmZip();
      if (fs.existsSync(tempDir)) {
        for (const f of fs.readdirSync(tempDir)) {
          zip.addLocalFile(path.join(tempDir, f));
        }
      }
      if (count === 0) {
        zip.addFile(
          'readme.txt',
          Buffer.from(`FloXync monthly delivery backup\nFolder: ${folderName}\nNo delivery proof images.\n`, 'utf8'),
        );
      }
      zip.writeZip(deliveryZipPath);
      parentPort.postMessage({
        type: 'log',
        msg: `배송 사진 백업 완료 (총 ${count}건 | 캐시참조: ${cachedCount}건, 신규다운: ${downloadedCount}건) -> ${deliveryZipPath}`,
      });
    } finally {
      try {
        if (fs.existsSync(tempDir)) {
          for (const f of fs.readdirSync(tempDir)) fs.unlinkSync(path.join(tempDir, f));
          fs.rmdirSync(tempDir);
        }
      } catch (_) {}
    }
  }

  // ── 2. 영수증 사진 백업 (로컬 캐시 우선) ──
  if (needReceiptBackup) {
    const tempDir = path.join(receiptBackupDir, `_tmp_rcp_${folderName}_${Date.now()}`);
    try {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      let count = 0;
      let cachedCount = 0;
      let downloadedCount = 0;

      for (const item of (receiptItems || [])) {
        try {
          const cachedFilePath = path.join(receiptCacheDir, item.fileName);
          const dest = path.join(tempDir, item.fileName);

          // 1순위: 로컬 캐시 폴더에 이미 다운로드된 이미지가 있는지 확인
          if (fs.existsSync(cachedFilePath)) {
            fs.copyFileSync(cachedFilePath, dest);
            cachedCount++;
          } else {
            // 2순위: 캐시가 없으면(포맷 등) 안전하게 직접 다운로드
            await downloadFile(item.url, dest);
            downloadedCount++;
          }
          count++;
        } catch (e) {
          parentPort.postMessage({ type: 'warn', msg: `영수증 사진 처리 실패 URL=${item.url}: ${e.message}` });
        }
      }

      if (!fs.existsSync(receiptBackupDir)) fs.mkdirSync(receiptBackupDir, { recursive: true });
      const zip = new AdmZip();
      if (fs.existsSync(tempDir)) {
        for (const f of fs.readdirSync(tempDir)) {
          zip.addLocalFile(path.join(tempDir, f));
        }
      }
      if (count === 0) {
        zip.addFile(
          'readme.txt',
          Buffer.from(`FloXync monthly receipt backup\nFolder: ${folderName}\nNo receipt images.\n`, 'utf8'),
        );
      }
      zip.writeZip(receiptZipPath);
      parentPort.postMessage({
        type: 'log',
        msg: `영수증 사진 백업 완료 (총 ${count}건 | 캐시참조: ${cachedCount}건, 신규다운: ${downloadedCount}건) -> ${receiptZipPath}`,
      });
    } finally {
      try {
        if (fs.existsSync(tempDir)) {
          for (const f of fs.readdirSync(tempDir)) fs.unlinkSync(path.join(tempDir, f));
          fs.rmdirSync(tempDir);
        }
      } catch (_) {}
    }
  }

  parentPort.postMessage({ type: 'done' });
}

run().catch((err) => {
  parentPort.postMessage({ type: 'error', msg: err.message });
});
