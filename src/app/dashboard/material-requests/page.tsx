"use client";
import { getMessages } from "@/i18n/getMessages";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Loader2,
  Plus,
  Minus,
  Send,
  Trash2,
  ClipboardList,
  Search,
  Package,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import type { Material } from "@/hooks/use-materials";
import { useSettings, DEFAULT_MATERIAL_CATEGORIES } from "@/hooks/use-settings";
import { sortMaterialMainCategoriesForDisplay } from "@/lib/category-defaults";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, type Locale } from "date-fns";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { pickUiText } from "@/i18n/pick-ui-text";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

const ALL = "__ALL__";

type DraftLine = {
  key: string;
  material_id: string | null;
  name: string;
  main_category: string;
  mid_category: string;
  quantity: string;
  unit: string;
  spec: string;
};

function newLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    material_id: null,
    name: "",
    main_category: "",
    mid_category: "",
    quantity: "1",
    unit: "ea",
    spec: "",
  };
}

function lineFromMaterial(m: Material, defaultMain: string): DraftLine {
  return {
    key: crypto.randomUUID(),
    material_id: m.id,
    name: m.name,
    main_category: m.main_category || defaultMain,
    mid_category: m.mid_category || "",
    quantity: "1",
    unit: m.unit || "ea",
    spec: m.spec || "",
  };
}

export default function BranchMaterialRequestsPage() {
  const { tenantId, isLoading: authLoading } = useAuth();
  const { materialCategories, loading: settingsLoading } = useSettings();
  const CATEGORIES = materialCategories || DEFAULT_MATERIAL_CATEGORIES;

  const [catalogMaterials, setCatalogMaterials] = useState<Material[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [linkedOrg, setLinkedOrg] = useState<boolean | null>(null);
  const [branchNote, setBranchNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      status: string;
      created_at: string;
      branch_note: string | null;
      lines: unknown[];
    }>
  >([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMain, setActiveMain] = useState(ALL);
  const [activeMid, setActiveMid] = useState(ALL);
  const [manualOpen, setManualOpen] = useState(false);
  const [mobileCartExpanded, setMobileCartExpanded] = useState(true);
  const [fullCartOpen, setFullCartOpen] = useState(false);
  const [qtyPopoverMaterialId, setQtyPopoverMaterialId] = useState<string | null>(null);
  const [qtyDraft, setQtyDraft] = useState("1");

  const materialMainOrdered = useMemo(
    () => sortMaterialMainCategoriesForDisplay(CATEGORIES.main),
    [CATEGORIES.main]
  );

  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const ui = useMemo(
    () => ({
      catalogTitle: pickUiText(
        baseLocale,
        "자재 카탈로그",
        "Material catalog",
        "Danh mục vật tư",
        "資材カタログ",
        "物料目录",
        "Catálogo de materiales",
        "Catálogo de materiais",
        "Catalogue matières",
        "Materialkatalog",
        "Каталог материалов",
      ),
      catalogHint: pickUiText(
        baseLocale,
        "카드를 누르면 1개씩 담깁니다. 담긴 수량을 누르면 개수를 바꿀 수 있습니다.",
        "Tap a card to add one. Tap the quantity badge to change the amount.",
        "Chạm thẻ để thêm 1. Chạm số lượng để sửa.",
        "カードをタップで1個追加。数量バッジで変更。",
        "点击卡片每次加 1。点击数量可修改。",
        "Toca la tarjeta para sumar 1. Toca la cantidad para editar.",
        "Toque o cartão para +1. Toque na quantidade para editar.",
        "Appuyez sur la carte pour +1. Touchez le badge pour modifier.",
        "Tippen Sie auf die Karte für +1. Auf die Menge tippen zum Ändern.",
        "Нажмите карточку — +1. Нажмите на число, чтобы изменить.",
      ),
      qtyLabel: pickUiText(
        baseLocale,
        "수량",
        "Quantity",
        "Số lượng",
        "数量",
        "数量",
        "Cantidad",
        "Quantidade",
        "Quantité",
        "Menge",
        "Кол-во",
      ),
      qtyApply: pickUiText(
        baseLocale,
        "적용",
        "Apply",
        "Áp dụng",
        "適用",
        "应用",
        "Aplicar",
        "Aplicar",
        "Appliquer",
        "Übernehmen",
        "Применить",
      ),
      cartTitle: pickUiText(
        baseLocale,
        "요청 장바구니",
        "Request cart",
        "Giỏ yêu cầu",
        "依頼カート",
        "申请购物车",
        "Carrito de solicitud",
        "Carrinho do pedido",
        "Panier demande",
        "Warenkorb",
        "Корзина заявки",
      ),
      cartEmpty: pickUiText(
        baseLocale,
        "담은 품목이 없습니다. 위에서 자재를 담아 주세요.",
        "Cart is empty. Add items from the catalog above.",
        "Giỏ trống.",
        "カートは空です。",
        "购物车为空。",
        "El carrito está vacío.",
        "Carrinho vazio.",
        "Panier vide.",
        "Warenkorb leer.",
        "Корзина пуста.",
      ),
      manualSection: pickUiText(
        baseLocale,
        "목록에 없는 품목 직접 입력",
        "Enter an item not in the list",
        "Nhập thủ công",
        "一覧にない品目",
        "手动添加列表外物料",
        "Artículo manual",
        "Item manual",
        "Saisie manuelle",
        "Manuell erfassen",
        "Вручную",
      ),
      all: pickUiText(
        baseLocale,
        "전체",
        "All",
        "Tất cả",
        "すべて",
        "全部",
        "Todos",
        "Todos",
        "Tous",
        "Alle",
        "Все",
      ),
      stock: pickUiText(
        baseLocale,
        "재고",
        "Stock",
        "Tồn",
        "在庫",
        "库存",
        "Stock",
        "Estoque",
        "Stock",
        "Bestand",
        "Остаток",
      ),
      detailEdit: pickUiText(
        baseLocale,
        "상세 편집",
        "Edit details",
        "Chi tiết",
        "詳細編集",
        "详细编辑",
        "Detalle",
        "Detalhes",
        "Détail",
        "Details",
        "Подробно",
      ),
    }),
    [baseLocale]
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/branch/material-requests?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" }
      );
      const j = await res.json().catch(() => ({}));
      if (typeof j.organizationLinked === "boolean") {
        setLinkedOrg(j.organizationLinked);
      } else if (!res.ok) {
        setLinkedOrg(false);
      }
      if (!res.ok) return;
      const list = (j.requests ?? []) as typeof history;
      setHistory(
        list.filter((r) => (r as { tenant_id?: string }).tenant_id === tenantId).slice(0, 30)
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantId, locale]);

  useEffect(() => {
    if (!tenantId) {
      setLinkedOrg(false);
      return;
    }
    setLinkedOrg(null);
  }, [tenantId]);

  useEffect(() => {
    if (authLoading || !tenantId) return;
    void loadHistory();
  }, [authLoading, tenantId, loadHistory]);

  useEffect(() => {
    if (!tenantId || linkedOrg !== true) return;
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("materials")
          .select(
            "id, tenant_id, name, main_category, mid_category, unit, spec, price, color, stock, current_stock, supplier, supplier_id, memo, updated_at"
          )
          .eq("tenant_id", tenantId)
          .order("name", { ascending: true })
          .range(0, 4999);
        if (cancelled) return;
        if (error) {
          console.warn("[material-requests] catalog load", error);
          setCatalogMaterials([]);
        } else {
          setCatalogMaterials((data ?? []) as Material[]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, linkedOrg]);

  const defaultMain = materialMainOrdered[0] ?? "";

  const midForMain = useCallback(
    (main: string) => {
      const mids = CATEGORIES.mid[main] ?? [];
      const used = new Set(
        catalogMaterials.filter((m) => m.main_category === main).map((m) => m.mid_category).filter(Boolean)
      );
      return [...new Set([...mids, ...Array.from(used)])].sort((a, b) =>
        String(a).localeCompare(String(b), baseLocale)
      ) as string[];
    },
    [CATEGORIES.mid, catalogMaterials, baseLocale]
  );

  const currentMidOptions = useMemo(() => {
    if (activeMain === ALL) return [] as string[];
    return midForMain(activeMain);
  }, [activeMain, midForMain]);

  const filteredCatalog = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return catalogMaterials.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (activeMain !== ALL && (m.main_category || "") !== activeMain) return false;
      if (activeMid !== ALL && (m.mid_category || "") !== activeMid) return false;
      return true;
    });
  }, [catalogMaterials, searchTerm, activeMain, activeMid]);

  const qtyForMaterial = (id: string) => {
    const row = lines.find((l) => l.material_id === id);
    return row ? Math.max(0, Number(row.quantity) || 0) : 0;
  };

  const setQtyForMaterial = (m: Material, qty: number) => {
    const safe = Math.max(0, Math.floor(qty));
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.material_id === m.id);
      if (safe === 0) {
        if (idx < 0) return prev;
        return prev.filter((_, i) => i !== idx);
      }
      const qStr = String(safe);
      if (idx < 0) {
        const nl = lineFromMaterial(m, defaultMain);
        return [...prev, { ...nl, quantity: qStr }];
      }
      return prev.map((l, i) => (i === idx ? { ...l, quantity: qStr, name: m.name } : l));
    });
  };

  const bumpMaterial = (m: Material, delta: number) => {
    const cur = qtyForMaterial(m.id);
    setQtyForMaterial(m, cur + delta);
  };

  const applyMaterial = (key: string, materialId: string) => {
    if (!materialId || materialId === "__manual__") {
      setLines((prev) => prev.map((L) => (L.key === key ? { ...L, material_id: null } : L)));
      return;
    }
    const mat = catalogMaterials.find((x) => x.id === materialId);
    if (!mat) return;
    setLines((prev) =>
      prev.map((L) =>
        L.key === key
          ? {
              ...L,
              material_id: mat.id,
              name: mat.name,
              main_category: mat.main_category || defaultMain,
              mid_category: mat.mid_category || "",
              unit: mat.unit || "ea",
              spec: mat.spec || "",
            }
          : L
      )
    );
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((L) => (L.key === key ? { ...L, ...patch } : L)));
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((L) => L.key !== key));

  const manualLines = useMemo(() => lines.filter((l) => !l.material_id), [lines]);

  const cartLineCount = lines.filter((l) => l.name.trim()).length;
  const totalQty = lines.reduce((s, l) => s + (l.name.trim() ? Number(l.quantity) || 0 : 0), 0);
  const estTotal = lines.reduce((s, l) => {
    if (!l.name.trim() || !l.material_id) return s;
    const m = catalogMaterials.find((x) => x.id === l.material_id);
    const p = m?.price ?? 0;
    return s + p * (Number(l.quantity) || 0);
  }, 0);

  const submit = async () => {
    if (!tenantId || linkedOrg !== true) return;
    const payload = lines
      .filter((L) => L.name.trim())
      .map((L) => ({
        material_id: L.material_id,
        name: L.name.trim(),
        main_category: L.main_category.trim(),
        mid_category: L.mid_category.trim(),
        quantity: Number(L.quantity) || 1,
        unit: L.unit.trim() || "ea",
        spec: L.spec.trim() || null,
      }));

    if (payload.length === 0) {
      toast.error(
        pickUiText(
          baseLocale,
          "요청할 품목을 한 가지 이상 담아 주세요.",
          "Add at least one item to the cart.",
          "Thêm ít nhất một mặt hàng.",
          "カートに1件以上入れてください。",
          "请至少添加一项。",
          "Añada al menos un artículo.",
          "Adicione pelo menos um item.",
          "Ajoutez au moins un article.",
          "Mindestens einen Artikel hinzufügen.",
          "Добавьте хотя бы одну позицию.",
        )
      );
      return;
    }

    for (let i = 0; i < payload.length; i++) {
      const p = payload[i]!;
      if (!p.name || !p.main_category || !p.mid_category) {
        toast.error(`${i + 1}${tf.f01249}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/branch/material-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lines: payload, branch_note: branchNote, uiLocale: locale }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j?.error === "string" ? j.error : tf.f01624);
        return;
      }
      toast.success(`${tf.f01281} (${j.lineCount ?? payload.length}${tf.f02124}).`);
      setBranchNote("");
      setLines([]);
      setFullCartOpen(false);
      await loadHistory();
    } finally {
      setSubmitting(false);
    }
  };

  const renderCartBody = (compact: boolean) => (
    <div className={cn("space-y-3", compact && "max-h-[50vh] overflow-y-auto")}>
      {lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
            <ShoppingCart className="h-6 w-6 opacity-60" />
          </div>
          <p className="max-w-[16rem] text-sm leading-relaxed text-muted-foreground">{ui.cartEmpty}</p>
        </div>
      ) : (
        lines.map((line) => {
          const mids = midForMain(line.main_category);
          return (
            <div
              key={line.key}
              className="rounded-xl border border-slate-200/80 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm leading-snug break-words">{line.name || "—"}</p>
                  {line.material_id ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {line.main_category} · {line.mid_category || "—"}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive"
                  onClick={() => removeLine(line.key)}
                  aria-label="remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{tf.f00377}</span>
                <div className="flex items-center rounded-lg border bg-background">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={() => bumpMaterialFromLine(line, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    className="h-8 w-14 border-0 text-center text-sm px-0"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={() => bumpMaterialFromLine(line, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {!line.material_id ? (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">{ui.manualSection}</span>
                ) : null}
              </div>
              {!line.material_id ? (
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  <Select
                    value={line.material_id ?? "__manual__"}
                    onValueChange={(v) => {
                      if (v == null) return;
                      applyMaterial(line.key, v);
                    }}
                  >
                    <SelectTrigger className="h-9 sm:col-span-2">
                      <SelectValue placeholder={tf.f01958} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      <SelectItem value="__manual__">{tf.f00789}</SelectItem>
                      {catalogMaterials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                          {m.main_category ? ` · ${m.main_category}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={line.name}
                    onChange={(e) => updateLine(line.key, { name: e.target.value, material_id: null })}
                    placeholder={tf.f01589}
                  />
                  <Select
                    value={line.main_category || "__none__"}
                    onValueChange={(v) => {
                      if (v == null || v === "__none__") return;
                      updateLine(line.key, { main_category: v, mid_category: "", material_id: null });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={tf.f01403} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>
                        {tf.f01403}
                      </SelectItem>
                      {materialMainOrdered.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-9"
                    list={`mid-dl-${line.key}`}
                    disabled={!line.main_category}
                    placeholder={line.main_category ? tf.f01724 : tf.f01183}
                    value={line.mid_category}
                    onChange={(e) =>
                      updateLine(line.key, { mid_category: e.target.value, material_id: null })
                    }
                  />
                  <datalist id={`mid-dl-${line.key}`}>
                    {mids.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <Input
                    value={line.unit}
                    onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                    placeholder={tf.f01066}
                  />
                  <Input
                    value={line.spec}
                    onChange={(e) => updateLine(line.key, { spec: e.target.value })}
                    placeholder={tf.f01389}
                    className="sm:col-span-2"
                  />
                </div>
              ) : null}
            </div>
          );
        })
      )}
      <div className="space-y-2 pt-1">
        <Label htmlFor="bm-note" className="text-xs">
          {tf.f01623}
        </Label>
        <Textarea
          id="bm-note"
          value={branchNote}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBranchNote(e.target.value)}
          placeholder={tf.f01029}
          rows={2}
          className="resize-none text-sm"
        />
      </div>
      <Button
        type="button"
        className="w-full gap-1"
        disabled={submitting || cartLineCount === 0}
        onClick={() => void submit()}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {tf.f01280}
      </Button>
    </div>
  );

  function bumpMaterialFromLine(line: DraftLine, delta: number) {
    if (line.material_id) {
      const m = catalogMaterials.find((x) => x.id === line.material_id);
      if (m) bumpMaterial(m, delta);
      return;
    }
    const cur = Number(line.quantity) || 0;
    updateLine(line.key, { quantity: String(Math.max(0.01, cur + delta)) });
  }

  const loadingPage =
    authLoading || settingsLoading || linkedOrg === null || (linkedOrg === true && catalogLoading);

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!tenantId) {
    return null;
  }

  if (!linkedOrg) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <PageHeader title={tf.f01270} description={tf.f01854} icon={ClipboardList} />
        <Card className="mt-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">{tf.f01668}</CardTitle>
            <CardDescription>{tf.f02146}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const catalogSection = (
    <Card className="overflow-visible rounded-2xl border-border/70 bg-card shadow-md shadow-black/[0.04] ring-1 ring-black/[0.03] dark:ring-white/[0.06] dark:shadow-black/30">
      <CardHeader className="space-y-3.5 border-b border-border/50 bg-gradient-to-br from-primary/[0.06] via-muted/40 to-muted/10 py-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">{ui.catalogTitle}</CardTitle>
          <CardDescription className="text-xs leading-relaxed text-muted-foreground/90">{ui.catalogHint}</CardDescription>
        </div>
        <Tabs
          value={activeMain}
          onValueChange={(v) => {
            setActiveMain(v);
            setActiveMid(ALL);
          }}
        >
          <TabsList className="h-auto w-full min-w-0 max-w-full flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-visible rounded-2xl bg-muted/60 p-1.5 shadow-inner [scrollbar-width:thin]">
            <TabsTrigger
              value={ALL}
              className="shrink-0 grow-0 basis-auto rounded-xl px-3 py-2 text-xs leading-snug transition-all data-active:shadow-sm whitespace-nowrap"
            >
              {ui.all}
            </TabsTrigger>
            {materialMainOrdered.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="shrink-0 grow-0 basis-auto max-w-none rounded-xl px-3 py-2 text-xs leading-snug transition-all data-active:shadow-sm whitespace-nowrap"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {currentMidOptions.length > 0 ? (
          <Tabs value={activeMid} onValueChange={setActiveMid}>
            <TabsList className="h-auto w-full min-w-0 max-w-full flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-visible rounded-2xl bg-background/70 p-1.5 ring-1 ring-border/60 [scrollbar-width:thin] dark:bg-background/40">
              <TabsTrigger
                value={ALL}
                className="shrink-0 grow-0 basis-auto rounded-lg px-2.5 py-2 text-[11px] leading-snug data-active:bg-primary/15 data-active:text-primary dark:data-active:bg-primary/20 whitespace-nowrap"
              >
                {ui.all}
              </TabsTrigger>
              {currentMidOptions.map((mid) => (
                <TabsTrigger
                  key={mid}
                  value={mid}
                  className="shrink-0 grow-0 basis-auto max-w-none rounded-lg px-2.5 py-2 text-[11px] leading-snug data-active:bg-primary/15 data-active:text-primary dark:data-active:bg-primary/20 whitespace-nowrap"
                >
                  {mid}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            className="h-10 border-border/60 bg-background/90 pl-10 text-sm shadow-sm transition-shadow focus-visible:border-primary/40 focus-visible:ring-primary/15 rounded-xl"
            placeholder={tf.f01747}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden rounded-b-2xl bg-gradient-to-b from-muted/20 via-background to-muted/10 p-3 sm:p-4">
        {filteredCatalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 py-16 text-muted-foreground">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 shadow-inner">
              <Package className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-medium">{tf.f01829}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 items-start gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCatalog.map((m) => {
              const q = qtyForMaterial(m.id);
              const qtyPopoverOpen = qtyPopoverMaterialId === m.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-sm shadow-black/[0.03] backdrop-blur-sm transition-all duration-200 ease-out",
                    "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.07]",
                    q > 0 &&
                      "border-primary/45 bg-gradient-to-br from-primary/[0.07] to-primary/[0.02] shadow-md ring-1 ring-primary/20"
                  )}
                >
                  {q > 0 ? (
                    <Popover
                      open={qtyPopoverOpen}
                      onOpenChange={(open) => {
                        if (open) {
                          setQtyPopoverMaterialId(m.id);
                          setQtyDraft(String(Math.max(1, q)));
                        } else {
                          setQtyPopoverMaterialId(null);
                        }
                      }}
                    >
                      <PopoverTrigger
                        type="button"
                        className={cn(
                          "absolute right-2 top-2 z-10 flex h-8 min-w-8 items-center justify-center rounded-full px-2.5",
                          "bg-primary text-xs font-bold tabular-nums text-primary-foreground shadow-lg shadow-primary/25",
                          "ring-2 ring-background transition-transform hover:bg-primary/92 hover:shadow-xl active:scale-95"
                        )}
                        aria-label={ui.qtyLabel}
                      >
                        {q}
                      </PopoverTrigger>
                      <PopoverContent className="w-44 rounded-xl border-border/60 p-3 shadow-lg" align="end" initialFocus={false}>
                        <div className="space-y-2">
                          <Label htmlFor={`qty-${m.id}`} className="text-xs">
                            {ui.qtyLabel}
                          </Label>
                          <Input
                            id={`qty-${m.id}`}
                            type="number"
                            min={0}
                            step={1}
                            className="h-9 text-center tabular-nums"
                            value={qtyDraft}
                            onChange={(e) => setQtyDraft(e.target.value)}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const n = Math.max(0, Math.floor(Number(qtyDraft.replace(/,/g, "")) || 0));
                              setQtyForMaterial(m, n);
                              setQtyPopoverMaterialId(null);
                            }}
                          >
                            {ui.qtyApply}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full flex-col rounded-2xl px-2 py-1.5 text-left outline-none ring-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-muted/35 group-hover:bg-muted/15"
                    onClick={() => bumpMaterial(m, 1)}
                  >
                    <div className={cn("mb-0.5 flex items-center gap-1", q > 0 && "pr-10")}>
                      <Badge
                        variant="secondary"
                        className="h-4 max-w-[92%] truncate border-0 bg-muted/90 px-1.5 text-[9px] font-medium leading-none text-muted-foreground shadow-none"
                      >
                        {m.mid_category || m.main_category || "—"}
                      </Badge>
                    </div>
                    <h3 className="line-clamp-3 text-[11px] font-semibold leading-tight tracking-tight text-foreground sm:text-xs">
                      {m.name}
                    </h3>
                    {(m.spec || m.color) ? (
                      <p className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-muted-foreground/90">
                        {m.spec || ""}
                        {m.color ? `${m.spec ? " · " : ""}${m.color}` : ""}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-1 gap-y-0 border-t border-border/40 pt-1 leading-none">
                      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                        {ui.stock} {m.stock ?? m.current_stock ?? 0}
                      </span>
                      {m.price > 0 ? (
                        <span className="shrink-0 text-[11px] font-bold tabular-nums text-primary">
                          ₩{m.price.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-28 lg:pb-8">
      <PageHeader title={tf.f01270} description={tf.f01745} icon={ClipboardList} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={manualOpen ? "secondary" : "outline"}
          size="sm"
          className="rounded-xl shadow-sm"
          onClick={() => {
            if (!manualOpen) {
              setManualOpen(true);
              setLines((p) => {
                const hasBlankManual = p.some((l) => !l.material_id && !l.name.trim());
                if (hasBlankManual) return p;
                return [...p, newLine()];
              });
            } else {
              setManualOpen(false);
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          {ui.manualSection}
        </Button>
      </div>

      {manualOpen && manualLines.length > 0 ? (
        <Card className="border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{ui.manualSection}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {manualLines.map((line) => {
              const mids = midForMain(line.main_category);
              return (
                <div key={line.key} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{tf.f00789}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => removeLine(line.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select
                    value={line.material_id ?? "__manual__"}
                    onValueChange={(v) => {
                      if (v == null) return;
                      applyMaterial(line.key, v);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={tf.f01958} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      <SelectItem value="__manual__">{tf.f00789}</SelectItem>
                      {catalogMaterials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={line.name}
                    onChange={(e) => updateLine(line.key, { name: e.target.value, material_id: null })}
                    placeholder={tf.f01589}
                  />
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Select
                      value={line.main_category || "__none__"}
                      onValueChange={(v) => {
                        if (v == null || v === "__none__") return;
                        updateLine(line.key, { main_category: v, mid_category: "", material_id: null });
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={tf.f01403} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>
                          {tf.f01403}
                        </SelectItem>
                        {materialMainOrdered.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-9"
                      list={`mid-manual-${line.key}`}
                      disabled={!line.main_category}
                      placeholder={line.main_category ? tf.f01724 : tf.f01183}
                      value={line.mid_category}
                      onChange={(e) =>
                        updateLine(line.key, { mid_category: e.target.value, material_id: null })
                      }
                    />
                    <datalist id={`mid-manual-${line.key}`}>
                      {mids.map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    />
                    <Input
                      value={line.unit}
                      onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                      placeholder={tf.f01066}
                    />
                  </div>
                  <Input
                    value={line.spec}
                    onChange={(e) => updateLine(line.key, { spec: e.target.value })}
                    placeholder={tf.f01389}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* 데스크톱: 좌 카탈로그 / 우 장바구니 */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {catalogSection}
          <HistoryCard
            history={history}
            historyLoading={historyLoading}
            tf={tf}
            dfLoc={dfLoc}
          />
        </div>
        <div className="sticky top-4 space-y-3">
          <Card className="overflow-hidden rounded-2xl border-border/70 shadow-md shadow-black/[0.04] ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
            <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/50 to-background py-3.5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                </span>
                {ui.cartTitle}
              </CardTitle>
              {cartLineCount > 0 ? (
                <CardDescription className="text-xs">
                  {cartLineCount}
                  {tf.f02124} · {totalQty}
                  {tf.f00033}
                  {estTotal > 0 ? ` · ₩${estTotal.toLocaleString()}` : ""}
                </CardDescription>
              ) : (
                <CardDescription className="text-xs">{ui.cartEmpty}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-4">{renderCartBody(false)}</CardContent>
          </Card>
        </div>
      </div>

      {/* 모바일·태블릿: 카탈로그 스크롤 + 하단 장바구니 바 */}
      <div className="lg:hidden space-y-4">
        {catalogSection}
        <HistoryCard history={history} historyLoading={historyLoading} tf={tf} dfLoc={dfLoc} />
        {cartLineCount > 0 ? <div className="h-[200px]" aria-hidden /> : null}
      </div>

      {cartLineCount > 0 ? (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[105] border-t border-border/60 bg-card/95 shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.12)] backdrop-blur-md pb-[env(safe-area-inset-bottom)] dark:shadow-[0_-8px_28px_-4px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={() => setMobileCartExpanded((e) => !e)}
            className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-muted/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart className="h-5 w-5 text-primary shrink-0" />
              <span className="font-bold text-sm truncate">{ui.cartTitle}</span>
              <Badge variant="default" className="text-[10px] shrink-0">
                {cartLineCount}
                {tf.f02124} {totalQty}
                {tf.f00033}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {estTotal > 0 ? (
                <span className="text-sm font-bold text-primary">₩{estTotal.toLocaleString()}</span>
              ) : null}
              {mobileCartExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {mobileCartExpanded ? (
            <div className="border-t max-h-[45vh] overflow-y-auto px-3 py-2 space-y-2">
              {renderCartBody(true)}
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setFullCartOpen(true)}>
                {ui.detailEdit}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {fullCartOpen ? (
        <div className="lg:hidden fixed inset-0 z-[110] flex flex-col bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {ui.cartTitle}
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setFullCartOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{renderCartBody(false)}</div>
        </div>
      ) : null}
    </div>
  );
}

function HistoryCard({
  history,
  historyLoading,
  tf,
  dfLoc,
}: {
  history: Array<{ id: string; status: string; created_at: string; branch_note: string | null; lines: unknown[] }>;
  historyLoading: boolean;
  tf: Record<string, string>;
  dfLoc: Locale;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{tf.f01667}</CardTitle>
        <CardDescription>{tf.f02007}</CardDescription>
      </CardHeader>
      <CardContent>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{tf.f01521}</p>
        ) : (
          <div className="space-y-6">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-50/80 dark:bg-slate-900/50 text-sm">
                  <Badge variant="secondary">{h.status}</Badge>
                  <span className="text-muted-foreground tabular-nums">
                    {format(new Date(h.created_at), "Pp", { locale: dfLoc })}
                  </span>
                  {h.branch_note ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[240px]">{h.branch_note}</span>
                  ) : null}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tf.f02124}</TableHead>
                      <TableHead>{tf.f01074}</TableHead>
                      <TableHead>{tf.f01887}</TableHead>
                      <TableHead className="text-right">{tf.f00377}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(h.lines as Array<Record<string, unknown>>).map((ln) => (
                      <TableRow key={String(ln.id)}>
                        <TableCell className="font-medium">{String(ln.name)}</TableCell>
                        <TableCell className="text-sm">{String(ln.main_category ?? "—")}</TableCell>
                        <TableCell className="text-sm">{String(ln.mid_category ?? "—")}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {String(ln.quantity)} {String(ln.unit ?? "")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
