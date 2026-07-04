# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "docs" / "floxync-manual.html"
html = p.read_text(encoding="utf-8")

start = '        <div id="settings-automation" class="anchor-offset mb-16">'
end = '        <div id="settings-security" class="anchor-offset mb-16 opacity-60">'

i0 = html.find(start)
i1 = html.find(end)
if i0 < 0 or i1 < 0 or i1 <= i0:
    raise SystemExit(f"markers not found: {i0}, {i1}")

stub = '''        <div id="settings-automation" class="anchor-offset mb-16 opacity-75">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2 text-slate-600">
            <span class="w-1.5 h-6 bg-slate-300 rounded-full"></span> 1-7. 연동 및 자동화
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 ml-2">준비중</span>
          </h3>
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-sm">
            <p class="text-sm text-slate-600 mb-4 leading-relaxed">환경 설정 왼쪽 탭에 <strong>연동 및 자동화</strong> 메뉴가 보이지만, 지금은 앱에서 <strong>준비중</strong>으로 표시됩니다. 쇼핑몰·문자(솔라피 등)·국가별 연동 안내는 <strong>추후 매뉴얼에 추가</strong>할 예정이니, 당분간 이 절은 건너뛰셔도 됩니다.</p>
            <p class="text-xs text-slate-500">지금 당장 필요한 설정은 <a href="#settings-printer" class="text-emerald-700 underline">프린터/브릿지</a> · <a href="#settings-delivery" class="text-emerald-700 underline">배송</a> · <a href="#settings-store" class="text-emerald-700 underline">상점 정보</a>를 먼저 보세요.</p>
          </div>
        </div>
'''

html = html[:i0] + stub + html[i1:]
p.write_text(html, encoding="utf-8")
print("replaced settings-automation section")
