"use client";

import { 
  Cloud, 
  FileImage, 
  ExternalLink, 
  RefreshCw, 
  LayoutGrid, 
  Share2, 
  MessageCircle, 
  Info, 
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  Plus,
  Coins,
  Volume2,
  BellRing
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SystemSettings } from "@/hooks/use-settings";
import { PosIntegrationCard } from "./PosIntegrationCard";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface AutomationSettingsProps {
  settings: SystemSettings;
  saveSettings: (newSettings: SystemSettings) => Promise<boolean>;
  tenantId: string;
  posIntegration?: any;
  isPosLoading?: boolean;
}

export function AutomationSettings({ 
  settings, 
  saveSettings, 
  tenantId,
  posIntegration,
  isPosLoading
}: AutomationSettingsProps) {
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  // 헬퍼 함수: 연동 상태 확인용
  const getStatus = (service: string) => {
    switch (service) {
      case 'pos':
        return posIntegration && posIntegration.is_active;
      case 'kakao':
        return settings.useKakaoTalk && !!settings.kakaoApiKey;
      case 'storage':
        return settings.photoStorageType === 'google_drive' && !!settings.googleDriveFolderId;
      case 'sheets':
        return settings.useGoogleSheets && !!settings.googleSheetOrdersId;
      default:
        return false;
    }
  };

  const handleToggleSound = async (checked: boolean) => {
    const success = await saveSettings({
      ...settings,
      orderNotificationSound: checked
    });
    if (success) {
      toast.success(checked ? tr("주문 알림음이 활성화되었습니다. 🔔", "Order notification sound enabled. 🔔") : tr("주문 알림음이 비활성화되었습니다.", "Order notification sound disabled."));
    }
  };

  const playTestSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, start + duration);
        gain.gain.setValueAtTime(0.5, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      const now = audioCtx.currentTime;
      playTone(880, now, 0.4);
      playTone(660, now + 0.15, 0.5);
      toast.info(tr("알림음 테스트 중... 🔊", "Playing test sound... 🔊"));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* 0. 실시간 알림 설정 (소리) */}
      <Card className="border-0 shadow-lg ring-1 ring-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-200">
                <BellRing className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {tr("새 주문 실시간 알림음", "Real-time New Order Sound")}
                  {settings.orderNotificationSound && (
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 animate-pulse">LIVE</Badge>
                  )}
                </h3>
                <p className="text-sm text-slate-500">{tr("쇼핑몰이나 POS에서 주문이 들어오면 우렁찬 소리로 즉시 알려드립니다.", "Get an immediate loud alert when orders arrive from mall or POS.")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                onClick={playTestSound}
              >
                {tr("테스트 소리 듣기", "Play test sound")}
              </Button>
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm min-w-[120px] justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className={cn("h-4 w-4", settings.orderNotificationSound ? "text-indigo-600" : "text-slate-300")} />
                  <span className="text-xs font-bold text-slate-700">{settings.orderNotificationSound ? "ON" : "OFF"}</span>
                </div>
                <Switch 
                  checked={settings.orderNotificationSound !== false}
                  onCheckedChange={handleToggleSound}
                />
              </div>
            </div>
          </div>
          <div className="px-6 pb-4">
             <div className="text-[11px] text-indigo-400 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50 flex items-center gap-2">
               <Info className="h-3 w-3" />
               {tr("브라우저 정책상 페이지 접속 후 최소 한 번은 화면을 클릭해야 소리가 재생됩니다.", "Due to browser policy, click once on the page before sound can play.")}
             </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. POS 연동 (기존 POS 연동 카드) */}
      <PosIntegrationCard 
        posIntegration={posIntegration} 
        isLoading={isPosLoading} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. 사진 저장소 및 갤러리 */}
        <Card className="border-0 shadow-sm ring-1 ring-blue-200 bg-blue-50/10">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
               <div className={cn(
                 "h-2 w-2 rounded-full animate-pulse",
                 getStatus('storage') ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-300"
               )} />
               <CardTitle className="flex items-center gap-2 text-blue-700">
                 <Cloud className="h-5 w-5 text-blue-600" /> {tr("사진 저장소 및 자동화", "Photo Storage & Automation")}
               </CardTitle>
            </div>
            <CardDescription>{tr("앨범 사진 저장 방식을 선택하고 연동합니다.", "Choose and connect your photo storage method.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <Label className="text-sm font-bold flex items-center gap-2">
                   <FileImage className="h-5 w-5 text-emerald-600" /> {tr("사진 저장소 설정 (Google Drive 권장)", "Photo Storage (Google Drive recommended)")}
                 </Label>
                 <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">{tr("연동 권장", "Recommended")}</Badge>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={settings.photoStorageType === 'google_drive' ? 'default' : 'outline'}
                    className="h-20 flex-col gap-2 rounded-2xl border-emerald-200 hover:bg-emerald-50"
                    onClick={() => saveSettings({...settings, photoStorageType: 'google_drive'})}
                  >
                    <FileImage className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs">{tr("구글 드라이브", "Google Drive")}</span>
                  </Button>
                  <Button 
                    variant={settings.photoStorageType === 'cloudinary' ? 'default' : 'outline'}
                    className="h-20 flex-col gap-2 rounded-2xl border-indigo-200 hover:bg-indigo-50"
                    onClick={() => saveSettings({...settings, photoStorageType: 'cloudinary'})}
                  >
                    <ExternalLink className="h-5 w-5 text-indigo-600" />
                    <span className="text-xs">{tr("외부 클라우드", "External Cloud")}</span>
                  </Button>
               </div>
            </div>

            {settings.photoStorageType === 'google_drive' && (
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">Google Drive Folder ID</Label>
                  <Input 
                    placeholder={tr("구글 드라이브 폴더 ID를 입력하세요.", "Enter Google Drive folder ID")}
                    value={settings.googleDriveFolderId}
                    onChange={e => saveSettings({...settings, googleDriveFolderId: e.target.value})}
                    className="h-9 mt-1 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 px-1">{tr("폴더 공유 시 '링크가 있는 모든 사용자'로 설정 후 주소창의 폴더 ID를 입력하세요.", "Set folder sharing to 'Anyone with the link' and paste folder ID from URL.")}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <Label className="text-sm font-bold flex items-center gap-2">
                     <LayoutGrid className="h-4 w-4 text-violet-600" /> {tr("공개 샘플 앨범 (쇼핑몰 형태)", "Public Sample Gallery")}
                   </Label>
                   <p className="text-xs text-slate-500">{tr("업로드한 사진을 외부 고객이나 다른 꽃집에 공유합니다.", "Share uploaded photos with customers or partner stores.")}</p>
                </div>
                <Switch 
                  checked={settings.isGalleryPublic}
                  onCheckedChange={(checked) => saveSettings({...settings, isGalleryPublic: checked})}
                />
              </div>
              {settings.isGalleryPublic && (
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-100 space-y-3">
                   <div className="flex items-center gap-3">
                     <Share2 className="h-4 w-4 text-violet-600" />
                     <div className="flex-1 truncate text-xs font-medium text-violet-800">
                       {typeof window !== 'undefined' ? `${window.location.origin}/gallery/${tenantId}` : '/gallery/...'}
                     </div>
                     <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => {
                       const url = `${window.location.origin}/gallery/${tenantId}`;
                       navigator.clipboard.writeText(url);
                       toast.success(tr("갤러리 주소가 복사되었습니다!", "Gallery link copied!"));
                     }}>복사</Button>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-violet-400">갤러리 테마</Label>
                      <div className="grid grid-cols-3 gap-2">
                         {(['grid', 'masonry', 'carousel'] as const).map(t => (
                           <Button 
                             key={t}
                             size="sm" 
                             variant={settings.galleryTheme === t ? 'default' : 'outline'}
                             className="h-8 text-[10px] capitalize"
                             onClick={() => saveSettings({...settings, galleryTheme: t})}
                           >
                             {t}
                           </Button>
                         ))}
                      </div>
                   </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. 카카오 알림톡 자동 전송 */}
        <Card className="border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50/10">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
               <div className={cn(
                 "h-2 w-2 rounded-full animate-pulse",
                 getStatus('kakao') ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-300"
               )} />
               <CardTitle className="flex items-center gap-2 text-amber-700">
                <MessageCircle className="h-5 w-5 text-amber-600" /> {tr("카카오 알림톡 자동 전송", "Kakao AlertTalk Auto Send")}
               </CardTitle>
            </div>
            <CardDescription>{tr("배송 사진 및 주문 알림을 카카오톡으로 자동 발송합니다.", "Automatically send delivery photos and order alerts via KakaoTalk.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <Label className="font-bold cursor-pointer" htmlFor="kakao-use">{tr("카카오톡 서비스 활성화", "Enable KakaoTalk Service")}</Label>
              </div>
              <Switch 
                id="kakao-use" 
                checked={settings.useKakaoTalk}
                onCheckedChange={(checked) => saveSettings({...settings, useKakaoTalk: checked})}
              />
            </div>

            {settings.useKakaoTalk && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-amber-100 space-y-2 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-amber-600" /> {tr("Solapi 연동 안내", "Solapi Integration Guide")}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {tr("1. solapi.com 가입 및 카카오 채널 연동 2. API Key(Key:Secret) 생성 및 입력 3. 알림톡 템플릿 코드 등록 필수", "1. Register at solapi.com and connect Kakao channel 2. Create API key (Key:Secret) 3. Register alert template code")}
                      </p>
                    </div>
                    <div className="flex items-center justify-center bg-white/50 rounded-xl border border-dashed border-amber-200 p-2">
                       <Badge variant="ghost" className="text-[9px] text-amber-600">Solapi 공식 연동</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">API Key (Key:Secret)</Label>
                    <Input 
                      type="password"
                      value={settings.kakaoApiKey}
                      onChange={e => saveSettings({...settings, kakaoApiKey: e.target.value})}
                      placeholder={tr("Key:Secret 형식으로 입력", "Enter in Key:Secret format")}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">발신 채널 ID (@아이디)</Label>
                    <Input 
                      placeholder={tr("@플록싱크", "@yourChannel")}
                      value={settings.kakaoSenderId}
                      onChange={e => saveSettings({...settings, kakaoSenderId: e.target.value})}
                      className="h-9 bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">알림톡 템플릿 코드</Label>
                  <Input 
                    placeholder={tr("비즈톡에서 발급받은 템플릿 코드", "Template code from BizTalk")}
                    value={settings.kakaoDefaultMessage}
                    onChange={e => saveSettings({...settings, kakaoDefaultMessage: e.target.value})}
                    className="h-9 bg-white"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. 구글 시트 데이터 자동 백업 */}
        <Card className="border-0 shadow-sm ring-1 ring-emerald-200 bg-emerald-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> {tr("데이터 자동 내보내기 (Google Sheets)", "Auto Export Data (Google Sheets)")}
            </CardTitle>
            <CardDescription>{tr("주문 및 지출 내역을 실시간으로 구글 시트에 기록합니다.", "Write orders and expenses to Google Sheets in real-time.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <Label className="font-bold cursor-pointer" htmlFor="gs-use">{tr("구글 시트 연동 활성화", "Enable Google Sheets Integration")}</Label>
              </div>
              <Switch 
                id="gs-use" 
                checked={settings.useGoogleSheets}
                onCheckedChange={(checked) => saveSettings({...settings, useGoogleSheets: checked})}
              />
            </div>

            {settings.useGoogleSheets && (
              <div className="space-y-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2 p-3 bg-white rounded-lg border border-emerald-100">
                    <Label className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                      <FileSpreadsheet className="h-3 w-3" /> {tr("주문 내역 Spreadsheet ID", "Orders Spreadsheet ID")}
                    </Label>
                    <Input
                      placeholder={tr("구글 시트 주소창의 고유 ID", "Unique ID from Google Sheets URL")}
                      value={settings.googleSheetOrdersId}
                      onChange={e => saveSettings({...settings, googleSheetOrdersId: e.target.value})}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-2 p-3 bg-white rounded-lg border border-emerald-100">
                    <Label className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                      <Coins className="h-3 w-3" /> {tr("지출 관리 Spreadsheet ID", "Expenses Spreadsheet ID")}
                    </Label>
                    <Input
                      placeholder={tr("지출 내역 구글 시트 ID", "Expenses Google Sheet ID")}
                      value={settings.googleSheetExpensesId}
                      onChange={e => saveSettings({...settings, googleSheetExpensesId: e.target.value})}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. 서비스 연동 상태 대시보드 (사용자 제안형) */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-slate-500" /> {tr("통합 연동 상태 대시보드", "Integration Status Dashboard")}
            </CardTitle>
            <CardDescription className="text-[11px]">{tr("현재 활성화된 서비스들의 상태를 확인합니다.", "Check status of active integrations.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: 'pos', name: tr('POS 연동 (이지체크/토스)', 'POS Integration (EasyCheck/Toss)'), icon: RefreshCw, color: 'text-blue-600' },
              { id: 'kakao', name: tr('알림톡 발송 (Solapi)', 'AlertTalk Send (Solapi)'), icon: MessageCircle, color: 'text-amber-600' },
              { id: 'storage', name: tr('클라우드 저장소 (Google)', 'Cloud Storage (Google)'), icon: Cloud, color: 'text-emerald-600' },
              { id: 'sheets', name: tr('데이터 백업 (Sheets)', 'Data Backup (Sheets)'), icon: FileSpreadsheet, color: 'text-green-600' }
            ].map((service, idx) => {
              const isActive = getStatus(service.id);
              return (
                <div key={idx} className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  isActive ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50/50 border-transparent opacity-60"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      isActive ? "bg-slate-100" : "bg-transparent"
                    )}>
                      <service.icon className={cn("h-4 w-4", service.color)} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{service.name}</span>
                  </div>
                  {isActive ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 cursor-default shadow-[0_0_10px_rgba(16,185,129,0.2)]">{tr("정상 작동 중", "Operational")}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200">{tr("비활성", "Inactive")}</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
