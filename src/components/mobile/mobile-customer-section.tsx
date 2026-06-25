"use client";

import { useMemo, useState } from "react";
import { Search, User, X } from "lucide-react";
import type { Customer } from "@/types/customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPhoneNumber } from "@/lib/mobile/format-phone";
import { cn } from "@/lib/utils";
import { useMobileShopMessages } from "@/lib/mobile/use-mobile-shop-messages";

type MobileCustomerSectionProps = {
  customers: Customer[];
  customersLoading: boolean;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  ordererName: string;
  setOrdererName: (v: string) => void;
  ordererContact: string;
  setOrdererContact: (v: string) => void;
  ordererCompany: string;
  setOrdererCompany: (v: string) => void;
  ordererEmail: string;
  setOrdererEmail: (v: string) => void;
  registerCustomer: boolean;
  setRegisterCustomer: (v: boolean) => void;
  registerAnniversaryFromOrder: boolean;
  setRegisterAnniversaryFromOrder: (v: boolean) => void;
  marketingConsent: boolean;
  setMarketingConsent: (v: boolean) => void;
  hasOrdererIdentity: boolean;
  usedPoints: number;
  setUsedPoints: (v: number) => void;
  maxUsablePoints: number;
  pointRate?: number;
};

export function MobileCustomerSection({
  customers,
  customersLoading,
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  ordererName,
  setOrdererName,
  ordererContact,
  setOrdererContact,
  ordererCompany,
  setOrdererCompany,
  ordererEmail,
  setOrdererEmail,
  registerCustomer,
  setRegisterCustomer,
  registerAnniversaryFromOrder,
  setRegisterAnniversaryFromOrder,
  marketingConsent,
  setMarketingConsent,
  hasOrdererIdentity,
  usedPoints,
  setUsedPoints,
  maxUsablePoints,
  pointRate = 0,
}: MobileCustomerSectionProps) {
  const { m } = useMobileShopMessages();
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.contact.replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, "")) ||
          (c.company_name || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [customers, customerSearch]);

  const handleSelect = (c: Customer) => {
    onSelectCustomer(c);
    setCustomerSheetOpen(false);
    setCustomerSearch("");
  };

  const searchHint =
    pointRate > 0
      ? `${m.customer.searchHint} (${pointRate}%)`
      : m.customer.searchHint;

  return (
    <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-800">{m.customer.sectionTitle}</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setCustomerSheetOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          {m.customer.search}
        </Button>
      </div>

      {selectedCustomer ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900">{selectedCustomer.name}</p>
            {selectedCustomer.company_name ? (
              <p className="text-xs text-gray-600">{selectedCustomer.company_name}</p>
            ) : null}
            <p className="text-xs text-gray-500">{selectedCustomer.contact}</p>
            {selectedCustomer.marketing_consent ? (
              <p className="mt-1 text-[10px] font-bold text-emerald-600">{m.customer.marketingConsentBadge}</p>
            ) : null}
            <p className="mt-1 text-sm font-black text-emerald-700">
              {m.customer.pointsBalance.replace(
                "{{amount}}",
                `${(selectedCustomer.points ?? 0).toLocaleString()}P`,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearCustomer}
            className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-red-500"
            aria-label={m.customer.clearSelection}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed bg-gray-50 px-3 py-2 text-xs text-gray-500">
          {searchHint}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">{m.customer.companyOptional}</Label>
          <Input
            value={ordererCompany}
            onChange={(e) => setOrdererCompany(e.target.value)}
            className="h-10"
            placeholder={m.customer.companyPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">{m.customer.emailOptional}</Label>
          <Input
            type="email"
            value={ordererEmail}
            onChange={(e) => setOrdererEmail(e.target.value)}
            className="h-10"
            placeholder="example@email.com"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug -mt-1">
        {m.customer.emailHint}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-500">{m.customer.name}</Label>
          <Input
            value={ordererName}
            onChange={(e) => setOrdererName(e.target.value)}
            className="mt-1 h-10"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">{m.customer.contact}</Label>
          <Input
            value={ordererContact}
            onChange={(e) => setOrdererContact(formatPhoneNumber(e.target.value))}
            type="tel"
            className="mt-1 h-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="mobile-register-customer"
            checked={registerCustomer}
            onCheckedChange={(c) => setRegisterCustomer(!!c)}
            disabled={!!selectedCustomer}
          />
          <Label
            htmlFor="mobile-register-customer"
            className={cn("text-xs", selectedCustomer ? "text-gray-400" : "cursor-pointer")}
          >
            {m.customer.register}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="mobile-anniversary-from-order"
            checked={registerAnniversaryFromOrder}
            onCheckedChange={(c) => setRegisterAnniversaryFromOrder(!!c)}
            disabled={!marketingConsent || !hasOrdererIdentity}
          />
          <Label
            htmlFor="mobile-anniversary-from-order"
            className={cn("text-xs", hasOrdererIdentity ? "cursor-pointer" : "text-gray-400")}
          >
            {m.customer.anniversaryFromOrder}
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="mobile-marketing-consent"
          checked={marketingConsent}
          onCheckedChange={(c) => setMarketingConsent(!!c)}
        />
        <Label htmlFor="mobile-marketing-consent" className="text-xs cursor-pointer">
          {m.customer.marketingConsent}
        </Label>
      </div>

      {selectedCustomer && maxUsablePoints > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-amber-900">{m.customer.usePoints}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-amber-800"
              onClick={() => setUsedPoints(maxUsablePoints)}
            >
              {m.customer.useAllPoints}
            </Button>
          </div>
          <Input
            type="number"
            min={0}
            max={maxUsablePoints}
            value={usedPoints || ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10) || 0;
              setUsedPoints(Math.min(maxUsablePoints, Math.max(0, n)));
            }}
            className="h-10 bg-white"
          />
          <p className="text-[10px] text-amber-800/80">
            {m.customer.maxPointsHint.replace(
              "{{amount}}",
              maxUsablePoints.toLocaleString(),
            )}
          </p>
        </div>
      )}

      <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{m.customer.sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={m.customer.sheetSearchPlaceholder}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ul className="mt-4 max-h-[calc(80vh-9rem)] space-y-1 overflow-y-auto pb-8">
            {customersLoading ? (
              <li className="py-8 text-center text-sm text-gray-400">{m.customer.sheetLoading}</li>
            ) : filteredCustomers.length === 0 ? (
              <li className="py-8 text-center text-sm text-gray-400">
                {m.customer.sheetEmpty}
                <br />
                <span className="text-xs">{m.customer.sheetEmptyHint}</span>
              </li>
            ) : (
              filteredCustomers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="flex w-full flex-col rounded-xl border p-3 text-left hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    <span className="text-xs text-gray-500">
                      {c.company_name ? `${c.company_name} · ` : ""}
                      {c.contact}
                    </span>
                    <span className="mt-1 text-xs font-bold text-indigo-600">
                      {(c.points ?? 0).toLocaleString()}P
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </SheetContent>
      </Sheet>
    </section>
  );
}
