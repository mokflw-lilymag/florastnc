import { saveAs } from "file-saver";
import { toBaseLocale, type AppLocale } from "@/i18n/config";
import { pickExcelString, pickExcelCell, parseExcel } from "@/utils/excel";
import type { Customer, CustomerData } from "@/types/customer";

function base(uiLocale?: string) {
  return uiLocale ? toBaseLocale(uiLocale as AppLocale) : "ko";
}

export function customerImportHeaderAliases(uiLocale?: string) {
  const b = base(uiLocale);
  const X = (keys: string[]) => keys;
  if (b === "ko") {
    return {
      name: X(["고객명", "이름"]),
      type: X(["고객유형", "유형"]),
      company_name: X(["회사명", "상호"]),
      contact: X(["연락처", "전화번호", "휴대폰"]),
      email: X(["이메일"]),
      address: X(["주소"]),
      grade: X(["등급"]),
      points: X(["포인트"]),
      memo: X(["메모", "비고"]),
    };
  }
  return {
    name: X(["Customer name", "Name", "고객명", "이름"]),
    type: X(["Customer type", "Type", "고객유형", "유형"]),
    company_name: X(["Company", "Company name", "회사명", "상호"]),
    contact: X(["Contact", "Phone", "연락처", "전화번호"]),
    email: X(["Email", "이메일"]),
    address: X(["Address", "주소"]),
    grade: X(["Grade", "등급"]),
    points: X(["Points", "포인트"]),
    memo: X(["Memo", "Notes", "메모", "비고"]),
  };
}

export function normalizeCustomerExcelType(raw: string): CustomerData["type"] {
  const v = raw.trim().toLowerCase();
  if (v === "company" || v === "기업" || v === "법인" || v === "corporate") return "company";
  return "individual";
}

export function parseCustomerExcelRow(
  row: Record<string, unknown>,
  uiLocale?: string,
): CustomerData | null {
  const H = customerImportHeaderAliases(uiLocale);
  const name = pickExcelString(row, H.name);
  const contact = pickExcelString(row, H.contact);
  if (!name || !contact) return null;

  return {
    name,
    contact,
    type: normalizeCustomerExcelType(pickExcelString(row, H.type)),
    company_name: pickExcelString(row, H.company_name) || undefined,
    email: pickExcelString(row, H.email) || undefined,
    address: pickExcelString(row, H.address) || undefined,
    grade: pickExcelString(row, H.grade) || "신규",
    points: Number(pickExcelCell(row, H.points)) || 0,
    memo: pickExcelString(row, H.memo) || undefined,
    marketing_consent: false,
  };
}

export async function parseCustomerExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return parseExcel(file);
}

export async function downloadCustomerTemplate(uiLocale?: string) {
  const XLSX = await import("xlsx");
  const b = base(uiLocale);
  const headers =
    b === "ko"
      ? ["고객명", "고객유형", "회사명", "연락처", "이메일", "주소", "등급", "포인트", "메모"]
      : ["Customer name", "Type", "Company", "Contact", "Email", "Address", "Grade", "Points", "Memo"];
  const sample =
    b === "ko"
      ? [["김민수", "개인", "", "010-1234-5678", "kim@example.com", "서울 강남구", "신규", 0, ""]]
      : [["Kim Min-su", "individual", "", "010-1234-5678", "kim@example.com", "Seoul", "New", 0, ""]];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, b === "ko" ? "고객" : "Customers");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    b === "ko" ? "고객등록_양식.xlsx" : "customer_registration_template.xlsx",
  );
}

export async function exportCustomersToExcel(customers: Customer[], uiLocale?: string) {
  const XLSX = await import("xlsx");
  const b = base(uiLocale);
  const headers =
    b === "ko"
      ? ["고객명", "고객유형", "회사명", "연락처", "이메일", "주소", "등급", "포인트", "누적구매액", "주문건수", "메모"]
      : ["Customer name", "Type", "Company", "Contact", "Email", "Address", "Grade", "Points", "Total spent", "Orders", "Memo"];
  const rows = customers.map((c) => [
    c.name || "",
    c.type === "company" ? (b === "ko" ? "기업" : "company") : b === "ko" ? "개인" : "individual",
    c.company_name || "",
    c.contact || "",
    c.email || "",
    c.address || "",
    c.grade || "",
    c.points || 0,
    c.total_spent || 0,
    c.order_count || 0,
    c.memo || "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, b === "ko" ? "고객목록" : "Customers");
  const dateStamp = new Date().toISOString().split("T")[0];
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    b === "ko" ? `고객목록_${dateStamp}.xlsx` : `customer_list_${dateStamp}.xlsx`,
  );
}
