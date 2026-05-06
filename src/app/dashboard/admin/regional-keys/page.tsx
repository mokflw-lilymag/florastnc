"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Key, Eye, EyeOff, CheckCircle2, ShieldCheck } from "lucide-react";

// ─── 국가별 API 키 정의 ──────────────────────────────────
type KeyField = {
  id: string;
  label: string;
  placeholder: string;
  isSecret?: boolean;
  helpUrl?: string;
};

type CountryKeyConfig = {
  countryCode: string;
  flag: string;
  name: string;
  ringColor: string;
  sections: {
    platform: string;
    platformLabel: string;
    iconBg: string;
    iconText: string;
    fields: KeyField[];
  }[];
};

const COUNTRY_KEY_CONFIGS: CountryKeyConfig[] = [
  {
    countryCode: "KR",
    flag: "🇰🇷",
    name: "대한민국",
    ringColor: "ring-amber-300",
    sections: [
      {
        platform: "kakao_alimtalk",
        platformLabel: "카카오 알림톡",
        iconBg: "#FEE500",
        iconText: "K",
        fields: [
          { id: "kakao_alimtalk_api_key", label: "API 키 (REST API Key)", placeholder: "카카오 developers에서 발급", isSecret: true, helpUrl: "https://developers.kakao.com" },
          { id: "kakao_alimtalk_sender_key", label: "발신 프로필 키", placeholder: "카카오 비즈메시지 채널 발신 키", isSecret: true },
          { id: "kakao_alimtalk_pfid", label: "플러스친구 ID", placeholder: "@채널명" },
        ],
      },
      {
        platform: "kakao_t",
        platformLabel: "카카오 T 파트너스",
        iconBg: "#FEE500",
        iconText: "T",
        fields: [
          { id: "kakao_t_partner_api_key", label: "파트너스 API Key", placeholder: "카카오T 비즈니스 파트너스에서 발급", isSecret: true, helpUrl: "https://business.kakao.com" },
          { id: "kakao_t_partner_secret", label: "API Secret", placeholder: "파트너스 Secret Key", isSecret: true },
        ],
      },
      {
        platform: "naver_commerce",
        platformLabel: "네이버 커머스 API",
        iconBg: "#03C75A",
        iconText: "N",
        fields: [
          { id: "naver_commerce_client_id", label: "Client ID", placeholder: "네이버 스마트스토어 센터 API 발급", helpUrl: "https://sell.smartstore.naver.com" },
          { id: "naver_commerce_client_secret", label: "Client Secret", placeholder: "Client Secret", isSecret: true },
        ],
      },
    ],
  },
  {
    countryCode: "JP",
    flag: "🇯🇵",
    name: "일본",
    ringColor: "ring-red-300",
    sections: [
      {
        platform: "line_jp",
        platformLabel: "LINE Messaging API",
        iconBg: "#06C755",
        iconText: "L",
        fields: [
          { id: "line_jp_channel_id", label: "Channel ID", placeholder: "LINE Developers에서 발급", helpUrl: "https://developers.line.biz" },
          { id: "line_jp_channel_secret", label: "Channel Secret", placeholder: "Channel Secret", isSecret: true },
          { id: "line_jp_channel_token", label: "Channel Access Token", placeholder: "Long-lived Access Token", isSecret: true },
        ],
      },
    ],
  },
  {
    countryCode: "VN",
    flag: "🇻🇳",
    name: "베트남",
    ringColor: "ring-red-400",
    sections: [
      {
        platform: "zalo_zns",
        platformLabel: "Zalo ZNS",
        iconBg: "#0068FF",
        iconText: "Z",
        fields: [
          { id: "zalo_zns_app_id", label: "App ID", placeholder: "Zalo Developers에서 발급", helpUrl: "https://developers.zalo.me" },
          { id: "zalo_zns_secret_key", label: "Secret Key", placeholder: "App Secret Key", isSecret: true },
          { id: "zalo_zns_oa_id", label: "OA ID (Official Account ID)", placeholder: "Zalo 공식 채널 ID" },
        ],
      },
    ],
  },
  {
    countryCode: "ID",
    flag: "🇮🇩",
    name: "인도네시아",
    ringColor: "ring-red-500",
    sections: [
      {
        platform: "gosend_id",
        platformLabel: "GoSend (Gojek)",
        iconBg: "#00AA13",
        iconText: "G",
        fields: [
          { id: "gosend_client_id", label: "Client ID", placeholder: "Gojek for Business에서 발급", helpUrl: "https://business.gojek.com" },
          { id: "gosend_client_secret", label: "Client Secret", placeholder: "GoSend API Secret", isSecret: true },
          { id: "gosend_merchant_id", label: "Merchant ID", placeholder: "GoSend 가맹점 ID" },
        ],
      },
      {
        platform: "whatsapp_business_id",
        platformLabel: "WhatsApp Business API",
        iconBg: "#25D366",
        iconText: "W",
        fields: [
          { id: "wa_id_business_account_id", label: "WhatsApp Business Account ID", placeholder: "Meta for Developers에서 발급", helpUrl: "https://developers.facebook.com" },
          { id: "wa_id_phone_number_id", label: "Phone Number ID", placeholder: "등록된 전화번호 ID" },
          { id: "wa_id_access_token", label: "Access Token", placeholder: "Permanent Access Token", isSecret: true },
        ],
      },
      {
        platform: "shopee_id",
        platformLabel: "Shopee Indonesia",
        iconBg: "#EE4D2D",
        iconText: "S",
        fields: [
          { id: "shopee_id_partner_id", label: "Partner ID", placeholder: "Shopee Open Platform에서 발급", helpUrl: "https://open.shopee.com" },
          { id: "shopee_id_partner_key", label: "Partner Key", placeholder: "Partner Key", isSecret: true },
        ],
      },
    ],
  },
  {
    countryCode: "MY",
    flag: "🇲🇾",
    name: "말레이시아",
    ringColor: "ring-blue-400",
    sections: [
      {
        platform: "grab_express_my",
        platformLabel: "Grab Express Malaysia",
        iconBg: "#00B14F",
        iconText: "G",
        fields: [
          { id: "grab_my_client_id", label: "Client ID", placeholder: "Grab for Developers에서 발급", helpUrl: "https://developer.grab.com" },
          { id: "grab_my_client_secret", label: "Client Secret", placeholder: "Client Secret", isSecret: true },
          { id: "grab_my_merchant_id", label: "Merchant ID", placeholder: "Grab 파트너 가맹점 ID" },
        ],
      },
      {
        platform: "shopee_my",
        platformLabel: "Shopee Malaysia",
        iconBg: "#EE4D2D",
        iconText: "S",
        fields: [
          { id: "shopee_my_partner_id", label: "Partner ID", placeholder: "Shopee Open Platform Partner ID" },
          { id: "shopee_my_partner_key", label: "Partner Key", placeholder: "Partner Key", isSecret: true },
        ],
      },
    ],
  },
  {
    countryCode: "TH",
    flag: "🇹🇭",
    name: "태국",
    ringColor: "ring-blue-600",
    sections: [
      {
        platform: "line_th",
        platformLabel: "LINE Messaging API (Thailand)",
        iconBg: "#06C755",
        iconText: "L",
        fields: [
          { id: "line_th_channel_id", label: "Channel ID", placeholder: "LINE Developers에서 발급" },
          { id: "line_th_channel_secret", label: "Channel Secret", placeholder: "Channel Secret", isSecret: true },
          { id: "line_th_channel_token", label: "Channel Access Token", placeholder: "Long-lived Access Token", isSecret: true },
        ],
      },
      {
        platform: "lineman_th",
        platformLabel: "LINE MAN (배달)",
        iconBg: "#06C755",
        iconText: "LM",
        fields: [
          { id: "lineman_th_api_key", label: "API Key", placeholder: "LINE MAN Wongnai Partner API Key", isSecret: true, helpUrl: "https://partner.lineman.me" },
          { id: "lineman_th_merchant_id", label: "Merchant ID", placeholder: "LINE MAN 가맹점 ID" },
        ],
      },
      {
        platform: "shopee_th",
        platformLabel: "Shopee Thailand",
        iconBg: "#EE4D2D",
        iconText: "S",
        fields: [
          { id: "shopee_th_partner_id", label: "Partner ID", placeholder: "Shopee Open Platform Partner ID" },
          { id: "shopee_th_partner_key", label: "Partner Key", placeholder: "Partner Key", isSecret: true },
        ],
      },
    ],
  },
];

// ─── 키 필드 컴포넌트 ────────────────────────────────────
function KeyFieldInput({
  field,
  value,
  onChange,
}: {
  field: KeyField;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const hasValue = !!value && value.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
          <Key className="w-2.5 h-2.5" />
          {field.label}
        </Label>
        {field.helpUrl && (
          <a href={field.helpUrl} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-blue-500 hover:underline">
            발급 안내 ↗
          </a>
        )}
      </div>
      <div className="relative">
        <Input
          type={field.isSecret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="pr-8 text-sm"
        />
        {field.isSecret && (
          <button
            type="button"
            onClick={() => setShow((p) => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hasValue && (
        <p className="text-[10px] text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" />
          저장된 값이 있습니다
        </p>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────
export default function RegionalKeysPage() {
  const supabase = createClient();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCountry, setActiveCountry] = useState("KR");

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("platform_config")
        .select("key, value")
        .like("key", "regional_key_%");
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const fieldId = row.key.replace("regional_key_", "");
        map[fieldId] = (row.value as Record<string, string>)?.v ?? "";
      }
      setKeyValues(map);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) loadKeys();
    else if (!authLoading && !isSuperAdmin) setLoading(false);
  }, [authLoading, isSuperAdmin, loadKeys]);

  const handleSave = async (countryCode: string) => {
    setSaving(true);
    const config = COUNTRY_KEY_CONFIGS.find((c) => c.countryCode === countryCode);
    if (!config) { setSaving(false); return; }

    try {
      const allFields = config.sections.flatMap((s) => s.fields);
      const upserts = allFields.map((f) => ({
        key: `regional_key_${f.id}`,
        value: { v: keyValues[f.id] ?? "", country: countryCode },
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("platform_config")
        .upsert(upserts, { onConflict: "key" });
      if (error) throw error;
      toast.success(`✅ ${config.flag} ${config.name} API 키 저장 완료!`);
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (isSuperAdmin && loading)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">국가별 API 키 관리</h1>
          <p className="text-slate-500 text-sm">국가별 연동 앱 API 키를 안전하게 관리합니다. 슈퍼관리자만 접근 가능합니다.</p>
        </div>
      </div>

      {/* 국가 탭 */}
      <Tabs value={activeCountry} onValueChange={setActiveCountry}>
        <TabsList className="flex flex-wrap gap-1 h-auto bg-slate-100 p-1.5 rounded-xl">
          {COUNTRY_KEY_CONFIGS.map((c) => {
            const fieldCount = c.sections.flatMap((s) => s.fields).length;
            const filledCount = c.sections.flatMap((s) => s.fields).filter((f) => !!keyValues[f.id]).length;
            return (
              <TabsTrigger key={c.countryCode} value={c.countryCode} className="rounded-lg gap-1.5 px-3 py-2">
                <span>{c.flag}</span>
                <span className="font-bold text-xs">{c.name}</span>
                {filledCount > 0 && (
                  <Badge className="bg-emerald-500 text-white text-[9px] h-4 px-1 min-w-4 rounded-full">
                    {filledCount}/{fieldCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {COUNTRY_KEY_CONFIGS.map((countryConfig) => (
          <TabsContent key={countryConfig.countryCode} value={countryConfig.countryCode} className="space-y-4 mt-4">
            {countryConfig.sections.map((section) => (
              <Card key={section.platform} className={`border-0 shadow-sm ring-1 ${countryConfig.ringColor} overflow-hidden`}>
                <CardHeader className="py-4 px-5 flex-row items-center gap-3 bg-slate-50/80 border-b border-slate-100">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold shadow-sm shrink-0"
                    style={{ backgroundColor: section.iconBg, color: section.iconBg === "#FEE500" ? "#111" : "white" }}
                  >
                    {section.iconText}
                  </div>
                  <CardTitle className="text-sm font-bold">{section.platformLabel}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {section.fields.map((field) => (
                    <KeyFieldInput
                      key={field.id}
                      field={field}
                      value={keyValues[field.id] ?? ""}
                      onChange={(v) => setKeyValues((prev) => ({ ...prev, [field.id]: v }))}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* 저장 버튼 */}
            <div className="flex justify-end pt-2">
              <Button
                className="gap-2 bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() => handleSave(countryConfig.countryCode)}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {countryConfig.flag} {countryConfig.name} API 키 저장
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
