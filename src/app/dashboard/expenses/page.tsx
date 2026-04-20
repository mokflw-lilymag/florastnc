"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  PlusCircle,
  Search,
  Trash2,
  Receipt,
  Building2,
  TrendingDown,
  PieChart,
  Filter,
  Pencil,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  FileImage,
  FileCheck,
  Link2,
  Check,
  ChevronsUpDown,
  Plus,
  ArrowRight,
  ShoppingCart,
  ScanText,
  Sparkles,
  Loader2,
  Camera,
  AlertTriangle,
  Images,
  Undo2,
  Eye,
  RotateCw,
  FlipHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { findExpensesSimilarToDraft, findSameDaySupplierAmountMismatch } from "@/lib/expense-similarity";
import { useExpenses, Expense, useExpenseStorage } from "@/hooks/use-expenses";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useMaterials } from "@/hooks/use-materials";
import { useOrders } from "@/hooks/use-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import {
  setFlorasyncFloatingUiSuppressed,
  waitForFloatingUiHiddenFrame,
} from "@/lib/floating-ui-bridge";

/** 미리보기와 동일한 변환을 캔버스 캡처에 적용 (모바일 카메라 방향·좌우 보정) */
function applyVideoFrameToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  transform: { rotation: 0 | 90 | 180 | 270; flipH: boolean }
): boolean {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return false;
  const rot = transform.rotation;
  if (rot === 90 || rot === 270) {
    canvas.width = vh;
    canvas.height = vw;
  } else {
    canvas.width = vw;
    canvas.height = vh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  if (transform.flipH) ctx.scale(-1, 1);
  ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
  ctx.restore();
  return true;
}

interface ReceiptItem {
  id: string;
  material_id: string;
  material_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  sub_category: string;
  main_category: string;
  mid_category: string;
}

interface ExpenseFormData {
  category: string;
  sub_category: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_method: string;
  supplier_id: string;
  material_id?: string;
  quantity?: number;
  unit: string;
  receipt_url: string;
  receipt_file_id: string;
  storage_provider: string;
  items: ReceiptItem[];
}

const defaultFormData: ExpenseFormData = {
  category: "materials",
  sub_category: "",
  amount: 0,
  description: "",
  expense_date: format(new Date(), "yyyy-MM-dd"),
  payment_method: "card",
  supplier_id: "none",
  material_id: "none",
  quantity: 0,
  unit: "ea",
  receipt_url: "",
  receipt_file_id: "",
  storage_provider: "google_drive",
  items: []
};

const RECEIPT_OCR_CONCURRENCY = 3;
const MAX_RECEIPT_FILES_PER_BATCH = 25;

function receiptLinkHref(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return u;
}

/** Run async work with a fixed concurrency (order of completion may differ from input). */
async function runPool<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runWorker() {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await worker(items[i], i);
    }
  }
  const n = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

export default function ExpensesPage() {
  const { expenses, loading: expensesLoading, addExpense, addExpenses, updateExpense, deleteExpense } = useExpenses();
  const { uploadReceipt } = useExpenseStorage();
  const { suppliers } = useSuppliers();
  const { materials } = useMaterials();
  const { updateOrder } = useOrders(false);
  /** 목록은 지출만 로드되면 표시 (거래처·자재 로딩과 분리 — 로컬에서 자재/거래처 지연 시 스켈레톤만 보이던 현상 완화) */
  const listLoading = expensesLoading;

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const editingExpenseRef = useRef<Expense | null>(null);
  useEffect(() => {
    editingExpenseRef.current = editingExpense;
  }, [editingExpense]);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [sortKey, setSortKey] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [activeItemPopover, setActiveItemPopover] = useState<string | null>(null);

  const scanInputRef = React.useRef<HTMLInputElement>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const webcamModeRef = React.useRef<"single" | "multi">("single");
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamMode, setWebcamMode] = useState<"single" | "multi" | null>(null);
  /** 영수증이 거꾸로·좌우로 보일 때 셔터 전에 맞춤 (미리보기와 촬영 결과 동일) */
  const [webcamPreviewTransform, setWebcamPreviewTransform] = useState<{
    rotation: 0 | 90 | 180 | 270;
    flipH: boolean;
  }>({ rotation: 0, flipH: false });
  const [webcamQueue, setWebcamQueue] = useState<File[]>([]);

  const [itemSearchText, setItemSearchText] = useState("");
  const itemSearchList = useMemo(() => {
    if (!materials) return [];
    if (!itemSearchText) return materials.slice(0, 50);
    const search = itemSearchText.toLowerCase();
    return materials.filter(m =>
      m.name?.toLowerCase().includes(search) ||
      m.main_category?.toLowerCase().includes(search) ||
      m.mid_category?.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [materials, itemSearchText]);
  
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  /** 영수증 스캔/파일 OCR로 금액·품목 등이 채워진 상태 — 원본 대조 안내용 */
  const [fieldsFromOcr, setFieldsFromOcr] = useState(false);
  const [similarExpenseDialogOpen, setSimilarExpenseDialogOpen] = useState(false);
  const [similarExpenses, setSimilarExpenses] = useState<Expense[]>([]);
  const [amountMismatchDialogOpen, setAmountMismatchDialogOpen] = useState(false);
  const [amountMismatchExpenses, setAmountMismatchExpenses] = useState<Expense[]>([]);

  const categoryLabels: Record<string, string> = {
    all: "전체 분류",
    materials: "자재/꽃 사입",
    transportation: "운송비",
    rent: "임대료",
    utility: "공과금",
    labor: "인건비",
    marketing: "마케팅",
    etc: "기타"
  };

  const methodLabels: Record<string, string> = {
    all: "전체 수단",
    card: "카드",
    cash: "현금",
    transfer: "이체"
  };

  const supplierLabels: Record<string, string> = {
    all: "전체 거래처",
    none: "거래처 없음"
  };

  const [formData, setFormData] = useState<ExpenseFormData>({ ...defaultFormData });

  // Add Item to Receipt
  const addReceiptItem = () => {
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      material_id: "none",
      material_name: "",
      description: "",
      quantity: 1,
      unit: "ea",
      unit_price: 0,
      amount: 0,
      sub_category: "",
      main_category: "",
      mid_category: ""
    };
    setFormData(prev => ({
      ...prev,
      items: [newItem, ...prev.items]
    }));
  };

  const removeReceiptItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateReceiptItem = (id: string, updates: Partial<ReceiptItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          // Auto calculate amount if qty or price changed
          if ('quantity' in updates || 'unit_price' in updates) {
            updated.amount = updated.quantity * updated.unit_price;
          }
          return updated;
        }
        return item;
      })
    }));
  };

  // Sync total amount from items
  const totalItemsAmount = useMemo(() => {
    return formData.items.length > 0
      ? formData.items.reduce((sum, item) => sum + item.amount, 0)
      : formData.amount;
  }, [formData.items, formData.amount]);

  const activeFilterCount = [filterCategory !== "all", filterSupplier !== "all", filterMethod !== "all", !!filterDateFrom, !!filterDateTo].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterSupplier("all");
    setFilterMethod("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchTerm("");
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-500" />
      : <ArrowDown className="h-3 w-3 ml-1 text-indigo-500" />;
  };

  // Unique suppliers that appear in expenses for the filter dropdown
  const expenseSupplierIds = useMemo(() => {
    const ids = new Set<string>();
    expenses.forEach(e => { if (e.supplier_id) ids.add(e.supplier_id); });
    return Array.from(ids);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchText = e.description.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          (e.supplier_id && suppliers.find(s => s.id === e.supplier_id)?.name.toLowerCase().includes(term));
        if (!matchText) return false;
      }
      // Category filter
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      // Supplier filter
      if (filterSupplier !== "all") {
        if (filterSupplier === "none" && e.supplier_id) return false;
        if (filterSupplier !== "none" && e.supplier_id !== filterSupplier) return false;
      }
      // Payment method filter
      if (filterMethod !== "all" && e.payment_method !== filterMethod) return false;
      // Date range filter
      if (filterDateFrom) {
        const expDate = format(new Date(e.expense_date), "yyyy-MM-dd");
        if (expDate < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const expDate = format(new Date(e.expense_date), "yyyy-MM-dd");
        if (expDate > filterDateTo) return false;
      }
      return true;
    });
  }, [expenses, searchTerm, filterCategory, filterSupplier, filterMethod, filterDateFrom, filterDateTo, suppliers]);

  const sortedExpenses = useMemo(() => {
    const arr = [...filteredExpenses];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      switch (sortKey) {
        case "date":
          return dir * (new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());
        case "category":
          return dir * (a.category || "").localeCompare(b.category || "");
        case "supplier": {
          const sA = suppliers.find(s => s.id === a.supplier_id)?.name || "zzz";
          const sB = suppliers.find(s => s.id === b.supplier_id)?.name || "zzz";
          return dir * sA.localeCompare(sB);
        }
        case "method":
          return dir * (a.payment_method || "").localeCompare(b.payment_method || "");
        case "amount":
          return dir * (a.amount - b.amount);
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredExpenses, sortKey, sortDir, suppliers]);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const stats = useMemo(() => {
    const supplierMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
      if (e.supplier_id) {
        const current = supplierMap.get(e.supplier_id) || 0;
        supplierMap.set(e.supplier_id, current + e.amount);
      }
    });

    const supplierStats = Array.from(supplierMap.entries())
      .map(([id, amount]) => ({
        name: suppliers.find(s => s.id === id)?.name || "알 수 없음",
        amount
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      topSupplier: supplierStats[0] || null,
      supplierCount: supplierMap.size,
      avgExpense: filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0
    };
  }, [filteredExpenses, suppliers, totalAmount]);

  const openCreateDialog = () => {
    setFieldsFromOcr(false);
    setEditingExpense(null);
    const initialItem: ReceiptItem = {
      id: crypto.randomUUID(),
      material_id: "none",
      material_name: "",
      description: "",
      quantity: 1,
      unit: "ea",
      unit_price: 0,
      amount: 0,
      sub_category: "",
      main_category: "",
      mid_category: ""
    };
    setFormData({
      ...defaultFormData,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      items: [initialItem]
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (
    expense: Expense,
    receiptOverride?: Pick<ExpenseFormData, "receipt_url" | "receipt_file_id">
  ) => {
    setFieldsFromOcr(false);
    setEditingExpense(expense);
    const rUrl = receiptOverride?.receipt_url ?? expense.receipt_url ?? "";
    const rId = receiptOverride?.receipt_file_id ?? expense.receipt_file_id ?? "";
    setFormData({
      category: expense.category || "materials",
      sub_category: expense.sub_category || "",
      amount: Math.trunc(Number(expense.amount)) || 0,
      description: expense.description,
      expense_date: format(new Date(expense.expense_date), "yyyy-MM-dd"),
      payment_method: expense.payment_method || "card",
      supplier_id: expense.supplier_id || "none",
      material_id: expense.material_id || "none",
      quantity: expense.quantity || 0,
      unit: expense.unit || "ea",
      receipt_url: rUrl,
      receipt_file_id: rId,
      storage_provider: expense.storage_provider || "google_drive",
      items: []
    });
    setIsDialogOpen(true);
  };

  const switchToEditFromAmountMismatch = (expense: Expense) => {
    setAmountMismatchDialogOpen(false);
    setAmountMismatchExpenses([]);
    setSimilarExpenseDialogOpen(false);
    setSimilarExpenses([]);
    setIsDialogOpen(false);

    const draftUrl = formData.receipt_url?.trim() ?? "";
    const draftId = formData.receipt_file_id?.trim() ?? "";
    const hasDraftReceipt =
      draftUrl.length > 0 &&
      (draftUrl !== (expense.receipt_url || "").trim() ||
        draftId !== (expense.receipt_file_id || "").trim());

    openEditDialog(
      expense,
      hasDraftReceipt ? { receipt_url: formData.receipt_url, receipt_file_id: formData.receipt_file_id } : undefined
    );
    if (hasDraftReceipt) {
      setFieldsFromOcr(true);
    }
  };

  const isInvalidSingleLineExpense = (data: ExpenseFormData) => {
    if (data.items.length > 0) return false;
    const amt = Number(data.amount);
    const descOk = Boolean(data.description?.trim());
    // 0만 불가 — 할인·환급 등 음수 금액 허용
    return !descOk || !Number.isFinite(amt) || amt === 0;
  };

  const performExpenseSubmit = async () => {
    if (isInvalidSingleLineExpense(formData)) {
      toast.error("지출 내역과 금액을 정확히 입력해 주세요.");
      return;
    }

    if (editingExpense) {
      const payload = {
        category: formData.category,
        sub_category: formData.sub_category,
        amount: (() => {
          const n = Math.trunc(Number(formData.amount));
          return Number.isFinite(n) ? n : 0;
        })(),
        description: formData.description,
        expense_date: new Date(formData.expense_date).toISOString(),
        payment_method: formData.payment_method,
        supplier_id: formData.supplier_id === "none" ? undefined : formData.supplier_id,
        material_id: formData.material_id === "none" ? undefined : formData.material_id,
        quantity: formData.quantity,
        unit: formData.unit,
        receipt_url: formData.receipt_url,
        receipt_file_id: formData.receipt_file_id,
        storage_provider: formData.storage_provider
      };
      const updated = await updateExpense(editingExpense.id, payload);
      if (!updated) return;
      // 배송비인 경우 연결된 주문의 actual_delivery_cost도 동기화
      if (editingExpense.sub_category === '배송비' && editingExpense.related_order_id) {
        await updateOrder(editingExpense.related_order_id, { actual_delivery_cost: payload.amount } as any);
      }
    } else {
      if (formData.items.length > 0) {
        const payloads = formData.items.map(item => ({
          category: formData.category,
          sub_category: item.sub_category || formData.sub_category,
          amount: item.amount,
          description: item.description || (item.material_id !== "none" ? `${item.material_name} 사입` : formData.description),
          expense_date: new Date(formData.expense_date).toISOString(),
          payment_method: formData.payment_method,
          supplier_id: formData.supplier_id === "none" ? undefined : formData.supplier_id,
          material_id: item.material_id === "none" ? undefined : item.material_id,
          quantity: item.quantity,
          unit: item.unit,
          receipt_url: formData.receipt_url,
          receipt_file_id: formData.receipt_file_id,
          storage_provider: formData.storage_provider
        }));
        const inserted = await addExpenses(payloads);
        if (!inserted) return;
      } else {
        const singlePayload = {
          category: formData.category,
          sub_category: formData.sub_category,
          amount: formData.amount,
          description: formData.description,
          expense_date: new Date(formData.expense_date).toISOString(),
          payment_method: formData.payment_method,
          supplier_id: formData.supplier_id === "none" ? undefined : formData.supplier_id,
          material_id: formData.material_id === "none" ? undefined : formData.material_id,
          quantity: formData.quantity,
          unit: formData.unit,
          receipt_url: formData.receipt_url,
          receipt_file_id: formData.receipt_file_id,
          storage_provider: formData.storage_provider
        };
        const inserted = await addExpense(singlePayload);
        if (!inserted) return;
      }
    }

    setIsDialogOpen(false);
    setEditingExpense(null);
    setFormData({ ...defaultFormData });
  };

  const handleSubmit = async () => {
    if (isInvalidSingleLineExpense(formData)) {
      toast.error("지출 내역과 금액을 정확히 입력해 주세요.");
      return;
    }

    if (!editingExpense) {
      const similar = findExpensesSimilarToDraft(expenses, {
        expenseDateYmd: formData.expense_date,
        supplierId: formData.supplier_id,
        headerAmount: formData.amount,
        lineItems: formData.items,
        receiptUrl: formData.receipt_url || undefined,
      });
      if (similar.length > 0) {
        setSimilarExpenses(similar);
        setSimilarExpenseDialogOpen(true);
        return;
      }

      const mismatch = findSameDaySupplierAmountMismatch(expenses, {
        expenseDateYmd: formData.expense_date,
        supplierId: formData.supplier_id,
        headerAmount: formData.amount,
        headerDescription: formData.description,
        lineItems: formData.items,
      });
      if (mismatch.length > 0) {
        setAmountMismatchExpenses(mismatch);
        setAmountMismatchDialogOpen(true);
        return;
      }
    }

    await performExpenseSubmit();
  };

  const confirmSubmitDespiteSimilarExpenses = async () => {
    setSimilarExpenseDialogOpen(false);
    setSimilarExpenses([]);
    await performExpenseSubmit();
  };

  const confirmSubmitDespiteAmountMismatch = async () => {
    setAmountMismatchDialogOpen(false);
    setAmountMismatchExpenses([]);
    await performExpenseSubmit();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "materials": return "자재/꽃 사입";
      case "transportation": return "운송비";
      case "rent": return "임대료";
      case "utility": return "공과금";
      case "labor": return "인건비";
      case "marketing": return "마케팅";
      default: return "기타";
    }
  };

  const getSupplierName = (id?: string) => {
    if (!id) return "-";
    return suppliers.find(s => s.id === id)?.name || "정보 없음";
  };

  // Image Compression: 긴 변 최대 1000px, 그레이스케일, JPEG ~60% (OCR·용량 절충)
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_LONG = 1000;
          let width = img.width;
          let height = img.height;

          if (width >= height) {
            if (width > MAX_LONG) {
              height *= MAX_LONG / width;
              width = MAX_LONG;
            }
          } else {
            if (height > MAX_LONG) {
              width *= MAX_LONG / height;
              height = MAX_LONG;
            }
          }
          width = Math.max(1, Math.round(width));
          height = Math.max(1, Math.round(height));
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const px = imageData.data;
          for (let i = 0; i < px.length; i += 4) {
            const y = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
            const v = Math.min(255, Math.round(y));
            px[i] = v;
            px[i + 1] = v;
            px[i + 2] = v;
          }
          ctx.putImageData(imageData, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              resolve(
                new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            },
            "image/jpeg",
            0.6
          );
        };
      };
    });
  };

  // AI OCR: 여러 파일을 동시에(제한적 병렬) 분석하고, 품목·합계는 한 건 폼에 합산
  const processReceiptFiles = async (originalFiles: File[]) => {
    const imageFiles = originalFiles.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("영수증 이미지 파일(JPG, PNG)을 선택해 주세요.");
      return;
    }

    let files = imageFiles;
    if (files.length > MAX_RECEIPT_FILES_PER_BATCH) {
      toast.message(`한 번에 최대 ${MAX_RECEIPT_FILES_PER_BATCH}장까지 처리합니다.`, {
        description: "나머지는 제외되었습니다. 필요하면 나누어 등록해 주세요.",
      });
      files = files.slice(0, MAX_RECEIPT_FILES_PER_BATCH);
    }

    setIsOcrLoading(true);
    const toastId = toast.loading(
      files.length > 1
        ? `AI 분석 중… (0/${files.length}장)`
        : "AI가 영수증을 분석하고 최적화 중입니다..."
    );

    type PerFileOk = { ok: true; compressed: File; receipts: Record<string, unknown>[] };
    type PerFileFail = { ok: false; name: string; error: string };
    type PerFileResult = PerFileOk | PerFileFail;

    let progressDone = 0;
    const bumpProgress = () => {
      progressDone += 1;
      if (files.length > 1) {
        toast.loading(`AI 분석 중… (${progressDone}/${files.length}장)`, { id: toastId });
      }
    };

    try {
      const perFile: PerFileResult[] = await runPool(files, RECEIPT_OCR_CONCURRENCY, async (file) => {
        try {
          const compressedFile = await compressImage(file);
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(compressedFile);
          });
          const base64Data = base64.split(",")[1];

          const response = await fetch("/api/ai/ocr", {
            method: "POST",
            body: JSON.stringify({
              image: base64Data,
              mimeType: compressedFile.type || "image/jpeg",
            }),
            headers: { "Content-Type": "application/json" },
          });

          const result = await response.json().catch(
            () => ({} as { error?: string; data?: unknown; diagnose?: string; vercelEnv?: string | null })
          );
          if (!response.ok) {
            let msg = typeof result.error === "string" ? result.error : `OCR 실패 (HTTP ${response.status})`;
            if (response.status === 503 && result.vercelEnv != null) {
              msg += ` (Vercel: ${result.vercelEnv})`;
            }
            if (typeof result.diagnose === "string") {
              msg += ` ${result.diagnose}`;
            }
            return { ok: false as const, name: file.name, error: msg };
          }
          const data = result.data as { receipts?: Record<string, unknown>[]; store_name?: string } | undefined;
          if (!data) {
            return { ok: false as const, name: file.name, error: "응답 없음" };
          }
          const receipts = data.receipts || (data.store_name ? [data as Record<string, unknown>] : []);
          if (receipts.length === 0) {
            return { ok: false as const, name: file.name, error: "영수증에서 유효한 정보를 찾지 못했습니다." };
          }
          return { ok: true as const, compressed: compressedFile, receipts };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return { ok: false as const, name: file.name, error: msg };
        } finally {
          bumpProgress();
        }
      });

      const successes = perFile.filter((r): r is PerFileOk => r.ok);
      const failures = perFile.filter((r): r is PerFileFail => !r.ok);

      if (successes.length === 0) {
        toast.dismiss(toastId);
        toast.error(failures[0]?.error || "AI 분석에 실패했습니다.");
        return;
      }

      const receipts = successes.flatMap((s) => s.receipts);
      const allNewItems: ReceiptItem[] = [];
      let mainStoreName = "";
      let mainDate = "";

      receipts.forEach((rc: Record<string, unknown>, idx: number) => {
        if (idx === 0) {
          mainStoreName = String(rc.store_name ?? "");
          mainDate = String(rc.date ?? "");
        }
        const rawItems = (rc.items as Record<string, unknown>[] | undefined) || [];
        const items = rawItems.map((item: Record<string, unknown>) => {
          const materialName = String(item.material_name ?? "");
          const foundMat = materials.find(
            (m) => m.name.includes(materialName) || materialName.includes(m.name)
          );
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unit_price) || 0;
          return {
            id: crypto.randomUUID(),
            material_id: foundMat?.id || "none",
            material_name: foundMat?.name || materialName,
            description: String(item.description || materialName),
            quantity: qty,
            unit: String(item.unit || "ea"),
            unit_price: unitPrice,
            amount: Number(item.amount) || qty * unitPrice || 0,
            main_category: foundMat?.main_category || "",
            mid_category: foundMat?.mid_category || "",
            sub_category: "materials",
          };
        });
        allNewItems.push(...items);
      });

      toast.loading(files.length > 1 ? `클라우드에 저장 중… (${files.length}장)` : "클라우드에 저장 중…", { id: toastId });

      const uploadResults = await runPool(successes, RECEIPT_OCR_CONCURRENCY, async (s) => uploadReceipt(s.compressed));
      const firstUpload = uploadResults.find((u) => u != null) ?? null;

      const firstStore = String(receipts[0]?.store_name ?? "");

      setFormData((prev) => ({
        ...prev,
        expense_date: mainDate || prev.expense_date,
        supplier_id: firstStore
          ? suppliers.find((s) => s.name.includes(firstStore) || firstStore.includes(s.name))?.id || "none"
          : prev.supplier_id,
        amount: Math.trunc(
          receipts.reduce((sum, r) => sum + (Number((r as { total_amount?: unknown }).total_amount) || 0), 0)
        ),
        description: mainStoreName
          ? receipts.length > 1
            ? `${mainStoreName} 외 ${receipts.length - 1}건`
            : mainStoreName
          : prev.description,
        // 수정 모드는 단일 지출 행만 갱신 — OCR 품목 배열을 두면 검증/합계 로직만 꼬이고 금액 필드와 불일치할 수 있음
        items: editingExpenseRef.current ? [] : allNewItems.length > 0 ? allNewItems : prev.items,
        receipt_url: firstUpload?.url || prev.receipt_url,
        receipt_file_id: firstUpload?.id || prev.receipt_file_id,
      }));

      toast.dismiss(toastId);
      if (failures.length > 0) {
        toast.warning(`${successes.length}/${files.length}장만 분석되었습니다.`, {
          description: failures.map((f) => f.name).join(", "),
        });
      } else if (files.length > 1) {
        toast.success(`${files.length}장 분석·저장 완료`, {
          description: "품목·금액은 모두 합산되었습니다. 미리보기·증빙 링크는 첫 번째 영수증 기준입니다.",
        });
      } else if (receipts.length > 1) {
        toast.success(`AI가 총 ${receipts.length}개의 영수증을 감지하여 합산했습니다!`);
      } else {
        toast.success("AI 분석 및 클라우드 저장 완료 (이미지 최적화 적용됨)");
      }
      setFieldsFromOcr(Boolean(firstUpload?.url));
    } catch (err: unknown) {
      toast.dismiss(toastId);
      const message = err instanceof Error ? err.message : "AI 분석 중 오류가 발생했습니다.";
      toast.error(message);
      console.error("OCR Error:", err);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const processReceiptFile = (file: File) => processReceiptFiles([file]);

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length > 0) {
      await processReceiptFiles(list);
    }
    if (e.target) e.target.value = "";
  };

  const openWebcam = (mode: "single" | "multi" = "single") => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("현재 브라우저에서 카메라 기능을 지원하지 않습니다. 파일 불러오기를 이용해주세요.");
      return;
    }

    /* Android: 플로팅 UI(퀵챗 등)가 있으면 "다른 앱 오버레이"로 카메라 권한이 막히는 경우가 있음 */
    setFlorasyncFloatingUiSuppressed(true);

    webcamModeRef.current = mode;
    setWebcamMode(mode);
    setWebcamQueue([]);
    setWebcamPreviewTransform({ rotation: 0, flipH: false });
    setIsWebcamOpen(true);
    setTimeout(async () => {
      try {
        await waitForFloatingUiHiddenFrame();
        // 1순위: 후면 카메라 시도
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'environment' } } 
          });
        } catch (envCheckErr) {
          // 2순위: 전면 혹은 아무 카메라나 시도
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        // Next.js 개발 모드에서 console.error 시 오버레이 크래시 화면이 뜨는 것을 방지
        console.warn("Camera access fallback triggered:", err.message);
        setFlorasyncFloatingUiSuppressed(false);
        setIsWebcamOpen(false);
        setWebcamMode(null);
        webcamModeRef.current = "single";
        setWebcamQueue([]);
        setWebcamPreviewTransform({ rotation: 0, flipH: false });

        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          toast.error("기기에 연결된 카메라를 찾을 수 없습니다.");
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error("카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.");
        } else {
          toast.error(`카메라를 시작할 수 없습니다: ${err.message || '알 수 없는 오류'}`);
        }
        if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
          toast.message(
            "카카오·메신저 말풍선, ‘다른 앱 위에 표시’ 앱이 켜져 있으면 권한 창이 막힐 수 있어요. 접은 뒤 다시 시도해 주세요.",
            { duration: 6000 }
          );
        }
      }
    }, 180);
  };

  const closeWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setFlorasyncFloatingUiSuppressed(false);
    setIsWebcamOpen(false);
    setWebcamMode(null);
    webcamModeRef.current = "single";
    setWebcamQueue([]);
    setWebcamPreviewTransform({ rotation: 0, flipH: false });
  };

  const finishWebcamMulti = async () => {
    const files = [...webcamQueue];
    if (files.length === 0) {
      toast.error("촬영된 영수증이 없습니다.");
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamOpen(false);
    setWebcamMode(null);
    webcamModeRef.current = "single";
    setWebcamQueue([]);
    setWebcamPreviewTransform({ rotation: 0, flipH: false });
    setFlorasyncFloatingUiSuppressed(false);
    await processReceiptFiles(files);
  };

  const undoLastWebcamCapture = () => {
    setWebcamQueue((q) => (q.length > 0 ? q.slice(0, -1) : q));
  };

  const captureWebcam = () => {
    if (!videoRef.current) return;
    const mode = webcamModeRef.current;
    const canvas = document.createElement("canvas");
    if (!applyVideoFrameToCanvas(videoRef.current, canvas, webcamPreviewTransform)) {
      toast.error("카메라 화면이 준비될 때까지 잠시 후 다시 촬영해 주세요.");
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        if (mode === "multi") {
          setWebcamQueue((prev) => {
            if (prev.length >= MAX_RECEIPT_FILES_PER_BATCH) {
              toast.message(`연속 촬영은 최대 ${MAX_RECEIPT_FILES_PER_BATCH}장까지입니다.`, {
                description: "완료를 눌러 분석하세요.",
              });
              return prev;
            }
            return [...prev, file];
          });
        } else {
          closeWebcam();
          processReceiptFile(file);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="지출 관리"
        description="운영 지출과 거래처별 매입 내역을 관리하고 분석합니다."
        icon={Receipt}
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 font-bold text-violet-900 shadow-sm hover:from-violet-100 hover:to-indigo-100"
            onClick={openCreateDialog}
          >
            <Sparkles className="h-4 w-4 text-violet-600" />
            AI 영수증 입력
            <span className="hidden text-[10px] font-normal text-violet-600/80 sm:inline">(촬영·앨범)</span>
          </Button>
          <Button
            type="button"
            className="h-11 bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            onClick={openCreateDialog}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 지출 내역 등록
          </Button>
        </div>
      </PageHeader>

      <Card className="border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-200">
              <ScanText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">영수증만 있으면 AI가 품목·금액을 채워 드립니다</p>
              <p className="mt-0.5 text-xs text-slate-600">
                갤러리 다중 선택 또는 카메라「연속 촬영」으로 여러 장을 모은 뒤 한 번에 분석합니다. 촬영·선택 후 원본과 대조해 저장하세요.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5 border border-violet-200 bg-white font-semibold text-violet-900 hover:bg-violet-50"
              onClick={openCreateDialog}
            >
              <Sparkles className="h-3.5 w-3.5" />
              지금 영수증 넣기
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-slate-600"
              onClick={() => {
                openCreateDialog();
                window.setTimeout(() => openWebcam("single"), 450);
              }}
            >
              <Camera className="mr-1 h-3.5 w-3.5" />
              카메라 1장
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-slate-600"
              onClick={() => {
                openCreateDialog();
                window.setTimeout(() => openWebcam("multi"), 450);
              }}
            >
              <Images className="mr-1 h-3.5 w-3.5" />
              연속 촬영
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expense Form Dialog (Create / Edit) */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingExpense(null);
          setFieldsFromOcr(false);
        }
      }}>
        <DialogContent
          className={cn(
            "transition-all duration-300 gap-0 p-0 overflow-hidden",
            formData.receipt_url || formData.items.length > 0
              ? "w-[min(96vw,1040px)] sm:max-w-[min(96vw,1040px)]"
              : "sm:max-w-[480px]"
          )}
        >
          <div className="p-6 bg-slate-50/50 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {editingExpense ? <Pencil className="w-5 h-5 text-indigo-500" /> : <PlusCircle className="w-5 h-5 text-primary" />}
                {editingExpense ? "지출 내역 수정" : "새 지출 등록"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {editingExpense ? "수정할 내용을 변경한 뒤 저장하세요." : "상세 지출 내역과 해당 거래처를 선택해 주세요."}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <div
              className={cn(
                "grid gap-6",
                formData.receipt_url &&
                  "lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:gap-8 lg:items-start"
              )}
            >
              {formData.receipt_url ? (
                <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-sm font-bold text-slate-800">영수증 원본 (대조)</Label>
                    {fieldsFromOcr ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 border border-violet-200 bg-violet-100 text-[10px] font-bold text-violet-800"
                      >
                        <Sparkles className="h-3 w-3" />
                        AI·스캔 인식
                      </Badge>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="block w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 text-left shadow-sm ring-offset-2 hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    onClick={() => window.open(formData.receipt_url, "_blank", "noopener,noreferrer")}
                  >
                    {/* 공개 URL(스토리지·외부) — 도메인 가변 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.receipt_url}
                      alt="영수증 원본"
                      className="max-h-[min(48vh,420px)] w-full object-contain"
                    />
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold"
                      onClick={() => window.open(formData.receipt_url, "_blank", "noopener,noreferrer")}
                    >
                      새 탭에서 크게 보기
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs font-semibold text-amber-800 hover:bg-amber-50"
                      onClick={() => {
                        setFieldsFromOcr(false);
                        setFormData((prev) => ({ ...prev, receipt_url: "", receipt_file_id: "" }));
                      }}
                    >
                      영수증 바꾸기
                    </Button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    아래 입력란과 글자·금액을 맞춰 보시고, 틀린 부분은 직접 수정한 뒤 등록해 주세요.
                  </p>
                </div>
              ) : null}

              <div className="min-w-0 space-y-6">
              {fieldsFromOcr && formData.receipt_url ? (
                <div className="flex gap-2 rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-2.5 text-xs text-violet-950">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <p>
                    <span className="font-bold">AI(OCR)로 입력됨</span> — 날짜·거래처·품목·합계는 영수증에서 읽은
                    값입니다. 위쪽(또는 왼쪽) 원본과 다르면 이 화면에서 고친 뒤 저장하세요.
                  </p>
                </div>
              ) : null}

              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-bold text-slate-700">날짜</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.expense_date}
                    onChange={e => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-sm font-bold text-slate-700">거래처</Label>
                  <Popover open={isSupplierOpen} onOpenChange={setIsSupplierOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between bg-white border-slate-200 font-normal"
                        />
                      }
                    >
                      {formData.supplier_id && formData.supplier_id !== "none"
                        ? suppliers.find(s => s.id === formData.supplier_id)?.name
                        : "거래처 선택 (선택사항)"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="거래처 검색..." />
                        <CommandList>
                          <CommandEmpty>결과 없음.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, supplier_id: "none" }));
                                setIsSupplierOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.supplier_id === "none" ? "opacity-100" : "opacity-0")} />
                              선택 안함
                            </CommandItem>
                            {suppliers.map(s => (
                              <CommandItem
                                key={s.id}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, supplier_id: s.id }));
                                  setIsSupplierOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", formData.supplier_id === s.id ? "opacity-100" : "opacity-0")} />
                                {s.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-bold text-slate-700">분류</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v: string | null) => setFormData(prev => ({ ...prev, category: v || "materials" }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue>{categoryLabels[formData.category] || formData.category}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materials">자재/꽃 사입</SelectItem>
                      <SelectItem value="transportation">운송비</SelectItem>
                      <SelectItem value="rent">임대료</SelectItem>
                      <SelectItem value="utility">공과금</SelectItem>
                      <SelectItem value="labor">인건비</SelectItem>
                      <SelectItem value="marketing">마케팅</SelectItem>
                      <SelectItem value="etc">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method" className="text-sm font-bold text-slate-700">결제 수단</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(v: string | null) => setFormData(prev => ({ ...prev, payment_method: v || "card" }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue>{methodLabels[formData.payment_method] || formData.payment_method}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">카드</SelectItem>
                      <SelectItem value="cash">현금</SelectItem>
                      <SelectItem value="transfer">이체</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items List Section (Bulk Mode) */}
              {!editingExpense && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      영수증 품목 리스트
                      <span className="text-[10px] font-normal text-slate-400 ml-2">여러 품목을 한 번에 입력하려면 항목을 추가하세요.</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReceiptItem}
                      className="h-8 gap-1 font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> 항목 추가
                    </Button>
                  </div>

                  {(!editingExpense || formData.items.length > 0) && (
                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                        <div className="col-span-5">품목명 / 상세내용</div>
                        <div className="col-span-2 text-center">수량</div>
                        <div className="col-span-2 text-right">단가</div>
                        <div className="col-span-2 text-right">금액</div>
                        <div className="col-span-1"></div>
                      </div>
                      <div className="divide-y max-h-[400px] overflow-y-auto">
                        {formData.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="col-span-5">
                              <Popover
                                open={activeItemPopover === item.id}
                                onOpenChange={(open) => setActiveItemPopover(open ? item.id : null)}
                              >
                                <PopoverTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      className="w-full justify-between h-auto py-1 text-xs font-normal border border-transparent hover:border-slate-200 px-2"
                                    />
                                  }
                                >
                                  <div className="flex flex-col text-left overflow-hidden">
                                    <span className="truncate text-slate-700 font-medium leading-none mb-1">
                                      {item.material_id && item.material_id !== "none"
                                        ? item.material_name
                                        : item.description || "품목 선택 또는 직접 입력"}
                                    </span>
                                    {item.main_category && (
                                      <span className="text-[10px] text-slate-400 truncate leading-none">
                                        {item.main_category} &gt; {item.mid_category}
                                      </span>
                                    )}
                                  </div>
                                  <Search className="ml-1 h-3 w-3 shrink-0 opacity-30" />
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0" align="start">
                                  {activeItemPopover === item.id && (
                                    <Command shouldFilter={false}>
                                      <CommandInput
                                        placeholder="품목 검색..."
                                        value={itemSearchText}
                                        onValueChange={(v) => {
                                          setItemSearchText(v);
                                          updateReceiptItem(item.id, { description: v });
                                        }}
                                      />
                                      <CommandList className="max-h-[300px]">
                                        <CommandEmpty>
                                          <div className="p-4 text-center">
                                            <p className="text-xs text-slate-500">검색 결과가 없습니다.</p>
                                            <Button
                                              variant="link"
                                              size="sm"
                                              className="text-[10px]"
                                              onClick={() => {
                                                setActiveItemPopover(null);
                                                setItemSearchText("");
                                              }}
                                            >
                                              현재 입력값으로 적용
                                            </Button>
                                          </div>
                                        </CommandEmpty>
                                        <CommandGroup heading="검색 결과 (최대 50개)">
                                          {itemSearchList.map(m => (
                                            <CommandItem
                                              key={m.id}
                                              value={`${m.name} ${m.main_category}`}
                                              onSelect={() => {
                                                updateReceiptItem(item.id, {
                                                  material_id: m.id,
                                                  material_name: m.name,
                                                  unit: m.unit || "ea",
                                                  unit_price: m.price || 0,
                                                  description: `${m.name} 사입`,
                                                  main_category: m.main_category || "",
                                                  mid_category: m.mid_category || ""
                                                });
                                                setActiveItemPopover(null);
                                                setItemSearchText("");
                                              }}
                                            >
                                              <Check className={cn("mr-2 h-4 w-4 text-primary", item.material_id === m.id ? "opacity-100" : "opacity-0")} />
                                              <div className="flex flex-col">
                                                <span className="font-medium">{m.name}</span>
                                                <span className="text-[10px] text-slate-400">{m.main_category} &gt; {m.mid_category}</span>
                                              </div>
                                              <div className="ml-auto text-[10px] font-bold text-slate-400">₩{(m.price || 0).toLocaleString()}</div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                className="h-8 px-2 text-center text-xs border-slate-100 focus:border-indigo-200"
                                value={item.quantity}
                                onChange={e => updateReceiptItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                className="h-8 px-2 text-right text-xs border-slate-100 focus:border-indigo-200"
                                value={item.unit_price}
                                onChange={e => updateReceiptItem(item.id, { unit_price: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="col-span-2 text-right font-bold text-slate-700 text-xs truncate px-1">
                              ₩{(item.amount || 0).toLocaleString()}
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                onClick={() => removeReceiptItem(item.id)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-slate-50 flex justify-between items-center border-t">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Summary</div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-medium">총 {formData.items.length}개 품목 합계:</span>
                          <span className="text-xl font-black text-indigo-700 tracking-tight">₩{totalItemsAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Single / Description Section */}
              {editingExpense && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-sm font-bold text-slate-700">지출 내용</Label>
                    <Input
                      id="desc"
                      placeholder="예: 생화 사입(장미 10단), 월세 등"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-bold text-slate-700">금액</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
                      <Input
                        id="amount"
                        type="number"
                        inputMode="numeric"
                        step={1}
                        className="pl-10 h-12 text-lg font-black text-indigo-700 bg-white border-slate-200"
                        value={formData.amount}
                        onValueChange={(v) => {
                          const t = v.trim();
                          if (t === "") {
                            setFormData((prev) => ({ ...prev, amount: 0 }));
                            return;
                          }
                          const n = Number(t);
                          setFormData((prev) => ({
                            ...prev,
                            amount: Number.isFinite(n) ? Math.trunc(n) : prev.amount,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt File Section */}
              <div className="pt-4 border-t border-slate-100">
                <Label className="mb-3 block text-sm font-bold text-slate-700">증빙 자료 (영수증)</Label>

                {!formData.receipt_url ? (
                  <>
                    <div className="col-span-12 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="group relative h-14 gap-2 overflow-hidden border-emerald-500 bg-emerald-50/50 font-black text-emerald-700 transition-all hover:bg-emerald-100"
                            onClick={() => openWebcam("single")}
                            disabled={isOcrLoading}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 opacity-0 transition-opacity group-hover:opacity-100" />
                            {isOcrLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Camera className="h-5 w-5 text-emerald-600" />
                            )}
                            <div className="flex flex-col items-start leading-tight">
                              <span className="text-sm">카메라 1장</span>
                              <span className="text-[10px] font-normal opacity-60">찍으면 바로 분석</span>
                            </div>
                            <div className="absolute -top-1 -right-1">
                              <Sparkles className="h-3 w-3 animate-pulse text-emerald-400" />
                            </div>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="group relative h-14 gap-2 overflow-hidden border-teal-600 bg-teal-50/50 font-black text-teal-800 transition-all hover:bg-teal-100"
                            onClick={() => openWebcam("multi")}
                            disabled={isOcrLoading}
                          >
                            {isOcrLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Images className="h-5 w-5 text-teal-700" />
                            )}
                            <div className="flex flex-col items-start leading-tight">
                              <span className="text-sm">연속 촬영</span>
                              <span className="text-[10px] font-normal opacity-60">최대 {MAX_RECEIPT_FILES_PER_BATCH}장 후 완료</span>
                            </div>
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="group relative h-14 w-full gap-2 overflow-hidden border-slate-300 bg-slate-50/50 font-black text-slate-700 transition-all hover:bg-slate-100"
                          onClick={() => importInputRef.current?.click()}
                          disabled={isOcrLoading}
                        >
                          {isOcrLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ScanText className="h-5 w-5 text-slate-600" />
                          )}
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-sm">파일 불러오기</span>
                            <span className="text-[10px] font-normal opacity-60">
                              앨범·여러 장 선택 · 최대 {MAX_RECEIPT_FILES_PER_BATCH}장
                            </span>
                          </div>
                        </Button>
                    </div>
                    <details className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2">
                      <summary className="cursor-pointer list-inside text-xs font-bold text-slate-600 marker:text-slate-400">
                        외부 링크로만 첨부 (구글 드라이브 등)
                      </summary>
                      <div className="relative mt-2">
                        <div className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400">
                          <Link2 className="h-4 w-4" />
                        </div>
                        <Input
                          placeholder="https://…"
                          className="border-slate-200 bg-white pl-9 font-mono text-[11px]"
                          value={formData.receipt_url}
                          onChange={(e) => {
                            setFieldsFromOcr(false);
                            setFormData((prev) => ({ ...prev, receipt_url: e.target.value }));
                          }}
                        />
                      </div>
                    </details>
                    <p className="mt-2 ml-1 text-[10px] font-medium italic text-slate-400">
                      * 앨범 다중 선택·연속 촬영·파일 여러 장은 병렬 분석 후 합산합니다. 증빙 미리보기는 첫 번째 영수증만 표시됩니다.
                    </p>
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                    <p className="flex items-center gap-2 font-medium text-slate-700">
                      <Check className="h-4 w-4 text-emerald-600" />
                      영수증이 첨부되었습니다. 위쪽 미리보기에서 확인하세요.
                    </p>
                  </div>
                )}

                <input type="file" className="hidden" ref={scanInputRef} accept="image/*" capture="environment" onChange={handleReceiptScan} />
                <input type="file" className="hidden" ref={importInputRef} accept="image/*" multiple onChange={handleReceiptScan} />
              </div>
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">취소</Button>
            <Button
              onClick={handleSubmit}
              className={cn(
                "px-10 font-bold gap-2 text-white shadow-lg transition-all active:scale-95",
                formData.items.length > 0 ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" : "bg-primary hover:bg-primary/90 shadow-primary/20"
              )}
            >
              {editingExpense ? <FileCheck className="w-4 h-4" /> : (formData.items.length > 0 ? <TrendingDown className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />)}
              {editingExpense ? "수정 완료" : (formData.items.length > 0 ? `품목 ${formData.items.length}개 일괄 등록` : "지출 등록하기")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailExpense !== null}
        onOpenChange={(open) => {
          if (!open) setDetailExpense(null);
        }}
      >
        <DialogContent
          className={cn(
            "gap-0 overflow-hidden p-0",
            detailExpense?.receipt_url
              ? "w-[min(96vw,1040px)] sm:max-w-[min(96vw,1040px)]"
              : "sm:max-w-lg"
          )}
        >
          {detailExpense ? (
            <>
              <div className="border-b bg-slate-50/50 p-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <Eye className="h-5 w-5 shrink-0 text-slate-600" />
                    지출 상세
                  </DialogTitle>
                  <DialogDescription className="text-slate-500">
                    조회 전용입니다. 수정·삭제는 목록 맨 오른쪽 버튼을 사용하세요.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="max-h-[80vh] overflow-y-auto p-6">
                <div
                  className={cn(
                    "grid gap-6",
                    detailExpense.receipt_url &&
                      "lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:items-start lg:gap-8"
                  )}
                >
                  {detailExpense.receipt_url ? (
                    <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
                      <Label className="text-sm font-bold text-slate-800">영수증</Label>
                      <a
                        href={receiptLinkHref(detailExpense.receipt_url) || detailExpense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 shadow-sm ring-offset-2 hover:border-indigo-300"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detailExpense.receipt_url}
                          alt="영수증"
                          className="max-h-[min(48vh,420px)] w-full object-contain"
                        />
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold"
                        onClick={() => {
                          const raw = detailExpense.receipt_url;
                          if (!raw) return;
                          const u = receiptLinkHref(raw) || raw;
                          window.open(u, "_blank", "noopener,noreferrer");
                        }}
                      >
                        새 탭에서 크게 보기
                      </Button>
                    </div>
                  ) : null}
                  <div className="min-w-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">지출일</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-900">
                          {format(new Date(detailExpense.expense_date), "yyyy-MM-dd")}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">거래처</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-900">
                          {getSupplierName(detailExpense.supplier_id)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">분류</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                          {getCategoryLabel(detailExpense.category)}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">결제 수단</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                          {methodLabels[detailExpense.payment_method] || detailExpense.payment_method}
                        </div>
                      </div>
                    </div>
                    {detailExpense.sub_category ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">하위 분류</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                          {detailExpense.sub_category}
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">내용</p>
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm leading-relaxed text-slate-900">
                        {detailExpense.description || "—"}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">금액</p>
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-3 text-xl font-black tracking-tight text-indigo-800">
                        ₩{detailExpense.amount.toLocaleString()}
                      </div>
                    </div>
                    {detailExpense.purchase_id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1 border-indigo-100 bg-indigo-50 text-indigo-700">
                          <ShoppingCart className="h-3 w-3" /> 매입 연동
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t bg-slate-50 p-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="font-bold text-slate-600" onClick={() => setDetailExpense(null)}>
                  닫기
                </Button>
                <Button
                  type="button"
                  className="gap-2 font-bold"
                  onClick={() => {
                    const row = detailExpense;
                    setDetailExpense(null);
                    openEditDialog(row);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  이 지출 수정하기
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={similarExpenseDialogOpen}
        onOpenChange={(open) => {
          setSimilarExpenseDialogOpen(open);
          if (!open) setSimilarExpenses([]);
        }}
      >
        <AlertDialogContent className="max-w-lg sm:max-w-lg">
          <AlertDialogHeader className="text-left">
            <AlertDialogMedia>
              <AlertTriangle className="text-amber-600" />
            </AlertDialogMedia>
            <AlertDialogTitle>비슷한 지출이 이미 있습니다</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              같은 거래일·같은 거래처·같은 금액이거나, 같은 증빙 링크인 기존 지출이 있습니다. 목록을 확인한 뒤 등록 여부를 선택하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">같은 거래일</span>에{" "}
              <span className="font-medium text-foreground">같은 거래처</span>로{" "}
              <span className="font-medium text-foreground">같은 금액</span>인 지출이 이미 있거나, 붙인{" "}
              <span className="font-medium text-foreground">증빙 URL</span>이 기존과 같습니다. 다른 날·다른 금액만으로는 띄우지 않습니다. 거래처가 비어 있으면 URL이 같을 때만 알려 줍니다.
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs text-foreground">
              {similarExpenses.map((e) => (
                <li key={e.id} className="border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <span className="font-semibold text-slate-800">
                    {format(new Date(e.expense_date), "yyyy-MM-dd")}
                  </span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="font-bold text-indigo-700">₩{e.amount.toLocaleString()}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span>{getSupplierName(e.supplier_id)}</span>
                  {e.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-[11px] text-slate-600">{e.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가서 수정</AlertDialogCancel>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => void confirmSubmitDespiteSimilarExpenses()}
            >
              그래도 등록
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={amountMismatchDialogOpen}
        onOpenChange={(open) => {
          setAmountMismatchDialogOpen(open);
          if (!open) setAmountMismatchExpenses([]);
        }}
      >
        <AlertDialogContent className="max-w-lg sm:max-w-lg">
          <AlertDialogHeader className="text-left">
            <AlertDialogMedia>
              <Pencil className="text-sky-600" />
            </AlertDialogMedia>
            <AlertDialogTitle>기존 지출과 금액이 다릅니다</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              같은 거래일·같은 거래처에 비슷한 품목으로 이미 등록된 지출이 있으나 금액이 다릅니다. 정정 영수증이면 기존 건을 수정할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              같은 날·같은 거래처에, 이번에 입력한 품목·내용과{" "}
              <span className="font-medium text-foreground">겹치는 기존 지출</span>이 있는데{" "}
              <span className="font-medium text-foreground">합계 금액만 다릅니다</span>. 정정 영수증이라면 새로 또 넣기보다 아래 기존 건을 수정하는 편이 안전합니다.
            </p>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground">
              이번 입력 합계:{" "}
              <span className="font-bold text-indigo-700">
                ₩
                {(formData.items.length > 0
                  ? formData.items.reduce((s, i) => s + (i.amount || 0), 0)
                  : formData.amount
                ).toLocaleString()}
              </span>
            </p>
            <ul className="max-h-44 space-y-2 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs text-foreground">
              {amountMismatchExpenses.map((e) => (
                <li key={e.id} className="border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <span className="font-bold text-indigo-700">₩{e.amount.toLocaleString()}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="font-semibold text-slate-800">
                    {format(new Date(e.expense_date), "yyyy-MM-dd")}
                  </span>
                  {e.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-[11px] text-slate-600">{e.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {amountMismatchExpenses.length > 1 ? (
              <p className="text-[11px] italic text-slate-500">
                여러 건이면 목록에서 맞는 건을 고른 뒤 표에서 직접 수정할 수도 있습니다. 여기서는 가장 최근 등록 건부터 엽니다.
              </p>
            ) : null}
          </div>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button">돌아가기</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="border-sky-300 text-sky-900 hover:bg-sky-50"
              disabled={amountMismatchExpenses.length === 0}
              onClick={() => {
                const first = amountMismatchExpenses[0];
                if (first) switchToEditFromAmountMismatch(first);
              }}
            >
              최근 건 수정하기
            </Button>
            <Button
              type="button"
              className="bg-slate-700 hover:bg-slate-800"
              onClick={() => void confirmSubmitDespiteAmountMismatch()}
            >
              그래도 새로 등록
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-white overflow-hidden border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> 총 지출 합계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">₩{totalAmount.toLocaleString()}</div>
            <p className="text-[10px] text-slate-400 mt-1">조회된 필터 기준 합계</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white overflow-hidden border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 주요 거래처
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-700 truncate">
              {stats.topSupplier ? stats.topSupplier.name : "없음"}
            </div>
            {stats.topSupplier && (
              <p className="text-[10px] text-slate-500 mt-1">
                누적 매입액: ₩{stats.topSupplier.amount.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-white overflow-hidden border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
              <PieChart className="w-4 h-4" /> 평균 건당 지출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              ₩{Math.round(stats.avgExpense).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">총 {filteredExpenses.length}건 기준</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-slate-50 to-white overflow-hidden border-l-4 border-l-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Filter className="w-4 h-4" /> 활성 거래처 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{stats.supplierCount} <span className="text-sm font-normal">개소</span></div>
            <p className="text-[10px] text-slate-400 mt-1">지출 내역이 있는 업체</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">지출 일지</CardTitle>
              <CardDescription>
                행을 누르면 상세(조회 전용)가 열립니다. 수정·삭제는 오른쪽 아이콘을 사용하세요.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="지출 내용, 거래처, 카테고리 검색"
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              필터
              {activeFilterCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[9px] bg-indigo-500 text-white border-none">{activeFilterCount}</Badge>
              )}
            </div>

            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 w-[130px] text-xs border-slate-200 rounded-lg"
              placeholder="시작일"
            />
            <span className="text-slate-300 text-xs">~</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 w-[130px] text-xs border-slate-200 rounded-lg"
              placeholder="종료일"
            />

            <Select value={filterCategory} onValueChange={(v: string | null) => setFilterCategory(v || "all")}>
              <SelectTrigger className="h-8 w-[120px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder="분류">{categoryLabels[filterCategory]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                <SelectItem value="materials">자재/꽃 사입</SelectItem>
                <SelectItem value="transportation">운송비</SelectItem>
                <SelectItem value="rent">임대료</SelectItem>
                <SelectItem value="utility">공과금</SelectItem>
                <SelectItem value="labor">인건비</SelectItem>
                <SelectItem value="marketing">마케팅</SelectItem>
                <SelectItem value="etc">기타</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSupplier} onValueChange={(v: string | null) => setFilterSupplier(v || "all")}>
              <SelectTrigger className="h-8 w-[130px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder="거래처">
                  {supplierLabels[filterSupplier] || suppliers.find(s => s.id === filterSupplier)?.name || filterSupplier}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 거래처</SelectItem>
                <SelectItem value="none">거래처 없음</SelectItem>
                {expenseSupplierIds.map(id => {
                  const s = suppliers.find(sup => sup.id === id);
                  return s ? <SelectItem key={id} value={id}>{s.name}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>

            <Select value={filterMethod} onValueChange={(v: string | null) => setFilterMethod(v || "all")}>
              <SelectTrigger className="h-8 w-[110px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder="결제수단">{methodLabels[filterMethod]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 수단</SelectItem>
                <SelectItem value="card">카드</SelectItem>
                <SelectItem value="cash">현금</SelectItem>
                <SelectItem value="transfer">이체</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-red-500 gap-1 px-2" onClick={resetFilters}>
                <X className="h-3 w-3" /> 초기화
              </Button>
            )}

            <span className="ml-auto text-[11px] text-slate-400 font-medium">
              {sortedExpenses.length}건 / 총 {expenses.length}건
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="font-bold text-gray-600 cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("date")}>
                      <span className="inline-flex items-center">날짜 <SortIcon column="date" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("category")}>
                      <span className="inline-flex items-center">분류 <SortIcon column="category" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600">지출 내용</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">증빙</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("supplier")}>
                      <span className="inline-flex items-center justify-center w-full">거래처 <SortIcon column="supplier" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("method")}>
                      <span className="inline-flex items-center justify-center w-full">결제수단 <SortIcon column="method" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-right cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("amount")}>
                      <span className="inline-flex items-center justify-end w-full">지출 금액 <SortIcon column="amount" /></span>
                    </TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Receipt className="w-10 h-10 text-slate-200" />
                          <p>검색 결과가 없거나 등록된 지출 내역이 없습니다.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedExpenses.map((e) => (
                      <TableRow
                        key={e.id}
                        className="group cursor-pointer hover:bg-slate-50/50 transition-colors"
                        onClick={() => setDetailExpense(e)}
                      >
                        <TableCell className="text-sm font-mono text-slate-500 py-4">
                          {format(new Date(e.expense_date), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">
                            {getCategoryLabel(e.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-800 tracking-tight">
                          <div className="flex items-center gap-2">
                            {e.description}
                            {e.purchase_id && (
                              <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-indigo-50 text-indigo-600 border-indigo-100 font-bold gap-1 flex items-center">
                                <ShoppingCart className="w-2.5 h-2.5" /> 매입 연동
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {e.receipt_url ? (
                            <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
                              <FileCheck className="h-3.5 w-3.5" /> 있음
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-light italic">없음</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-medium ${e.supplier_id ? "text-blue-600 bg-blue-50 px-2 py-1 rounded-md" : "text-slate-400"}`}>
                            {getSupplierName(e.supplier_id)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded uppercase">
                            {e.payment_method}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-black text-red-600 tracking-tighter text-lg">
                          ₩{e.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => openEditDialog(e)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                              onClick={async () => {
                                if (!window.confirm("지출 내역을 삭제하시겠습니까?")) return;
                                if (e.sub_category === '배송비' && e.related_order_id) {
                                  await updateOrder(e.related_order_id, { actual_delivery_cost: null } as any);
                                }
                                deleteExpense(e.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webcam UI Dialog */}
      <Dialog open={isWebcamOpen} onOpenChange={(open) => { if (!open) closeWebcam(); }}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-black border-none overflow-hidden rounded-3xl">
          <div className="relative w-full aspect-[3/4] bg-neutral-900 flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: `rotate(${webcamPreviewTransform.rotation}deg)${webcamPreviewTransform.flipH ? " scaleX(-1)" : ""}`,
                transformOrigin: "center center",
              }}
            />
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9 rounded-full bg-black/55 border-0 text-white shadow-md hover:bg-black/70"
                title="화면 90° 회전 (글자 방향에 맞출 때)"
                onClick={() =>
                  setWebcamPreviewTransform((t) => ({
                    ...t,
                    rotation: ((t.rotation + 90) % 360) as 0 | 90 | 180 | 270,
                  }))
                }
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9 rounded-full bg-black/55 border-0 text-white shadow-md hover:bg-black/70"
                title="좌우 반전"
                onClick={() => setWebcamPreviewTransform((t) => ({ ...t, flipH: !t.flipH }))}
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
            </div>
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] border border-white/30 rounded-xl flex items-center justify-center">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                <div className="text-white/30 font-bold text-sm bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">영수증을 네모 안에 맞춰주세요</div>
              </div>
            </div>

            {webcamMode === "multi" ? (
              <div className="pointer-events-none absolute top-3 left-0 right-0 flex justify-center px-3">
                <div className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                  연속 촬영 {webcamQueue.length}/{MAX_RECEIPT_FILES_PER_BATCH} · 셔터마다 추가 · 완료 시 일괄 분석
                </div>
              </div>
            ) : null}

            {/* Controls */}
            <div className="absolute bottom-6 left-0 w-full flex items-center justify-around px-4 sm:px-8">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md transition-all"
                onClick={closeWebcam}
              >
                <X className="h-5 w-5" />
              </Button>
              {webcamMode === "multi" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md transition-all disabled:opacity-30"
                  onClick={undoLastWebcamCapture}
                  disabled={webcamQueue.length === 0}
                  title="마지막 촬영 취소"
                >
                  <Undo2 className="h-5 w-5" />
                </Button>
              ) : (
                <div className="w-12 shrink-0" />
              )}
              <button
                type="button"
                className="h-20 w-20 shrink-0 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-95 transition-transform border-4 border-neutral-300"
                onClick={captureWebcam}
              >
                <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-inner">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </button>
              {webcamMode === "multi" ? (
                <Button
                  type="button"
                  className="h-12 max-w-[7.5rem] shrink-0 rounded-full bg-teal-500 px-3 text-xs font-black text-white hover:bg-teal-600 disabled:opacity-40"
                  disabled={webcamQueue.length === 0 || isOcrLoading}
                  onClick={() => void finishWebcamMulti()}
                >
                  완료 ({webcamQueue.length})
                </Button>
              ) : (
                <div className="w-12 shrink-0" />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
