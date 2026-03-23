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
    sample = [['P01', '축하화환 3단', '경조사화환', '축하화환', 100000, 10, '자체제작', 'active']];
    filename = '상품등록_양식.xlsx';
  } else {
    // Matches the user's requested order for materials
    headers = ['번호', '자재ID', '자재명', '대분류', '중분류', '단위', '규격', '가격', '색상', '재고', '공급업체', '메모'];
    sample = [['1', '', '대형 리본(핑크)', '부자재', '리본', '롤', '10cm*50m', 5000, '핑크', 20, 'ABC상사', '']];
    filename = '자재등록_양식.xlsx';
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "양식");
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(data, filename);
}

/**
 * Export actual data to Excel.
 */
export function exportDataToExcel(type: 'product' | 'material', list: any[]) {
  let headers: string[] = [];
  let dataRows: any[] = [];
  let filename = '';

  if (type === 'product') {
    headers = ['상품코드', '상품명', '대분류', '중분류', '판매가', '재고', '공급처', '상태'];
    dataRows = list.map(p => [
      p.code || '',
      p.name || '',
      p.main_category || '',
      p.mid_category || '',
      p.price || 0,
      p.stock || 0,
      p.supplier || '',
      p.status || ''
    ]);
    filename = `상품목록_${new Date().toISOString().split('T')[0]}.xlsx`;
  } else {
    headers = ['번호', '자재ID', '자재명', '대분류', '중분류', '단위', '규격', '가격', '색상', '재고', '공급업체', '메모'];
    dataRows = list.map((m, idx) => [
      idx + 1,
      m.id || '',
      m.name || '',
      m.main_category || '',
      m.mid_category || '',
      m.unit || '',
      m.spec || '',
      m.price || 0,
      m.color || '',
      m.stock || 0,
      m.supplier || '',
      m.memo || ''
    ]);
    filename = `자재목록_${new Date().toISOString().split('T')[0]}.xlsx`;
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "데이터");
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(dataBlob, filename);
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
