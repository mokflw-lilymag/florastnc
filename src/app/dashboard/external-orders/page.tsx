"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useEffect } from "react";
import { 
    Share2, Clock, Building2, MapPin, Settings, Check,
    Store, Info, ShoppingBag, ArrowRight, Star, ExternalLink,
    ChevronRight, Search, Sparkles, Filter, LayoutGrid, List, Package, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

const getGDriveId = (val: string) => {
    if (!val) return "";
    try {
        if (val.includes("folders/")) {
            const match = val.match(/folders\/([^/?#]+)/);
            return match ? match[1] : val;
        }
        if (val.includes("id=")) {
            const match = val.match(/id=([^&#]+)/);
            return match ? match[1] : val;
        }
        return val.trim();
    } catch (e) {
        return val;
    }
};

const EXT_CAT_ALL = "전체";
const EXT_CATEGORIES_KO = ["전체", "꽃다발", "꽃바구니", "축하화환", "근조화환", "동양란/서양란", "식물/분재"] as const;
const EXT_REGIONS_KO = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"] as const;
const EXT_CATEGORY_EN: Record<string, string> = {
    전체: "All",
    꽃다발: "Bouquet",
    꽃바구니: "Basket",
    축하화환: "Celebration wreath",
    근조화환: "Condolence wreath",
    "동양란/서양란": "Orchids",
    "식물/분재": "Plants / bonsai",
};
const EXT_REGION_EN: Record<string, string> = {
    서울: "Seoul",
    경기: "Gyeonggi",
    인천: "Incheon",
    부산: "Busan",
    대구: "Daegu",
    광주: "Gwangju",
    대전: "Daejeon",
    울산: "Ulsan",
    강원: "Gangwon",
    충북: "Chungbuk",
    충남: "Chungnam",
    전북: "Jeonbuk",
    전남: "Jeonnam",
    경북: "Gyeongbuk",
    경남: "Gyeongnam",
    제주: "Jeju",
};

/** Khu vực Hàn Quốc — tên thường dùng tiếng Việt / quốc tế */
const EXT_REGION_VI: Record<string, string> = {
    서울: "Seoul",
    경기: "Gyeonggi",
    인천: "Incheon",
    부산: "Busan",
    대구: "Daegu",
    광주: "Gwangju",
    대전: "Daejeon",
    울산: "Ulsan",
    강원: "Gangwon",
    충북: "Chungcheong Bắc",
    충남: "Chungcheong Nam",
    전북: "Jeolla Bắc",
    전남: "Jeolla Nam",
    경북: "Gyeongsang Bắc",
    경남: "Gyeongsang Nam",
    제주: "Jeju",
};

const EXT_CATEGORY_VI: Record<string, string> = {
    전체: "Tất cả",
    꽃다발: "Hoa bó",
    꽃바구니: "Giỏ hoa",
    축하화환: "Vòng hoa chúc mừng",
    근조화환: "Vòng hoa chia buồn",
    "동양란/서양란": "Lan (Đông/Tây phương)",
    "식물/분재": "Cây cảnh / bonsai",
};

function extCategoryLabel(ko: string, baseLocale: string) {
    const t = ko.trim();
    if (baseLocale === "ko") return t;
    if (baseLocale === "vi") return EXT_CATEGORY_VI[t] ?? EXT_CATEGORY_EN[t] ?? t;
    return EXT_CATEGORY_EN[t] ?? t;
}

function extCategoriesLineDisplay(raw: string, baseLocale: string) {
    return raw
        .split(",")
        .map((p) => extCategoryLabel(p, baseLocale))
        .filter(Boolean)
        .join(", ");
}

function extRegionLabel(regionKo: string, baseLocale: string) {
    const r = regionKo.trim();
    if (baseLocale === "ko") return r;
    if (baseLocale === "vi") return EXT_REGION_VI[r] ?? EXT_REGION_EN[r] ?? r;
    return EXT_REGION_EN[r] ?? r;
}

function extRegionLineDisplay(s: string, baseLocale: string) {
    if (baseLocale === "ko") return s;
    return s
        .split(",")
        .map((p) => extRegionLabel(p, baseLocale))
        .join(", ");
}

export default function ExternalOrdersPage() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
    const [loading, setLoading] = useState(true);
    const [partners, setPartners] = useState<any[]>([]);
    const [filterRegion, setFilterRegion] = useState("");
    const [filterCategory, setFilterCategory] = useState(EXT_CAT_ALL);
    const [myTenant, setMyTenant] = useState<any>(null);
    const [showTerms, setShowTerms] = useState(false);
    const [activeAlbumTab, setActiveAlbumTab] = useState(EXT_CAT_ALL);

    useEffect(() => {
        if (!tenantId) return;
        fetchPartners();
        fetchMyTenant();
    }, [tenantId]);

    const fetchMyTenant = async () => {
        if (!tenantId) return;
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single();
        if (!error && data) setMyTenant(data);
    };

    const updateMyPartnerStatus = async (updates: any) => {
        try {
            const { data, error } = await supabase.from('tenants').update(updates).eq('id', tenantId).select().single();
            if (error) throw error;
            setMyTenant((prev: any) => ({ ...prev, ...data }));
            toast.success(tf.f00568);
            fetchPartners();
        } catch (err) {
            console.error(err);
            toast.error(tf.f00439);
        }
    };

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('tenants')
                .select('*')
                .eq('can_receive_orders', true)
                .order('name');
            setPartners(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const regions = [...EXT_REGIONS_KO];
    const categories = [...EXT_CATEGORIES_KO];

    const filteredPartners = partners.filter(p => {
        const matchRegion = !filterRegion || p.partner_region?.includes(filterRegion);
        const matchCategory = filterCategory === EXT_CAT_ALL || p.partner_category?.includes(filterCategory);
        return matchRegion && matchCategory;
    });

    const premiumPartners = filteredPartners.filter(p => p.is_premium);
    const generalPartners = filteredPartners.filter(p => !p.is_premium);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8 pb-32">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">
                                {tr("파트너 마켓플레이스", "Partner marketplace", "Chợ đối tác")}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            {tf.f00547} <br/>
                            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{tf.f00750}</span>
                        </h1>
                        <p className="text-slate-400 text-sm md:text-base font-light max-w-xl">
                            {tf.f00039} <br/>
                            {tf.f00507}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Link href="/dashboard/external-orders/received">
                            <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold backdrop-blur-md">
                                <Package className="mr-3 w-5 h-5 opacity-60" /> {tf.f00398}
                            </Button>
                        </Link>
                        <Button 
                            className={cn(
                                "h-14 px-8 rounded-2xl font-bold transition-all duration-500",
                                myTenant?.can_receive_orders 
                                    ? "bg-white text-indigo-900 shadow-xl shadow-white/10 hover:scale-105" 
                                    : "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500"
                            )}
                            onClick={() => {
                                if (!myTenant?.can_receive_orders) setShowTerms(true);
                                else updateMyPartnerStatus({ can_receive_orders: false });
                            }}
                        >
                            {myTenant?.can_receive_orders ? <><Check className="mr-3 w-5 h-5" /> {tf.f00122}</> : tf.f00123}
                        </Button>
                        
                        {myTenant?.can_receive_orders && (
                            <Dialog>
                                <DialogTrigger render={
                                    <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold backdrop-blur-md">
                                        <Settings className="mr-3 w-5 h-5 opacity-60" /> {tf.f00749}
                                    </Button>
                                } />
                                <DialogContent className="max-w-2xl rounded-[2.5rem] border-0 shadow-3xl p-0 overflow-hidden bg-white">
                                    <div className="bg-slate-900 p-8 text-white">
                                        <h3 className="text-xl font-bold">{tf.f00125}</h3>
                                        <p className="text-slate-400 text-xs mt-1">{tf.f00237}</p>
                                    </div>
                                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{tf.f00150}</label>
                                            <Input id="portfolio-id" placeholder={tf.f00783} defaultValue={myTenant?.portfolio_gdrive_id || ''} className="rounded-xl h-12 bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f00120}</label>
                                                <Input id="bouquet-id" placeholder={tf.f00744} defaultValue={myTenant?.gdrive_bouquet_id || ''} className="rounded-lg h-10 bg-white border-slate-200 text-xs" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f00121}</label>
                                                <Input id="basket-id" placeholder={tf.f00744} defaultValue={myTenant?.gdrive_basket_id || ''} className="rounded-lg h-10 bg-white border-slate-200 text-xs" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f00700}</label>
                                                <Input id="wreath-id" placeholder={tf.f00744} defaultValue={myTenant?.gdrive_wreath_id || ''} className="rounded-lg h-10 bg-white border-slate-200 text-xs" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f00093}</label>
                                                <Input id="condolence-id" placeholder={tf.f00744} defaultValue={myTenant?.gdrive_condolence_id || ''} className="rounded-lg h-10 bg-white border-slate-200 text-xs" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f00161}</label>
                                                <Input id="orchid-id" placeholder={tf.f00744} defaultValue={myTenant?.gdrive_orchid_id || ''} className="rounded-lg h-10 bg-white border-slate-200 text-xs" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f00414}</label>
                                                <Input id="plant-id" placeholder={tf.f00744} defaultValue={myTenant?.gdrive_plant_id || ''} className="rounded-lg h-10 bg-white border-slate-200 text-xs" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 animate-in fade-in slide-in-from-left duration-500">
                                                    <div className="w-1 h-1 bg-indigo-500 rounded-full" /> {tf.f00748}
                                                </label>
                                                <Input id="partner-desc" placeholder={tf.f00452} defaultValue={myTenant?.partner_description || ''} className="rounded-xl h-12 bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 animate-in fade-in slide-in-from-left duration-700">
                                                    <div className="w-1 h-1 bg-indigo-500 rounded-full" /> {tf.f00445}
                                                </label>
                                                <Input id="contact-phone" placeholder={tf.f00451} defaultValue={myTenant?.contact_phone || ''} className="rounded-xl h-12 bg-slate-50 border-0 focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                                             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
                                             <div className="relative z-10 space-y-4">
                                                 <div className="flex items-center gap-3">
                                                     <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg">
                                                        <Sparkles className="w-5 h-5" />
                                                     </div>
                                                     <h4 className="font-black text-lg">{tf.f00433}</h4>
                                                 </div>
                                                 <div className="grid grid-cols-1 gap-3">
                                                     <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 group hover:bg-white/10 transition-all">
                                                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">01</div>
                                                         <p className="text-[11px] font-light leading-relaxed"><span className="text-indigo-400 font-black">{tf.f00722}</span> {tf.f00723}{" "}
                                                         <span className="bg-white/10 px-2 py-0.5 rounded font-bold text-indigo-300">
                                                            {tr("[상품명] 가격.jpg", "[Product name] price.jpg", "[Tên sản phẩm] giá.jpg")}
                                                         </span> {tf.f00494}</p>
                                                     </div>
                                                     <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 group hover:bg-white/10 transition-all">
                                                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">02</div>
                                                         <p className="text-[11px] font-light leading-relaxed"><span className="text-indigo-400 font-black">{tf.f00713}</span> {tf.f00561} <span className="text-amber-400 font-bold">{tf.f00143}</span> {tf.f00300}</p>
                                                     </div>
                                                 </div>
                                             </div>
                                        </div>

                                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                            <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                            <p className="text-[11px] text-indigo-700 leading-relaxed">
                                                {tf.f00022}
                                            </p>
                                        </div>

                                        <DialogClose render={
                                            <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 mt-4" onClick={async () => {
                                                const updates = {
                                                    portfolio_gdrive_id: getGDriveId((document.getElementById('portfolio-id') as HTMLInputElement).value),
                                                    gdrive_bouquet_id: getGDriveId((document.getElementById('bouquet-id') as HTMLInputElement).value),
                                                    gdrive_basket_id: getGDriveId((document.getElementById('basket-id') as HTMLInputElement).value),
                                                    gdrive_wreath_id: getGDriveId((document.getElementById('wreath-id') as HTMLInputElement).value),
                                                    gdrive_condolence_id: getGDriveId((document.getElementById('condolence-id') as HTMLInputElement).value),
                                                    gdrive_orchid_id: getGDriveId((document.getElementById('orchid-id') as HTMLInputElement).value),
                                                    gdrive_plant_id: getGDriveId((document.getElementById('plant-id') as HTMLInputElement).value),
                                                    partner_description: (document.getElementById('partner-desc') as HTMLInputElement).value,
                                                    contact_phone: (document.getElementById('contact-phone') as HTMLInputElement).value
                                                };
                                                await updateMyPartnerStatus(updates);
                                            }}>{tf.f00361}</Button>
                                        } />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </div>

            {/* Terms Dialog */}
            <Dialog open={showTerms} onOpenChange={setShowTerms}>
                <DialogContent className="max-w-xl rounded-[3rem] p-0 overflow-hidden border-0 shadow-3xl bg-white">
                    <div className="bg-indigo-600 p-10 text-white">
                        <Badge className="bg-white/20 text-white border-0 mb-4 px-4 py-1.5 rounded-full font-bold">
                            {tr("파트너 정책", "Partner policy", "Chính sách đối tác")}
                        </Badge>
                        <h3 className="text-3xl font-black leading-tight">{tf.f00548} <br/>{tf.f00673}</h3>
                    </div>
                    <div className="p-10 space-y-6 max-h-[50vh] overflow-y-auto bg-slate-50/50">
                        {[
                            { title: tf.f00571, desc: tf.f00405 },
                            { title: tf.f00572, desc: tf.f00716 },
                            { title: tf.f00577, desc: tf.f00213 }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-5 items-start p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black shrink-0">{idx + 1}</div>
                                <div>
                                    <h5 className="font-bold text-slate-800">{item.title}</h5>
                                    <p className="text-xs text-slate-500 font-light mt-1">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-10 bg-white flex gap-4">
                        <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold text-slate-400" onClick={() => setShowTerms(false)}>{tf.f00702}</Button>
                        <Button className="flex-[2] h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100" onClick={() => { setShowTerms(false); updateMyPartnerStatus({ can_receive_orders: true }); }}>{tf.f00438}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Filter Bar */}
            <div className="sticky top-6 z-40 bg-white/70 backdrop-blur-2xl border border-white/50 p-3 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 grow scrollbar-hide">
                    <Button 
                        variant={!filterRegion ? "default" : "ghost"} 
                        size="sm" 
                        className={cn("rounded-full px-6 h-11 text-[11px] font-bold transition-all", !filterRegion && "bg-slate-900 text-white shadow-xl shadow-slate-200")}
                        onClick={() => setFilterRegion("")}
                    >
                        {tf.f00546}
                    </Button>
                    {regions.map(r => (
                        <Button 
                            key={r} 
                            variant={filterRegion === r ? "default" : "ghost"} 
                            size="sm" 
                            className={cn("rounded-full px-6 h-11 text-[11px] font-bold shrink-0 transition-all", filterRegion === r && "bg-slate-900 text-white shadow-xl shadow-slate-200")}
                            onClick={() => setFilterRegion(r)}
                        >
                            {extRegionLabel(r, baseLocale)}
                        </Button>
                    ))}
                </div>
                <div className="h-8 w-px bg-slate-200 hidden md:block" />
                <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
                    <div className="relative">
                        <select 
                            className="appearance-none bg-transparent h-9 pl-4 pr-10 rounded-full text-[11px] font-black text-slate-700 focus:outline-none cursor-pointer"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            {categories.map(c => <option key={c} value={c}>{extCategoryLabel(c, baseLocale)}</option>)}
                        </select>
                        <Filter className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Premium Partners Section */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Star fill="currentColor" className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {tr(
                                    "프리미엄 추천 파트너",
                                    "Premium partner picks",
                                    "Đối tác cao cấp được đề xuất",
                                )}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                {tr(
                                    "관리자가 검증한 최우수 퀄리티의 파트너사입니다.",
                                    "Partners verified by our team for top-tier quality.",
                                    "Đối tác đã được quản trị viên xác minh với chất lượng hàng đầu.",
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {premiumPartners.length === 0 ? (
                    <div className="h-64 rounded-[3rem] border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-slate-300">
                        <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-bold">{tf.f00585}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                        {premiumPartners.map(p => (
                            <PremiumCard key={p.id} partner={p} isMyStore={p.id === tenantId} activeTab={activeAlbumTab} setTab={setActiveAlbumTab} />
                        ))}
                    </div>
                )}
            </div>

            {/* General Partners List */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1.5rem] bg-slate-200 flex items-center justify-center text-slate-500">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{tf.f00527}</h3>
                            <p className="text-xs text-slate-400 font-medium">{generalPartners.length}{tf.f00027}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-6">{tf.f00193}</th>
                                    <th className="px-10 py-6">{tf.f00662}</th>
                                    <th className="px-10 py-6 text-center">{tf.f00186}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {generalPartners.map(p => (
                                    <GeneralRow key={p.id} partner={p} isMyStore={p.id === tenantId} activeTab={activeAlbumTab} setTab={setActiveAlbumTab} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* Subcomponents for Premium Card and Table Row */

function PremiumCard({ partner, isMyStore, activeTab, setTab }: any) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
    return (
        <Card className="relative overflow-hidden group border-0 shadow-xl hover:shadow-3xl transition-all duration-700 rounded-[3rem] bg-white flex flex-col h-full hover:-translate-y-2">
            <div className="absolute top-0 right-0 p-4 z-10">
                {isMyStore && (
                    <Badge className="bg-indigo-600 text-white rounded-full px-3 py-1 font-black text-[9px] shadow-lg">
                        {tr("내 매장", "My store", "Cửa hàng của tôi")}
                    </Badge>
                )}
            </div>
            
            <div className="p-8 pb-4 flex-1 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-110 transition-transform duration-700">
                        {partner.logo_url ? <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-contain p-3" /> : <Building2 className="w-8 h-8 text-slate-200" />}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 pt-2">
                        <Badge className="bg-amber-100 text-amber-700 border-0 font-black px-2.5 py-1 text-[9px] rounded-lg tracking-tight uppercase">
                            {tr("프리미엄", "Premium", "Cao cấp")}
                        </Badge>
                        <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400 font-bold">
                            <div className="flex items-center gap-1">
                                <MapPin size={10} /> {partner.partner_region ? extRegionLineDisplay(partner.partner_region, baseLocale) : tf.f00546}
                            </div>
                            {partner.contact_phone && (
                                <div className="text-indigo-500 font-black animate-in fade-in slide-in-from-right duration-1000">
                                    {partner.contact_phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{partner.name}</h4>
                    <p className="text-[11px] text-slate-500 font-light leading-relaxed line-clamp-3 h-[3.3rem] opacity-70 italic">
                        {partner.partner_description || tf.f00430}
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {partner.partner_category?.split(',').map((c: string) => {
                        const t = c.trim();
                        if (!t) return null;
                        return <Badge key={t} variant="outline" className="text-[9px] font-bold text-indigo-500 border-indigo-100 bg-indigo-50/50 rounded-full">{extCategoryLabel(t, baseLocale)}</Badge>;
                    })}
                    {!partner.partner_category && <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-100 rounded-full">{tf.f00528}</Badge>}
                </div>
            </div>

            <div className="p-8 pt-0 mt-auto">
                <div className="flex items-center gap-3">
                    {partner.portfolio_gdrive_id ? (
                        <AlbumDialog partner={partner} activeTab={activeTab} setTab={setTab} />
                    ) : (
                        <div className="flex-1 h-14 flex items-center justify-center text-[10px] text-slate-300 italic bg-slate-50 rounded-2xl border border-slate-100">{tf.f00436}</div>
                    )}
                    <Button 
                        variant="outline" 
                        className="w-14 h-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-slate-50 transition-all p-0 flex items-center justify-center shadow-sm"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { partnerId: partner.id, partnerName: partner.name } }))}
                    >
                        <MessageSquare className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}

function GeneralRow({ partner, isMyStore, activeTab, setTab }: any) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
    return (
        <tr className="group hover:bg-slate-50/80 transition-all duration-300">
            <td className="px-10 py-8">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-110">
                        {partner.logo_url ? <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-contain p-2" /> : <Building2 className="w-5 h-5 text-slate-200" />}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800">{partner.name}</span>
                            {isMyStore && (
                                <Badge className="h-4 text-[8px] bg-indigo-100 text-indigo-600 border-0 font-black">
                                    {tr("내", "My", "Tôi")}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-[11px] text-slate-400 font-light line-clamp-1 max-w-[200px] italic">{partner.partner_description || tf.f00364}</p>
                            {partner.contact_phone && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{partner.contact_phone}</span>}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-10 py-8">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200 bg-white rounded-full px-4 py-1.5 flex items-center gap-2">
                        <MapPin size={10} className="text-slate-300" /> {partner.partner_region ? extRegionLineDisplay(partner.partner_region, baseLocale) : tf.f00546}
                    </Badge>
                    <Badge className="text-[10px] font-black text-indigo-600 bg-indigo-50 border-0 rounded-full px-4 py-1.5 uppercase tracking-tighter">
                        {partner.partner_category ? extCategoriesLineDisplay(partner.partner_category, baseLocale) : tf.f00525}
                    </Badge>
                </div>
            </td>
            <td className="px-10 py-8">
                <div className="flex items-center gap-2 justify-center">
                    {partner.portfolio_gdrive_id ? (
                        <AlbumDialog partner={partner} activeTab={activeTab} setTab={setTab} variant="minimal" />
                    ) : (
                        <span className="text-[10px] text-slate-300 italic font-light">{tf.f00434}</span>
                    )}
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-indigo-600"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { partnerId: partner.id, partnerName: partner.name } }))}
                    >
                        <MessageSquare size={16} />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

function AlbumDialog({ partner, activeTab, setTab, variant = "full" }: any) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
    const albumCategories = [EXT_CAT_ALL];
    if (partner.gdrive_bouquet_id) albumCategories.push('꽃다발');
    if (partner.gdrive_basket_id) albumCategories.push('꽃바구니');
    if (partner.gdrive_wreath_id) albumCategories.push('축하화환');
    if (partner.gdrive_condolence_id) albumCategories.push('근조화환');
    if (partner.gdrive_orchid_id) albumCategories.push('동양란/서양란');
    if (partner.gdrive_plant_id) albumCategories.push('식물/분재');
    
    // 카테고리에 따른 Google Drive ID 결정
    const getCategoryId = () => {
        switch(activeTab) {
            case '꽃다발': return partner.gdrive_bouquet_id || partner.portfolio_gdrive_id;
            case '꽃바구니': return partner.gdrive_basket_id || partner.portfolio_gdrive_id;
            case '축하화환': return partner.gdrive_wreath_id || partner.portfolio_gdrive_id;
            case '근조화환': return partner.gdrive_condolence_id || partner.portfolio_gdrive_id;
            case '동양란/서양란': return partner.gdrive_orchid_id || partner.portfolio_gdrive_id;
            case '식물/분재': return partner.gdrive_plant_id || partner.portfolio_gdrive_id;
            default: return partner.portfolio_gdrive_id;
        }
    };
    const currentGdriveId = getCategoryId();

    return (
        <Dialog>
            <DialogTrigger render={
                variant === "full" ? (
                    <Button className="w-full h-14 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-bold transition-all shadow-xl group-hover:shadow-indigo-600/20">
                        <Store className="mr-3 w-5 h-5 opacity-70" /> {tf.f00437}
                    </Button>
                ) : (
                    <Button variant="outline" className="h-10 px-6 rounded-xl border-indigo-100 text-indigo-600 font-bold text-[11px] hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 mx-auto">
                        <Store size={14} /> {tf.f00435}
                    </Button>
                )
            } />
            <DialogContent className="max-w-screen-2xl sm:max-w-none w-[95vw] h-[95vh] rounded-[4rem] border-0 shadow-3xl p-0 overflow-hidden flex flex-col bg-[#F8FAFC]">
                {/* Modal Header */}
                <div className="bg-slate-900 p-8 md:p-12 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none translate-x-32 -translate-y-32" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-white border-8 border-white/10 flex items-center justify-center p-1 shadow-2xl">
                             {partner.logo_url ? <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-contain" /> : <Building2 className="w-10 h-10 text-slate-600" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Badge className="bg-indigo-500 text-white border-0 font-black text-[9px] rounded-md tracking-widest uppercase">
                                    {tr("인증 파트너", "Certified partner", "Đối tác đã xác minh")}
                                </Badge>
                                <span className="text-white/40 text-[10px] font-bold flex items-center gap-1"><MapPin size={10} /> {partner.partner_region ? extRegionLineDisplay(partner.partner_region, baseLocale) : tf.f00546}</span>
                            </div>
                            <h3 className="text-3xl font-black tracking-tight">
                                {partner.name}{" "}
                                <span className="text-indigo-400 font-light">{tr("갤러리", "Gallery", "Album")}</span>
                            </h3>
                        </div>
                    </div>
                    <DialogClose render={<Button variant="ghost" className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-[2.5rem] h-16 w-16 p-0 group"><ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" /></Button>} />
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
                     <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <LayoutGrid className="text-indigo-600" /> {tf.f00735}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 w-fit">
                                {albumCategories.map((cat) => (
                                    <Button 
                                        key={cat}
                                        variant={activeTab === cat ? "default" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "rounded-full px-6 h-12 text-[11px] font-bold transition-all duration-300",
                                            activeTab === cat ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                                        )}
                                        onClick={() => setTab(cat)}
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        
                        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom duration-700">
                             <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                <Info className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">
                                    {tr("실시간 앨범 동기화", "Real-time album sync", "Đồng bộ album thời gian thực")}
                                </p>
                                <p className="text-[10px] text-slate-400 font-light">
                                    {tf.f00537}{" "}
                                    <span className="font-bold text-indigo-600">
                                        {tr("[상품명] 가격", "[Product name] price", "[Tên sản phẩm] giá")}
                                    </span>
                                    {tf.f00499}
                                </p>
                             </div>
                        </div>
                    </div>

                    <div className="relative group/gallery">
                        <div className="h-[650px] md:h-[calc(95vh-400px)] min-h-[500px] rounded-[4rem] overflow-hidden border-[12px] border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white relative transition-all duration-500 group-hover/gallery:border-indigo-50">
                            <iframe 
                                key={`${partner.id}-${activeTab}`}
                                src={`https://drive.google.com/embeddedfolderview?id=${getGDriveId(currentGdriveId)}#grid`} 
                                width="100%" 
                                height="100%" 
                                frameBorder="0"
                                className="w-full h-full"
                            ></iframe>
                            
                            <div className="absolute bottom-6 right-6 flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    className="h-12 px-6 rounded-2xl bg-white/90 backdrop-blur-xl border-slate-100 shadow-xl font-bold text-xs text-slate-600 hover:text-indigo-600 flex items-center gap-2 transition-all"
                                    onClick={() => window.open(`https://drive.google.com/drive/folders/${getGDriveId(currentGdriveId)}`, '_blank')}
                                >
                                    <ExternalLink size={14} /> {tf.f00347}
                                </Button>
                            </div>

                            {/* Visual Feedback Overlay */}
                            {activeTab !== EXT_CAT_ALL && (
                                <div className="absolute top-10 right-10 animate-in slide-in-from-right fade-in duration-700 pointer-events-none">
                                    <div className="flex items-center gap-3 bg-indigo-600/90 backdrop-blur-xl text-white px-8 py-4 rounded-full shadow-2xl border border-white/20">
                                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                        <span className="text-[13px] font-black tracking-tight">{extCategoryLabel(activeTab, baseLocale)} {tf.f00363}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Scroll Guide */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                             <div className="w-8 h-12 rounded-full border-2 border-slate-200 flex justify-center p-1 bg-white shadow-lg">
                                <div className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" />
                             </div>
                             <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Scroll for more</span>
                        </div>
                    </div>

                    {/* Partner Footer Info */}
                    <div className="p-12 bg-white rounded-[4rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-12">
                         <div className="space-y-4 max-w-xl">
                            <h5 className="text-xl font-black text-slate-800 italic">&quot;{tf.f00669}&quot;</h5>
                            <p className="text-sm text-slate-400 leading-relaxed font-light">
                                {tf.f00290} {partner.name}. {tf.f00775}
                            </p>
                         </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
