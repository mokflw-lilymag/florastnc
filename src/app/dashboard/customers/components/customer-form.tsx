"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Customer, CustomerData, CustomerAnniversaryInput } from "@/types/customer";
import { PENDING_ANNIVERSARY_LABEL } from "@/lib/revenue/order-anniversary-register";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { cn } from "@/lib/utils";

interface CustomerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerData) => void | Promise<void>;
  customer?: Customer | null;
  isSaving?: boolean;
}

const INDIVIDUAL_ANNIVERSARY_PRESETS = [
  "결혼기념일",
  "배우자 생일",
  "부모님 생신",
  "자녀 생일",
  "친구 생일",
  "본인 생일",
  "첫 방문일",
  "기타",
] as const;

const COMPANY_ANNIVERSARY_PRESETS = [
  "창립기념일",
  "대표 생일",
  "임원 생일",
  "거래처 기념일",
  "행사·오픈일",
  "직원 생일",
  "기타",
] as const;

function emptyAnniversary(label = ""): CustomerAnniversaryInput {
  return { label, anniversary_date: "", recurring_yearly: true };
}

export function CustomerForm({ isOpen, onOpenChange, onSubmit, customer, isSaving = false }: CustomerFormProps) {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const phContact = pickUiText(
    baseLocale,
    "010-0000-0000",
    "+1 555-000-0000",
    "0909 000 000",
    "090-0000-0000",
    "138-0000-0000",
    "+34 600 000 000",
    "+55 11 90000-0000",
    "+33 6 00 00 00 00",
    "+49 151 00000000",
    "+7 900 000-00-00",
  );
  const phEmail = pickUiText(
    baseLocale,
    "example@email.com",
    "you@example.com",
    "email@company.com",
    "info@yourshop.jp",
    "lianxi@yourshop.cn",
    "cliente@tutienda.com",
    "cliente@sualoja.com",
    "client@boutique.com",
    "kunde@beispiel.de",
    "klient@primer.ru",
  );
  const [formData, setFormData] = useState<CustomerData>({
    name: "",
    contact: "",
    type: "individual",
    company_name: "",
    department: "",
    email: "",
    address: "",
    grade: tf.f00525,
    points: 0,
    memo: "",
    marketing_consent: false,
    anniversaries: [],
    point_adjustment_reason: "",
  });
  const [baselinePoints, setBaselinePoints] = useState(0);

  // Mandatory Consents (only needed when creating a new customer)
  const [ageConsent, setAgeConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  useEffect(() => {
    const t = getMessages(locale).tenantFlows;
    const resetForm = (anniversaries: CustomerAnniversaryInput[] = []) => ({
      name: "",
      contact: "",
      type: "individual" as const,
      company_name: "",
      department: "",
      email: "",
      address: "",
      grade: t.f00525,
      points: 0,
      memo: "",
      marketing_consent: false,
      anniversaries,
      point_adjustment_reason: "",
    });

    if (!isOpen) return;

    if (customer) {
      const currentPoints = customer.points || 0;
      setBaselinePoints(currentPoints);
      setFormData({
        name: customer.name,
        contact: customer.contact || "",
        type: customer.type,
        company_name: customer.company_name || "",
        department: customer.department || "",
        email: customer.email || "",
        address: customer.address || "",
        grade: customer.grade || t.f00525,
        points: currentPoints,
        memo: customer.memo || "",
        marketing_consent: customer.marketing_consent ?? false,
        anniversaries: [],
        point_adjustment_reason: "",
      });

      fetch(`/api/revenue/anniversary?customerId=${customer.id}`)
        .then((res) => res.json())
        .then((json) => {
          const rows = (json.anniversaries ?? []) as CustomerAnniversaryInput[];
          setFormData((prev) => ({
            ...prev,
            anniversaries: rows.map((row) => ({
              id: row.id,
              label: row.label ?? "",
              anniversary_date: row.anniversary_date ?? "",
              recurring_yearly: row.recurring_yearly ?? true,
            })),
          }));
        })
        .catch(() => {});
    } else {
      setBaselinePoints(0);
      setFormData(resetForm());
      setAgeConsent(false);
      setPrivacyConsent(false);
    }
  }, [customer, isOpen, locale]);

  const anniversaryPresets =
    formData.type === "company" ? COMPANY_ANNIVERSARY_PRESETS : INDIVIDUAL_ANNIVERSARY_PRESETS;

  const addAnniversary = (label = "") => {
    setFormData((prev) => ({
      ...prev,
      anniversaries: [...(prev.anniversaries ?? []), emptyAnniversary(label)],
    }));
  };

  const updateAnniversary = (index: number, patch: Partial<CustomerAnniversaryInput>) => {
    setFormData((prev) => ({
      ...prev,
      anniversaries: (prev.anniversaries ?? []).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const removeAnniversary = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      anniversaries: (prev.anniversaries ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!customer) {
      if (!ageConsent) {
        toast.error("만 14세 이상 확인에 동의해주세요.");
        return;
      }
      if (!privacyConsent) {
        toast.error("개인정보 수집 및 이용에 동의해주세요.");
        return;
      }
    }

    const currentPoints = formData.points ?? 0;
    const pointDelta = currentPoints - baselinePoints;
    const reason = (formData.point_adjustment_reason ?? "").trim();

    if (pointDelta !== 0 && !reason) {
      toast.error(
        pickUiText(
          baseLocale,
          "포인트를 변경할 때는 적립/차감 사유를 입력해 주세요.",
          "Please enter a reason when changing points.",
        ),
      );
      return;
    }

    if (!customer && currentPoints > 0 && !reason) {
      toast.error(
        pickUiText(
          baseLocale,
          "초기 포인트를 설정할 때는 사유를 입력해 주세요.",
          "Please enter a reason for the initial points.",
        ),
      );
      return;
    }

    await onSubmit({
      ...formData,
      point_adjustment_reason: reason,
      point_adjustment_idempotency_key: crypto.randomUUID(),
    });
  };

  const currentPoints = formData.points ?? 0;
  const pointDelta = currentPoints - baselinePoints;
  const showPointReason =
    pointDelta !== 0 || (!customer && currentPoints > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {customer ? tf.f00070 : tf.f00342}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {tf.f00084}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-slate-700 font-medium">{tf.f00076} <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-name"
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={tf.f00456}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{tf.f00066}</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={val => setFormData(prev => ({ ...prev, type: val as any }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{tf.f00028}</SelectItem>
                    <SelectItem value="company">{tf.f00109}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-contact" className="text-slate-700 font-medium">{tf.f00444} <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-contact"
                  value={formData.contact} 
                  onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder={phContact}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email" className="text-slate-700 font-medium">{tf.f00504}</Label>
                <Input 
                  id="customer-email"
                  type="email"
                  value={formData.email || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={phEmail}
                />
              </div>
            </div>

            {formData.type === 'company' && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-slate-700 font-medium">{tf.f00779}</Label>
                  <Input 
                    id="company-name"
                    value={formData.company_name || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder={tf.f00449}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-slate-700 font-medium">{tf.f00296}</Label>
                  <Input 
                    id="department"
                    value={formData.department || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder={tf.f00454}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-700 font-medium">{tf.f00650}</Label>
              <Input 
                id="address"
                value={formData.address || ""} 
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder={tf.f00316}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{tf.f00062}</Label>
                <Select 
                  value={formData.grade || tf.f00525} 
                  onValueChange={val => setFormData(prev => ({ ...prev, grade: val }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={tf.f00525}>{tf.f00525}</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="VVIP">VVIP</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-points" className="text-slate-700 font-medium">{tf.f00728}</Label>
                <Input 
                  id="customer-points"
                  type="number"
                  min={0}
                  value={formData.points === undefined ? "" : formData.points} 
                  onChange={e => setFormData(prev => ({ ...prev, points: e.target.value ? parseInt(e.target.value) : 0 }))}
                  placeholder={tf.f00453}
                />
                {customer && pointDelta !== 0 && (
                  <p className={cn(
                    "text-xs font-medium",
                    pointDelta > 0 ? "text-emerald-600" : "text-rose-600",
                  )}>
                    {pointDelta > 0 ? "+" : ""}{pointDelta.toLocaleString()}P{" "}
                    {pickUiText(baseLocale, "변경", "change")}
                    {" "}({baselinePoints.toLocaleString()}P → {currentPoints.toLocaleString()}P)
                  </p>
                )}
              </div>
            </div>

            {showPointReason && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <Label htmlFor="point-adjustment-reason" className="text-slate-800 font-semibold">
                  {pickUiText(baseLocale, "적립/차감 사유", "Earn / deduct reason")}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Textarea
                  id="point-adjustment-reason"
                  value={formData.point_adjustment_reason ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, point_adjustment_reason: e.target.value }))
                  }
                  placeholder={pickUiText(
                    baseLocale,
                    "예: 선불 10만원 충전, 오입력 정정, VIP 감사 포인트",
                    "e.g. Prepaid top-up, correction, VIP bonus",
                  )}
                  className="min-h-[72px] resize-none bg-white"
                />
                <p className="text-[11px] text-amber-900/70">
                  {pickUiText(
                    baseLocale,
                    "입력한 내용이 포인트 내역에 그대로 표시됩니다.",
                    "This text appears as-is in point history.",
                  )}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="memo" className="text-slate-700 font-medium">{tf.f00197}</Label>
              <Textarea 
                id="memo"
                value={formData.memo || ""} 
                onChange={e => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                placeholder={tf.f00721}
                className="resize-none h-20"
              />
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {pickUiText(baseLocale, "매출 엔진 · 기념일 (선택)", "Revenue · anniversaries (optional)")}
                  </p>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    {pickUiText(
                      baseLocale,
                      formData.type === "company"
                        ? "창립기념일, 거래처 기념일, 임원 생일 등 여러 날짜를 등록할 수 있어요."
                        : "결혼기념일, 가족·친구 생일 등 기억하고 싶은 날을 모두 등록할 수 있어요.",
                      formData.type === "company"
                        ? "Add founding days, partner milestones, executive birthdays, and more."
                        : "Add wedding anniversaries, family birthdays, friend birthdays, and more.",
                    )}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => addAnniversary()}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {pickUiText(baseLocale, "추가", "Add")}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="marketing-consent"
                  checked={formData.marketing_consent ?? false}
                  onCheckedChange={(v) =>
                    setFormData((prev) => ({ ...prev, marketing_consent: v === true }))
                  }
                />
                <Label htmlFor="marketing-consent" className="text-sm font-normal cursor-pointer">
                  {pickUiText(baseLocale, "마케팅·기념일 알림 수신 동의 (선택)", "Marketing & anniversary alerts (optional)")}
                </Label>
                <p className="text-[11px] text-emerald-800/70 pl-6">
                  {pickUiText(
                    baseLocale,
                    "체크하지 않아도 고객 저장은 됩니다. 동의한 고객만 매출 캘린더 문자 대상입니다.",
                    "Saving works without this. Only opted-in customers receive campaign messages.",
                  )}
                </p>
              </div>

              {!customer && (
                <div className="flex flex-col gap-3 pt-2 mt-4 border-t border-emerald-100/50">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="age-consent"
                      checked={ageConsent}
                      onCheckedChange={(v) => setAgeConsent(v === true)}
                    />
                    <Label htmlFor="age-consent" className="text-sm font-medium cursor-pointer">
                      (필수) 만 14세 이상입니다.
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="privacy-consent"
                      checked={privacyConsent}
                      onCheckedChange={(v) => setPrivacyConsent(v === true)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="privacy-consent" className="text-sm font-medium cursor-pointer">
                        (필수) 개인정보 수집 및 이용 동의
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        수집 항목: 이름, 연락처 (선택 시 이메일, 생년월일 등)<br />
                        수집 목적: 고객 식별, 예약/주문 내역 관리 및 서비스 제공<br />
                        보유 기간: 회원 탈퇴 또는 동의 철회 시까지
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(formData.anniversaries ?? []).length === 0 ? (
                <div className="flex flex-wrap gap-2">
                  {anniversaryPresets.slice(0, 4).map((label) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => addAnniversary(label)}
                    >
                      + {label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(formData.anniversaries ?? []).map((row, index) => (
                    <div key={row.id ?? `new-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">{pickUiText(baseLocale, "기념일 이름", "Label")}</Label>
                        <Input
                          list={`anniversary-presets-${index}`}
                          value={row.label ?? ""}
                          onChange={(e) => updateAnniversary(index, { label: e.target.value })}
                          placeholder={pickUiText(baseLocale, "결혼기념일", "Anniversary")}
                          className={row.label === PENDING_ANNIVERSARY_LABEL ? "border-amber-400 bg-amber-50/80" : undefined}
                        />
                        <datalist id={`anniversary-presets-${index}`}>
                          {anniversaryPresets.map((label) => (
                            <option key={label} value={label} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{pickUiText(baseLocale, "날짜", "Date")}</Label>
                        <Input
                          type="date"
                          value={row.anniversary_date ?? ""}
                          onChange={(e) => updateAnniversary(index, { anniversary_date: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-500"
                        onClick={() => removeAnniversary(index)}
                        aria-label={pickUiText(baseLocale, "삭제", "Remove")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost">{tf.f00702}</Button>} />
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
              {isSaving ? pickUiText(baseLocale, "저장 중…", "Saving…") : customer ? tf.f00395 : tf.f00063}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
