"use client";
import { getMessages } from "@/i18n/getMessages";

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
  setFloxyncFloatingUiSuppressed,
  waitForFloatingUiHiddenFrame,
} from "@/lib/floating-ui-bridge";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

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
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const phReceiptUrl = pickUiText(
    baseLocale,
    "https://…",
    "https://…",
    "https://…",
    "https://…",
    "https://…",
    "https://…",
    "https://…",
    "https://…",
    "https://…",
    "https://…",
  );
  const categoryLabels: Record<string, string> = {
    all: tf.f01798,
    materials: tf.f01744,
    transportation: tf.f01632,
    rent: tf.f01721,
    utility: tf.f00949,
    labor: tf.f01695,
    marketing: tf.f01139,
    etc: tf.f00115
  };

  const methodLabels: Record<string, string> = {
    all: tf.f01801,
    card: tf.f00704,
    cash: tf.f00769,
    transfer: tf.f01693
  };

  const supplierLabels: Record<string, string> = {
    all: tf.f01790,
    none: tf.f00879
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
        name: suppliers.find(s => s.id === id)?.name || tf.f01526,
        amount
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      topSupplier: supplierStats[0] || null,
      supplierCount: supplierMap.size,
      avgExpense: filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0
    };
  }, [filteredExpenses, suppliers, totalAmount, tf]);

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
      toast.error(tf.f02483);
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
          description:
            item.description ||
            (item.material_id !== "none"
              ? tf.f02495.replace("{name}", item.material_name)
              : formData.description),
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
      toast.error(tf.f02483);
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

  const getCategoryLabel = (cat: string) =>
    (categoryLabels as Record<string, string>)[cat] ?? tf.f00115;

  const getSupplierName = (id?: string) => {
    if (!id) return "-";
    return suppliers.find(s => s.id === id)?.name || tf.f02498;
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
      toast.error(tf.f02484);
      return;
    }

    let files = imageFiles;
    if (files.length > MAX_RECEIPT_FILES_PER_BATCH) {
      toast.message(tf.f02499.replace("{max}", String(MAX_RECEIPT_FILES_PER_BATCH)), {
        description: tf.f02485,
      });
      files = files.slice(0, MAX_RECEIPT_FILES_PER_BATCH);
    }

    setIsOcrLoading(true);
    const toastId = toast.loading(
      files.length > 1
        ? tf.f02513.replace("{done}", "0").replace("{total}", String(files.length))
        : tf.f02486
    );

    type PerFileOk = { ok: true; compressed: File; receipts: Record<string, unknown>[] };
    type PerFileFail = { ok: false; name: string; error: string };
    type PerFileResult = PerFileOk | PerFileFail;

    let progressDone = 0;
    const bumpProgress = () => {
      progressDone += 1;
      if (files.length > 1) {
        toast.loading(
          tf.f02513.replace("{done}", String(progressDone)).replace("{total}", String(files.length)),
          { id: toastId }
        );
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
              uiLocale: locale,
            }),
            headers: { "Content-Type": "application/json" },
          });

          const result = await response.json().catch(
            () => ({} as { error?: string; data?: unknown; diagnose?: string; vercelEnv?: string | null })
          );
          if (!response.ok) {
            let msg =
              typeof result.error === "string"
                ? result.error
                : tf.f02515.replace("{status}", String(response.status));
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
            return { ok: false as const, name: file.name, error: tf.f02487 };
          }
          const receipts = data.receipts || (data.store_name ? [data as Record<string, unknown>] : []);
          if (receipts.length === 0) {
            return { ok: false as const, name: file.name, error: tf.f02488 };
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
        toast.error(failures[0]?.error || tf.f02489);
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

      toast.loading(
        files.length > 1 ? tf.f02514.replace("{n}", String(files.length)) : tf.f02506,
        { id: toastId }
      );

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
            ? tf.f02516.replace("{name}", mainStoreName).replace("{n}", String(receipts.length - 1))
            : mainStoreName
          : prev.description,
        // 수정 모드는 단일 지출 행만 갱신 — OCR 품목 배열을 두면 검증/합계 로직만 꼬이고 금액 필드와 불일치할 수 있음
        items: editingExpenseRef.current ? [] : allNewItems.length > 0 ? allNewItems : prev.items,
        receipt_url: firstUpload?.url || prev.receipt_url,
        receipt_file_id: firstUpload?.id || prev.receipt_file_id,
      }));

      toast.dismiss(toastId);
      if (failures.length > 0) {
        toast.warning(
          tf.f02508.replace("{ok}", String(successes.length)).replace("{total}", String(files.length)),
          {
            description: failures.map((f) => f.name).join(", "),
          }
        );
      } else if (files.length > 1) {
        toast.success(tf.f02509.replace("{n}", String(files.length)), {
          description: tf.f02510,
        });
      } else if (receipts.length > 1) {
        toast.success(tf.f02511.replace("{n}", String(receipts.length)));
      } else {
        toast.success(tf.f02512);
      }
      setFieldsFromOcr(Boolean(firstUpload?.url));
    } catch (err: unknown) {
      toast.dismiss(toastId);
      const message = err instanceof Error ? err.message : tf.f02505;
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
      toast.error(tf.f02490);
      return;
    }

    /* Android: 플로팅 UI(퀵챗 등)가 있으면 "다른 앱 오버레이"로 카메라 권한이 막히는 경우가 있음 */
    setFloxyncFloatingUiSuppressed(true);

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
        setFloxyncFloatingUiSuppressed(false);
        setIsWebcamOpen(false);
        setWebcamMode(null);
        webcamModeRef.current = "single";
        setWebcamQueue([]);
        setWebcamPreviewTransform({ rotation: 0, flipH: false });

        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          toast.error(tf.f02491);
        } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          toast.error(tf.f02492);
        } else {
          toast.error(
            tf.f02503.replace("{msg}", err.message || tf.f02504)
          );
        }
        if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
          toast.message(tf.f02502, { duration: 6000 });
        }
      }
    }, 180);
  };

  const closeWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setFloxyncFloatingUiSuppressed(false);
    setIsWebcamOpen(false);
    setWebcamMode(null);
    webcamModeRef.current = "single";
    setWebcamQueue([]);
    setWebcamPreviewTransform({ rotation: 0, flipH: false });
  };

  const finishWebcamMulti = async () => {
    const files = [...webcamQueue];
    if (files.length === 0) {
      toast.error(tf.f02493);
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
    setFloxyncFloatingUiSuppressed(false);
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
      toast.error(tf.f02053);
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        if (mode === "multi") {
          setWebcamQueue((prev) => {
            if (prev.length >= MAX_RECEIPT_FILES_PER_BATCH) {
              toast.message(tf.f02501.replace("{max}", String(MAX_RECEIPT_FILES_PER_BATCH)), {
                description: tf.f02500,
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
        title={tf.f01931}
        description={tf.f01634}
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
            {tf.f02240}
            <span className="hidden text-[10px] font-normal text-violet-600/80 sm:inline">{tf.f00793}</span>
          </Button>
          <Button
            type="button"
            className="h-11 bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            onClick={openCreateDialog}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> {tf.f01935}
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
              <p className="text-sm font-bold text-slate-900">{tf.f01582}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {tf.f00868}
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
              {tf.f01899}
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
              {tf.f02052}
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
              {tf.f01578}
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
                {editingExpense ? tf.f01936 : tf.f01381}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {editingExpense ? tf.f01455 : tf.f01342}
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
                    <Label className="text-sm font-bold text-slate-800">{tf.f01580}</Label>
                    {fieldsFromOcr ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 border border-violet-200 bg-violet-100 text-[10px] font-bold text-violet-800"
                      >
                        <Sparkles className="h-3 w-3" />
                        {tf.f02246}
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
                      alt={tf.f02538}
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
                      {tf.f01382}
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
                      {tf.f01579}
                    </Button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    {tf.f01519}
                  </p>
                </div>
              ) : null}

              <div className="min-w-0 space-y-6">
              {fieldsFromOcr && formData.receipt_url ? (
                <div className="flex gap-2 rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-2.5 text-xs text-violet-950">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <p>
                    <span className="font-bold">{tf.f02247}</span> — {tf.f01027}
                    {tf.f02537}
                  </p>
                </div>
              ) : null}

              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-bold text-slate-700">{tf.f00127}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.expense_date}
                    onChange={e => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-sm font-bold text-slate-700">{tf.f00872}</Label>
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
                        : tf.f00878}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={tf.f00873} />
                        <CommandList>
                          <CommandEmpty>{tf.f00907}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, supplier_id: "none" }));
                                setIsSupplierOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.supplier_id === "none" ? "opacity-100" : "opacity-0")} />
                              {tf.f01406}
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
                  <Label htmlFor="category" className="text-sm font-bold text-slate-700">{tf.f01290}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v: string | null) => setFormData(prev => ({ ...prev, category: v || "materials" }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue>{categoryLabels[formData.category] || formData.category}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materials">{tf.f01744}</SelectItem>
                      <SelectItem value="transportation">{tf.f01632}</SelectItem>
                      <SelectItem value="rent">{tf.f01721}</SelectItem>
                      <SelectItem value="utility">{tf.f00949}</SelectItem>
                      <SelectItem value="labor">{tf.f01695}</SelectItem>
                      <SelectItem value="marketing">{tf.f01139}</SelectItem>
                      <SelectItem value="etc">{tf.f00115}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method" className="text-sm font-bold text-slate-700">{tf.f00049}</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(v: string | null) => setFormData(prev => ({ ...prev, payment_method: v || "card" }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue>{methodLabels[formData.payment_method] || formData.payment_method}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">{tf.f00704}</SelectItem>
                      <SelectItem value="cash">{tf.f00769}</SelectItem>
                      <SelectItem value="transfer">{tf.f01693}</SelectItem>
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
                      {tf.f01581}
                      <span className="text-[10px] font-normal text-slate-400 ml-2">{tf.f01556}</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReceiptItem}
                      className="h-8 gap-1 font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> {tf.f02174}
                    </Button>
                  </div>

                  {(!editingExpense || formData.items.length > 0) && (
                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                        <div className="col-span-5">{tf.f02134}</div>
                        <div className="col-span-2 text-center">{tf.f00377}</div>
                        <div className="col-span-2 text-right">{tf.f00148}</div>
                        <div className="col-span-2 text-right">{tf.f00097}</div>
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
                                        : item.description || tf.f02127}
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
                                        placeholder={tf.f02125}
                                        value={itemSearchText}
                                        onValueChange={(v) => {
                                          setItemSearchText(v);
                                          updateReceiptItem(item.id, { description: v });
                                        }}
                                      />
                                      <CommandList className="max-h-[300px]">
                                        <CommandEmpty>
                                          <div className="p-4 text-center">
                                            <p className="text-xs text-slate-500">{tf.f00036}</p>
                                            <Button
                                              variant="link"
                                              size="sm"
                                              className="text-[10px]"
                                              onClick={() => {
                                                setActiveItemPopover(null);
                                                setItemSearchText("");
                                              }}
                                            >
                                              {tf.f02517}
                                            </Button>
                                          </div>
                                        </CommandEmpty>
                                        <CommandGroup heading={tf.f02518}>
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
                                                  description: tf.f02495.replace("{name}", m.name),
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
                          <span className="text-xs text-slate-500 font-medium">{tf.f01992} {formData.items.length}{tf.f00863}:</span>
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
                    <Label htmlFor="desc" className="text-sm font-bold text-slate-700">{tf.f01938}</Label>
                    <Input
                      id="desc"
                      placeholder={tf.f02519}
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-bold text-slate-700">{tf.f00097}</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
                      <Input
                        id="amount"
                        type="number"
                        inputMode="numeric"
                        step={1}
                        className="pl-10 h-12 text-lg font-black text-indigo-700 bg-white border-slate-200"
                        value={formData.amount}
                        onChange={(e) => {
                          const t = e.target.value.trim();
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
                <Label className="mb-3 block text-sm font-bold text-slate-700">{tf.f01893}</Label>

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
                              <span className="text-sm">{tf.f02052}</span>
                              <span className="text-[10px] font-normal opacity-60">{tf.f01971}</span>
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
                              <span className="text-sm">{tf.f01578}</span>
                              <span className="text-[10px] font-normal opacity-60">{tf.f02017} {MAX_RECEIPT_FILES_PER_BATCH}{tf.f01756}</span>
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
                            <span className="text-sm">{tf.f02090}</span>
                            <span className="text-[10px] font-normal opacity-60">
                              {tf.f02520.replace("{max}", String(MAX_RECEIPT_FILES_PER_BATCH))}
                            </span>
                          </div>
                        </Button>
                    </div>
                    <details className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2">
                      <summary className="cursor-pointer list-inside text-xs font-bold text-slate-600 marker:text-slate-400">
                        {tf.f02521}
                      </summary>
                      <div className="relative mt-2">
                        <div className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400">
                          <Link2 className="h-4 w-4" />
                        </div>
                        <Input
                          placeholder={phReceiptUrl}
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
                      {tf.f02522}
                    </p>
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                    <p className="flex items-center gap-2 font-medium text-slate-700">
                      <Check className="h-4 w-4 text-emerald-600" />
                      {tf.f02523}
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
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">{tf.f00702}</Button>
            <Button
              onClick={handleSubmit}
              className={cn(
                "px-10 font-bold gap-2 text-white shadow-lg transition-all active:scale-95",
                formData.items.length > 0 ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" : "bg-primary hover:bg-primary/90 shadow-primary/20"
              )}
            >
              {editingExpense ? <FileCheck className="w-4 h-4" /> : (formData.items.length > 0 ? <TrendingDown className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />)}
              {editingExpense
                ? tf.f02524
                : formData.items.length > 0
                  ? tf.f02525.replace("{n}", String(formData.items.length))
                  : tf.f02526}
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
                    {tf.f02527}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500">
                    {tf.f02528}
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
                      <Label className="text-sm font-bold text-slate-800">{tf.f00448}</Label>
                      <a
                        href={receiptLinkHref(detailExpense.receipt_url) || detailExpense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 shadow-sm ring-offset-2 hover:border-indigo-300"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detailExpense.receipt_url}
                          alt={tf.f02539}
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
                        {tf.f02529}
                      </Button>
                    </div>
                  ) : null}
                  <div className="min-w-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tf.f01952}</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-900">
                          {format(new Date(detailExpense.expense_date), "P", { locale: dfLoc })}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tf.f00872}</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-900">
                          {getSupplierName(detailExpense.supplier_id)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tf.f01290}</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                          {getCategoryLabel(detailExpense.category)}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tf.f00049}</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                          {methodLabels[detailExpense.payment_method] || detailExpense.payment_method}
                        </div>
                      </div>
                    </div>
                    {detailExpense.sub_category ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tf.f02161}</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                          {detailExpense.sub_category}
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tf.f01033}</p>
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm leading-relaxed text-slate-900">
                        {detailExpense.description || "—"}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tf.f00097}</p>
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-3 text-xl font-black tracking-tight text-indigo-800">
                        ₩{detailExpense.amount.toLocaleString()}
                      </div>
                    </div>
                    {detailExpense.purchase_id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1 border-indigo-100 bg-indigo-50 text-indigo-700">
                          <ShoppingCart className="h-3 w-3" /> {tf.f02496}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t bg-slate-50 p-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="font-bold text-slate-600" onClick={() => setDetailExpense(null)}>
                  {tf.f02530}
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
                  {tf.f01676}
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
            <AlertDialogTitle>{tf.f01305}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {tf.f02531}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{tf.f00857}</span>{tf.f01545}{" "}
              <span className="font-medium text-foreground">{tf.f00858}</span>{tf.f01126}{" "}
              <span className="font-medium text-foreground">{tf.f00859}</span>{tf.f01694}{" "}
              <span className="font-medium text-foreground">{tf.f01894}</span>{tf.f01666}
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs text-foreground">
              {similarExpenses.map((e) => (
                <li key={e.id} className="border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <span className="font-semibold text-slate-800">
                    {format(new Date(e.expense_date), "P", { locale: dfLoc })}
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
            <AlertDialogCancel>{tf.f01102}</AlertDialogCancel>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => void confirmSubmitDespiteSimilarExpenses()}
            >
              {tf.f00994}
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
            <AlertDialogTitle>{tf.f01012}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {tf.f02532}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {tf.f02533}
              <span className="font-medium text-foreground">{tf.f00929}</span>{tf.f01671}{" "}
              <span className="font-medium text-foreground">{tf.f02166}</span>{tf.f00790}
            </p>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground">
              {tf.f02534}{" "}
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
                    {format(new Date(e.expense_date), "P", { locale: dfLoc })}
                  </span>
                  {e.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-[11px] text-slate-600">{e.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {amountMismatchExpenses.length > 1 ? (
              <p className="text-[11px] italic text-slate-500">
                {tf.f02535}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button">{tf.f00159}</AlertDialogCancel>
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
              {tf.f02010}
            </Button>
            <Button
              type="button"
              className="bg-slate-700 hover:bg-slate-800"
              onClick={() => void confirmSubmitDespiteAmountMismatch()}
            >
              {tf.f00995}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-white overflow-hidden border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> {tf.f02000}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">₩{totalAmount.toLocaleString()}</div>
            <p className="text-[10px] text-slate-400 mt-1">{tf.f01859}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white overflow-hidden border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {tf.f01879}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-700 truncate">
              {stats.topSupplier ? stats.topSupplier.name : tf.f00441}
            </div>
            {stats.topSupplier && (
              <p className="text-[10px] text-slate-500 mt-1">
                {tf.f01051}: ₩{stats.topSupplier.amount.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-white overflow-hidden border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
              <PieChart className="w-4 h-4" /> {tf.f02104}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              ₩{Math.round(stats.avgExpense).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{tf.f01992} {filteredExpenses.length}{tf.f00888}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-slate-50 to-white overflow-hidden border-l-4 border-l-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Filter className="w-4 h-4" /> {tf.f02222}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{stats.supplierCount} <span className="text-sm font-normal">{tf.f00865}</span></div>
            <p className="text-[10px] text-slate-400 mt-1">{tf.f01937}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">{tf.f01947}</CardTitle>
              <CardDescription>
                {tf.f02536}
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder={tf.f01939}
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
              {tf.f02158}
              {activeFilterCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[9px] bg-indigo-500 text-white border-none">{activeFilterCount}</Badge>
              )}
            </div>

            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 w-[130px] text-xs border-slate-200 rounded-lg"
              placeholder={tf.f01488}
            />
            <span className="text-slate-300 text-xs">~</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 w-[130px] text-xs border-slate-200 rounded-lg"
              placeholder={tf.f01861}
            />

            <Select value={filterCategory} onValueChange={(v: string | null) => setFilterCategory(v || "all")}>
              <SelectTrigger className="h-8 w-[120px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder={tf.f01290}>{categoryLabels[filterCategory]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tf.f01798}</SelectItem>
                <SelectItem value="materials">{tf.f01744}</SelectItem>
                <SelectItem value="transportation">{tf.f01632}</SelectItem>
                <SelectItem value="rent">{tf.f01721}</SelectItem>
                <SelectItem value="utility">{tf.f00949}</SelectItem>
                <SelectItem value="labor">{tf.f01695}</SelectItem>
                <SelectItem value="marketing">{tf.f01139}</SelectItem>
                <SelectItem value="etc">{tf.f00115}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSupplier} onValueChange={(v: string | null) => setFilterSupplier(v || "all")}>
              <SelectTrigger className="h-8 w-[130px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder={tf.f00872}>
                  {supplierLabels[filterSupplier] || suppliers.find(s => s.id === filterSupplier)?.name || filterSupplier}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tf.f01790}</SelectItem>
                <SelectItem value="none">{tf.f00879}</SelectItem>
                {expenseSupplierIds.map(id => {
                  const s = suppliers.find(sup => sup.id === id);
                  return s ? <SelectItem key={id} value={id}>{s.name}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>

            <Select value={filterMethod} onValueChange={(v: string | null) => setFilterMethod(v || "all")}>
              <SelectTrigger className="h-8 w-[110px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder={tf.f00926}>{methodLabels[filterMethod]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tf.f01801}</SelectItem>
                <SelectItem value="card">{tf.f00704}</SelectItem>
                <SelectItem value="cash">{tf.f00769}</SelectItem>
                <SelectItem value="transfer">{tf.f01693}</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-red-500 gap-1 px-2" onClick={resetFilters}>
                <X className="h-3 w-3" /> {tf.f01987}
              </Button>
            )}

            <span className="ml-auto text-[11px] text-slate-400 font-medium">
              {sortedExpenses.length}{tf.f00033} / {tf.f01992} {expenses.length}{tf.f00033}
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
                      <span className="inline-flex items-center">{tf.f00127} <SortIcon column="date" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("category")}>
                      <span className="inline-flex items-center">{tf.f01290} <SortIcon column="category" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f01938}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">{tf.f01892}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("supplier")}>
                      <span className="inline-flex items-center justify-center w-full">{tf.f00872} <SortIcon column="supplier" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("method")}>
                      <span className="inline-flex items-center justify-center w-full">{tf.f00926} <SortIcon column="method" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-right cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("amount")}>
                      <span className="inline-flex items-center justify-end w-full">{tf.f01933} <SortIcon column="amount" /></span>
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
                          <p>{tf.f00902}</p>
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
                          {format(new Date(e.expense_date), "P", { locale: dfLoc })}
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
                                <ShoppingCart className="w-2.5 h-2.5" /> {tf.f02496}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {e.receipt_url ? (
                            <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
                              <FileCheck className="h-3.5 w-3.5" /> {tf.f02497}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-light italic">{tf.f00441}</span>
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
                                if (!window.confirm(tf.f02494)) return;
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
                title={tf.f02540}
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
                title={tf.f02541}
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
                <div className="text-white/30 font-bold text-sm bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">{tf.f01583}</div>
              </div>
            </div>

            {webcamMode === "multi" ? (
              <div className="pointer-events-none absolute top-3 left-0 right-0 flex justify-center px-3">
                <div className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                  {tf.f02542
                    .replace("{current}", String(webcamQueue.length))
                    .replace("{max}", String(MAX_RECEIPT_FILES_PER_BATCH))}
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
                  title={tf.f02543}
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
                  {tf.f02544.replace("{n}", String(webcamQueue.length))}
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
