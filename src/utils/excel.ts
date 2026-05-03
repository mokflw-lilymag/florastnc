import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toBaseLocale, type AppLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

function resolveExcelBase(uiLocale?: string): string {
  return uiLocale ? toBaseLocale(uiLocale as AppLocale) : "ko";
}

/**
 * Download a template for product/material registration.
 * `uiLocale`가 있으면 자재(material) 양식의 헤더·파일명을 해당 로케일(ko/en/vi)에 맞춥니다.
 */
export function downloadTemplate(type: "product" | "material" | "supplier", uiLocale?: string) {
  let headers: string[] = [];
  let sample: any[] = [];
  let filename = "";
  const base = resolveExcelBase(uiLocale);

  if (type === "product") {
    headers = ["상품코드", "상품명", "대분류", "중분류", "판매가", "재고", "공급처", "상태(active/inactive)"];
    sample = [["P01", "축하화환 3단", "경조사화환", "축하화환", 100000, 10, "자체제작", "active"]];
    filename = "상품등록_양식.xlsx";
  } else if (type === "supplier") {
    headers = ["거래처명", "유형", "연락처", "담당자", "이메일", "주소", "메모"];
    sample = [["(주)꽃도매상사", "생화", "02-123-4567", "김담당", "contact@flower.com", "서울 서초구 양재동", "오전 배송 전용"]];
    filename = "거래처등록_양식.xlsx";
  } else {
    if (base === "ko") {
      headers = ["번호", "자재ID", "자재명", "대분류", "중분류", "단위", "규격", "가격", "색상", "재고", "공급업체", "메모"];
      sample = [["1", "", "대형 리본(핑크)", "부자재", "리본", "롤", "10cm*50m", 5000, "핑크", 20, "ABC상사", ""]];
      filename = "자재등록_양식.xlsx";
    } else if (base === "vi") {
      headers = [
        "STT",
        "ID vật tư",
        "Tên vật tư",
        "Nhóm lớn",
        "Nhóm nhỏ",
        "Đơn vị",
        "Quy cách",
        "Giá",
        "Màu sắc",
        "Tồn kho",
        "Nhà cung cấp",
        "Ghi chú",
      ];
      sample = [["1", "", "Ruy băng lớn (hồng)", "Phụ liệu", "Ruy băng", "cuộn", "10cm*50m", 5000, "Hồng", 20, "Nhà cung ABC", ""]];
      filename = "mau_dang_ky_vat_tu.xlsx";
    } else {
      headers = [
        "No.",
        "Material ID",
        "Material name",
        "Main category",
        "Sub category",
        "Unit",
        "Spec",
        "Price",
        "Color",
        "Stock",
        "Supplier",
        "Memo",
      ];
      sample = [["1", "", "Large ribbon (pink)", "Supplies", "Ribbon", "roll", "10cm*50m", 5000, "Pink", 20, "ABC Trading", ""]];
      filename = "material_template.xlsx";
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const workbook = XLSX.utils.book_new();
  const sheetLabel = pickUiText(base, "양식", "Template", "Mẫu");
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetLabel);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(data, filename);
}

/**
 * Export actual data to Excel.
 * 자재(material)보내기 시 `uiLocale`로 헤더·파일명·시트명을 맞춥니다.
 */
export function exportDataToExcel(type: "product" | "material" | "supplier", list: any[], uiLocale?: string) {
  let headers: string[] = [];
  let dataRows: any[] = [];
  let filename = "";
  const base = resolveExcelBase(uiLocale);

  if (type === "product") {
    headers = ["상품코드", "상품명", "대분류", "중분류", "판매가", "재고", "공급처", "상태"];
    dataRows = list.map((p) => [
      p.code || "",
      p.name || "",
      p.main_category || "",
      p.mid_category || "",
      p.price || 0,
      p.stock || 0,
      p.supplier || "",
      p.status || "",
    ]);
    filename = `상품목록_${new Date().toISOString().split("T")[0]}.xlsx`;
  } else if (type === "supplier") {
    headers = ["업체명", "연락처", "이메일", "사업자번호", "주소", "메모"];
    dataRows = list.map((s) => [
      s.name || "",
      s.contact || "",
      s.email || "",
      s.business_number || "",
      s.address || "",
      s.memo || "",
    ]);
    filename = `거래처목록_${new Date().toISOString().split("T")[0]}.xlsx`;
  } else {
    const dateStr = new Date().toISOString().split("T")[0];
    if (base === "ko") {
      headers = ["번호", "자재ID", "자재명", "대분류", "중분류", "단위", "규격", "가격", "색상", "재고", "공급업체", "메모"];
      filename = `자재목록_${dateStr}.xlsx`;
    } else if (base === "vi") {
      headers = [
        "STT",
        "ID vật tư",
        "Tên vật tư",
        "Nhóm lớn",
        "Nhóm nhỏ",
        "Đơn vị",
        "Quy cách",
        "Giá",
        "Màu sắc",
        "Tồn kho",
        "Nhà cung cấp",
        "Ghi chú",
      ];
      filename = `danh_sach_vat_tu_${dateStr}.xlsx`;
    } else {
      headers = [
        "No.",
        "Material ID",
        "Material name",
        "Main category",
        "Sub category",
        "Unit",
        "Spec",
        "Price",
        "Color",
        "Stock",
        "Supplier",
        "Memo",
      ];
      filename = `material_list_${dateStr}.xlsx`;
    }
    dataRows = list.map((m, idx) => [
      idx + 1,
      m.id || "",
      m.name || "",
      m.main_category || "",
      m.mid_category || "",
      m.unit || "",
      m.spec || "",
      m.price || 0,
      m.color || "",
      m.stock || 0,
      m.supplier || "",
      m.memo || "",
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  const dataSheet = pickUiText(base, "데이터", "Data", "Dữ liệu");
  XLSX.utils.book_append_sheet(workbook, worksheet, dataSheet);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
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
        const workbook = XLSX.read(data, { type: "array" });
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
