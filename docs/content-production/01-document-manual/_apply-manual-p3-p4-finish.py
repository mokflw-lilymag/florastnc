# -*- coding: utf-8
"""P3 revenue + order dialogs + P4 HQ registries — finish manual v4.5"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
MANUAL = ROOT / "docs" / "floxync-manual.html"
PACK = ROOT / "pack" / "wrap" / "next-standalone" / "docs" / "floxync-manual.html"


def main():
    text = MANUAL.read_text(encoding="utf-8")

    # --- revenue-engine anchor ids ---
    text = text.replace(
        '<h3 class="text-xl font-black text-slate-900 mb-4">상단 Auto-Pilot 스위치</h3>',
        '<h3 id="nav-revenue-autopilot" class="text-xl font-black text-slate-900 mb-4">상단 Auto-Pilot 스위치</h3>',
    )
    text = text.replace(
        '<h3 class="text-xl font-black text-slate-900 mb-4">설정 · 메시지 템플릿</h3>',
        '<h3 id="nav-revenue-templates" class="text-xl font-black text-slate-900 mb-4">설정 · 메시지 템플릿</h3>',
    )
    text = text.replace(
        '<h3 class="text-xl font-black text-violet-900 mb-4">Instagram 계정 연결 (SNS Auto-Pilot · PRO)</h3>',
        '<h3 id="nav-revenue-instagram" class="text-xl font-black text-violet-900 mb-4">Instagram 계정 연결 (SNS Auto-Pilot · PRO)</h3>',
    )
    text = text.replace(
        '<h3 class="text-xl font-black text-slate-500 mb-4">문자·알림 발송</h3>',
        '<h3 id="nav-revenue-sms" class="text-xl font-black text-slate-500 mb-4">문자·알림 발송</h3>',
    )

    # --- nav-revenue expand ---
    old_revenue = """        <!-- 매출 캘린더 -->
        <article id="nav-revenue" class="anchor-offset mb-20 border border-emerald-200 rounded-3xl p-8 md:p-10 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 shadow-md">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <h3 class="text-2xl font-black text-emerald-900 tracking-tight">매출 캘린더</h3>
            <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">NEW · 메인</span>
          </div>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/revenue</code></p>
          <p class="text-sm text-slate-700 mb-6 leading-relaxed"><strong>개요</strong> 기념일 D-7 · 구매 후 문자 · SNS AI 초안 · Floxync 귀속 매출을 <strong>한 화면</strong>에서 관리합니다. 왼쪽 사이드바 <strong>마케팅</strong> 그룹의 첫 메뉴입니다.</p>
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            <div class="p-4 rounded-xl bg-white border border-emerald-100 text-sm text-slate-700 leading-relaxed">
              <strong class="text-emerald-800">이용 순서</strong>
              <ol class="mt-2 space-y-1 list-decimal pl-4 text-xs">
                <li>고객 CRM에서 기념일·마케팅 동의 등록</li>
                <li>Auto-Pilot 스위치 ON (기념일 D-7 · 구매 후)</li>
                <li>설정에서 메시지 템플릿 확인·수정</li>
                <li>(PRO) Instagram 계정 연결 → SNS Auto-Pilot</li>
              </ol>
            </div>
            <div class="p-4 rounded-xl bg-emerald-900 text-white text-sm leading-relaxed">
              <strong class="text-emerald-200">문자 발송</strong>
              <p class="mt-2 text-xs text-emerald-50">자동 문자(솔라피 등) 연동은 <strong>추후 제공 예정</strong>입니다. 지금은 문구·스케줄·고객 기념일을 먼저 준비하세요. 상세는 <a href="#revenue-engine" class="underline text-white">3-2. 매출 캘린더</a> 참고.</p>
            </div>
          </div>
          <p class="text-xs text-slate-500">예전 <strong>AI 홍보 마스터</strong>만 쓰던 SNS·자동화 흐름은 여기로 통합되었습니다.</p>
        </article>"""

    new_revenue = """        <!-- 매출 캘린더 P3 -->
        <article id="nav-revenue" class="anchor-offset mb-20 border border-emerald-200 rounded-3xl p-8 md:p-10 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 shadow-md">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <h3 class="text-2xl font-black text-emerald-900 tracking-tight">매출 캘린더</h3>
            <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">P3 · v4.5</span>
          </div>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/revenue</code> · 마케팅 그룹 첫 메뉴</p>
          <p class="text-sm text-slate-700 mb-6">기념일 D-7 · 구매 후 · SNS 초안 · 성과 리포트 · (PRO) 재고 플래시. CRM <a href="#nav-customers" class="underline">기념일·마케팅 동의</a>와 연동.</p>
          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mb-6">📖 장문 설명·스크린샷: <a href="#revenue-engine" class="underline font-semibold">3-2장 매출 캘린더</a></p>
          <table class="w-full text-xs md:text-sm border border-emerald-200 rounded-xl mb-6">
            <thead class="bg-emerald-50"><tr><th class="p-2">앵커</th><th class="p-2">구역</th><th class="p-2">주요 버튼·스위치</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-mono text-[10px]"><a href="#nav-revenue-autopilot" class="underline">autopilot</a></td><td class="p-2 font-semibold">Auto-Pilot 탭</td><td class="p-2">기념일 D-7 · 구매 후 · SNS 초안 · 성과 · 재고 플래시 ON/OFF</td></tr>
              <tr class="border-t"><td class="p-2 font-mono text-[10px]"><a href="#nav-revenue-templates" class="underline">templates</a></td><td class="p-2 font-semibold">설정 패널</td><td class="p-2">4종 메시지 템플릿 수정·저장</td></tr>
              <tr class="border-t"><td class="p-2 font-mono text-[10px]"><a href="#nav-revenue-instagram" class="underline">instagram</a></td><td class="p-2 font-semibold">SNS Auto-Pilot</td><td class="p-2">Instagram 계정 연결 · 승인/자동 게시</td></tr>
              <tr class="border-t"><td class="p-2 font-mono text-[10px]"><a href="#nav-revenue-sms" class="underline">sms</a></td><td class="p-2 font-semibold">문자 발송</td><td class="p-2">솔라피 연동 <strong>추후 예정</strong></td></tr>
              <tr class="border-t"><td class="p-2 font-mono text-[10px]">—</td><td class="p-2 font-semibold">SNS 초안 탭</td><td class="p-2">완료 주문 선택 → AI 생성 → <strong>복사</strong></td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">레거시 <a href="#nav-marketing" class="underline">AI 홍보 마스터</a>는 통합됨 · 구독: <a href="#nav-subscription" class="underline">PRO</a></p>
        </article>"""

    if old_revenue in text:
        text = text.replace(old_revenue, new_revenue)

    # --- outsource dialog ---
    outsource_dialog = """
          <h4 id="nav-outsource-dialog" class="text-base font-black text-amber-900 mt-6 mb-3">다이얼로그 버튼 레지스트리</h4>
          <table class="w-full text-xs md:text-sm border border-amber-200 rounded-xl mb-4">
            <thead class="bg-amber-50"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th><th class="p-2">연동</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">외부발주처 선택</td><td class="p-2"><a href="#nav-suppliers" class="underline">거래처</a> 검색</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">외주 단가 · 고객 정보 숨기기</td><td class="p-2">금액·개인정보 마스킹</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">텍스트 복사 · 이미지 복사</td><td class="p-2">발주 인수증 → 카톡·문자</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">외부발주주문 / 수정</td><td class="p-2">저장</td><td class="p-2"><a href="#nav-expenses" class="underline">지출</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">외부발주 취소</td><td class="p-2">기존 발주 철회</td><td class="p-2">—</td></tr>
            </tbody>
          </table>"""

    if "nav-outsource-dialog" not in text:
        text = text.replace(
            '          <div class="p-3 bg-amber-100/60 rounded-lg text-xs text-amber-950"><strong>팁:</strong> 고객 정보 숨기기',
            outsource_dialog + '\n          <div class="p-3 bg-amber-100/60 rounded-lg text-xs text-amber-950"><strong>팁:</strong> 고객 정보 숨기기',
        )

    # --- partner dialog ---
    partner_dialog = """
          <h4 id="nav-partner-order-dialog" class="text-base font-black text-violet-900 mt-6 mb-3">발주 다이얼로그 (회원사 수발주 발주)</h4>
          <table class="w-full text-xs md:text-sm border border-violet-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">수주 꽃집 검색·선택</td><td class="p-2">FloXync 가입 매장 목록</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수주 금액 · 비고</td><td class="p-2">정산 금액·전달사항</td></tr>
              <tr class="border-t bg-violet-50/40"><td class="p-2 font-semibold">회원사 발주 전송</td><td class="p-2">수주 매장 알림 → 수락/반려</td></tr>
            </tbody>
          </table>"""

    if "nav-partner-order-dialog" not in text:
        text = text.replace(
            '          <p class="text-xs text-slate-500">환경 설정 → <strong>회원사 수발주</strong> 탭에서',
            partner_dialog + '\n          <p class="text-xs text-slate-500">환경 설정 → <strong>회원사 수발주</strong> 탭에서',
        )

    # --- branch transfer dialog in nav-branch-transfer ---
    transfer_dialog = """
          <h4 id="nav-branch-transfer-dialog" class="text-base font-black text-blue-900 mt-6 mb-3">지점 이관 다이얼로그</h4>
          <table class="w-full text-xs md:text-sm border border-blue-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">이관할 지점 (수주처)</td><td class="p-2">같은 조직 지점만</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">이관 사유</td><td class="p-2">필수</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">정산 금액 분배 (%)</td><td class="p-2">발주지점 / 수주지점 합 100%</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">비고</td><td class="p-2">수주 지점 전달사항</td></tr>
              <tr class="border-t bg-blue-50/40"><td class="p-2 font-semibold">이관 요청</td><td class="p-2">수주 지점 수락/반려 · 인쇄 가능</td></tr>
            </tbody>
          </table>"""

    if "nav-branch-transfer-dialog" not in text:
        text = text.replace(
            '          <p class="text-xs text-slate-500">4장 요약: <a href="#nav-branch-transfer"',
            transfer_dialog + '\n          <p class="text-xs text-slate-500">4장 요약: <a href="#nav-branch-transfer"',
        )

    # --- HQ overview registry ---
    hq_overview = """
        <article id="hq-hq-dashboard" class="anchor-offset mb-16 border border-indigo-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-indigo-900 mb-2">5-2b. 본사 개요 (`/dashboard/hq`)</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">v4.5 · 본사 담당자·대표 점주</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <thead class="bg-indigo-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">KPI</td><td class="p-2 font-semibold">전 지점 매출·지출·순이익·마진</td><td class="p-2">조회 기간 기준</td></tr>
              <tr class="border-t"><td class="p-2">차트</td><td class="p-2 font-semibold">일/주/월/년 · 지점별 스택</td><td class="p-2">추이</td></tr>
              <tr class="border-t"><td class="p-2">표</td><td class="p-2 font-semibold">지점별 행 클릭</td><td class="p-2"><code>/dashboard/hq/branches/{id}</code></td></tr>
              <tr class="border-t"><td class="p-2">랭킹</td><td class="p-2 font-semibold">베스트 자재·상품 · 지점 스위처</td><td class="p-2">전 지점 / 개별</td></tr>
              <tr class="border-t"><td class="p-2">수령</td><td class="p-2 font-semibold">배송·픽업·매장 비율</td><td class="p-2">통계</td></tr>
            </tbody>
          </table>
        </article>

        <article id="hq-shared-products" class="anchor-offset mb-16 border border-slate-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-slate-900 mb-2">5-2c. 공동상품·자재·카테고리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4"><code>/dashboard/hq/shared-products</code></p>
          <p class="text-sm text-slate-700 mb-4">본사 마스터 상품·자재·카테고리 생성 → <strong>여러 지점에 배포</strong>. 탭: 상품 / 자재 / 카테고리.</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">추가 · 수정 · 삭제</td><td class="p-2">마스터 CRUD</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">지점 배포</td><td class="p-2">선택 지점에 동기화</td></tr>
            </tbody>
          </table>
        </article>

        <article id="hq-branch-expenses" class="anchor-offset mb-16 border border-rose-100 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-rose-900 mb-2">5-2d. 지점별 지출 관제탑</h3>
          <p class="text-xs font-mono text-slate-500 mb-4"><code>/dashboard/hq/branch-expenses</code></p>
          <p class="text-sm text-slate-700 mb-4">지점별 지출·자재 매입 비교 · 시즌·연도 필터 · 상세 드릴다운.</p>
        </article>

        <article id="hq-material-requests" class="anchor-offset mb-16 border border-teal-100 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-teal-900 mb-2">5-2e. 자재 요청·취합 (본사)</h3>
          <p class="text-xs font-mono text-slate-500 mb-4"><code>/dashboard/hq/material-requests</code> · 지점 요청: <code>/dashboard/material-requests</code></p>
          <table class="w-full text-xs md:text-sm border border-teal-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">지점별 요청 목록</td><td class="p-2">취합·상태</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">이행 처리 · 거절</td><td class="p-2">본사 승인 워크플로</td></tr>
            </tbody>
          </table>
        </article>
"""

    if "hq-hq-dashboard" not in text:
        text = text.replace(
            "        <!-- 5-3 본사 담당자 -->",
            hq_overview + "\n        <!-- 5-3 본사 담당자 -->",
        )

    # --- hq team registry ---
    if "hq-org-team-fields" not in text:
        text = text.replace(
            '          <ol class="list-decimal pl-5 space-y-2 text-sm text-slate-700">\n            <li><strong>본사 담당자 관리</strong> 메뉴 진입</li>',
            """          <h4 id="hq-org-team-fields" class="text-base font-black text-indigo-900 mb-3">버튼 레지스트리</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">담당자 추가</td><td class="p-2">이메일 입력 DLG</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">삭제</td><td class="p-2">추가 담당자 1명만 (대표 점주 제외)</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">슬롯 1/1</td><td class="p-2">추가 한도</td></tr>
            </tbody>
          </table>
          <ol class="list-decimal pl-5 space-y-2 text-sm text-slate-700">
            <li><strong>본사 담당자 관리</strong> 메뉴 진입</li>""",
        )

    # --- hq transfers registry ---
    if "hq-transfers-fields" not in text:
        text = text.replace(
            '          <p class="text-sm text-slate-700 mb-4 leading-relaxed">본사 담당자가 <strong>모든 지점의 지점 이관</strong>을 한곳에서 봅니다.',
            """          <h4 id="hq-transfers-fields" class="text-base font-black text-indigo-900 mb-3">화면 레지스트리</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">통계 4카드</td><td class="p-2">총 이관 · 승인 대기 · 수락 · 완료</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">새로고침</td><td class="p-2">목록 갱신</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">표 열</td><td class="p-2">일시 · 발주/수주 지점 · 원금 · 분배% · 정산금 · 상태</td></tr>
            </tbody>
          </table>
          <p class="text-sm text-slate-700 mb-4 leading-relaxed">본사 담당자가 <strong>모든 지점의 지점 이관</strong>을 한곳에서 봅니다.""",
        )

    # --- version ---
    text = text.replace(
        "v4.4 (2026-07) · P0~P1 · PR 리본 · P2 CRM·재고·지출",
        "v4.5 (2026-07) · 테넌트 백과 완료 · 본사 5장 · PNG 촬영만 남음",
    )
    text = text.replace(
        "<strong>v4.4:</strong> PR 리본 레지스트리 · P2 상품·재고·거래처·매입·정산·통계·세무·지출 필터 · CRM·일일마감 헤더 보강.",
        "<strong>v4.5:</strong> P3 매출 캘린더 zone · 발주 3종 DLG · P4 본사 HQ 화면 레지스트리. 사장님 PNG 촬영만 남음.",
    )

    # sidebar HQ sub links
    if "hq-hq-dashboard" not in text.split("</aside>")[0]:
        text = text.replace(
            '           <li><a href="#hq-org-menu" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">5-2. 본사·지점 메뉴 지도</a></li>',
            '           <li><a href="#hq-org-menu" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">5-2. 본사·지점 메뉴 지도</a></li>\n           <li><a href="#hq-hq-dashboard" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 본사 개요 KPI</a></li>\n           <li><a href="#hq-transfers-settlement" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 이관 정산</a></li>',
        )
    text = text.replace(
        '           <li><a href="#nav-revenue" class="flex items-center gap-2 p-2 text-emerald-800 font-semibold rounded-lg sidebar-link anchor-offset"><span>매출 캘린더</span>',
        '           <li><a href="#nav-revenue" class="flex items-center gap-2 p-2 text-emerald-800 font-semibold rounded-lg sidebar-link anchor-offset"><span>매출 캘린더 (P3)</span>',
    )

    MANUAL.write_text(text, encoding="utf-8")
    print(f"Updated {MANUAL}")
    if PACK.parent.exists():
        PACK.write_text(text, encoding="utf-8")
        print(f"Synced {PACK}")


if __name__ == "__main__":
    main()
