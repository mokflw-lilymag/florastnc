"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Loader2, Save, ShoppingCart, RefreshCw, KeyRound, CheckCircle2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export function MallIntegrationCard({ tenantId }: { tenantId: string }) {
  const [isNaverActive, setIsNaverActive] = useState(false);
  const [naverClientId, setNaverClientId] = useState("");
  const [naverSecret, setNaverSecret] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const [isCafeActive, setIsCafeActive] = useState(false);
  const [cafeClientId, setCafeClientId] = useState("");
  const [cafeSecret, setCafeSecret] = useState("");
  const [cafeMallId, setCafeMallId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);

  useEffect(() => {
    async function loadIntegrations() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shop_integrations")
        .select("*")
        .eq("shop_id", tenantId);

      if (data && !error) {
        data.forEach(integration => {
          if (integration.platform === "naver_commerce") {
            setIsNaverActive(integration.is_active);
            setNaverClientId(integration.client_id || "");
            setNaverSecret(integration.client_secret || "");
          } else if (integration.platform === "cafe24") {
            setIsCafeActive(integration.is_active);
            setCafeClientId(integration.client_id || "");
            setCafeSecret(integration.client_secret || "");
            setCafeMallId(integration.mall_id || "");
            setHasAccessToken(!!integration.access_token);
          }
        });
      }
    }
    loadIntegrations();
  }, [tenantId]);

  const handleTestAndSave = async (platform: string) => {
    setIsTesting(true);
    // TODO: 실제로 백엔드 API를 호출하여 유효성을 검증하는 로직 추가
    setTimeout(async () => {
      setIsTesting(false);
      toast.success(`${platform === 'naver' ? '네이버 스마트스토어' : '카페24'} 설정이 저장되었습니다!`, {
        description: "권한 인증을 완료해야 실제 수집이 시작됩니다.",
      });
      
      // 데모용: 로컬 스토리지에 저장하거나, 실제로는 Supabase에 upsert 합니다.
      const supabase = createClient();
      await supabase.from('shop_integrations').upsert({
        shop_id: tenantId,
        platform: platform === 'naver' ? 'naver_commerce' : 'cafe24',
        client_id: platform === 'naver' ? naverClientId : cafeClientId,
        client_secret: platform === 'naver' ? naverSecret : cafeSecret,
        mall_id: platform === 'cafe24' ? cafeMallId : null,
        is_active: platform === 'naver' ? isNaverActive : isCafeActive,
        updated_at: new Date().toISOString()
      }, { onConflict: 'shop_id, platform' });

    }, 1500);
  };

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/cafe24', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 ${data.message}`, {
          description: data.synced_count > 0 
            ? `${data.synced_count}건의 주문이 주문 목록에 추가되었습니다. 새로고침해 주세요.`
            : '새 주문이 없습니다.',
          duration: 6000,
        });
      } else {
        toast.error('동기화 실패', { description: data.error });
      }
    } catch (err: any) {
      toast.error('동기화 오류', { description: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleActive = async (platform: string, active: boolean) => {
    // 1. UI 상태 즉시 업데이트
    if (platform === 'naver_commerce') setIsNaverActive(active);
    else if (platform === 'cafe24') setIsCafeActive(active);
    
    // 2. DB 업데이트
    const supabase = createClient();
    
    // 먼저 레코드가 있는지 확인 (없으면 upsert 해야함)
    const { data: existing } = await supabase
      .from('shop_integrations')
      .select('id')
      .eq('shop_id', tenantId)
      .eq('platform', platform)
      .single();

    let error;
    if (existing) {
      const { error: updateError } = await supabase
        .from('shop_integrations')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('shop_id', tenantId)
        .eq('platform', platform);
      error = updateError;
    } else {
      // 레코드가 없으면 기본값으로 생성 (비활성화 상태에서 토글했을 때 대비)
      const { error: insertError } = await supabase
        .from('shop_integrations')
        .insert({
          shop_id: tenantId,
          platform: platform,
          is_active: active,
          updated_at: new Date().toISOString()
        });
      error = insertError;
    }

    if (error) {
      toast.error("설정 변경 실패", { description: error.message });
      // 실패 시 UI 복구
      if (platform === 'naver_commerce') setIsNaverActive(!active);
      else if (platform === 'cafe24') setIsCafeActive(!active);
    } else {
      toast.success(`${platform === 'naver_commerce' ? '네이버' : '카페24'} 연동이 ${active ? '활성화' : '비활성화'}되었습니다.`);
    }
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-emerald-500 bg-emerald-50/5 overflow-hidden my-6">
      <CardHeader className="bg-emerald-600 text-white">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <CardTitle>쇼핑몰 주문 자동 수집 (API 연동)</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-8">
        {/* 네이버 스토어섹션 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 text-white p-2 rounded-lg font-bold">N</div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">네이버 커머스 API</h4>
                  {naverClientId && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> 연동됨
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">스마트스토어 주문을 실시간으로 가져옵니다.</p>
              </div>
            </div>
            <Switch 
              className="data-[state=checked]:bg-emerald-600"
              checked={isNaverActive}
              onCheckedChange={(val) => handleToggleActive('naver_commerce', val)}
            />
          </div>

          {isNaverActive && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-xl border border-emerald-100">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Application ID</Label>
                <Input 
                  placeholder="네이버 커머스 API Client ID"
                  value={naverClientId}
                  onChange={e => setNaverClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Application Secret</Label>
                <Input 
                  type="password"
                  placeholder="네이버 커머스 API Secret"
                  value={naverSecret}
                  onChange={e => setNaverSecret(e.target.value)}
                />
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end">
                <Button onClick={() => handleTestAndSave('naver')} disabled={isTesting || !naverClientId || !naverSecret} className="bg-emerald-600 hover:bg-emerald-700">
                  {isTesting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  인증 테스트 및 저장
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 카페24 섹션 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 text-white p-2 rounded-lg font-bold text-sm">Cafe24</div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">카페24 개발자 API</h4>
                  {cafeClientId && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> 연동됨
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">자사몰 주문을 실시간으로 가져옵니다.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasAccessToken && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncOrders}
                  disabled={isSyncing}
                  className="h-8 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 gap-1 rounded-full px-3"
                >
                  {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  {isSyncing ? '동기화 중...' : '주문 수동 동기화'}
                </Button>
              )}
              {cafeClientId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!cafeMallId) {
                      toast.error("쇼핑몰 아이디(Mall ID)를 입력해주세요.");
                      return;
                    }
                    const redirectUri = encodeURIComponent(`https://floxync.com/api/sync/cafe24/callback`);
                    const state = `${tenantId}:${cafeMallId}`;
                    const oauthUrl = `https://${cafeMallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${cafeClientId}&state=${state}&redirect_uri=${redirectUri}&scope=mall.read_order`;
                    window.open(oauthUrl, '_blank', 'width=800,height=800');
                  }}
                  className="h-8 text-xs font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 gap-1 rounded-full px-3"
                >
                  <KeyRound className="w-3 h-3" /> {hasAccessToken ? '재인증' : '카페24 로그인 연동'}
                </Button>
              )}
              <Switch 
                checked={isCafeActive}
                onCheckedChange={(val) => handleToggleActive('cafe24', val)}
              />
            </div>
          </div>

          {isCafeActive && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-xl border border-slate-200">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">쇼핑몰 아이디 (Mall ID)</Label>
                <Input 
                  placeholder="예: florasync"
                  value={cafeMallId}
                  onChange={e => setCafeMallId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Client ID</Label>
                <Input 
                  placeholder="카페24 앱 Client ID"
                  value={cafeClientId}
                  onChange={e => setCafeClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Client Secret</Label>
                <Input 
                  type="password"
                  placeholder="카페24 앱 Client Secret"
                  value={cafeSecret}
                  onChange={e => setCafeSecret(e.target.value)}
                />
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end">
                <Button onClick={() => handleTestAndSave('cafe24')} disabled={isTesting || !cafeClientId || !cafeSecret} variant="outline">
                  {isTesting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  인증 테스트 및 저장
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
