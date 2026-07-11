"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  applyLineDateOverrides,
  buildDocumentLineItemsFromOrders,
  computeDocumentTotal,
  decodeLineDateOverrides,
  formatCustomerDocumentDate,
  parseDocumentDateParam,
} from "@/lib/customer-document-lines";
import { signalPrintDocumentReady } from "@/lib/print-routes";
import { useCurrency } from "@/hooks/use-currency";

function PrintContent() {
    const { symbol: currencySymbol } = useCurrency();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [recipient, setRecipient] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [type, setType] = useState<string | null>("");
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [lineDateOverrides, setLineDateOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [useVat, setUseVat] = useState(false);
  const locale = usePreferredLocale();
  const m = getMessages(locale);
  const tf = m.tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));
  const issueDateLabel = useMemo(
    () => format(issueDate, "PPP", { locale: dfLoc }),
    [issueDate, dfLoc]
  );
  const periodLabel = useMemo(() => {
    if (!periodStart || !periodEnd) return "";
    return `${format(periodStart, "PPP", { locale: dfLoc })} ~ ${format(periodEnd, "PPP", { locale: dfLoc })}`;
  }, [periodStart, periodEnd, dfLoc]);

  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    representative: m.tenantFlows.f02625,
    address: m.tenantFlows.f02626,
    contact: "",
    businessNumber: ""
  });
  useEffect(() => {
    const ids = searchParams.get("ids")?.split(",") || [];
    const manualItemsBase64 = searchParams.get("manual_items");
    const recipientParam = searchParams.get("recipient") || "";
    const companyParam = searchParams.get("company") || "";
    const contactParam = searchParams.get("contact") || "";
    const emailParam = searchParams.get("email") || "";
    const typeParam = searchParams.get("type");
    const vatParam = searchParams.get("use_vat") === "true";
    const issueDateParam = searchParams.get("issue_date");
    const periodStartParam = searchParams.get("period_start");
    const periodEndParam = searchParams.get("period_end");
    const lineDatesParam = searchParams.get("line_dates");
    
    setRecipient(recipientParam);
    setRecipientCompany(companyParam);
    setRecipientContact(contactParam);
    setRecipientEmail(emailParam);
    setType(typeParam);
    setUseVat(vatParam);
    setIssueDate(parseDocumentDateParam(issueDateParam) ?? new Date());
    setPeriodStart(parseDocumentDateParam(periodStartParam));
    setPeriodEnd(parseDocumentDateParam(periodEndParam));
    setLineDateOverrides(decodeLineDateOverrides(lineDatesParam));

    const init = async () => {
      try {
        const tasks: Promise<void>[] = [fetchBusinessInfo()];

        if (manualItemsBase64) {
          const decoded = JSON.parse(decodeURIComponent(atob(manualItemsBase64)));
          setItems(
            decoded.map((item: any) => ({
              order_date: new Date().toISOString(),
              items: [{ name: item.name, quantity: item.quantity, price: item.price }],
              summary: { total: item.quantity * item.price },
            })),
          );
        } else if (ids.length > 0) {
          tasks.push(fetchOrders(ids, recipientParam));
        }

        await Promise.all(tasks);
      } catch (err) {
        console.error("Print init error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const notifyReady = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          signalPrintDocumentReady();
          if (window.self === window.top) {
            window.print();
          }
        });
      });
    };

    void notifyReady();
    return () => {
      cancelled = true;
    };
  }, [loading]);

  const fetchBusinessInfo = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       
       const { data: profile } = await supabase
         .from('profiles')
         .select('tenant_id')
         .eq('id', user.id)
         .single();
       
       if (profile?.tenant_id) {
         const [{ data: tenant }, { data: settings }] = await Promise.all([
           supabase.from("tenants").select("name").eq("id", profile.tenant_id).single(),
           supabase
             .from("system_settings")
             .select("data")
             .eq("id", `settings_${profile.tenant_id}`)
             .single(),
         ]);
         
         if (settings?.data) {
           const d = settings.data;
           setBusinessInfo({
             name: d.siteName || tenant?.name || "",
             representative: d.representative || tf.f02625,
             address: d.address || tf.f02626,
             contact: d.contactPhone || "",
             businessNumber: d.businessNumber || ""
           });
         } else if (tenant?.name) {
           setBusinessInfo(prev => ({ ...prev, name: tenant.name }));
         }
       }
     } catch (err) {
       console.error("Error fetching business info:", err);
     }
  };

  const fetchOrders = async (ids: string[], recipientParam: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("id", ids)
        .order("order_date", { ascending: true });

      if (error) throw error;
      setItems(data || []);

      if (data?.[0] && !recipientParam) {
        const orderer = data[0].orderer as { id?: string; name?: string; contact?: string; company?: string; email?: string } | undefined;
        const customerId = data[0].customer_id || orderer?.id;
        if (customerId) {
          const { data: customer } = await supabase.from("customers").select("*").eq("id", customerId).single();
          if (customer) {
            setRecipient(customer.name);
            setRecipientCompany(customer.company_name || "");
            setRecipientContact(customer.contact || "");
            setRecipientEmail(customer.email || "");
          }
        } else if (orderer?.name) {
          setRecipient(orderer.name);
          setRecipientCompany(orderer.company || "");
          setRecipientContact(orderer.contact || "");
          setRecipientEmail(orderer.email || "");
        }
      }
    } catch (err) {
      console.error("Error fetching print data:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        {tf.f00513}
      </div>
    );
  }

  const documentType = (type === "statement" || type === "receipt" || type === "estimate"
    ? type
    : "statement") as "statement" | "receipt" | "estimate";
  const documentLabels = { deliveryFee: tf.f00259, discount: tf.f00759 };
  const baseLocale = toBaseLocale(locale);
  const flattenedItems = applyLineDateOverrides(
    buildDocumentLineItemsFromOrders(items, documentType, documentLabels),
    lineDateOverrides
  );

  const subtotal = computeDocumentTotal(items, documentType, flattenedItems);
  const vat = useVat ? Math.floor(subtotal * 0.1) : 0;
  const totalAmount = subtotal + vat;

  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          header,
          aside,
          nav,
          footer,
          [role="complementary"],
          [role="navigation"],
          .sidebar,
          .app-header,
          .quick-chat-container {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #print-document-root,
          #print-document-root * {
            visibility: visible;
          }
          #print-document-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          * {
            transition: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div
        id="print-document-root"
        className="mx-auto min-h-screen max-w-[800px] bg-white p-8 text-slate-900 font-sans print:min-h-0 print:max-w-none print:p-0"
      >
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter mb-1">
            {type === 'statement' ? tf.f00031 : type === 'estimate' ? tf.f00040 : tf.f00023}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{tf.f02621}</p>
          <p className="text-sm font-black">{issueDateLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 block">{tf.f02605}</span>
            <div className="text-xl font-black border-b-2 border-slate-200 pb-2 mb-2">
              {recipientCompany && <p className="mb-0.5">{recipientCompany}</p>}
              <div className="flex items-baseline gap-2">
                 <span className="text-sm font-bold text-slate-500">{tf.f02607}</span>
                 {recipient} <span className="text-xs font-medium text-slate-500">{tf.f02609}</span>
              </div>
            </div>
            {(recipientContact || recipientEmail) && (
              <div className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-400">
                {recipientContact && (
                  <p>
                    {tf.f00444}: {recipientContact}
                  </p>
                )}
                {recipientEmail && (
                  <p>
                    {tf.f00504}: {recipientEmail}
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-500 italic font-bold">
            {type === 'estimate'
              ? tf.f00429
              : type === 'receipt'
                ? tf.f02637
                : tf.f00428}
          </p>
        </div>
        
        <div className="border-2 border-slate-900 p-4 rounded-sm relative overflow-hidden flex flex-col justify-between">
           {/* Mock Stamp */}
           <div className="absolute top-2 right-2 w-12 h-12 border-4 border-red-500/30 rounded-full flex items-center justify-center text-red-500/30 font-black text-[10px] rotate-12 -z-0">
             {tf.f02610}
           </div>
           
           <div className="space-y-2 relative z-10 w-full">
              <span className="text-[10px] font-black uppercase text-slate-400 block">{tf.f02611}</span>
              <p className="text-sm font-black">{businessInfo.name}</p>
              <p className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">{tf.f02612}</span> {businessInfo.businessNumber}
              </p>
              <p className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">{tf.f02613}</span> {businessInfo.representative}
              </p>
              <div className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">{tf.f02614}</span> 
                <span className="leading-tight break-keep">{businessInfo.address}</span>
              </div>
              <p className="text-[10px] text-slate-600 flex gap-2">
                <span className="text-slate-400 w-14 shrink-0">{tf.f00444}</span> {businessInfo.contact}
              </p>
           </div>
        </div>
      </div>

      {type === "statement" && periodLabel && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-slate-400">{tf.f02657}</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{periodLabel}</p>
        </div>
      )}

      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
            <th className="p-3 text-left w-24">{tf.f01717}</th>
            <th className="p-3 text-left">{tf.f02618}</th>
            <th className="p-3 text-center w-16">{tf.f00377}</th>
            <th className="p-3 text-right w-32">{tf.f00148}</th>
            <th className="p-3 text-right w-32">{tf.f00097}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {flattenedItems.map((item, idx) => (
            <tr key={idx} className="text-xs font-medium">
              <td className="p-3 text-slate-500">{formatCustomerDocumentDate(item.date, baseLocale)}</td>
              <td className="p-3">
                <div className="font-bold text-slate-900">{item.name}</div>
                {item.order_number && <div className="text-[10px] text-slate-400 mt-0.5 font-mono">#{item.order_number}</div>}
              </td>
              <td className="p-3 text-center">{item.quantity}</td>
              <td className="p-3 text-right">{currencySymbol}{item.price.toLocaleString()}</td>
              <td className="p-3 text-right font-bold">{currencySymbol}{item.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {useVat && (
            <>
              <tr className="bg-slate-50 text-[11px] font-bold">
                <td colSpan={3} className="p-2 text-center border-t border-slate-200">{tf.f02615}</td>
                <td colSpan={2} className="p-2 text-right border-t border-slate-200">{currencySymbol}{subtotal.toLocaleString()}</td>
              </tr>
              <tr className="bg-slate-50 text-[11px] font-bold">
                <td colSpan={3} className="p-2 text-center border-t border-slate-200">{tf.f02616}</td>
                <td colSpan={2} className="p-2 text-right border-t border-slate-200">{currencySymbol}{vat.toLocaleString()}</td>
              </tr>
            </>
          )}
          <tr className="bg-slate-50 font-black border-t-2 border-slate-900">
            <td colSpan={3} className="p-4 text-center text-lg uppercase tracking-widest">
              {tf.f02619}{' '}
              {!useVat && <span className="text-[10px] font-medium text-slate-400 ml-2">{tf.f02620}</span>}
            </td>
            <td colSpan={2} className="p-4 text-right text-2xl italic tracking-tighter">
              {currencySymbol}{totalAmount.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      </div>
    </>
  );
}

function PrintSuspenseFallback() {
    const { symbol: currencySymbol } = useCurrency();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  return <div className="p-10 text-center">{tf.f00513}</div>;
}

export default function PrintPage() {
    const { symbol: currencySymbol } = useCurrency();
  return (
    <Suspense fallback={<PrintSuspenseFallback />}>
      <PrintContent />
    </Suspense>
  );
}
