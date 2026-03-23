import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Download a template for product/material registration.
 */
export function downloadTemplate(type: 'product' | 'material') {
  let headers: string[] = [];
  let sample: any[] = [];
  let filename = '';

  if (type === 'product') {
    headers = ['상품코드', '상품명', '대분류', '중분류', '판매가', '재고', '공급처', '상태(active/inactive)'];
    sample = [['P00001', '장미꽃다발', '꽃다발', '기본형', 35000, 10, '자체제작', 'active']];
    filename = '상품등록_템플릿.xlsx';
  } else {
    headers = ['자재명', '대분류', '중분류', '단위', '규격', '단가', '재고', '공급처', '메모'];
    sample = [['포장지(핑크)', '포장자재', '포장지', '롤', '60cm*10m', 5000, 20, 'ABC상사', '']];
    filename = '자재등록_템플릿.xlsx';
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "템플릿");
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(data, filename);
}

/**
 * Parse an Excel file and return an array of objects.
 */
export async function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
