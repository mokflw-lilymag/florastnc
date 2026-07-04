# -*- coding: utf-8 -*-
"""Apply PR ribbon + P2 registry expansions to floxync-manual.html"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
MANUAL = ROOT / "docs" / "floxync-manual.html"
PACK = ROOT / "pack" / "wrap" / "next-standalone" / "docs" / "floxync-manual.html"

PR_REGISTRY = """
          <h4 id="nav-printer-sidebar" class="text-base font-black text-slate-900 mt-8 mb-3">PR-A. 왼쪽 사이드 패널 레지스트리</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">출력 프린터 (녹/빨 점)</td><td class="p-2">브릿지 연결 상태 · Bridge Engine 버전</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">프린터 드롭다운</td><td class="p-2">브릿지가 알려준 기기 선택</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">매장 기본 프린터로 원격 전송</td><td class="p-2">목록 없을 때 예비</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">새로고침 ↻</td><td class="p-2">프린터 목록 재조회</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">브릿지 연결 문제 해결 및 초기화</td><td class="p-2">자가 진단 다이얼로그</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">리본 프리셋</td><td class="p-2">폭·길이·여백 일괄 적용 (꽃다발·근조 등)</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">Xprinter (105mm 이하)</td><td class="p-2">105mm 제한 모드</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">폭 / 길이 (mm)</td><td class="p-2">숫자 미세 조정</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상단·하단여백 · 양쪽레이스</td><td class="p-2">mm 단위 여백</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수평(좌우) 보정</td><td class="p-2">±2mm 슬라이더</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">인쇄 대상</td><td class="p-2">양쪽 / 경조사어 / 보내는이</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">컷 리본 / 롤 리본</td><td class="p-2">롤은 개발중 → 컷 복귀</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">고속 인쇄 / 고급(저속)</td><td class="p-2">품질·속도</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">커팅 Ncm / 커팅 NO</td><td class="p-2">컷 길이 (모드별)</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">좌·우 리본 입력창</td><td class="p-2">경조사 · 보내는이 (ACTIVE 표시)</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">폰트 마법사 · B · 가로%/세로%</td><td class="p-2">한/漢/A/★ 탭 · 굵기 · 비율</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">자주 쓰는 문구 · 톱니</td><td class="p-2">그리드 삽입 · 상용구 관리 DLG</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">특수 기호</td><td class="p-2">커서 위치 삽입</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">내 점포 로고</td><td class="p-2">업로드 · 인쇄 합성 토글 · 삭제</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">Ribbonist 초보자 매뉴얼</td><td class="p-2">앱 내장 도움말</td></tr>
            </tbody>
          </table>

          <h4 id="nav-printer-canvas" class="text-base font-black text-slate-900 mb-3">PR-B. 캔버스</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">좌측 리본 (경조사) / 우측 (보내는이)</td><td class="p-2">두 줄 미리보기</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">글자 클릭</td><td class="p-2">글자 단위 90° 회전 편집</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">Chevron (좁은 화면)</td><td class="p-2">접힌 사이드 패널 다시 열기</td></tr>
            </tbody>
          </table>

          <h4 id="nav-printer-toolbar" class="text-base font-black text-slate-900 mb-3">PR-C. 하단 툴바</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">Templates</td><td class="p-2">저장 템플릿 불러오기</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">Preview / Design</td><td class="p-2">미리보기 ↔ 편집 전환</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">줌 ± (%)</td><td class="p-2">캔버스 확대·축소 (인쇄 해상도 무관)</td></tr>
              <tr class="border-t bg-emerald-50/40"><td class="p-2 font-semibold">PRINT</td><td class="p-2">구독·권한 → 브릿지 전송 (SENDING…)</td></tr>
            </tbody>
          </table>

          <h4 id="nav-printer-dialogs" class="text-base font-black text-slate-900 mb-3">PR-D. 다이얼로그</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">폰트 관리</td><td class="p-2">내 폰트 · Windows 폰트 · 숨기기</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상용구(문구) 관리</td><td class="p-2">카테고리 · 커스텀 저장</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">템플릿 보관함</td><td class="p-2">불러오기 · 삭제</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">브릿지 온보딩/문제해결</td><td class="p-2">재설치 · 설정 초기화</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">무료/구독 제한 모달</td><td class="p-2">ribbon_only · 업그레이드 안내</td></tr>
            </tbody>
          </table>
"""

RIBBON_FROM_ORDER = """
          <h4 id="nav-ribbon-from-order-header" class="text-base font-black text-slate-900 mt-6 mb-3">M13c. 주문→리본 화면 (`/orders/print-ribbon`)</h4>
          <table class="w-full text-xs md:text-sm border border-violet-200 rounded-xl mb-6">
            <thead class="bg-violet-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">돌아가기</td><td class="p-2">이전 화면</td></tr>
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">리본 출력 설정 · 주문번호</td><td class="p-2">제목·연동 주문</td></tr>
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">상세설정</td><td class="p-2">고급 옵션 패널</td></tr>
              <tr class="border-t bg-emerald-50/40"><td class="p-2">헤더</td><td class="p-2 font-semibold">바로 인쇄하기</td><td class="p-2">브릿지 전송</td></tr>
              <tr class="border-t"><td class="p-2">① 문구</td><td class="p-2 font-semibold">축하/근조 문구 · 보내는 분</td><td class="p-2">주문에서 자동 채움 · 수정 가능</td></tr>
              <tr class="border-t"><td class="p-2">② 스타일</td><td class="p-2 font-semibold">폰트 · 크기 · 리본 폭</td><td class="p-2">38/70/100mm</td></tr>
              <tr class="border-t"><td class="p-2">③ 정렬</td><td class="p-2 font-semibold">상단 / 중앙 / 하단</td><td class="p-2">세로 정렬</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500 mb-6">POS 자동 인쇄와 별개 · PC 전용 · <a href="#integration-ribbon-vs-pos" class="underline">연동 한눈에</a></p>
"""

def article_replace(content: str, article_id: str, new_body: str, comment_hint: str = "") -> str:
    pattern = rf'(        <!-- {comment_hint}.*?\n)?        <article id="{article_id}".*?</article>\n'
    m = re.search(pattern, content, flags=re.DOTALL)
    if not m:
        pattern = rf'        <article id="{article_id}".*?</article>\n'
        m = re.search(pattern, content, flags=re.DOTALL)
    if not m:
        raise SystemExit(f"article {article_id} not found")
    return content[: m.start()] + new_body + content[m.end() :]


NAV_HOME_EXTRA = """
          <h4 id="nav-home-greeting" class="text-base font-black text-slate-900 mb-3">인사 · 동기화</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">{매장}님! 오늘 현황</td><td class="p-2">인사말</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">실시간 동기화 활성</td><td class="p-2">동기화 배지</td></tr>
            </tbody>
          </table>
          <h4 id="nav-home-chart" class="text-base font-black text-slate-900 mb-3">매출 차트</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">매출 지표 추이</td><td class="p-2">차트 제목</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">일간 / 주간 / 월간 / 연간</td><td class="p-2">기간 탭</td></tr>
            </tbody>
          </table>
          <h4 id="nav-home-recent-orders" class="text-base font-black text-slate-900 mb-3">최근 주문 · 빠른 작업</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">최근 주문 내역 · 전체보기</td><td class="p-2"><a href="#nav-orders" class="underline">주문 목록</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">주문등록 · 주문목록 · 배송관리 · 재고관리</td><td class="p-2">빠른 작업 카드</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">재고 알림 · 재고 관리 바로가기</td><td class="p-2"><a href="#nav-inventory" class="underline">재고</a></td></tr>
            </tbody>
          </table>
"""

NAV_PRODUCTS = """        <!-- 상품 M09 -->
        <article id="nav-products" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-blue-800 mb-1">상품 · 상품 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/products</code> · M09 · v4.4</p>
          <h4 id="nav-products-header" class="text-base font-black text-slate-900 mb-3">상단</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">카테고리 설정</td><td class="p-2"><a href="#settings-categories" class="underline">분류</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">데이터 다운로드 · 양식 · 가져오기</td><td class="p-2">엑셀</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">새로고침 · 상품 추가</td><td class="p-2">목록 갱신 · 등록 DLG</td></tr>
            </tbody>
          </table>
          <h4 id="nav-products-stats" class="text-base font-black text-slate-900 mb-3">통계</h4>
          <p class="text-sm text-slate-700 mb-4">전체 상품 · 판매중 · 재고 부족 · 품절</p>
          <h4 id="nav-products-filters" class="text-base font-black text-slate-900 mb-3">필터</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">상품명·코드 검색</td><td class="p-2">현재 페이지 내</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">직접입력만 보기</td><td class="p-2">맞춤 상품 필터</td></tr>
            </tbody>
          </table>
          <h4 id="nav-products-form" class="text-base font-black text-slate-900 mb-3">행 · 폼</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">수정 · 삭제</td><td class="p-2">행 ⋮</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상품명 · 대·중분류 · 가격 · 재고 · 상태</td><td class="p-2">등록/수정 DLG</td></tr>
            </tbody>
          </table>
        </article>
"""

NAV_INVENTORY = """        <!-- 재고 M10 -->
        <article id="nav-inventory" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-teal-800 mb-1">재고 · 재고 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/inventory</code> · M10 · v4.4</p>
          <h4 id="nav-inventory-header" class="text-base font-black text-slate-900 mb-3">상단</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">거래처 관리</td><td class="p-2"><a href="#nav-suppliers" class="underline">거래처</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">카테고리 설정 · 엑셀 · 새 자재 등록</td><td class="p-2"><a href="#settings-categories-page" class="underline">자재 분류</a></td></tr>
            </tbody>
          </table>
          <h4 id="nav-inventory-stats" class="text-base font-black text-slate-900 mb-3">통계</h4>
          <p class="text-sm text-slate-700 mb-4">총 자재 종류 · 총 재고 수량 · 재고 부족 · 품절</p>
          <h4 id="nav-inventory-filters" class="text-base font-black text-slate-900 mb-3">필터 · 표</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">대분류 · 중분류 · 검색</td><td class="p-2">목록 필터</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">자재명 · 규격 · 단위 · 색상 · 가격 · 재고 · 거래처</td><td class="p-2">열</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수정 · 삭제</td><td class="p-2">행 관리</td></tr>
            </tbody>
          </table>
        </article>
"""

NAV_SUPPLIERS = """        <!-- 거래처 -->
        <article id="nav-suppliers" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-slate-800 mb-1">거래처 · 거래처 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/suppliers</code> · v4.4</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <thead class="bg-slate-100"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">신규 거래처 등록 · 엑셀</td><td class="p-2">등록 DLG</td></tr>
              <tr class="border-t"><td class="p-2">필터</td><td class="p-2 font-semibold">거래처명 검색</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2">표</td><td class="p-2 font-semibold">상호 · 연락처 · 담당자 · 계좌 · 주소 · 메모</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2">폼</td><td class="p-2 font-semibold">생화/분화/란/화환/자재/기타</td><td class="p-2">거래처 유형</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">연동: <a href="#nav-purchases" class="underline">매입</a> · <a href="#nav-inventory" class="underline">재고</a> · <a href="#nav-outsource" class="underline">외부발주</a></p>
        </article>
"""

NAV_PURCHASES = """        <!-- 매입 -->
        <article id="nav-purchases" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-emerald-800 mb-1">매입 · 매입 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/purchases</code> · v4.4</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <thead class="bg-emerald-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">사용 매뉴얼 · 새 매입(배치) 등록</td><td class="p-2">앱 내장 DLG</td></tr>
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">필터 초기화</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2">통계</td><td class="p-2 font-semibold">계획/전체 건수·금액</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2">탭</td><td class="p-2 font-semibold">배치(폴더) / 전체 내역</td><td class="p-2">보기 전환</td></tr>
              <tr class="border-t bg-emerald-50/40"><td class="p-2">행</td><td class="p-2 font-semibold">매입확정 · 엑셀 · 인쇄 · 수정 · 삭제</td><td class="p-2">확정 → <a href="#nav-expenses" class="underline">지출</a>·<a href="#nav-inventory" class="underline">재고</a></td></tr>
            </tbody>
          </table>
        </article>
"""

NAV_REPORTS = """        <!-- 정산 보고서 -->
        <article id="nav-reports" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-violet-800 mb-1">정산 · 보고서</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/reports</code> · v4.4</p>
          <h4 id="nav-reports-header" class="text-base font-black text-slate-900 mb-3">상단 · 기간</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">인쇄 · 엑셀 다운로드</td><td class="p-2">내보내기</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">일일 정산 / 주간 / 월간 / 연간</td><td class="p-2">기간 탭</td></tr>
            </tbody>
          </table>
          <h4 id="nav-reports-kpi" class="text-base font-black text-slate-900 mb-3">KPI</h4>
          <p class="text-sm text-slate-700 mb-4">총 매출 · 총 지출 · 순 이익 · Top5 상품 · 금일 정산 상세(카드/현금/지출/순현금)</p>
        </article>
"""

NAV_ANALYTICS = """        <!-- analytics -->
        <article id="nav-analytics" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-violet-800 mb-1">매입·매출 통계</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/analytics</code> · v4.4</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">이번 달 / 3·6·12개월</td><td class="p-2">기간</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">총 매출 · 총 지출 · 매출이익</td><td class="p-2">KPI</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">분류별 지출 · 거래처 TOP10 · 결제수단별</td><td class="p-2">차트</td></tr>
            </tbody>
          </table>
        </article>
"""

NAV_TAX = """        <!-- 세무 -->
        <article id="nav-tax" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-slate-800 mb-1">세무 · 세무 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/tax</code> · v4.4</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">연도 선택 · 현황신고 자료 다운로드</td><td class="p-2">헤더</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">면세/과세 안내 · 월별 수입/경비</td><td class="p-2">카드</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">필요경비 · 거래처별 매입 · 신고 체크리스트</td><td class="p-2">섹션</td></tr>
            </tbody>
          </table>
        </article>
"""

NAV_EXPENSES_EXTRA = """
          <h4 id="nav-expenses-filters" class="text-base font-black text-slate-900 mt-8 mb-3">필터 · 목록 (v4.4)</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">지출 일지 검색 · 기간 · 분류 · 거래처 · 결제수단</td><td class="p-2">필터</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">필터 초기화</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">총 지출 · 주요 거래처 · 평균 건당 · 활성 거래처</td><td class="p-2">통계 카드</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">일자 · 분류 · 내용 · 영수증 · 금액</td><td class="p-2">표 · 매입 연동 배지</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">지출 등록 DLG: 날짜·거래처·품목·영수증 첨부</td><td class="p-2">수동 등록</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">연동: <a href="#integration-order-delivery" class="underline">배송→지출</a> · <a href="#nav-daily-settlement" class="underline">일일 마감</a></p>
"""

NAV_CUSTOMERS_HEADER = """
          <h4 id="nav-customers-header" class="text-base font-black text-slate-900 mb-3">상단 · 통계 (v4.4 레지스트리)</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">새로고침 · 디지털 서류함 · 엑셀 · 양식 · 가져오기 · 신규 고객 등록</td><td class="p-2">헤더</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">전체/VIP/신규/우수 · 구매·포인트 TOP5</td><td class="p-2">통계</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">고객명·연락처·회사명 검색</td><td class="p-2">필터</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">행 ⋮ 수정 · 삭제</td><td class="p-2">—</td></tr>
            </tbody>
          </table>
"""

DAILY_SETTLEMENT_HEADER = """
          <h4 id="nav-daily-settlement-header" class="text-base font-black text-slate-900 mb-3">버튼 레지스트리 (v4.4)</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-8">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">주문 목록으로 돌아가기</td><td class="p-2"><a href="#nav-orders" class="underline">주문 목록</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">날짜 선택기</td><td class="p-2">정산일 변경</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수정저장 (이월)</td><td class="p-2">이월 현금만 먼저 고정</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">오늘 정산 마감 / 금고 잔액 확정 및 이월</td><td class="p-2">마감 저장</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">정산서 출력</td><td class="p-2">인쇄</td></tr>
            </tbody>
          </table>
"""


def main():
    text = MANUAL.read_text(encoding="utf-8")

    # PR registry insert before nav-ribbon-from-order h4
    if "nav-printer-sidebar" not in text:
        anchor = '          <h4 class="text-lg font-bold text-slate-800 mt-10 mb-3" id="nav-ribbon-from-order">주문 목록 → 리본 인쇄 연동</h4>'
        text = text.replace(anchor, PR_REGISTRY + "\n" + anchor)

    # Ribbon from order tables
    if "nav-ribbon-from-order-header" not in text:
        old = '          <p class="text-sm text-slate-700 mb-4 leading-relaxed">주문 현황 행 메뉴 또는 상세의 <strong>리본 인쇄</strong>를 누르면 <code>/dashboard/orders/print-ribbon</code> 화면이 열리고, 주문에 적어 둔 <strong>경조사 문구·보내는 이</strong>가 좌우 리본에 <strong>자동 입력</strong>됩니다. 확인 후 인쇄만 하시면 됩니다. (PC 전용 · POS 자동 인쇄와 별개)</p>'
        text = text.replace(old, old + RIBBON_FROM_ORDER)

    # Update PR badge
    text = text.replace(
        "<strong>PR 작성 단계</strong> — 리본 화면은 버튼·다이얼로그가 많아 <strong>별도 P(PR)</strong>로 버튼 레지스트리를 채웁니다. 아래는 개요이며, 구역별 상세는 순차 보강 중입니다.",
        "<strong>PR v4.4</strong> — 사이드·캔버스·툴바·다이얼로그 버튼 레지스트리 + 아래 상세 설명.",
    )

    # nav-home extra zones
    if "nav-home-greeting" not in text:
        text = text.replace(
            '          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 매출 숫자가 기대와 다르면',
            NAV_HOME_EXTRA + '\n          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 매출 숫자가 기대와 다르면',
        )

    # P2 article replacements
    for aid, body, hint in [
        ("nav-products", NAV_PRODUCTS, "상품"),
        ("nav-inventory", NAV_INVENTORY, "재고"),
        ("nav-suppliers", NAV_SUPPLIERS, "거래처"),
        ("nav-purchases", NAV_PURCHASES, "매입"),
        ("nav-reports", NAV_REPORTS, "정산"),
        ("nav-analytics", NAV_ANALYTICS, "analytics"),
        ("nav-tax", NAV_TAX, "세무"),
    ]:
        text = article_replace(text, aid, body, hint)

    # expenses extra
    if "nav-expenses-filters" not in text:
        text = text.replace(
            '          <p class="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-4">목록·필터·편집',
            NAV_EXPENSES_EXTRA + '\n          <p class="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-4">목록·필터·편집',
        )

    # customers header table
    if "nav-customers-header" not in text:
        text = text.replace(
            '          <p class="text-sm text-slate-700 mb-6 leading-relaxed"><strong>개요</strong> 화면 제목은 <strong>고객 관리</strong>입니다.',
            NAV_CUSTOMERS_HEADER + '\n          <p class="text-sm text-slate-700 mb-6 leading-relaxed"><strong>개요</strong> 화면 제목은 <strong>고객 관리</strong>입니다.',
        )

    # daily settlement header
    if "nav-daily-settlement-header" not in text:
        text = text.replace(
            '          <p class="text-sm text-slate-700 mb-4"><strong>목적</strong> 선택한',
            DAILY_SETTLEMENT_HEADER + '\n          <p class="text-sm text-slate-700 mb-4"><strong>목적</strong> 선택한',
        )

    # version banner
    text = text.replace(
        "v4.3 (2026-07) · P0 완료 · P1 주문·배송·POS · 연동 지도 · 리본 PR",
        "v4.4 (2026-07) · P0~P1 · PR 리본 · P2 CRM·재고·지출",
    )
    text = text.replace(
        "<strong>P0 완료 (v4.3):</strong> 환경설정 9탭 + 분류 전용 화면 + 구독(M23). <strong>P1 1차:</strong> 주문 목록(M03) 풀 레지스트리 · 새 주문(M02/M02m) · 업무 홈 · 배송 · POS.",
        "<strong>v4.4:</strong> PR 리본 레지스트리 · P2 상품·재고·거래처·매입·정산·통계·세무·지출 필터 · CRM·일일마감 헤더 보강.",
    )

    MANUAL.write_text(text, encoding="utf-8")
    print(f"Updated {MANUAL}")
    if PACK.parent.exists():
        PACK.write_text(text, encoding="utf-8")
        print(f"Synced {PACK}")


if __name__ == "__main__":
    main()
