"""Patch floxync-manual.html: sidebar, hub grid, settings-delivery, png->svg, nav-notifications."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "docs" / "floxync-manual.html"
html = path.read_text(encoding="utf-8")

# png -> svg for manual-screenshots
html = re.sub(
    r'(src="manual-screenshots/[^"]+)\.png"',
    r'\1.svg"',
    html,
)

# Sidebar: add S0 + S6-S10
old_sidebar = """           <li><a href="#sit-hub" class="flex items-center p-2 text-sm text-violet-900 font-semibold rounded-lg sidebar-link sit-link anchor-offset">전체 목록</a></li>
           <li><a href="#sit-pos-printer" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S1 영수증·주문서</a></li>"""

new_sidebar = """           <li><a href="#sit-hub" class="flex items-center p-2 text-sm text-violet-900 font-semibold rounded-lg sidebar-link sit-link anchor-offset">전체 목록</a></li>
           <li><a href="#sit-first-day" class="flex items-center p-2 text-sm text-emerald-800 font-semibold rounded-lg sidebar-link sit-link anchor-offset">S0 첫날 30분</a></li>
           <li><a href="#sit-pos-printer" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S1 영수증·주문서</a></li>"""

if old_sidebar in html:
    html = html.replace(old_sidebar, new_sidebar, 1)

old_sidebar_tail = """           <li><a href="#sit-pickup-delivery" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S5 배송 마무리</a></li>
        </ul>"""

new_sidebar_tail = """           <li><a href="#sit-pickup-delivery" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S5 배송 마무리</a></li>
           <li><a href="#sit-mobile-order" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S6 모바일 주문</a></li>
           <li><a href="#sit-daily-settlement" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S7 일일 마감</a></li>
           <li><a href="#sit-ai-order" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S8 AI 주문</a></li>
           <li><a href="#sit-customer-point" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S9 단골·포인트</a></li>
           <li><a href="#sit-revenue-calendar" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link sit-link anchor-offset">S10 매출 캘린더</a></li>
        </ul>"""

if old_sidebar_tail in html:
    html = html.replace(old_sidebar_tail, new_sidebar_tail, 1)

# Hub grid
old_grid = """        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
          <a href="#sit-pos-printer" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm"><span class="font-bold text-violet-900">S1</span> 영수증·주문서 (폰 주문도 출력)</a>"""

new_grid = """        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
          <a href="#sit-first-day" class="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 text-sm sm:col-span-2 lg:col-span-3"><span class="font-bold text-emerald-900">S0</span> 처음이세요? 첫날 30분 체크리스트</a>
          <a href="#sit-pos-printer" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm"><span class="font-bold text-violet-900">S1</span> 영수증·주문서 (폰 주문도 출력)</a>"""

if old_grid in html:
    html = html.replace(old_grid, new_grid, 1)

old_grid_end = """          <a href="#sit-pickup-delivery" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm sm:col-span-2"><span class="font-bold text-violet-900">S5</span> 픽업·배송 끝내기 (실배송비·지출까지)</a>
        </div>"""

new_grid_end = """          <a href="#sit-pickup-delivery" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm"><span class="font-bold text-violet-900">S5</span> 픽업·배송 끝내기</a>
          <a href="#sit-mobile-order" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm"><span class="font-bold text-violet-900">S6</span> 휴대폰 주문</a>
          <a href="#sit-daily-settlement" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm"><span class="font-bold text-violet-900">S7</span> 일일 마감</a>
          <a href="#sit-ai-order" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm"><span class="font-bold text-violet-900">S8</span> AI 주문 붙여넣기</a>
          <a href="#sit-customer-point" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm"><span class="font-bold text-violet-900">S9</span> 단골·포인트</a>
          <a href="#sit-revenue-calendar" class="p-4 rounded-xl bg-white border border-violet-100 hover:border-violet-300 text-sm sm:col-span-2"><span class="font-bold text-violet-900">S10</span> 매출 캘린더 시작</a>
        </div>"""

if old_grid_end in html:
    html = html.replace(old_grid_end, new_grid_end, 1)

# settings-map table S1~S5 -> S0~S10
html = html.replace(
    '<a href="#sit-hub" class="text-violet-700 underline font-bold">⭐ S1~S5</a>',
    '<a href="#sit-hub" class="text-violet-700 underline font-bold">⭐ S0~S10</a>',
)

# settings-delivery full content
old_delivery = """        <div id="settings-delivery" class="anchor-offset mb-16">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-blue-700">
            <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span> 1-3. 배송비 설정
          </h3>
          <div class="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <figure class="manual-figure mb-6">
              <img src="manual-screenshots/settings-03-delivery-fee.svg" alt="배송비 설정" class="manual-shot-img w-full rounded-xl border border-slate-200 shadow-sm bg-white" loading="lazy" />
              <div class="manual-shot-missing hidden w-full min-h-[14rem] img-placeholder rounded-xl"><div class="text-center px-4"><p class="font-mono font-bold text-emerald-700">settings-03-delivery-fee.png</p></div></div>
              <figcaption class="text-xs text-slate-500 mt-2"><code>settings-03-delivery-fee.png</code> — 배송비·거리 설정</figcaption>
            </figure>
            <p class="text-sm text-gray-500 italic">거리에 따른 배송비, 지역별 할증 등을 설정하는 공간입니다. (작성 예정)</p>
          </div>
        </div>"""

new_delivery = """        <div id="settings-delivery" class="anchor-offset mb-16">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-blue-700">
            <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span> 1-3. 배송비 설정
          </h3>
          <p class="text-xs text-violet-800 bg-violet-50 border border-violet-100 px-3 py-2 rounded-lg mb-4 inline-block">⚡ 빠르게: <a href="#sit-delivery-fee" class="underline font-semibold">S3 배송비 규칙</a></p>
          <div class="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <p class="text-sm text-slate-700 mb-6 leading-relaxed">배달을 하시는 매장이라면 <strong>한 번만</strong> 규칙을 넣어 두면, 새 주문할 때 주소만 입력해도 배송비가 자동으로 채워집니다.</p>
            <figure class="manual-figure mb-6">
              <img src="manual-screenshots/settings-03-delivery-fee.svg" alt="배송비 설정" class="manual-shot-img w-full rounded-xl border border-slate-200 shadow-sm bg-white" loading="lazy" />
              <figcaption class="text-xs text-slate-500 mt-2">환경 설정 → <strong>배송</strong> 탭</figcaption>
            </figure>
            <ol class="list-decimal pl-5 space-y-2 text-sm text-slate-700 mb-6">
              <li>왼쪽 맨 아래 <strong>환경 설정</strong> 클릭</li>
              <li>왼쪽 탭에서 <strong>배송</strong> 선택</li>
              <li><strong>기본 배송비</strong> — 목록에 없는 지역에 적용할 금액</li>
              <li><strong>무료 배송 기준</strong> — 이 금액 이상 주문이면 배송비 0원 (안 쓰면 0)</li>
              <li><strong>지역별 배송비</strong> — 구·동 이름과 금액을 추가 (예: 강남구 5,000원)</li>
              <li>변경 후 저장 (자동 저장이면 화면에 반영됐는지 확인)</li>
            </ol>
            <div class="p-4 bg-sky-50 rounded-xl border border-sky-100 text-sm text-sky-950">
              <p class="font-bold mb-1">주문할 때 예외가 있으면</p>
              <p>새 주문 화면에서 <strong>배송비 수동</strong> 스위치를 켜고 금액을 직접 바꿀 수 있습니다.</p>
            </div>
          </div>
        </div>"""

if old_delivery in html:
    html = html.replace(old_delivery, new_delivery, 1)
else:
    print("WARN: settings-delivery block not matched exactly")

# nav-notifications after nav-home
nav_notif = """
        <!-- 알림 · 공지 -->
        <article id="nav-notifications" class="anchor-offset mb-16 border border-violet-100 rounded-2xl p-8 bg-gradient-to-b from-white to-violet-50/30 shadow-sm">
          <h3 class="text-xl font-bold text-violet-900 mb-1">알림 · 공지</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/notifications</code> · 상단 종 아이콘</p>
          <figure class="manual-figure mb-4 max-w-2xl">
            <img src="manual-screenshots/nav-notifications.svg" alt="알림 화면" class="manual-shot-img w-full rounded-xl border border-violet-200 bg-white" loading="lazy"/>
          </figure>
          <p class="text-sm text-slate-700 mb-4"><strong>개요</strong> FloXync 본사·플랫폼에서 보내는 <strong>공지</strong>와 매장 관련 알림을 모아 봅니다. 화면 오른쪽 위 <strong>종 모양</strong>을 눌러도 열립니다.</p>
          <p class="text-sm text-slate-700 mb-4"><strong>순서</strong> ① 종 아이콘 또는 왼쪽 <strong>알림</strong> 메뉴 → ② 읽지 않은 항목 확인 → ③ 항목을 눌러 내용 읽기 → ④ 필요하면 관련 화면으로 이동 링크 사용</p>
          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 알림이 안 보이면 브라우저 알림 권한과 로그인 계정(매장)이 맞는지 확인하세요.</div>
        </article>
"""

if 'id="nav-notifications"' not in html:
    needle_nav = '        </article>\n\n        <!-- 새 주문 -->'
    if needle_nav in html:
        # insert after nav-home closing - find nav-home block end
        nav_home_end = """          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 매출 숫자가 기대와 다르면 환경 설정의 <strong>매출 집계 기준</strong>(주문일 vs 결제완료일)을 먼저 확인하세요.</div>
        </article>

        <!-- 새 주문 -->"""
        if nav_home_end in html:
            html = html.replace(
                nav_home_end,
                """          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 매출 숫자가 기대와 다르면 환경 설정의 <strong>매출 집계 기준</strong>(주문일 vs 결제완료일)을 먼저 확인하세요.</div>
        </article>
""" + nav_notif + """
        <!-- 새 주문 -->",
                1,
            )

# nav-map add notifications
html = html.replace(
    '<li><strong>시작</strong>: <code class="bg-white px-1 rounded border">/dashboard</code> 업무 홈 — 오늘 주문·매출·일정 요약과 매출 차트.</li>',
    '<li><strong>시작</strong>: <code class="bg-white px-1 rounded border">/dashboard</code> 업무 홈 — 오늘 주문·매출·일정 요약과 매출 차트. <a href="#nav-notifications" class="text-violet-700 underline font-semibold">알림·공지</a>(상단 종 아이콘).</li>',
)

# nav-new-order quick links
html = html.replace(
    '⚡ 빠르게: <a href="#sit-pickup-delivery" class="underline font-semibold">S5 픽업·배송 마무리</a> · <a href="#sit-delivery-fee" class="underline font-semibold">S3 배송비 설정</a>',
    '⚡ 빠르게: <a href="#sit-ai-order" class="underline font-semibold">S8 AI 주문</a> · <a href="#sit-mobile-order" class="underline font-semibold">S6 모바일 주문</a> · <a href="#sit-pickup-delivery" class="underline font-semibold">S5 배송 마무리</a> · <a href="#sit-delivery-fee" class="underline font-semibold">S3 배송비</a>',
    1,
)

# nav-daily-settlement quick link
if 'sit-daily-settlement' not in html[html.find('id="nav-daily-settlement"'):html.find('id="nav-daily-settlement"')+800]:
    html = html.replace(
        '<article id="nav-daily-settlement" class="anchor-offset mb-16 border border-indigo-100',
        '<article id="nav-daily-settlement" class="anchor-offset mb-16 border border-indigo-100',
        1,
    )
    html = html.replace(
        """        <article id="nav-daily-settlement" class="anchor-offset mb-16 border border-indigo-100 rounded-2xl p-8 bg-gradient-to-b from-white to-indigo-50/40 shadow-sm">
          <h3 class="text-xl font-bold text-indigo-900 mb-1">일일 마감 정산</h3>""",
        """        <article id="nav-daily-settlement" class="anchor-offset mb-16 border border-indigo-100 rounded-2xl p-8 bg-gradient-to-b from-white to-indigo-50/40 shadow-sm">
          <p class="text-xs text-violet-800 bg-violet-50 border border-violet-100 px-3 py-2 rounded-lg mb-4 inline-block">⚡ 빠르게: <a href="#sit-daily-settlement" class="underline font-semibold">S7 일일 마감</a></p>
          <h3 class="text-xl font-bold text-indigo-900 mb-1">일일 마감 정산</h3>""",
        1,
    )

path.write_text(html, encoding="utf-8")
print("patched floxync-manual.html")
