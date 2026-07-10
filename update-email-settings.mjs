import fs from 'fs';

let content = fs.readFileSync('src/app/dashboard/settings/components/EmailSettingsCard.tsx', 'utf8');

// Update imports
if (!content.includes('Plus')) {
  content = content.replace(
    'import { Mail, Save, Loader2, Info, CalendarClock, Send } from "lucide-react";',
    'import { Mail, Save, Loader2, Info, CalendarClock, Send, Plus, Trash2, Edit2 } from "lucide-react";'
  );
}

// Update handleSave
content = content.replace(
  "marketingEmailAutoFirstPurchase: local.marketingEmailAutoFirstPurchase,",
  "marketingEmailAutoFirstPurchase: local.marketingEmailAutoFirstPurchase,\n        marketingAdTemplates: local.marketingAdTemplates,"
);

// Update handleBulkSend signature
content = content.replace(
  "const handleBulkSend = async (type: 'dayOf' | 'd7' | 'firstPurchase') => {",
  "const handleBulkSend = async (type: 'dayOf' | 'd7' | 'firstPurchase' | 'custom_ad', templateId?: string) => {"
);
content = content.replace(
  "body: JSON.stringify({ type })",
  "body: JSON.stringify({ type, templateId })"
);

// Inject the Ad Templates UI before the Save Templates button
const adTemplatesUI = `
        <Separator className="my-6" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{tr("광고/마케팅 전용 템플릿 (대량 발송용)", "Ad/Marketing Templates")}</h3>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              const newTemplate = {
                id: crypto.randomUUID(),
                name: '새 광고 템플릿',
                subject: '[{회사명}] 새로운 이벤트 안내!',
                content: DEFAULT_EMAIL_TEMPLATE_FIRST_PURCHASE // placeholder
              };
              patch({ marketingAdTemplates: [...(local.marketingAdTemplates || []), newTemplate] });
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> 새 템플릿 추가
          </Button>
        </div>
        <p className="text-sm text-slate-500 mb-4">전체 발송은 이 광고/마케팅 전용 템플릿으로만 가능합니다.</p>

        <div className="space-y-4">
          {(local.marketingAdTemplates || []).map((template, index) => (
            <div key={template.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Label className="font-semibold w-24">템플릿명</Label>
                <Input 
                  value={template.name} 
                  onChange={(e) => {
                    const newTemplates = [...local.marketingAdTemplates];
                    newTemplates[index] = { ...template, name: e.target.value };
                    patch({ marketingAdTemplates: newTemplates });
                  }}
                  placeholder="템플릿 이름 (예: 봄맞이 이벤트)"
                />
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => {
                  if (confirm('이 템플릿을 삭제하시겠습니까?')) {
                    patch({ marketingAdTemplates: local.marketingAdTemplates.filter(t => t.id !== template.id) });
                  }
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-semibold w-24">메일 제목</Label>
                <Input 
                  value={template.subject} 
                  onChange={(e) => {
                    const newTemplates = [...local.marketingAdTemplates];
                    newTemplates[index] = { ...template, subject: e.target.value };
                    patch({ marketingAdTemplates: newTemplates });
                  }}
                  placeholder="메일 제목"
                />
              </div>

              <div className="pt-2 border-t mt-4">
                <EmailTemplateEditor
                  templateName={template.name}
                  value={template.content}
                  onChange={(v) => {
                    const newTemplates = [...local.marketingAdTemplates];
                    newTemplates[index] = { ...template, content: v };
                    patch({ marketingAdTemplates: newTemplates });
                  }}
                  variables={["고객명", "회사명", "보유포인트", "포인트안내", "설명"]}
                  defaultTemplate={DEFAULT_EMAIL_TEMPLATE_FIRST_PURCHASE}
                  sampleData={templatePreviewSample}
                  shopLogoUrl={tenantLogoUrl}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  size="sm" 
                  variant="default" 
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => handleBulkSend('custom_ad', template.id)}
                >
                  <Send className="h-3.5 w-3.5" /> 이 템플릿으로 전체 발송
                </Button>
              </div>
            </div>
          ))}
          {(!local.marketingAdTemplates || local.marketingAdTemplates.length === 0) && (
            <div className="text-center p-8 border border-dashed rounded-lg text-slate-500">
              저장된 광고/마케팅 템플릿이 없습니다. 새 템플릿을 추가해주세요.
            </div>
          )}
        </div>

        <Separator className="my-6" />
`;

content = content.replace(
  '<Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">',
  adTemplatesUI + '\n        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">'
);

fs.writeFileSync('src/app/dashboard/settings/components/EmailSettingsCard.tsx', content);
console.log('Update Complete');
