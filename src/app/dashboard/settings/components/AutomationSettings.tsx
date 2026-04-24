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
      toast.success(checked ? "주문 알림음이 활성화되었습니다. 🔔" : "주문 알림음이 비활성화되었습니다.");
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
                  새 주문 실시간 알림음
                  {settings.orderNotificationSound && (
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 animate-pulse">LIVE</Badge>
                  )}
                </h3>
                <p className="text-sm text-slate-500">쇼핑몰이나 POS에서 주문이 들어오면 우렁찬 소리로 즉시 알려드립니다.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm min-w-[140px] justify-between">
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
          <div className="px-6 pb-4">
             <div className="text-[11px] text-indigo-400 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50 flex items-center gap-2">
               <Info className="h-3 w-3" />
               브라우저 정책상 페이지 접속 후 최소 한 번은 화면을 클릭해야 소리가 재생됩니다.
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
                 <Cloud className="h-5 w-5 text-blue-600" /> 사진 저장소 및 자동화
               </CardTitle>
            </div>
            <CardDescription>앨범 사진 저장 방식을 선택하고 연동합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <Label className="text-sm font-bold flex items-center gap-2">
                   <FileImage className="h-5 w-5 text-emerald-600" /> 사진 저장소 설정 (Google Drive 권장)
                 </Label>
                 <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">연동 권장</Badge>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={settings.photoStorageType === 'google_drive' ? 'default' : 'outline'}
                    className="h-20 flex-col gap-2 rounded-2xl border-emerald-200 hover:bg-emerald-50"
                    onClick={() => saveSettings({...settings, photoStorageType: 'google_drive'})}
                  >
                    <FileImage className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs">구글 드라이브</span>
                  </Button>
                  <Button 
                    variant={settings.photoStorageType === 'cloudinary' ? 'default' : 'outline'}
                    className="h-20 flex-col gap-2 rounded-2xl border-indigo-200 hover:bg-indigo-50"
                    onClick={() => saveSettings({...settings, photoStorageType: 'cloudinary'})}
                  >
                    <ExternalLink className="h-5 w-5 text-indigo-600" />
                    <span className="text-xs">외부 클라우드</span>
                  </Button>
               </div>
            </div>

            {settings.photoStorageType === 'google_drive' && (
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">Google Drive Folder ID</Label>
                  <Input 
                    placeholder="구글 드라이브 폴더 ID를 입력하세요." 
                    value={settings.googleDriveFolderId}
                    onChange={e => saveSettings({...settings, googleDriveFolderId: e.target.value})}
                    className="h-9 mt-1 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 px-1">폴더 공유 시 '링크가 있는 모든 사용자'로 설정 후 주소창의 폴더 ID를 입력하세요.</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <Label className="text-sm font-bold flex items-center gap-2">
                     <LayoutGrid className="h-4 w-4 text-violet-600" /> 공개 샘플 앨범 (쇼핑몰 형태)
                   </Label>
                   <p className="text-xs text-slate-500">업로드한 사진을 외부 고객이나 다른 꽃집에 공유합니다.</p>
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
                       toast.success("갤러리 주소가 복사되었습니다!");
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
                 <MessageCircle className="h-5 w-5 text-amber-600" /> 카카오 알림톡 자동 전송
               </CardTitle>
            </div>
            <CardDescription>배송 사진 및 주문 알림을 카카오톡으로 자동 발송합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <Label className="font-bold cursor-pointer" htmlFor="kakao-use">카카오톡 서비스 활성화</Label>
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
                        <Info className="h-3.5 w-3.5 text-amber-600" /> Solapi 연동 안내
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        1. <b>solapi.com</b> 가입 및 카카오 채널 연동<br/>
                        2. API Key (Key:Secret) 생성 및 입력<br/>
                        3. 알림톡 템플릿 코드 등록 필수
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
                      placeholder="Key:Secret 형식으로 입력"
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">발신 채널 ID (@아이디)</Label>
                    <Input 
                      placeholder="@플록싱크"
                      value={settings.kakaoSenderId}
                      onChange={e => saveSettings({...settings, kakaoSenderId: e.target.value})}
                      className="h-9 bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">알림톡 템플릿 코드</Label>
                  <Input 
                    placeholder="비즈톡에서 발급받은 템플릿 코드"
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
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> 데이터 자동 내보내기 (Google Sheets)
            </CardTitle>
            <CardDescription>주문 및 지출 내역을 실시간으로 구글 시트에 기록합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <Label className="font-bold cursor-pointer" htmlFor="gs-use">구글 시트 연동 활성화</Label>
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
                      <FileSpreadsheet className="h-3 w-3" /> 주문 내역 Spreadsheet ID
                    </Label>
                    <Input
                      placeholder="구글 시트 주소창의 고유 ID"
                      value={settings.googleSheetOrdersId}
                      onChange={e => saveSettings({...settings, googleSheetOrdersId: e.target.value})}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-2 p-3 bg-white rounded-lg border border-emerald-100">
                    <Label className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                      <Coins className="h-3 w-3" /> 지출 관리 Spreadsheet ID
                    </Label>
                    <Input
                      placeholder="지출 내역 구글 시트 ID"
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
              <LayoutGrid className="h-4 w-4 text-slate-500" /> 통합 연동 상태 대시보드
            </CardTitle>
            <CardDescription className="text-[11px]">현재 활성화된 서비스들의 상태를 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: 'pos', name: 'POS 연동 (이지체크/토스)', icon: RefreshCw, color: 'text-blue-600' },
              { id: 'kakao', name: '알림톡 발송 (Solapi)', icon: MessageCircle, color: 'text-amber-600' },
              { id: 'storage', name: '클라우드 저장소 (Google)', icon: Cloud, color: 'text-emerald-600' },
              { id: 'sheets', name: '데이터 백업 (Sheets)', icon: FileSpreadsheet, color: 'text-green-600' }
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
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 cursor-default shadow-[0_0_10px_rgba(16,185,129,0.2)]">정상 작동 중</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200">비활성</Badge>
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
