# -*- coding: utf-8 -*-
"""Apply P0/P1 manual expansions to floxync-manual.html"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
MANUAL = ROOT / "docs" / "floxync-manual.html"
PACK = ROOT / "pack" / "wrap" / "next-standalone" / "docs" / "floxync-manual.html"

CATEGORIES_PAGE = """
        <div id="settings-categories-page" class="anchor-offset mb-16">
          <h3 class="text-xl font-bold mb-2 flex items-center gap-2 text-orange-700">
            <span class="w-1.5 h-6 bg-orange-500 rounded-full"></span> 1-4b. 분류 관리 — 전용 화면
          </h3>
          <p class="text-xs text-slate-500 mb-4">경로 <code>/dashboard/settings/categories</code> · P0 M18 · 검수 2026-07-04</p>
          <div class="bg-white border border-orange-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <p class="text-sm text-slate-700 mb-6">환경 설정 → 분류 관리 탭의 <strong>분류 관리 화면 열기</strong> 버튼으로 들어옵니다. 상단 <strong>환경 설정으로</strong>로 1장으로 돌아갈 수 있습니다.</p>
            <h4 class="text-base font-black text-slate-900 mb-3">탭 (3종)</h4>
            <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
              <thead class="bg-orange-50"><tr><th class="p-2 text-left">탭</th><th class="p-2 text-left">연동 메뉴</th></tr></thead>
              <tbody class="text-slate-700">
                <tr class="border-t"><td class="p-2 font-semibold">상품 분류</td><td class="p-2"><a href="#nav-products" class="underline">상품</a> · <a href="#nav-new-order" class="underline">새 주문</a> 카테고리 탭</td></tr>
                <tr class="border-t"><td class="p-2 font-semibold">자재 분류</td><td class="p-2"><a href="#nav-inventory" class="underline">재고</a> · 매입</td></tr>
                <tr class="border-t"><td class="p-2 font-semibold">지출 분류</td><td class="p-2"><a href="#nav-expenses" class="underline">지출</a></td></tr>
              </tbody>
            </table>
            <h4 class="text-base font-black text-slate-900 mb-3">각 탭 공통 버튼 (CategoryManagerCard)</h4>
            <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
              <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
              <tbody class="text-slate-700">
                <tr class="border-t"><td class="p-2 font-semibold">대분류 추가 입력 + 추가</td><td class="p-2">새 상위 분류</td></tr>
                <tr class="border-t"><td class="p-2 font-semibold">대분류 목록 클릭</td><td class="p-2">선택 → 하위 분류 편집</td></tr>
                <tr class="border-t"><td class="p-2 font-semibold">대분류 삭제 (휴지통)</td><td class="p-2">하위 분류 함께 삭제 · 확인</td></tr>
                <tr class="border-t"><td class="p-2 font-semibold">하위 분류 입력 + 추가</td><td class="p-2">선택된 대분류 아래</td></tr>
                <tr class="border-t"><td class="p-2 font-semibold">하위 분류 삭제</td><td class="p-2">행별 휴지통</td></tr>
                <tr class="border-t"><td class="p-2 font-semibold">기본값으로 되돌리기</td><td class="p-2">FloXync 표준 분류 복원</td></tr>
                <tr class="border-t bg-emerald-50/40"><td class="p-2 font-semibold">저장</td><td class="p-2">DB 반영 · 토스트 확인</td></tr>
              </tbody>
            </table>
          </div>
        </div>
"""

SUBSCRIPTION_ARTICLE = """
        <article id="nav-subscription" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-indigo-800 mb-1">구독 · 플랜</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/subscription</code> · P0 M23 · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-6"><strong>개요</strong> 현재 플랜·만료일을 확인하고, 4종 플랜 카드에서 기간을 고른 뒤 결제합니다. 플랜이 낮으면 PRO 전용 메뉴가 숨겨지거나 업그레이드 안내가 뜹니다.</p>

          <h4 id="nav-subscription-plans" class="text-base font-black text-slate-900 mb-3">플랜 카드 (4종)</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <thead class="bg-indigo-50"><tr><th class="p-2 text-left">플랜 ID</th><th class="p-2 text-left">표기</th><th class="p-2 text-left">주요 범위</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-mono">ribbon_only</td><td class="p-2 font-semibold">리본 라이센스</td><td class="p-2"><a href="#nav-printer" class="underline">리본 프린터</a> 중심</td></tr>
              <tr class="border-t"><td class="p-2 font-mono">light</td><td class="p-2 font-semibold">플로비서 라이트</td><td class="p-2">기본 ERP·주문</td></tr>
              <tr class="border-t bg-indigo-50/30"><td class="p-2 font-mono">pro</td><td class="p-2 font-semibold">플로비서 프로</td><td class="p-2">주문·CRM·배송·통계 (인기)</td></tr>
              <tr class="border-t"><td class="p-2 font-mono">pro_plus</td><td class="p-2 font-semibold">프로 플러스</td><td class="p-2">PRO + 고급 기능</td></tr>
            </tbody>
          </table>

          <h4 id="nav-subscription-period" class="text-base font-black text-slate-900 mb-3">결제 기간 선택</h4>
          <p class="text-sm text-slate-700 mb-3">상단 토글에서 <strong>월간(1m)</strong> · <strong>연간(12m)</strong> 등을 고릅니다. 연간 결제 시 보너스 이용 개월이 subscription에 반영됩니다.</p>

          <h4 id="nav-subscription-pay" class="text-base font-black text-slate-900 mb-3">결제 버튼</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">플랜 카드 · 구독하기 / 업그레이드</td><td class="p-2">토스(국내) 또는 Stripe(해외) 결제창</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">현재 플랜 배지</td><td class="p-2">이미 이용 중인 플랜 표시</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">기능 비교표</td><td class="p-2">PRINT · SMART · PRO 열 비교</td></tr>
            </tbody>
          </table>
          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 결제 후에도 메뉴가 안 바뀌면 로그아웃 후 다시 로그인하거나, 상단 동기화 배지를 확인하세요.</div>
        </article>
"""

NAV_ORDERS = """
        <!-- 주문 목록 M03 -->
        <article id="nav-orders" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <p class="text-xs text-violet-800 bg-violet-50 border border-violet-100 px-3 py-2 rounded-lg mb-4">⚡ M03 · P1 · <a href="#integration-print" class="underline font-semibold">자동 인쇄 연동</a> · <a href="#nav-order-flows" class="underline font-semibold">발주·이관 3종</a></p>
          <h3 class="text-xl font-bold text-emerald-800 mb-1">주문 목록 · 주문 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/orders</code> · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-6"><strong>개요</strong> 페이지 제목은 <strong>주문 관리</strong>입니다. PC는 표+필터, 모바일은 카드+하단 빠른 이동 바로 같은 데이터를 봅니다. 새 주문 저장 시 수령 방식에 따라 POS 자동 인쇄가 실행됩니다 → <a href="#integration-print" class="underline font-semibold">연동 한눈에</a>.</p>

          <h4 id="nav-orders-header-actions" class="text-base font-black text-slate-900 mb-3">① 상단 헤더 버튼</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <thead class="bg-emerald-50"><tr><th class="p-2 w-8">#</th><th class="p-2 text-left">UI 표기</th><th class="p-2 text-left">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">1</td><td class="p-2 font-semibold">회원사 수발주</td><td class="p-2"><a href="#nav-partner-orders" class="underline">/dashboard/orders/partner-orders</a></td></tr>
              <tr class="border-t"><td class="p-2">2</td><td class="p-2 font-semibold">일일마감정산</td><td class="p-2"><a href="#nav-daily-settlement" class="underline">/dashboard/orders/daily-settlement</a></td></tr>
              <tr class="border-t"><td class="p-2">3</td><td class="p-2 font-semibold">엑셀</td><td class="p-2">조회된 주문 목록 엑셀 다운로드</td></tr>
              <tr class="border-t"><td class="p-2">4</td><td class="p-2 font-semibold">데이터 가져오기</td><td class="p-2">엑셀 일괄 업로드 다이얼로그</td></tr>
              <tr class="border-t"><td class="p-2">5</td><td class="p-2 font-semibold">구글 시트</td><td class="p-2">연동 설정 시 시트로 내보내기</td></tr>
              <tr class="border-t"><td class="p-2">6</td><td class="p-2 font-semibold">쇼핑몰 동기화</td><td class="p-2">Cafe24·네이버 등 연동 시 주문 가져오기</td></tr>
              <tr class="border-t bg-emerald-50/40"><td class="p-2">7</td><td class="p-2 font-semibold">새 주문 등록</td><td class="p-2"><a href="#nav-new-order" class="underline">/dashboard/orders/new</a> (웹·터치 UI, 안드로이드 앱 일부 숨김)</td></tr>
            </tbody>
          </table>

          <h4 id="nav-orders-stats" class="text-base font-black text-slate-900 mb-3">② 통계 카드 (5개)</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <thead class="bg-slate-100"><tr><th class="p-2">카드</th><th class="p-2">의미</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">연간 통계 (Electron)</td><td class="p-2">데스크톱 앱 연간 요약 (해당 시)</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">오늘 주문</td><td class="p-2">오늘 접수 건수</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">제작 중</td><td class="p-2">처리중(status=processing) 건수</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">배송/완료</td><td class="p-2">완료 건수·완료율 %</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">조회 매출</td><td class="p-2">현재 필터 기간 합계 (환경설정 집계 기준 반영)</td></tr>
            </tbody>
          </table>

          <h4 id="nav-orders-filters" class="text-base font-black text-slate-900 mb-3">③ 검색 · 필터</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <thead class="bg-slate-100"><tr><th class="p-2">#</th><th class="p-2">UI 표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">1</td><td class="p-2 font-semibold">검색</td><td class="p-2">주문자·수령인·주문번호</td></tr>
              <tr class="border-t"><td class="p-2">2</td><td class="p-2 font-semibold">집계 기준</td><td class="p-2">주문일 / 등록일</td></tr>
              <tr class="border-t"><td class="p-2">3</td><td class="p-2 font-semibold">기간</td><td class="p-2">2개월 · 3개월 · 6개월 · 1년 · 전체</td></tr>
              <tr class="border-t"><td class="p-2">4</td><td class="p-2 font-semibold">상태</td><td class="p-2">전체 · 처리중 · 완료 · 취소</td></tr>
              <tr class="border-t"><td class="p-2">5</td><td class="p-2 font-semibold">수령 유형</td><td class="p-2">전체 · 배송예약 · 수령예약 · 매장수령</td></tr>
            </tbody>
          </table>

          <h4 id="nav-orders-bulk" class="text-base font-black text-slate-900 mb-3">④ 일괄 작업 · 목록</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <thead class="bg-slate-100"><tr><th class="p-2">#</th><th class="p-2">UI 표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">1</td><td class="p-2 font-semibold">행 체크박스</td><td class="p-2">다중 선택</td></tr>
              <tr class="border-t"><td class="p-2">2</td><td class="p-2 font-semibold">일괄 (N건)</td><td class="p-2">완료 처리 · 준비중 변경 · 주문 내역 삭제</td></tr>
              <tr class="border-t"><td class="p-2">3</td><td class="p-2 font-semibold">전체 선택 / 선택 해제</td><td class="p-2">모바일 카드 목록 상단</td></tr>
              <tr class="border-t"><td class="p-2">4</td><td class="p-2 font-semibold">행 클릭</td><td class="p-2">주문 상세 모달</td></tr>
              <tr class="border-t"><td class="p-2">5</td><td class="p-2 font-semibold">더보기 (n/m)</td><td class="p-2">페이지네이션</td></tr>
            </tbody>
          </table>

          <h4 id="nav-orders-row-menu" class="text-base font-black text-slate-900 mb-3">⑤ 행 ⋮ 메뉴 (11항목)</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-8">
            <thead class="bg-violet-50"><tr><th class="p-2 w-8">#</th><th class="p-2">그룹</th><th class="p-2">UI 표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">1</td><td class="p-2">주문 관리</td><td class="p-2 font-semibold">상세 보기</td><td class="p-2">주문 상세 모달</td></tr>
              <tr class="border-t"><td class="p-2">2</td><td class="p-2">주문 관리</td><td class="p-2 font-semibold">주문 수정</td><td class="p-2">수정 다이얼로그 (아래 참고)</td></tr>
              <tr class="border-t"><td class="p-2">3</td><td class="p-2">인쇄 및 출력</td><td class="p-2 font-semibold">주문서 인쇄</td><td class="p-2">주문서·영수증 화면</td></tr>
              <tr class="border-t"><td class="p-2">4</td><td class="p-2">인쇄 및 출력</td><td class="p-2 font-semibold">카드 메시지 출력</td><td class="p-2">메시지 인쇄 설정 → 라벨지</td></tr>
              <tr class="border-t"><td class="p-2">5</td><td class="p-2">인쇄 및 출력</td><td class="p-2 font-semibold">리본 출력 (프린터 전송)</td><td class="p-2"><a href="#nav-printer" class="underline">리본</a> 화면 (POS 자동과 별개)</td></tr>
              <tr class="border-t"><td class="p-2">6</td><td class="p-2">상태 관리</td><td class="p-2 font-semibold">상태 변경 → 처리중/완료/취소</td><td class="p-2">주문 상태 즉시 변경</td></tr>
              <tr class="border-t"><td class="p-2">7</td><td class="p-2">상태 관리</td><td class="p-2 font-semibold">결제 상태 → 완결/미결</td><td class="p-2">결제 완료 여부</td></tr>
              <tr class="border-t"><td class="p-2">8</td><td class="p-2">발주</td><td class="p-2 font-semibold">지점 이관 요청</td><td class="p-2">조직 소속 매장만 · <a href="#nav-branch-transfer" class="underline">지점 이관</a></td></tr>
              <tr class="border-t"><td class="p-2">9</td><td class="p-2">발주</td><td class="p-2 font-semibold">외부 발주</td><td class="p-2"><a href="#nav-outsource" class="underline">외부발주</a> 다이얼로그</td></tr>
              <tr class="border-t"><td class="p-2">10</td><td class="p-2">발주</td><td class="p-2 font-semibold">회원사 수발주 발주</td><td class="p-2"><a href="#nav-partner-orders" class="underline">회원사 수발주</a></td></tr>
              <tr class="border-t bg-rose-50/30"><td class="p-2">11</td><td class="p-2">—</td><td class="p-2 font-semibold text-rose-700">주문 내역 삭제</td><td class="p-2">확인 후 삭제</td></tr>
            </tbody>
          </table>

          <h4 class="text-base font-bold text-slate-900 mt-4 mb-3">카드 메시지 / 리본 출력 (상세)</h4>
          <ul class="text-sm text-slate-700 space-y-2 list-disc pl-5 mb-4">
            <li><strong>주문서 인쇄</strong> — 주문 내역서 및 영수증 형태의 화면을 출력합니다.</li>
            <li><strong>카드 메시지 출력</strong> — 메시지 인쇄 설정 화면에서 문구·용지 규격·시작 칸 번호를 맞춘 뒤 인쇄합니다.</li>
            <li><strong>리본 출력</strong> — 주문서 리본 문구가 채워진 상태로 리본 프린터 화면이 열립니다. (윈도우 PC 권장)</li>
          </ul>

          <h4 id="nav-orders-edit" class="text-base font-bold text-slate-900 mt-6 mb-3">주문 수정</h4>
          <p class="text-sm text-slate-700 mb-3">행 메뉴의 <strong>주문 수정</strong>을 누르면 다이얼로그에서 주문자·연락처·수령 방식·일정·수령인·주소·상품·메시지·결제·메모·실제 배송비 등을 고칩니다. 복잡한 전체 재작성은 <a href="#nav-new-order" class="text-indigo-700 underline">새 주문</a> 화면 URL에 <code>?id=</code> 로 여는 방식과 병행합니다.</p>

          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900 mt-6"><strong>막힘 해소</strong> 안드로이드 앱 모드에서는 쇼핑몰 동기화·새 주문 등록 버튼이 숨겨질 수 있습니다. 웹 브라우저에서 접속해 보세요.</div>
        </article>
"""

NEW_ORDER_ZONES = """
          <h4 id="nav-new-order-ai" class="text-base font-black text-slate-900 mt-8 mb-3">⑥-A. AI 주문 컨시어지</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-violet-50"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">AI 주문 (상단)</td><td class="p-2">문자·카톡 내용 붙여넣기 → 고객·상품·수령 필드 자동 채움</td></tr>
            </tbody>
          </table>

          <h4 id="nav-new-order-customer" class="text-base font-black text-slate-900 mb-3">⑥-B. 고객</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">지점 선택</td><td class="p-2">다지점 조직 시 주문 귀속 지점</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">고객 검색</td><td class="p-2">이름·연락처로 기존 고객</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">익명 주문</td><td class="p-2">고객 없이 진행</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">신규 고객 등록</td><td class="p-2">CRM에 바로 추가</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">마케팅·기념일 동의</td><td class="p-2"><a href="#nav-revenue" class="underline">매출 캘린더</a> 연동</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">기념일 추가</td><td class="p-2">여러 건 등록 가능</td></tr>
            </tbody>
          </table>

          <h4 id="nav-new-order-products" class="text-base font-black text-slate-900 mb-3">⑥-C. 상품</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">분류 탭</td><td class="p-2"><a href="#settings-categories" class="underline">상품 분류</a> 기준</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상품 카드 클릭</td><td class="p-2">장바구니에 추가</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상품 검색</td><td class="p-2">이름·코드 필터</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">직접 입력 상품</td><td class="p-2">맞춤 상품명·단가 다이얼로그</td></tr>
            </tbody>
          </table>

          <h4 id="nav-new-order-fulfillment" class="text-base font-black text-slate-900 mb-3">⑥-D. 수령 · 배송</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th><th class="p-2">자동 인쇄</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">매장수령</td><td class="p-2">당일 매장 픽업</td><td class="p-2">없음</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수령예약 (픽업)</td><td class="p-2">일시·수령인</td><td class="p-2">예약증</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">배송예약</td><td class="p-2">주소 검색·일시·급송·크기</td><td class="p-2">주문서+영수증</td></tr>
            </tbody>
          </table>

          <h4 id="nav-new-order-message" class="text-base font-black text-slate-900 mb-3">⑥-E. 메시지 (카드/리본)</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">카드 / 리본 / 없음</td><td class="p-2">메시지 유형 선택</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">표준 문구</td><td class="p-2">자주 쓰는 경조사 문구</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">최근 문구</td><td class="p-2">이전 주문에서 불러오기</td></tr>
            </tbody>
          </table>

          <h4 id="nav-new-order-summary" class="text-base font-black text-slate-900 mb-3">⑥-F. 요약 · 결제 · 저장</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-emerald-50"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">수량 ± · 삭제</td><td class="p-2">줄별 수량 조정</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">할인율</td><td class="p-2">환경설정 할인 규칙</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">포인트 전액 사용</td><td class="p-2">고객 포인트 차감</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">배송비 수동</td><td class="p-2">자동 계산 대신 직접 입력</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">결제 수단 (6종+)</td><td class="p-2">현금·카드·계좌 등</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">분할 결제</td><td class="p-2">2회 나눠 결제</td></tr>
              <tr class="border-t bg-emerald-50/40"><td class="p-2 font-semibold">주문하기 / 저장</td><td class="p-2">저장 → <a href="#integration-print" class="underline">자동 인쇄</a> 트리거</td></tr>
            </tbody>
          </table>

          <h4 id="nav-new-order-dialogs" class="text-base font-black text-slate-900 mb-3">⑥-G. 저장 후 다이얼로그</h4>
          <ul class="text-sm text-slate-700 space-y-2 list-disc pl-5 mb-4">
            <li><strong>직접 입력 상품</strong> — 유사 상품 제안·신규 등록</li>
            <li><strong>카드 결제 확인</strong> — 수기 카드 승인 번호 입력</li>
            <li><strong>저장 성공</strong> — 주문서 인쇄 · 계속 주문 · 목록으로</li>
          </ul>

          <p class="text-xs text-slate-500 mb-4">모바일 전용: <a href="#nav-new-mobile" class="underline font-semibold">M02m 모바일 주문</a> · <a href="#sit-mobile-order" class="underline">S6</a></p>
"""

NAV_HOME = """
        <article id="nav-home" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-emerald-800 mb-1">업무 홈</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard</code> · M01 · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-6"><strong>개요</strong> 로그인 후 첫 화면. 오늘 주문·매출·픽업/배송 일정 카드와 매출 차트(일/주/월/년)를 제공합니다.</p>
          <h4 id="nav-home-cards" class="text-base font-black text-slate-900 mb-3">카드 · 버튼</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-emerald-50"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">동기화 상태 배지</td><td class="p-2">오프라인·동기화 중 표시</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">오늘 주문 / 오늘 매출</td><td class="p-2">당일 핵심 KPI</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">오늘·내일 픽업/배송</td><td class="p-2">일정 요약</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상세 일정 확인</td><td class="p-2"><a href="#nav-delivery" class="underline">배송·픽업</a>으로 이동</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">매출 차트 기간 탭</td><td class="p-2">일 · 주 · 월 · 년 전환</td></tr>
            </tbody>
          </table>
          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 매출 숫자가 기대와 다르면 환경 설정의 <strong>매출 집계 기준</strong>(주문일 vs 결제완료일)을 먼저 확인하세요.</div>
        </article>
"""

NAV_DELIVERY = """
        <article id="nav-delivery" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <p class="text-xs text-violet-800 bg-violet-50 border border-violet-100 px-3 py-2 rounded-lg mb-4">⚡ M05 · <a href="#sit-pickup-delivery" class="underline font-semibold">S5 배송 마무리</a> · <a href="#integration-order-delivery" class="underline font-semibold">지출 연동</a></p>
          <h3 class="text-xl font-bold text-emerald-800 mb-1">배송 · 픽업</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/delivery</code> · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-6"><strong>개요</strong> 제목 <strong>배송 및 픽업 관리</strong>. 예약된 배송·픽업 일정을 날짜별로 보고 상태·실배송비·인쇄를 처리합니다.</p>

          <h4 id="nav-delivery-header" class="text-base font-black text-slate-900 mb-3">상단</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">배송비 정산 내역</td><td class="p-2"><code>/dashboard/delivery/profit</code></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">배송업체 관리</td><td class="p-2">택배·퀵 목록 추가·삭제·저장</td></tr>
            </tbody>
          </table>

          <h4 id="nav-delivery-filters" class="text-base font-black text-slate-900 mb-3">필터</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <thead class="bg-slate-100"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">오늘 · 내일 · 전체 · 날짜</td><td class="p-2">일정 범위</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">전체 · 배송 · 픽업</td><td class="p-2">수령 유형</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">검색</td><td class="p-2">주문자·수령인·주소</td></tr>
            </tbody>
          </table>

          <h4 id="nav-delivery-row" class="text-base font-black text-slate-900 mb-3">행 작업</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <thead class="bg-emerald-50"><tr><th class="p-2">표기</th><th class="p-2">하는 일</th><th class="p-2">연동</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">완료 / 처리중</td><td class="p-2">배송 상태 변경</td><td class="p-2">—</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">리본 · 카드</td><td class="p-2">인쇄 다이얼로그</td><td class="p-2"><a href="#nav-printer" class="underline">리본</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상세</td><td class="p-2">주문 상세</td><td class="p-2">—</td></tr>
              <tr class="border-t bg-amber-50/40"><td class="p-2 font-semibold">실배송비 저장</td><td class="p-2">카드·현금 분리 입력</td><td class="p-2"><a href="#nav-expenses" class="underline">지출</a> 자동 기록</td></tr>
            </tbody>
          </table>
        </article>
"""

NAV_NEW_MOBILE = """
        <article id="nav-new-mobile" class="anchor-offset mb-16 border border-violet-100 rounded-2xl p-8 bg-gradient-to-b from-white to-violet-50/30 shadow-sm">
          <h3 class="text-xl font-bold text-violet-900 mb-1">모바일 주문 (M02m)</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/orders/new-mobile</code> · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-6">터치 UI에 최적화된 주문 접수. 저장 시 PC 브릿지로 <a href="#integration-print" class="underline">자동 인쇄</a> (S1 설정 필요).</p>

          <h4 id="nav-new-mobile-tabs" class="text-base font-black text-slate-900 mb-3">상단 탭</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">픽업/배송 주문</td><td class="p-2">본 화면</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">⚡ 빠른판매 POS</td><td class="p-2"><a href="#nav-pos-quick" class="underline">/dashboard/pos/quick</a></td></tr>
            </tbody>
          </table>

          <h4 id="nav-new-mobile-orderer" class="text-base font-black text-slate-900 mb-3">주문자</h4>
          <p class="text-sm text-slate-700 mb-4">고객 검색 · 연락처 · 신규 입력</p>

          <h4 id="nav-new-mobile-products" class="text-base font-black text-slate-900 mb-3">상품</h4>
          <p class="text-sm text-slate-700 mb-4">+ 상품 추가 · 시트에서 선택 · 수량 · 삭제</p>

          <h4 id="nav-new-mobile-fulfillment" class="text-base font-black text-slate-900 mb-3">수령</h4>
          <p class="text-sm text-slate-700 mb-4">매장수령 · 픽업 · 배송 탭 · 주소 · 배송비 수동</p>

          <h4 id="nav-new-mobile-payment" class="text-base font-black text-slate-900 mb-3">결제 · 접수</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">할인 · 포인트 전액</td><td class="p-2">금액 조정</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">결제 수단 · 완료/미수</td><td class="p-2">결제 상태</td></tr>
              <tr class="border-t bg-emerald-50/40"><td class="p-2 font-semibold">주문 접수하기</td><td class="p-2">저장</td></tr>
            </tbody>
          </table>
        </article>
"""

NAV_POS_QUICK = """
        <article id="nav-pos-quick" class="anchor-offset mb-16 border border-amber-100 rounded-2xl p-8 bg-gradient-to-b from-white to-amber-50/30 shadow-sm">
          <h3 class="text-xl font-bold text-amber-900 mb-1">빠른판매 POS (M06)</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/pos/quick</code> · <a href="#sit-quick-pos" class="underline">S4</a></p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <thead class="bg-amber-50"><tr><th class="p-2">구역</th><th class="p-2">주요 버튼</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">탭</td><td class="p-2">픽업/배송 · 빠른판매 · (모바일) 주문접수</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상품</td><td class="p-2">카테고리 · 📌 고정 · 금액 직접 입력</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">결제</td><td class="p-2">할인 0/5/10/20% · 6종 결제수단 · 결제하기</td></tr>
            </tbody>
          </table>
        </article>
"""

SIDEBAR_OLD = """           <li><a href="#settings-categories" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link anchor-offset">1-4. 분류</a></li>
           <li><a href="#settings-printer" """

SIDEBAR_NEW = """           <li><a href="#settings-categories" class="flex items-center p-2 text-sm text-gray-700 rounded-lg sidebar-link anchor-offset">1-4. 분류</a></li>
           <li><a href="#settings-categories-page" class="flex items-center p-2 text-sm text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 전용 화면</a></li>
           <li><a href="#settings-printer" """

SIDEBAR_ORDERS_OLD = """           <li><a href="#nav-orders" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">주문 목록</a></li>
           <li><a href="#nav-order-flows" """

SIDEBAR_ORDERS_NEW = """           <li><a href="#nav-orders" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">주문 목록</a></li>
           <li><a href="#nav-orders-header-actions" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 상단·필터·행메뉴</a></li>
           <li><a href="#nav-new-mobile" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">모바일 주문</a></li>
           <li><a href="#nav-pos-quick" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">빠른판매 POS</a></li>
           <li><a href="#nav-order-flows" """

SIDEBAR_SUB_OLD = """           <li><a href="#nav-subscription" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">구독 · 플랜</a></li>"""

SIDEBAR_SUB_NEW = """           <li><a href="#nav-subscription" class="flex items-center p-2 text-indigo-800 font-semibold rounded-lg sidebar-link anchor-offset">구독 · 플랜 (M23)</a></li>"""


def main():
    text = MANUAL.read_text(encoding="utf-8")
    original = text

    # categories page insert
    cat_marker = """              <li><strong>지출 분류</strong> → <a href="#nav-expenses" class="underline">지출</a></li>
            </ul>
          </div>
        </div>

        <!-- 1-5 M19 -->"""
    if "settings-categories-page" not in text:
        if cat_marker not in text:
            raise SystemExit("categories insert marker not found")
        text = text.replace(
            cat_marker,
            """              <li><strong>지출 분류</strong> → <a href="#nav-expenses" class="underline">지출</a></li>
            </ul>
          </div>
        </div>
"""
            + CATEGORIES_PAGE
            + """
        <!-- 1-5 M19 -->""",
        )

    # nav-orders replace
    text = re.sub(
        r"        <!-- 주문 목록 -->\n        <article id=\"nav-orders\".*?</article>\n",
        NAV_ORDERS + "\n",
        text,
        count=1,
        flags=re.DOTALL,
    )

    # nav-new-order: insert zones before amber box
    if "nav-new-order-ai" not in text:
        needle = '          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 배송비가 이상하면'
        if needle not in text:
            raise SystemExit("new-order insert needle not found")
        text = text.replace(needle, NEW_ORDER_ZONES + "\n" + needle)

    # nav-home replace
    text = re.sub(
        r"        <article id=\"nav-home\".*?</article>\n\n        <!-- 알림",
        NAV_HOME + "\n\n        <!-- 알림",
        text,
        count=1,
        flags=re.DOTALL,
    )

    # nav-delivery replace
    text = re.sub(
        r"        <article id=\"nav-delivery\".*?</article>\n\n        <!-- CRM -->",
        NAV_DELIVERY + "\n\n        <!-- CRM -->",
        text,
        count=1,
        flags=re.DOTALL,
    )

    # insert mobile as sibling after nav-new-order article
    if 'id="nav-new-mobile"' not in text:
        mobile_anchor = '          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 배송비가 이상하면 환경 설정의 배송비 규칙과 본 화면의 주소 입력이 일치하는지 확인하세요.</div>\n        </article>\n\n        <!-- 주문 목록'
        if mobile_anchor not in text:
            # already fixed layout or different comment
            alt = '        </article>\n\n        <article id="nav-new-mobile"'
            if alt not in text:
                raise SystemExit("mobile insert anchor not found")
        else:
            text = text.replace(
                mobile_anchor,
                '          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900"><strong>막힘 해소</strong> 배송비가 이상하면 환경 설정의 배송비 규칙과 본 화면의 주소 입력이 일치하는지 확인하세요.</div>\n        </article>\n\n'
                + NAV_NEW_MOBILE
                + "\n\n        <!-- 주문 목록",
                1,
            )

    if "nav-pos-quick" not in text:
        # after nav-delivery
        text = text.replace(
            NAV_DELIVERY + "\n\n        <!-- CRM -->",
            NAV_DELIVERY + "\n\n" + NAV_POS_QUICK + "\n\n        <!-- CRM -->",
        )

    # subscription replace
    text = re.sub(
        r"        <!-- 구독 -->\n        <article id=\"nav-subscription\".*?</article>\n",
        "        <!-- 구독 M23 -->\n" + SUBSCRIPTION_ARTICLE + "\n",
        text,
        count=1,
        flags=re.DOTALL,
    )

    # sidebar
    text = text.replace(SIDEBAR_OLD, SIDEBAR_NEW)
    text = text.replace(SIDEBAR_ORDERS_OLD, SIDEBAR_ORDERS_NEW)
    if SIDEBAR_SUB_OLD in text:
        text = text.replace(SIDEBAR_SUB_OLD, SIDEBAR_SUB_NEW)

    if text == original:
        print("No changes made")
    else:
        MANUAL.write_text(text, encoding="utf-8")
        print(f"Updated {MANUAL}")

    if PACK.parent.exists():
        PACK.write_text(MANUAL.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"Synced {PACK}")


if __name__ == "__main__":
    main()
