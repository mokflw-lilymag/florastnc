"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, FileSpreadsheet, ExternalLink, Copy, CheckCircle2, Info } from "lucide-react";

const ORDERS_SCRIPT = `function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var year = new Date().getFullYear().toString();
  var sheet = ss.getSheetByName(year);
  if (!sheet) {
    sheet = ss.insertSheet(year, 0);
  } else {
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);
  }
  var data = JSON.parse(e.postData.contents);
  var rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return ContentService.createTextOutput("success");

  // 헤더 정의
  var HEADERS = [
    '등록일', '주문일시', '주문번호', '주문상태', '수령방법', 
    '주문자명', '주문자연락처', '수령인명', '수령인연락처', 
    '배송/픽업일시', '배송지주소', '주문상품내역', '총결제금액', 
    '결제수단', '결제상태', '배송비', '기사명', '기사연락처', 
    '리본/카드문구', '요청사항/메모'
  ];

  // 헤더가 없으면 1행에 추가하고 고정
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#f3f4f6");
  }

  var idColIdx = HEADERS.indexOf('주문번호');

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowValues = HEADERS.map(function(h) {
      if (h === '등록일') return row['created_at'] || new Date().toISOString();
      return row[h] !== undefined ? row[h] : ''; 
    });

    var found = false;
    if (idColIdx >= 0 && row['주문번호']) {
      var allData = sheet.getDataRange().getValues();
      for (var r = 1; r < allData.length; r++) {
        if (String(allData[r][idColIdx]) === String(row['주문번호'])) {
          sheet.getRange(r + 1, 1, 1, HEADERS.length).setValues([rowValues]);
          found = true;
          break;
        }
      }
    }
    if (!found) {
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1, 1, HEADERS.length).setValues([rowValues]);
    }
  }
  return ContentService.createTextOutput("success");
}`;

const CUSTOMERS_SCRIPT = `function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var year = new Date().getFullYear().toString();
  var sheet = ss.getSheetByName(year);
  if (!sheet) {
    sheet = ss.insertSheet(year, 0);
  } else {
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);
  }
  var data = JSON.parse(e.postData.contents);
  var rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return ContentService.createTextOutput("success");

  // 헤더 정의
  var HEADERS = ['등록일', '최근업데이트', '고객명', '연락처', '이메일', '총주문수', '총누적금액', '최근주문내역', '메모'];

  // 헤더가 없으면 1행에 추가하고 고정
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e0f2fe");
  }

  var phoneColIdx = HEADERS.indexOf('연락처');
  var orderLogIdx = HEADERS.indexOf('최근주문내역');

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowValues = HEADERS.map(function(h) {
      if (h === '등록일') return row['created_at'] || new Date().toISOString();
      return row[h] !== undefined ? row[h] : ''; 
    });

    var found = false;
    var allData = sheet.getDataRange().getValues();
    
    // 연락처 매칭
    if (phoneColIdx >= 0 && row['연락처']) {
      for (var r = 1; r < allData.length; r++) {
        if (String(allData[r][phoneColIdx]) === String(row['연락처'])) {
          found = true;
          // 주문내역이 존재하면 기존 내역 맨 위에 추가 (줄바꿈)
          if (row['최근주문내역']) {
            var existingLog = allData[r][orderLogIdx] || "";
            if (existingLog.indexOf(row['최근주문내역']) === -1) {
              rowValues[orderLogIdx] = row['최근주문내역'] + (existingLog ? "\\n" + existingLog : "");
            } else {
              rowValues[orderLogIdx] = existingLog; // 중복 방지
            }
          }
          sheet.getRange(r + 1, 1, 1, HEADERS.length).setValues([rowValues]);
          break;
        }
      }
    }

    if (!found) {
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1, 1, HEADERS.length).setValues([rowValues]);
    }
  }
  return ContentService.createTextOutput("success");
}`;

const EXPENSES_SCRIPT = `function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var year = new Date().getFullYear().toString();
  var sheet = ss.getSheetByName(year);
  if (!sheet) {
    sheet = ss.insertSheet(year, 0);
  } else {
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);
  }
  var data = JSON.parse(e.postData.contents);
  var rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return ContentService.createTextOutput("success");

  var HEADERS = ['등록일', '지출일자', '항목분류', '상세분류', '내역', '금액', '결제수단', '거래처', '증빙자료', '메모'];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#fee2e2");
  }

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowValues = HEADERS.map(function(h) {
      if (h === '등록일') return row['created_at'] || new Date().toISOString();
      return row[h] !== undefined ? row[h] : ''; 
    });
    sheet.appendRow(rowValues);
  }
  return ContentService.createTextOutput("success");
}`;

function ScriptBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("복사에 실패했습니다.");
    }
  };

  return (
    <div className="relative mt-2 mb-4">
      <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2 h-8"
        onClick={copyToClipboard}
      >
        {copied ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "복사완료" : "코드 복사"}
      </Button>
    </div>
  );
}

function GuideModal() {
  return (
    <Dialog>
      <DialogTrigger className="ml-4 h-8 inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-blue-600 text-white hover:bg-blue-700 shadow-md px-4 py-2 animate-pulse">
        <Info className="w-4 h-4 mr-1.5" />
        자세한 연동 방법 (필독)
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl text-slate-800">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
            구글 시트 연동 상세 가이드
          </DialogTitle>
          <DialogDescription className="text-sm">
            앱스 스크립트(Apps Script)를 이용하여 주문 현황과 고객 명단을 내 구글 시트로 자동 전송하는 방법입니다. 주문용과 고객용 각각 동일한 방법으로 적용하시면 됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 text-slate-700 text-sm">
          <section className="space-y-2">
            <h4 className="font-bold text-base text-slate-900 border-b pb-1">1단계: 구글 시트 준비하기</h4>
            <p>1. <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google 스프레드시트</a>에 접속하여 <strong>내용이 없는 새 스프레드시트</strong>를 만듭니다.</p>
            <p>2. 원하시는 시트의 제목(예: <em>"플로싱크 주문관리"</em>)을 입력해둡니다.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-slate-900 border-b pb-1">2단계: Apps Script에 코드 복사하기</h4>
            <p>1. 구글 시트 상단 메뉴에서 <strong>[확장 프로그램] → [Apps Script]</strong>를 클릭합니다.</p>
            <p>2. 새로운 탭으로 열리는 Apps Script 편집창에서 기존에 적혀있는 코드를 모두 지웁니다.</p>
            <p>3. 본 화면으로 돌아와 <strong>[코드 복사]</strong> 버튼을 눌러 스크립트 코드를 복사합니다.</p>
            <p>4. 다시 Apps Script 화면에 복사한 코드를 <strong>붙여넣기</strong> 합니다.</p>
            <p>5. 상단 메뉴의 <strong>플로피 디스크 아이콘(💾 저장)</strong> 버튼을 눌러 프로젝트를 저장합니다.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-slate-900 border-b pb-1">3단계: 스크립트 배포 및 웹훅 주소 받기</h4>
            <p>1. Apps Script 창 우측 상단의 파란색 <strong>[배포]</strong> 버튼을 누르고 <strong>[새 배포]</strong>를 선택합니다.</p>
            <p>2. 톱니바퀴 아이콘(⚙️)을 눌러 유형 선택에서 <strong>[웹 앱]</strong>을 선택합니다.</p>
            <p>3. 구성 설정에서 아래와 같이 선택하세요:</p>
            <ul className="list-disc pl-5 space-y-1 bg-slate-50 p-3 rounded-md">
              <li><strong>설명:</strong> (비워두셔도 됩니다)</li>
              <li><strong>실행하는 사용자:</strong> <span className="font-semibold text-red-600">나 (본인 이메일)</span></li>
              <li><strong>액세스 권한이 있는 사용자:</strong> <span className="font-semibold text-red-600">모든 사용자</span></li>
            </ul>
            <p>4. 우측 하단의 <strong>[배포]</strong> 버튼을 클릭합니다.</p>
            <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
              ※ 만약 '승인 필요' 창이 뜨면 <strong>[접근 승인]</strong> → 본인 구글 계정 선택 → <strong>[고급]</strong> → <strong>[제목 없는 프로젝트(으)로 이동(안전하지 않음)]</strong> → <strong>[허용]</strong> 순서로 진행해주세요.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-slate-900 border-b pb-1">4단계: 웹훅 URL 저장하기</h4>
            <p>1. 배포가 완료되면 <strong>'웹 앱' URL 주소</strong>가 나타납니다. 해당 주소 옆의 <strong>[복사]</strong> 버튼을 누릅니다.</p>
            <p className="break-all text-xs text-slate-400">예시: https://script.google.com/macros/s/.../exec</p>
            <p>2. 다시 본 설정 화면으로 돌아와 복사한 주소를 <strong>[웹훅 URL (Apps Script 배포 URL)]</strong> 입력창에 붙여넣습니다.</p>
            <p>3. <strong>[설정 저장하기]</strong> 버튼을 누르면 연동이 완료됩니다!</p>
          </section>

          <section className="bg-blue-50 p-4 rounded-lg space-y-2 text-slate-800">
            <p className="font-semibold text-blue-900 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              참고사항
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>헤더 행(1행)은 주문 또는 고객 등록 시 자동으로 생성됩니다.</li>
              <li>신규 데이터는 항상 2행에 새롭게 추가되어 최신 내역을 가장 위에서 볼 수 있습니다.</li>
              <li>데이터가 연동된 후에는 빈 열이나 다른 시트에 자유롭게 메모와 수식을 추가하셔도 좋습니다.</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationsTab({ tenantId }: { tenantId: string }) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Orders
  const [ordersWebhookUrl, setOrdersWebhookUrl] = useState("");
  const [ordersSheetUrl, setOrdersSheetUrl] = useState("");
  const [customersWebhookUrl, setCustomersWebhookUrl] = useState("");
  const [customersSheetUrl, setCustomersSheetUrl] = useState("");
  const [expensesWebhookUrl, setExpensesWebhookUrl] = useState("");
  const [expensesSheetUrl, setExpensesSheetUrl] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("gsheet_orders_webhook_url, gsheet_orders_sheet_url, gsheet_customers_webhook_url, gsheet_customers_sheet_url, gsheet_expenses_webhook_url, gsheet_expenses_sheet_url")
          .eq("id", tenantId)
          .single();

        if (error) throw error;
        
        if (data) {
          setOrdersWebhookUrl(data.gsheet_orders_webhook_url || "");
          setOrdersSheetUrl(data.gsheet_orders_sheet_url || "");
          setCustomersWebhookUrl(data.gsheet_customers_webhook_url || "");
          setCustomersSheetUrl(data.gsheet_customers_sheet_url || "");
          setExpensesWebhookUrl(data.gsheet_expenses_webhook_url || "");
          setExpensesSheetUrl(data.gsheet_expenses_sheet_url || "");
        }
      } catch (err) {
        console.error("Failed to load integrations", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [tenantId, supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          gsheet_orders_webhook_url: ordersWebhookUrl.trim(),
          gsheet_orders_sheet_url: ordersSheetUrl.trim(),
          gsheet_customers_webhook_url: customersWebhookUrl.trim(),
          gsheet_customers_sheet_url: customersSheetUrl.trim(),
          gsheet_expenses_webhook_url: expensesWebhookUrl.trim(),
          gsheet_expenses_sheet_url: expensesSheetUrl.trim(),
        })
        .eq("id", tenantId);

      if (error) throw error;
      toast.success("구글 시트 연동 설정이 저장되었습니다.");
    } catch (err) {
      console.error(err);
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">로딩중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold flex items-center mb-1">
          <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
          구글 시트 자동 연동 (Google Sheets)
          <GuideModal />
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          주문 현황, 지출 관리, 고객 데이터 등 구글 시트로 자동 동기화할 수 있습니다. 각 항목별로 스크립트를 복사해서 적용해주세요.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-start">
          <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block mb-1">주의사항</span>
            자동저장되는 시트의 데이터는 직접 가공시 이상이 생길 수 있으니 꼭 시트 복사 후 가공해 주세요~
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 주문 현황 연동 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-base flex items-center justify-between">
              주문 현황 연동
              {ordersSheetUrl && (
                <Button variant="outline" size="sm" className="h-7 text-xs bg-white p-0">
                  <a href={ordersSheetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center w-full h-full px-3">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    시트 바로가기
                  </a>
                </Button>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              새로운 주문이 들어오거나 상태가 변경될 때 구글 시트의 2행에 자동으로 업데이트됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">1. 앱스 스크립트 코드 복사</Label>
              <p className="text-[11px] text-slate-500 mb-2">구글 시트의 [확장 프로그램] - [Apps Script]에 복사하여 붙여넣고 배포하세요.</p>
              <ScriptBox code={ORDERS_SCRIPT} />
            </div>
            
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">2. 웹훅 URL (Apps Script 배포 URL)</Label>
                <Input 
                  placeholder="https://script.google.com/macros/s/.../exec" 
                  value={ordersWebhookUrl}
                  onChange={(e) => setOrdersWebhookUrl(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">3. 시트 열람용 주소 (옵션)</Label>
                <Input 
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit" 
                  value={ordersSheetUrl}
                  onChange={(e) => setOrdersSheetUrl(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 고객 관리 연동 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-base flex items-center justify-between">
              고객 관리 연동
              {customersSheetUrl && (
                <Button variant="outline" size="sm" className="h-7 text-xs bg-white p-0">
                  <a href={customersSheetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center w-full h-full px-3">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    시트 바로가기
                  </a>
                </Button>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              고객이 등록되거나 방문할 때 자동으로 고객 명단이 시트에 업데이트됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">1. 앱스 스크립트 코드 복사</Label>
              <p className="text-[11px] text-slate-500 mb-2">고객용 구글 시트를 따로 만들고, 동일하게 Apps Script에 코드를 배포하세요.</p>
              <ScriptBox code={CUSTOMERS_SCRIPT} />
            </div>
            
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">2. 웹훅 URL (Apps Script 배포 URL)</Label>
                <Input 
                  placeholder="https://script.google.com/macros/s/.../exec" 
                  value={customersWebhookUrl}
                  onChange={(e) => setCustomersWebhookUrl(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">3. 시트 열람용 주소 (옵션)</Label>
                <Input 
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit" 
                  value={customersSheetUrl}
                  onChange={(e) => setCustomersSheetUrl(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 지출 관리 연동 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-base flex items-center justify-between">
              지출 관리 연동
              {expensesSheetUrl && (
                <Button variant="outline" size="sm" className="h-7 text-xs bg-white p-0">
                  <a href={expensesSheetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center w-full h-full px-3">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    시트 바로가기
                  </a>
                </Button>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              새로운 지출 내역을 구글 시트에 자동으로 기록합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">1. 앱스 스크립트 코드 복사</Label>
              <p className="text-[11px] text-slate-500 mb-2">지출 현황 구글 시트를 새로 만들고 파일에게 Apps Script로 코드를 배포하세요.</p>
              <ScriptBox code={EXPENSES_SCRIPT} />
            </div>
            
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">2. 웹훅 URL (Apps Script 배포 URL)</Label>
                <Input 
                  placeholder="https://script.google.com/macros/s/.../exec" 
                  value={expensesWebhookUrl}
                  onChange={(e) => setExpensesWebhookUrl(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">3. 시트 열람용 주소 (옵션)</Label>
                <Input 
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit" 
                  value={expensesSheetUrl}
                  onChange={(e) => setExpensesSheetUrl(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "저장 중..." : "설정 저장하기"}
        </Button>
      </div>
    </div>
  );
}
