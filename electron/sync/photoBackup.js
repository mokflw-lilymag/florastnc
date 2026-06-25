const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { getTenantBackupPath } = require('../backupPathStore');

const DELIVERY_SUBDIR = 'monthly image';
const RECEIPT_SUBDIR = 'monthly receipt';
const AUTO_WINDOW_MS = 72 * 60 * 60 * 1000;

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

function getBaseBackupPath(tenantId) {
  return getTenantBackupPath(tenantId);
}

function getDeliveryBackupDir(tenantId) {
  return path.join(getBaseBackupPath(tenantId), DELIVERY_SUBDIR);
}

function getReceiptBackupDir(tenantId) {
  return path.join(getBaseBackupPath(tenantId), RECEIPT_SUBDIR);
}

function getPreviousTargetMonth(refDate = new Date()) {
  const d = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function monthToZipPrefix(targetMonth) {
  return targetMonth.replace('-', '');
}

function getDeliveryZipPath(tenantId, targetMonth) {
  return path.join(getDeliveryBackupDir(tenantId), `${monthToZipPrefix(targetMonth)}_delivery.zip`);
}

function getReceiptZipPath(tenantId, targetMonth) {
  return path.join(getReceiptBackupDir(tenantId), `${monthToZipPrefix(targetMonth)}_receipt.zip`);
}

function isWithinAutoBackupWindow(now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const elapsed = now.getTime() - monthStart.getTime();
  return elapsed >= 0 && elapsed < AUTO_WINDOW_MS;
}

function sanitizeFilePart(value, maxLen = 28) {
  const cleaned = String(value ?? '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '미상';
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function guessExtension(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.png')) return '.png';
    if (pathname.endsWith('.webp')) return '.webp';
    if (pathname.endsWith('.jpeg')) return '.jpeg';
    if (pathname.endsWith('.pdf')) return '.pdf';
  } catch (_) {}
  return '.jpg';
}

function uniqueFileName(baseName, usedNames) {
  let name = baseName;
  let n = 2;
  while (usedNames.has(name)) {
    const dot = baseName.lastIndexOf('.');
    if (dot > 0) {
      name = `${baseName.slice(0, dot)}_${String(n).padStart(2, '0')}${baseName.slice(dot)}`;
    } else {
      name = `${baseName}_${String(n).padStart(2, '0')}`;
    }
    n += 1;
  }
  usedNames.add(name);
  return name;
}

function parseJsonField(raw, fallback = null) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function tableExists(db, tableName) {
  try {
    const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    return Boolean(row);
  } catch (_) {
    return false;
  }
}

/** FloXync: completionphotourl + delivery_info.completionPhotoUrl (+ legacy delivery_proof_url) */
function resolveDeliveryProofUrl(order) {
  if (order.delivery_proof_url) return order.delivery_proof_url;
  if (order.completionphotourl) return order.completionphotourl;
  const deliveryInfo = parseJsonField(order.delivery_info, {});
  return deliveryInfo.completionPhotoUrl || deliveryInfo.completion_photo_url || null;
}

function formatYmd(dateRaw) {
  const dateObj = new Date(dateRaw);
  if (Number.isNaN(dateObj.getTime())) return '00000000';
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function buildDeliveryFileName(order, proofUrl) {
  const ymd = formatYmd(order.completed_at || order.order_date);
  const orderNo = sanitizeFilePart(order.order_number || order.id?.slice(0, 8) || '주문', 16);
  const deliveryInfo = parseJsonField(order.delivery_info, {});
  const pickupInfo = parseJsonField(order.pickup_info, {});
  const orderer = parseJsonField(order.orderer, {});

  const isDelivery = order.receipt_type === 'delivery_reservation';
  const recipient = sanitizeFilePart(
    isDelivery ? deliveryInfo.recipientName || orderer.name : pickupInfo.pickerName || orderer.name,
    12,
  );

  let district = '픽업';
  if (isDelivery) {
    district = sanitizeFilePart(
      deliveryInfo.district ||
        (deliveryInfo.address ? deliveryInfo.address.split(/\s+/).slice(0, 2).join('') : '배송'),
      14,
    );
  }

  let productName = '상품';
  const items = parseJsonField(order.items, []);
  if (Array.isArray(items) && items.length > 0) {
    const first = sanitizeFilePart(items[0].name || '상품', 18);
    productName = items.length > 1 ? `${first}외${items.length - 1}건` : first;
  }

  const ext = guessExtension(proofUrl);
  return `${ymd}_${orderNo}_${recipient}_${district}_${productName}${ext}`;
}

/** simple_expenses(supplier) + expenses(supplier_id/description) 공통 */
function buildReceiptFileName(expense) {
  const ymd = formatYmd(expense.expense_date);
  const category = sanitizeFilePart(expense.category || expense.sub_category || '지출', 12);
  const amount = Math.round(Number(expense.amount) || 0);
  const supplierLabel = sanitizeFilePart(
    expense.supplier ||
      expense.supplier_name ||
      expense.description ||
      (expense.supplier_id ? `거래처${String(expense.supplier_id).slice(0, 6)}` : '미지정'),
    14,
  );
  const memo = sanitizeFilePart(expense.description || expense.memo || '', 16);
  const memoPart = memo !== '미상' && memo !== supplierLabel ? `_${memo}` : '';
  const sourceTag = expense._backup_source === 'expenses' ? '_E' : expense._backup_source === 'simple_expenses' ? '_S' : '';
  const ext = guessExtension(expense.receipt_url);
  return `${ymd}_${category}_${amount}원_${supplierLabel}${memoPart}${sourceTag}${ext}`;
}

function queryLocalReceiptRows(db, tenantId, targetMonth, tableName, sourceTag) {
  if (!tableExists(db, tableName)) return [];
  return db
    .prepare(
      `SELECT * FROM ${tableName}
       WHERE tenant_id = ?
         AND receipt_url IS NOT NULL AND receipt_url != ''
         AND expense_date LIKE ?`,
    )
    .all(tenantId, `${targetMonth}%`)
    .map((row) => ({ ...row, _backup_source: sourceTag }));
}

async function fetchCloudExpenseReceiptRows(supabase, tenantId, targetMonth) {
  if (!supabase || !tenantId) return [];
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('receipt_url', 'is', null)
      .neq('receipt_url', '')
      .like('expense_date', `${targetMonth}%`);
    if (error) {
      console.warn('[PhotoBackup] cloud expenses fetch:', error.message);
      return [];
    }
    return (data || []).map((row) => ({ ...row, _backup_source: 'expenses' }));
  } catch (err) {
    console.warn('[PhotoBackup] cloud expenses fetch failed:', err);
    return [];
  }
}

/** simple_expenses + expenses(로컬·클라우드) 통합, receipt_url 기준 중복 제거 */
async function collectReceiptRowsForMonth(db, tenantId, targetMonth, supabase) {
  const byId = new Map();
  const seenUrls = new Set();

  const ingest = (rows) => {
    for (const row of rows) {
      const url = String(row.receipt_url || '').trim();
      if (!url || seenUrls.has(url)) continue;
      if (!byId.has(row.id)) {
        byId.set(row.id, row);
        seenUrls.add(url);
      }
    }
  };

  ingest(queryLocalReceiptRows(db, tenantId, targetMonth, 'simple_expenses', 'simple_expenses'));
  ingest(queryLocalReceiptRows(db, tenantId, targetMonth, 'expenses', 'expenses'));
  ingest(await fetchCloudExpenseReceiptRows(supabase, tenantId, targetMonth));

  return Array.from(byId.values());
}

async function runPhotoBackupForMonth(db, tenantId, targetMonth, options = {}) {
  const { force = false, supabase = null } = options;
  if (!db || !tenantId) {
    return { ok: false, error: 'DB or tenant not configured' };
  }

  const deliveryZipPath = getDeliveryZipPath(tenantId, targetMonth);
  const receiptZipPath = getReceiptZipPath(tenantId, targetMonth);
  const deliveryBackupDir = getDeliveryBackupDir(tenantId);
  const receiptBackupDir = getReceiptBackupDir(tenantId);

  const needDeliveryBackup = force || !fs.existsSync(deliveryZipPath);
  const needReceiptBackup = force || !fs.existsSync(receiptZipPath);

  if (!needDeliveryBackup && !needReceiptBackup) {
    return {
      ok: true,
      skipped: true,
      targetMonth,
      deliveryZip: deliveryZipPath,
      receiptZip: receiptZipPath,
      deliveryCount: 0,
      receiptCount: 0,
      receiptSimpleCount: 0,
      receiptExpensesCount: 0,
    };
  }

  if (force) {
    try {
      if (fs.existsSync(deliveryZipPath)) fs.unlinkSync(deliveryZipPath);
      if (fs.existsSync(receiptZipPath)) fs.unlinkSync(receiptZipPath);
    } catch (err) {
      console.warn('[PhotoBackup] force delete failed:', err);
    }
  }

  console.log(`[PhotoBackup] tenant=${tenantId} month=${targetMonth} base=${getBaseBackupPath(tenantId)}`);

  let orders = [];
  if (needDeliveryBackup) {
    orders = db
      .prepare(
        `SELECT * FROM orders
         WHERE tenant_id = ?
           AND status = 'completed'
           AND (completed_at LIKE ? OR (completed_at IS NULL AND order_date LIKE ?))`,
      )
      .all(tenantId, `${targetMonth}%`, `${targetMonth}%`);
  }

  let receiptRows = [];
  if (needReceiptBackup) {
    receiptRows = await collectReceiptRowsForMonth(db, tenantId, targetMonth, supabase);
  }

  const AdmZip = require('adm-zip');
  let deliveryCount = 0;
  let receiptCount = 0;
  let receiptSimpleCount = 0;
  let receiptExpensesCount = 0;

  const tempDeliveryDir = path.join(deliveryBackupDir, `_tmp_del_${Date.now()}`);
  const tempReceiptDir = path.join(receiptBackupDir, `_tmp_rcp_${Date.now()}`);

  if (needDeliveryBackup) {
    if (!fs.existsSync(deliveryBackupDir)) fs.mkdirSync(deliveryBackupDir, { recursive: true });

    const candidates = orders
      .map((order) => ({ order, proofUrl: resolveDeliveryProofUrl(order) }))
      .filter((row) => row.proofUrl);

    if (candidates.length > 0) fs.mkdirSync(tempDeliveryDir, { recursive: true });

    const usedNames = new Set();
    for (const { order, proofUrl } of candidates) {
      try {
        const fileName = uniqueFileName(buildDeliveryFileName(order, proofUrl), usedNames);
        await downloadFile(proofUrl, path.join(tempDeliveryDir, fileName));
        deliveryCount += 1;
      } catch (err) {
        console.error(`[PhotoBackup] delivery order ${order.id}:`, err);
      }
    }

    try {
      const zip = new AdmZip();
      if (deliveryCount > 0 && fs.existsSync(tempDeliveryDir)) {
        for (const file of fs.readdirSync(tempDeliveryDir)) {
          zip.addLocalFile(path.join(tempDeliveryDir, file));
        }
      } else {
        zip.addFile(
          'readme.txt',
          Buffer.from(`FloXync monthly delivery backup\nMonth: ${targetMonth}\nNo delivery proof images.\n`, 'utf8'),
        );
      }
      zip.writeZip(deliveryZipPath);
      console.log(`[PhotoBackup] Delivery zip: ${deliveryZipPath} (${deliveryCount} files)`);
    } finally {
      if (fs.existsSync(tempDeliveryDir)) {
        for (const file of fs.readdirSync(tempDeliveryDir)) {
          fs.unlinkSync(path.join(tempDeliveryDir, file));
        }
        fs.rmdirSync(tempDeliveryDir);
      }
    }
  }

  if (needReceiptBackup) {
    if (!fs.existsSync(receiptBackupDir)) fs.mkdirSync(receiptBackupDir, { recursive: true });
    if (receiptRows.length > 0) fs.mkdirSync(tempReceiptDir, { recursive: true });

    const usedNames = new Set();
    for (const expense of receiptRows) {
      try {
        if (!expense.receipt_url) continue;
        const fileName = uniqueFileName(buildReceiptFileName(expense), usedNames);
        await downloadFile(expense.receipt_url, path.join(tempReceiptDir, fileName));
        receiptCount += 1;
        if (expense._backup_source === 'expenses') receiptExpensesCount += 1;
        else receiptSimpleCount += 1;
      } catch (err) {
        console.error(`[PhotoBackup] receipt ${expense._backup_source || 'expense'} ${expense.id}:`, err);
      }
    }

    try {
      const zip = new AdmZip();
      if (receiptCount > 0 && fs.existsSync(tempReceiptDir)) {
        for (const file of fs.readdirSync(tempReceiptDir)) {
          zip.addLocalFile(path.join(tempReceiptDir, file));
        }
      } else {
        zip.addFile(
          'readme.txt',
          Buffer.from(
            `FloXync monthly receipt backup\nMonth: ${targetMonth}\nSources: simple_expenses + expenses (지출관리)\nNo expense receipt images.\n`,
            'utf8',
          ),
        );
      }
      zip.writeZip(receiptZipPath);
      console.log(
        `[PhotoBackup] Receipt zip: ${receiptZipPath} (${receiptCount} files — simple:${receiptSimpleCount}, expenses:${receiptExpensesCount})`,
      );
    } finally {
      if (fs.existsSync(tempReceiptDir)) {
        for (const file of fs.readdirSync(tempReceiptDir)) {
          fs.unlinkSync(path.join(tempReceiptDir, file));
        }
        fs.rmdirSync(tempReceiptDir);
      }
    }
  }

  return {
    ok: true,
    targetMonth,
    deliveryZip: deliveryZipPath,
    receiptZip: receiptZipPath,
    deliveryCount,
    receiptCount,
    receiptSimpleCount,
    receiptExpensesCount,
  };
}

async function checkAndRunPhotoBackup(db, tenantId, supabase = null) {
  if (!db || !tenantId) return { ok: false, skipped: true, reason: 'not_configured' };

  if (!isWithinAutoBackupWindow()) {
    return { ok: true, skipped: true, reason: 'outside_72h_window' };
  }

  const targetMonth = getPreviousTargetMonth();
  const deliveryZip = getDeliveryZipPath(tenantId, targetMonth);
  const receiptZip = getReceiptZipPath(tenantId, targetMonth);

  if (fs.existsSync(deliveryZip) && fs.existsSync(receiptZip)) {
    return { ok: true, skipped: true, reason: 'already_backed_up', targetMonth };
  }

  try {
    return await runPhotoBackupForMonth(db, tenantId, targetMonth, { force: false, supabase });
  } catch (err) {
    console.error('[PhotoBackup] auto backup error:', err);
    return { ok: false, error: err.message || String(err) };
  }
}

module.exports = {
  DELIVERY_SUBDIR,
  RECEIPT_SUBDIR,
  getBaseBackupPath,
  getDeliveryBackupDir,
  getReceiptBackupDir,
  getPreviousTargetMonth,
  getDeliveryZipPath,
  getReceiptZipPath,
  isWithinAutoBackupWindow,
  resolveDeliveryProofUrl,
  collectReceiptRowsForMonth,
  runPhotoBackupForMonth,
  checkAndRunPhotoBackup,
};
