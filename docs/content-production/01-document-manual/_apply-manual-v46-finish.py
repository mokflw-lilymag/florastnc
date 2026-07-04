#!/usr/bin/env python3
"""v4.6: 누락 화면·얕은 레지스트리·사이드바·S→M 링크 보강."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MANUAL = ROOT / "docs" / "floxync-manual.html"
PACK = ROOT / "pack" / "wrap" / "next-standalone" / "docs" / "floxync-manual.html"
INVENTORY = ROOT / "docs" / "content-production" / "01-document-manual" / "SCREEN-BUTTON-INVENTORY.md"


def sub_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"MISSING anchor for {label}")
    return text.replace(old, new, 1)


def main() -> None:
    html = MANUAL.read_text(encoding="utf-8")

    # --- navbar version ---
    html = sub_once(
        html,
        "v4.5 (2026-07) · 테넌트 백과 완료 · 본사 5장 · PNG 촬영만 남음",
        "v4.6 (2026-07) · 누락 화면 보강 · PNG 촬영만 남음",
        "navbar",
    )

    # --- sidebar: settings tab order ---
    html = sub_once(
        html,
        """           <li><a href="#settings-partner" class="flex items-center p-2 text-sm text-blue-800 rounded-lg sidebar-link anchor-offset">1-8. 회원사 수발주</a></li>
           <li><span class="flex items-center p-2 text-sm text-slate-400 rounded-lg">1-7. 연동 및 자동화 <span class="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">준비중</span></span></li>""",
        """           <li><span class="flex items-center p-2 text-sm text-slate-400 rounded-lg">1-7. 연동 및 자동화 <span class="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">준비중</span></span></li>
           <li><a href="#settings-partner" class="flex items-center p-2 text-sm text-blue-800 rounded-lg sidebar-link anchor-offset">1-8. 회원사 수발주</a></li>""",
        "settings-order",
    )

    # --- sidebar: home link ---
    html = sub_once(
        html,
        '<li><a href="#dashboard" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">업무 홈</a></li>',
        '<li><a href="#nav-home" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">업무 홈</a></li>',
        "sidebar-home",
    )

    # --- sidebar: new 4장 menus ---
    html = sub_once(
        html,
        """           <li><a href="#nav-partner-orders" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset pl-8 text-[11px]">· 회원사 수발주</a></li>
           <li><a href="#nav-daily-settlement" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">일일 마감 정산</a></li>
           <li><a href="#nav-delivery" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">배송 · 픽업</a></li>""",
        """           <li><a href="#nav-partner-orders" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset pl-8 text-[11px]">· 회원사 수발주</a></li>
           <li><a href="#nav-orders-transfers" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-8 text-[11px]">· 지점 이관 내역</a></li>
           <li><a href="#nav-partner-orders-page" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-8 text-[11px]">· 회원사 수발주 내역</a></li>
           <li><a href="#nav-daily-settlement" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">일일 마감 정산</a></li>
           <li><a href="#nav-delivery" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">배송 · 픽업</a></li>
           <li><a href="#nav-schedule" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">매장 일정</a></li>
           <li><a href="#nav-mobile-pickup" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">모바일 픽업·배송</a></li>""",
        "sidebar-4-new",
    )

    html = sub_once(
        html,
        """           <li><a href="#nav-notifications" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">알림 · 공지</a></li>
           <li><a href="#nav-home" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">업무 홈</a></li>""",
        """           <li><a href="#nav-notifications" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">알림 · 공지</a></li>
           <li><a href="#nav-org-board" class="flex items-center p-2 text-indigo-700 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 본사 게시판</a></li>
           <li><a href="#nav-home" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">업무 홈</a></li>""",
        "sidebar-org-board",
    )

    # --- sidebar HQ fix ---
    html = sub_once(
        html,
        """           <li><a href="#hq-hq-dashboard" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 본사 개요 KPI</a></li>
           <li><a href="#hq-transfers-settlement" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 이관 정산</a></li>
           <li><a href="#hq-org-team" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">5-3. 본사 담당자 관리</a></li>
           <li><a href="#hq-org-work-mode" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">5-4. 지점 업무 모드</a></li>
           <li><a href="#hq-branch-transfer" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 지점 이관 (지점 업무)</a></li>
           <li><a href="#hq-transfers-settlement" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 본사 이관 정산</a></li>""",
        """           <li><a href="#hq-hq-dashboard" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 본사 개요 KPI</a></li>
           <li><a href="#hq-transfers-settlement" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 이관 정산</a></li>
           <li><a href="#hq-shared-products" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 공동상품·자재</a></li>
           <li><a href="#hq-material-requests" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 자재 요청 취합</a></li>
           <li><a href="#hq-branch-expenses" class="flex items-center p-2 text-gray-600 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 지점별 지출</a></li>
           <li><a href="#hq-org-team" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">5-3. 본사 담당자 관리</a></li>
           <li><a href="#hq-org-work-mode" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset">5-4. 지점 업무 모드</a></li>
           <li><a href="#hq-branch-transfer" class="flex items-center p-2 text-gray-700 rounded-lg sidebar-link anchor-offset pl-6 text-[11px]">↳ 지점 이관 (지점 업무)</a></li>""",
        "sidebar-hq",
    )

    # --- nav-map ---
    html = sub_once(
        html,
        """            <li><strong>시작</strong>: <code class="bg-white px-1 rounded border">/dashboard</code> 업무 홈 — 오늘 주문·매출·일정 요약과 매출 차트. <a href="#nav-notifications" class="text-violet-700 underline font-semibold">알림·공지</a>(상단 종 아이콘).</li>
            <li><strong>매장 운영</strong>: 주문 접수·목록, <a href="#nav-order-flows" class="text-indigo-700 underline font-semibold">외부발주·지점 이관·회원사 수발주</a>, 배송/픽업, 고객 CRM, 상품·재고, 거래처·매입, 정산·통계, 지출(<a href="#nav-expenses" class="text-emerald-700 underline font-semibold">AI 영수증</a>), 세무. (다매장 본사는 <code>/dashboard/hq/transfers</code> 지점 이관 정산)</li>""",
        """            <li><strong>시작</strong>: <code class="bg-white px-1 rounded border">/dashboard</code> <a href="#nav-home" class="text-emerald-700 underline font-semibold">업무 홈</a> — 오늘 주문·매출·일정 요약과 매출 차트. <a href="#nav-notifications" class="text-violet-700 underline font-semibold">알림·공지</a> · <a href="#nav-org-board" class="text-indigo-700 underline font-semibold">본사 게시판</a>(조직 소속 시).</li>
            <li><strong>매장 운영</strong>: 주문 접수·목록, <a href="#nav-order-flows" class="text-indigo-700 underline font-semibold">외부발주·지점 이관·회원사 수발주</a>(각 <a href="#nav-orders-transfers" class="underline">이관 내역</a>·<a href="#nav-partner-orders-page" class="underline">수발주 내역</a> 화면), 일일 마감, <a href="#nav-delivery" class="underline">배송·픽업</a>, <a href="#nav-schedule" class="underline">매장 일정</a>, <a href="#nav-mobile-pickup" class="underline">모바일 픽업</a>, 고객 CRM, 상품·재고, 거래처·매입, 정산·통계, 지출(<a href="#nav-expenses" class="text-emerald-700 underline font-semibold">AI 영수증</a>), 세무. (다매장 본사는 <a href="#hq-transfers-settlement" class="underline">이관 정산</a>)</li>""",
        "nav-map",
    )

    # --- nav-home schedule link ---
    html = sub_once(
        html,
        '<tr class="border-t"><td class="p-2 font-semibold">상세 일정 확인</td><td class="p-2"><a href="#nav-delivery" class="underline">배송·픽업</a>으로 이동</td></tr>',
        '<tr class="border-t"><td class="p-2 font-semibold">상세 일정 확인</td><td class="p-2"><a href="#nav-schedule" class="underline">매장 일정</a> · <a href="#nav-delivery" class="underline">배송·픽업</a></td></tr>',
        "nav-home-schedule",
    )

    # --- nav-org-board after notifications ---
    ORG_BOARD = """
        <!-- 본사 게시판 M-ORG -->
        <article id="nav-org-board" class="anchor-offset mb-16 border border-indigo-200 rounded-2xl p-8 bg-gradient-to-b from-white to-indigo-50/30 shadow-sm">
          <h3 class="text-xl font-bold text-indigo-900 mb-1">본사 게시판</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/org-board</code> · 조직 소속 지점 · v4.6 · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-4"><strong>개요</strong> 같은 <strong>본사 조직</strong>의 공지·안내를 모아 봅니다. 본사 관리자가 올린 글은 지점에서 읽고 <strong>내용 확인(본사에 전달)</strong>로 읽음을 남깁니다. 알림함에서도 본사 공지로 들어올 수 있습니다.</p>
          <h4 id="nav-org-board-header" class="text-base font-black text-slate-900 mb-3">헤더 · 목록</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-6">
            <thead class="bg-indigo-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">본사 게시판</td><td class="p-2">제목</td></tr>
              <tr class="border-t"><td class="p-2">헤더 (본사 관리자)</td><td class="p-2 font-semibold">새 게시물</td><td class="p-2">작성 다이얼로그</td></tr>
              <tr class="border-t"><td class="p-2">카드</td><td class="p-2 font-semibold">일반 / 중요</td><td class="p-2">강조 배지</td></tr>
              <tr class="border-t"><td class="p-2">카드</td><td class="p-2 font-semibold">조직명 · 등록일 · 만료일</td><td class="p-2">메타</td></tr>
              <tr class="border-t"><td class="p-2">카드</td><td class="p-2 font-semibold">첨부 이미지</td><td class="p-2">클릭 → 새 탭</td></tr>
              <tr class="border-t"><td class="p-2">지점</td><td class="p-2 font-semibold">내용 확인(본사에 전달)</td><td class="p-2">읽음 API · 본사에 확인 기록</td></tr>
              <tr class="border-t"><td class="p-2">지점</td><td class="p-2 font-semibold">본사에 확인 기록됨</td><td class="p-2">이미 확인한 글</td></tr>
            </tbody>
          </table>
          <h4 id="nav-org-board-thread" class="text-base font-black text-slate-900 mb-3">댓글 · 관리</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">댓글 입력 · 댓글 등록</td><td class="p-2">지점·본사 소통</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">🗑️ (본인·관리자)</td><td class="p-2">댓글 삭제</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">게시물 삭제 (관리자)</td><td class="p-2">게시물+댓글+첨부 영구 삭제</td></tr>
            </tbody>
          </table>
          <h4 id="nav-org-board-compose" class="text-base font-black text-slate-900 mb-3">새 게시물 다이얼로그 (본사)</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">조직 · 제목 · 본문</td><td class="p-2">필수 입력</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">리치 에디터</td><td class="p-2">굵게·기울임·목록·링크·실행취소 등</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">이미지 첨부 (최대 8장)</td><td class="p-2">업로드 · 미리보기 ✕</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">강조: 일반 / 중요</td><td class="p-2">priority</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">전광판 노출 만료일</td><td class="p-2">캘린더</td></tr>
              <tr class="border-t bg-indigo-50/40"><td class="p-2 font-semibold">취소 / 등록</td><td class="p-2">닫기 / 게시</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">다매장 조직 전체: <a href="#hq-org-menu" class="underline">5-2 본사·지점 메뉴 지도</a></p>
        </article>
"""
    html = sub_once(
        html,
        "          <div class=\"p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900\"><strong>막힘 해소</strong> 알림이 안 보이면 로그인한 매장 계정이 맞는지 확인하세요.</div>\n        </article>\n\n        <!-- 새 주문 -->",
        "          <div class=\"p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900\"><strong>막힘 해소</strong> 알림이 안 보이면 로그인한 매장 계정이 맞는지 확인하세요.</div>\n        </article>\n" + ORG_BOARD + "\n        <!-- 새 주문 -->",
        "nav-org-board",
    )

    # --- nav-schedule after nav-home ---
    SCHEDULE = """
        <!-- 매장 일정 M-SCH -->
        <article id="nav-schedule" class="anchor-offset mb-16 border border-teal-200 rounded-2xl p-8 bg-gradient-to-b from-white to-teal-50/30 shadow-sm">
          <h3 class="text-xl font-bold text-teal-900 mb-1">매장 일정</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/schedule</code> · ERP 플랜 · v4.6 · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-4"><strong>개요</strong> 픽업·배송·고정비·지출·직원 근무·특이사항을 <strong>한 달 캘린더</strong>에서 겹쳐 봅니다. 체크한 종류만 표시되며, 날짜를 누르면 그날 상세 패널이 열립니다.</p>
          <h4 id="nav-schedule-filters" class="text-base font-black text-slate-900 mb-3">레이어 필터 · 상단</h4>
          <table class="w-full text-xs md:text-sm border border-teal-200 rounded-xl mb-6">
            <thead class="bg-teal-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">필터</td><td class="p-2 font-semibold">픽업 / 배송 / 고정비 / 지출 / 직원 스케줄 / 특이·전달사항</td><td class="p-2">종류별 표시·숨김 토글</td></tr>
              <tr class="border-t"><td class="p-2">필터</td><td class="p-2 font-semibold">🔒 고정비</td><td class="p-2">PIN 해제 후 고정비 레이어 표시</td></tr>
              <tr class="border-t"><td class="p-2">툴바</td><td class="p-2 font-semibold">+ 특이/전달사항</td><td class="p-2">메모 추가 다이얼로그</td></tr>
              <tr class="border-t"><td class="p-2">툴바</td><td class="p-2 font-semibold">+ 직원 스케줄</td><td class="p-2">근무 추가 다이얼로그</td></tr>
            </tbody>
          </table>
          <h4 id="nav-schedule-calendar" class="text-base font-black text-slate-900 mb-3">월 캘린더</h4>
          <table class="w-full text-xs md:text-sm border border-teal-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">yyyy년 M월 · 오늘 · ◀ / ▶</td><td class="p-2">월 이동</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">날짜 셀 클릭</td><td class="p-2">해당일 <code>ScheduleDayView</code> 패널</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">날짜 칩 (건수 배지)</td><td class="p-2">픽업·배송·고정비·지출·직원·메모 요약</td></tr>
            </tbody>
          </table>
          <h4 id="nav-schedule-day" class="text-base font-black text-slate-900 mb-3">일별 패널 · 다이얼로그</h4>
          <table class="w-full text-xs md:text-sm border border-teal-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">+ 특이/전달사항 · + 직원 스케줄</td><td class="p-2">선택일 기준 추가</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">✏️ / 🗑️ (직원·메모)</td><td class="p-2">수정·삭제</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상세 보기</td><td class="p-2">주문·지출 상세 페이지 이동</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">직원 스케줄 DLG: 이름·날짜·시작·종료·메모 · 취소/저장</td><td class="p-2">근무 등록</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">특이사항 DLG: 날짜·내용 · 취소/저장</td><td class="p-2">전달사항</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">고정비 PIN DLG</td><td class="p-2">암호 확인 → 고정비 레이어 잠금 해제</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">배송·픽업 주문 일정: <a href="#nav-delivery" class="underline">배송·픽업</a> · 업무 홈 카드: <a href="#nav-home" class="underline">업무 홈</a></p>
        </article>
"""
    html = sub_once(
        html,
        "          <div class=\"p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900\"><strong>막힘 해소</strong> 매출 숫자가 기대와 다르면 환경 설정의 <strong>매출 집계 기준</strong>(주문일 vs 결제완료일)을 먼저 확인하세요.</div>\n        </article>\n\n\n        <!-- 알림 · 공지 M14 -->",
        "          <div class=\"p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900\"><strong>막힘 해소</strong> 매출 숫자가 기대와 다르면 환경 설정의 <strong>매출 집계 기준</strong>(주문일 vs 결제완료일)을 먼저 확인하세요.</div>\n        </article>\n" + SCHEDULE + "\n\n        <!-- 알림 · 공지 M14 -->",
        "nav-schedule",
    )

    # --- nav-orders-transfers + expand partner page ---
    TRANSFERS_BLOCK = """
        <article id="nav-orders-transfers" class="anchor-offset mb-16 border border-blue-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-blue-900 mb-1">지점 이관 · 수발주 내역</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/orders/transfers</code> · v4.6 · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-4"><strong>개요</strong> 같은 본사 조직 안에서 <strong>보낸·받은 지점 이관</strong> 건을 표로 봅니다. 발주는 <a href="#nav-branch-transfer" class="underline">주문 ⋮ → 지점 이관 요청</a> · 흐름은 <a href="#hq-branch-transfer" class="underline">5-5</a>.</p>
          <h4 id="nav-orders-transfers-header" class="text-base font-black text-slate-900 mb-3">헤더 · 통계</h4>
          <table class="w-full text-xs md:text-sm border border-blue-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">제목 (역할별)</td><td class="p-2">본사: 다매장 지점 이관 정산 · 지점: 지점 주문이관</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">주문 현황</td><td class="p-2"><a href="#nav-orders" class="underline">/dashboard/orders</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">새로고침</td><td class="p-2">목록 재조회</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">총 이관 주문액 · 수주 정산 금액 · 수락 대기중 · 정산 완료</td><td class="p-2">통계 카드 (읽기 전용)</td></tr>
            </tbody>
          </table>
          <h4 id="nav-orders-transfers-table" class="text-base font-black text-slate-900 mb-3">표 · 액션</h4>
          <table class="w-full text-xs md:text-sm border border-blue-200 rounded-xl mb-4">
            <thead class="bg-blue-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">열</td><td class="p-2 font-semibold">유형·이관일시·주문번호·발주/수주 지점·금액·비율·사유·상태</td><td class="p-2">읽기 전용</td></tr>
              <tr class="border-t"><td class="p-2">배지</td><td class="p-2 font-semibold">발주(보냄) / 수주(받음)</td><td class="p-2">방향</td></tr>
              <tr class="border-t"><td class="p-2">상태</td><td class="p-2 font-semibold">수락 대기 / 제작·수락됨 / 반려됨 / 정산 완료</td><td class="p-2">진행 단계</td></tr>
              <tr class="border-t bg-blue-50/40"><td class="p-2">수주점·pending</td><td class="p-2 font-semibold">수락</td><td class="p-2">accepted + 자동 인쇄 큐</td></tr>
              <tr class="border-t bg-blue-50/40"><td class="p-2">수주점·pending</td><td class="p-2 font-semibold">반려</td><td class="p-2">rejected</td></tr>
              <tr class="border-t bg-blue-50/40"><td class="p-2">수주점·accepted</td><td class="p-2 font-semibold">정산 확정(완료)</td><td class="p-2">completed</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">본사 전체 모니터: <a href="#hq-transfers-settlement" class="underline">다매장 수발주 정산</a></p>
        </article>

        <article id="nav-partner-orders-page" class="anchor-offset mb-16 border border-violet-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-violet-900 mb-1">회원사 수발주 · 내역 화면</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/orders/partner-orders</code> · v4.6 · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-4">발주 다이얼로그·개념은 <a href="#nav-partner-orders" class="underline font-semibold">회원사 수발주 (요약)</a> · 환경 설정: <a href="#settings-partner" class="underline">1-8</a>.</p>
          <h4 id="nav-partner-orders-page-header" class="text-base font-black text-slate-900 mb-3">헤더 · 탭</h4>
          <table class="w-full text-xs md:text-sm border border-violet-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">회원사 수발주 · 주문 현황 · 새로고침</td><td class="p-2">헤더</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수주함 / 발주함</td><td class="p-2">받은·보낸 external_orders</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수주점 미등록 배너 · 환경설정으로 이동</td><td class="p-2"><a href="#settings-partner" class="underline">수주점 등록</a></td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">전체 / 수락 대기 / 수락·완료</td><td class="p-2">통계 카드</td></tr>
            </tbody>
          </table>
          <h4 id="nav-partner-orders-page-table" class="text-base font-black text-slate-900 mb-3">표 · 액션</h4>
          <table class="w-full text-xs md:text-sm border border-violet-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">일시·꽃집·상품·주문자(마스킹)·금액·상태</td><td class="p-2">열</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수락 대기 / 수락됨 / 반려 / 완료</td><td class="p-2">상태 배지</td></tr>
              <tr class="border-t bg-violet-50/40"><td class="p-2 font-semibold">반려 (수주함·pending)</td><td class="p-2">발주 거절</td></tr>
              <tr class="border-t bg-violet-50/40"><td class="p-2 font-semibold">수락 &amp; 인쇄 (수주함·pending)</td><td class="p-2">수락 + 주문서·인수증 인쇄</td></tr>
            </tbody>
          </table>
        </article>
"""
    html = sub_once(
        html,
        "          <p class=\"text-xs text-slate-500\">환경 설정 → <strong>회원사 수발주</strong> 탭에서 수주 참여·정산 협약 문구를 볼 수 있습니다.</p>\n        </article>\n\n        <!-- 일일 마감 정산 -->",
        "          <p class=\"text-xs text-slate-500\">환경 설정 → <strong>회원사 수발주</strong> 탭에서 수주 참여·정산 협약 문구를 볼 수 있습니다. · 내역 화면: <a href=\"#nav-partner-orders-page\" class=\"underline font-semibold\">회원사 수발주 내역</a></p>\n        </article>\n" + TRANSFERS_BLOCK + "\n        <!-- 일일 마감 정산 -->",
        "transfers-partner-page",
    )

    html = sub_once(
        html,
        "          <p class=\"text-xs text-slate-500 mb-2\">다이얼로그 버튼: <a href=\"#nav-branch-transfer-dialog\" class=\"underline font-semibold\">지점 이관 DLG 레지스트리</a> · 상세 흐름 <a href=\"#hq-branch-transfer\" class=\"underline\">5-5</a></p>",
        "          <p class=\"text-xs text-slate-500 mb-2\">다이얼로그: <a href=\"#nav-branch-transfer-dialog\" class=\"underline font-semibold\">지점 이관 DLG</a> · 내역: <a href=\"#nav-orders-transfers\" class=\"underline font-semibold\">지점 이관 내역</a> · <a href=\"#hq-branch-transfer\" class=\"underline\">5-5</a></p>",
        "branch-transfer-link",
    )

    # --- nav-mobile-pickup after nav-delivery ---
    # find nav-delivery article end - grep for next article after nav-delivery
    MOBILE_PICKUP = """
        <!-- 모바일 픽업 M-MPU -->
        <article id="nav-mobile-pickup" class="anchor-offset mb-16 border border-indigo-200 rounded-2xl p-8 bg-gradient-to-b from-white to-indigo-50/40 shadow-sm">
          <h3 class="text-xl font-bold text-indigo-900 mb-1">모바일 픽업 · 배송 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/mobile/pickup</code> · 모바일·태블릿 · v4.6 · 검수 2026-07-04</p>
          <p class="text-sm text-slate-700 mb-4"><strong>개요</strong> 매장에서 <strong>휴대폰으로</strong> 오늘·내일 픽업/배송 예약을 빠르게 처리합니다. PC <a href="#nav-delivery" class="underline">배송·픽업</a>과 같은 주문 데이터를 쓰지만 UI가 터치에 맞춰져 있습니다.</p>
          <h4 id="nav-mobile-pickup-header" class="text-base font-black text-slate-900 mb-3">헤더 · 필터</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-6">
            <thead class="bg-indigo-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">픽업 / 배송 관리 · N건 대기</td><td class="p-2">제목·미완료 건수</td></tr>
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">🔄 새로고침</td><td class="p-2">최근 60일 주문 재조회</td></tr>
              <tr class="border-t"><td class="p-2">필터</td><td class="p-2 font-semibold">고객명·연락처·상품명 검색</td><td class="p-2">실시간 필터</td></tr>
              <tr class="border-t"><td class="p-2">탭</td><td class="p-2 font-semibold">전체 / 📦 픽업 / 🚚 배송</td><td class="p-2">수령 방식</td></tr>
              <tr class="border-t"><td class="p-2">날짜</td><td class="p-2 font-semibold">오늘 / 내일 / 전체</td><td class="p-2">예약일</td></tr>
              <tr class="border-t"><td class="p-2">토글</td><td class="p-2 font-semibold">완료 보기 / 완료 숨기기</td><td class="p-2">완료 주문(최근 3일)</td></tr>
            </tbody>
          </table>
          <h4 id="nav-mobile-pickup-card" class="text-base font-black text-slate-900 mb-3">주문 카드</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">픽업 / 배송 · 💳 선결제 · 제작완료 / 완료</td><td class="p-2">배지</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">주문자명 (밑줄)</td><td class="p-2">주문 상세 다이얼로그</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">제작대기 / 제작완료</td><td class="p-2">제작 상태 토글</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">수령확인</td><td class="p-2">선결제 건 완료</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">카드·현금·이체·메인·e-Pay·카카오</td><td class="p-2">미결제 시 결제+완료</td></tr>
            </tbody>
          </table>
          <h4 id="nav-mobile-pickup-detail" class="text-base font-black text-slate-900 mb-3">주문 상세 다이얼로그</h4>
          <table class="w-full text-xs md:text-sm border border-indigo-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">수정 모드 / 변경사항 저장 (관리자)</td><td class="p-2">날짜·결제일·픽업배송일시 정정</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">저장 (배송비)</td><td class="p-2">실제배송비·기사현금 (배송 건)</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">📱 이 화면에서는 <strong>인쇄 버튼이 없습니다</strong>. 영수증·주문서는 매장 PC·브릿지에서 처리하세요 → <a href="#sit-pos-printer" class="underline">S1</a></p>
          <p class="text-xs text-violet-800 bg-violet-50 border border-violet-100 px-3 py-2 rounded-lg mt-2">⚡ 빠르게: <a href="#sit-pickup-delivery" class="underline font-semibold">S5 배송 마무리</a></p>
        </article>
"""
    # Insert after nav-delivery article - find unique end marker
    html = sub_once(
        html,
        "        <!-- CRM -->\n        <article id=\"nav-customers\"",
        MOBILE_PICKUP + "\n        <!-- CRM -->\n        <article id=\"nav-customers\"",
        "nav-mobile-pickup",
    )

    # --- expand nav-pos-quick ---
    html = sub_once(
        html,
        """        <article id="nav-pos-quick" class="anchor-offset mb-16 border border-amber-100 rounded-2xl p-8 bg-gradient-to-b from-white to-amber-50/30 shadow-sm">
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
        </article>""",
        """        <article id="nav-pos-quick" class="anchor-offset mb-16 border border-amber-100 rounded-2xl p-8 bg-gradient-to-b from-white to-amber-50/30 shadow-sm">
          <p class="text-xs text-violet-800 bg-violet-50 border border-violet-100 px-3 py-2 rounded-lg mb-4">⚡ 빠르게: <a href="#sit-quick-pos" class="underline font-semibold">S4 빠른판매 POS</a></p>
          <h3 class="text-xl font-bold text-amber-900 mb-1">빠른판매 POS (M06)</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/pos/quick</code> · v4.6 · 검수 2026-07-04</p>
          <h4 id="nav-pos-quick-header" class="text-base font-black text-slate-900 mb-3">헤더 · 탭</h4>
          <table class="w-full text-xs md:text-sm border border-amber-200 rounded-xl mb-6">
            <thead class="bg-amber-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">◀ 뒤로</td><td class="p-2">이전 화면</td></tr>
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">🔄</td><td class="p-2">장바구니·할인·직접입력 초기화</td></tr>
              <tr class="border-t"><td class="p-2">탭</td><td class="p-2 font-semibold">📦 픽업/배송</td><td class="p-2"><code>/dashboard/pos/pickup</code></td></tr>
              <tr class="border-t"><td class="p-2">탭</td><td class="p-2 font-semibold">⚡ 빠른판매 POS</td><td class="p-2">현재 화면</td></tr>
              <tr class="border-t"><td class="p-2">탭</td><td class="p-2 font-semibold">📝 주문접수(mobile)</td><td class="p-2"><a href="#nav-new-mobile" class="underline">모바일 주문</a></td></tr>
            </tbody>
          </table>
          <h4 id="nav-pos-quick-products" class="text-base font-black text-slate-900 mb-3">카테고리 · 상품</h4>
          <table class="w-full text-xs md:text-sm border border-amber-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">플라워·플랜트·자재·기타·어버이날·전체</td><td class="p-2">상품 필터 (DB 분류)</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">📌</td><td class="p-2">시작 카테고리 고정 (localStorage)</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">+ 금액 직접 입력 · ✕</td><td class="p-2">커스텀 금액 모드</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">상품 타일 (이름·가격)</td><td class="p-2">장바구니 +1</td></tr>
            </tbody>
          </table>
          <h4 id="nav-pos-quick-cart" class="text-base font-black text-slate-900 mb-3">장바구니 · 결제</h4>
          <table class="w-full text-xs md:text-sm border border-amber-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">− / +</td><td class="p-2">수량 조절</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">할인 없음 / 5% / 10% / 20%</td><td class="p-2">할인율</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">카드·현금·계좌이체·메인·e-Pay·카카오</td><td class="p-2">결제 수단</td></tr>
              <tr class="border-t bg-amber-50/50"><td class="p-2 font-semibold">✓ 결제 완료</td><td class="p-2">주문 INSERT (completed) · 2초 후 초기화</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">📖 자세히: 위 표 전체가 버튼 레지스트리입니다.</p>
        </article>""",
        "nav-pos-quick",
    )

    # --- expand nav-reports ---
    html = sub_once(
        html,
        """          <h4 id="nav-reports-kpi" class="text-base font-black text-slate-900 mb-3">KPI</h4>
          <p class="text-sm text-slate-700 mb-4">총 매출 · 총 지출 · 순 이익 · Top5 상품 · 금일 정산 상세(카드/현금/지출/순현금)</p>
        </article>""",
        """          <h4 id="nav-reports-kpi" class="text-base font-black text-slate-900 mb-3">KPI · 운영 지표 (v4.6)</h4>
          <table class="w-full text-xs md:text-sm border border-violet-200 rounded-xl mb-6">
            <thead class="bg-violet-50"><tr><th class="p-2">구역</th><th class="p-2">표기</th><th class="p-2">하는 일</th></tr></thead>
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2">KPI</td><td class="p-2 font-semibold">총 매출 · 총 지출 · 순이익</td><td class="p-2">읽기 전용 카드</td></tr>
              <tr class="border-t"><td class="p-2">운영</td><td class="p-2 font-semibold">객단가 · 주문 건수 · 결제수단 비율</td><td class="p-2">읽기 전용</td></tr>
              <tr class="border-t"><td class="p-2">순위</td><td class="p-2 font-semibold">인기 상품 TOP5</td><td class="p-2">읽기 전용</td></tr>
              <tr class="border-t"><td class="p-2">일일 (오늘 탭)</td><td class="p-2 font-semibold">카드·현금·지출·실시간 잔액</td><td class="p-2">당일 정산표</td></tr>
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">인쇄</td><td class="p-2"><code>window.print()</code></td></tr>
              <tr class="border-t"><td class="p-2">헤더</td><td class="p-2 font-semibold">엑셀 다운로드</td><td class="p-2">※ UI만 있음 · 추후 연결</td></tr>
              <tr class="border-t"><td class="p-2">하단</td><td class="p-2 font-semibold">프로 플랜 업그레이드</td><td class="p-2">※ CTA 표시 · 추후 연결</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500">일일 마감 상세: <a href="#nav-daily-settlement" class="underline">일일 마감 정산</a></p>
        </article>""",
        "nav-reports",
    )

    # --- expand nav-analytics ---
    html = sub_once(
        html,
        """        <article id="nav-analytics" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-violet-800 mb-1">매입·매출 통계</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/analytics</code> · v4.4</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">이번 달 / 3·6·12개월</td><td class="p-2">기간</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">총 매출 · 총 지출 · 매출이익</td><td class="p-2">KPI</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">분류별 지출 · 거래처 TOP10 · 결제수단별</td><td class="p-2">차트</td></tr>
            </tbody>
          </table>
        </article>""",
        """        <article id="nav-analytics" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-violet-800 mb-1">매입·매출 통계</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/analytics</code> · v4.6 · 검수 2026-07-04</p>
          <h4 id="nav-analytics-header" class="text-base font-black text-slate-900 mb-3">컨트롤</h4>
          <table class="w-full text-xs md:text-sm border border-violet-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">◀ / ▶</td><td class="p-2">기준 월 이동</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">1개월 / 3개월 / 6개월 / 1년</td><td class="p-2">집계 구간</td></tr>
            </tbody>
          </table>
          <h4 id="nav-analytics-kpi" class="text-base font-black text-slate-900 mb-3">KPI · 차트 (읽기 전용)</h4>
          <table class="w-full text-xs md:text-sm border border-violet-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">총 매출 · 총 지출 · 순이익 · 평균</td><td class="p-2">KPI 카드 4장</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">일별/월별 추세 막대</td><td class="p-2">호버 툴팁</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">카테고리 지출 파이 · 거래처 랭킹 · 결제수단 파이</td><td class="p-2">호버만 · 드릴다운 없음</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">거래처 TOP 카드</td><td class="p-2">읽기 전용</td></tr>
            </tbody>
          </table>
        </article>""",
        "nav-analytics",
    )

    # --- expand nav-tax ---
    html = sub_once(
        html,
        """        <article id="nav-tax" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-slate-800 mb-1">세무 · 세무 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/tax</code> · v4.4</p>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">연도 선택 · 현황신고 자료 다운로드</td><td class="p-2">헤더</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">면세/과세 안내 · 월별 수입/경비</td><td class="p-2">카드</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">필요경비 · 거래처별 매입 · 신고 체크리스트</td><td class="p-2">섹션</td></tr>
            </tbody>
          </table>
        </article>""",
        """        <article id="nav-tax" class="anchor-offset mb-16 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
          <h3 class="text-xl font-bold text-slate-800 mb-1">세무 · 세무 관리</h3>
          <p class="text-xs font-mono text-slate-500 mb-4">경로: <code>/dashboard/tax</code> · v4.6 · 검수 2026-07-04</p>
          <h4 id="nav-tax-header" class="text-base font-black text-slate-900 mb-3">헤더 ·보내기</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">◀ / ▶</td><td class="p-2">조회 연도 ±1</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">현황신고 자료 다운로드</td><td class="p-2">CSV 다운로드</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">홈택스 바로가기</td><td class="p-2">외부 링크 (안내 배너)</td></tr>
            </tbody>
          </table>
          <h4 id="nav-tax-assist" class="text-base font-black text-slate-900 mb-3">한국 세무 도우미</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-6">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">신고 체크리스트 7항</td><td class="p-2">localStorage 저장</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">홈택스 / 국세청 / 지출 입력·관리</td><td class="p-2">외부·<a href="#nav-expenses" class="underline">지출</a> 링크</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">지출 화면 열기</td><td class="p-2"><code>/dashboard/expenses</code></td></tr>
            </tbody>
          </table>
          <h4 id="nav-tax-kpi" class="text-base font-black text-slate-900 mb-3">KPI · 일정 · 표 (읽기 전용)</h4>
          <table class="w-full text-xs md:text-sm border border-slate-200 rounded-xl mb-4">
            <tbody class="text-slate-700">
              <tr class="border-t"><td class="p-2 font-semibold">수입·매입·경비·소득 KPI 4장</td><td class="p-2">연도 집계</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">월별 매출·경비 막대 차트</td><td class="p-2">호버 툴팁</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">세무 일정 카드 · 홈택스에서 신고하기</td><td class="p-2">외부 링크</td></tr>
              <tr class="border-t"><td class="p-2 font-semibold">비용 항목 · 거래처별 매입 · 요약표</td><td class="p-2">읽기 전용</td></tr>
            </tbody>
          </table>
        </article>""",
        "nav-tax",
    )

    # --- S articles: standardize 📖 자세히 links ---
    sit_links = [
        (
            '          <p class="text-xs text-slate-500">더 자세히: <a href="#settings-printer" class="text-emerald-700 underline">1-5 프린터/브릿지</a></p>\n        </article>',
            '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">📖 자세히: <a href="#settings-printer" class="underline font-semibold">1-5 프린터/브릿지</a> · <a href="#nav-orders-row-menu" class="underline font-semibold">주문 행 메뉴(인쇄)</a></p>\n        </article>',
        ),
        (
            '          <p class="text-xs text-slate-500">더 자세히: <a href="#nav-printer" class="text-emerald-700 underline">리본 프린터 (상세)</a></p>\n        </article>',
            '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">📖 자세히: <a href="#nav-printer" class="underline font-semibold">리본 프린터 (PR)</a></p>\n        </article>',
        ),
    ]
    for old, new in sit_links:
        html = sub_once(html, old, new, "sit-link")

    # Add sit links where pattern differs - read sit-first-day, sit-delivery-fee etc.
    extra_sit = {
        "sit-delivery-fee": ('</article>\n\n        <!-- S4 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#settings-delivery" class="underline font-semibold">1-3 배송비</a> · <a href="#nav-new-order" class="underline font-semibold">새 주문</a></p>\n        </article>\n\n        <!-- S4 -->'),
        "sit-quick-pos": ('</article>\n\n        <!-- S5 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-pos-quick" class="underline font-semibold">빠른판매 POS</a></p>\n        </article>\n\n        <!-- S5 -->'),
        "sit-pickup-delivery": ('</article>\n\n        <!-- S· 외부발주 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-delivery" class="underline font-semibold">배송·픽업</a> · <a href="#nav-mobile-pickup" class="underline font-semibold">모바일 픽업</a></p>\n        </article>\n\n        <!-- S· 외부발주 -->'),
        "sit-outsource": ('</article>\n\n        <!-- S6 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-outsource" class="underline font-semibold">외부발주</a> · <a href="#nav-order-flows" class="underline font-semibold">발주 3종 비교</a></p>\n        </article>\n\n        <!-- S6 -->'),
        "sit-mobile-order": ('</article>\n\n        <!-- S7 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-new-mobile" class="underline font-semibold">모바일 주문</a></p>\n        </article>\n\n        <!-- S7 -->'),
        "sit-daily-settlement": ('</article>\n\n        <!-- S8 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-daily-settlement" class="underline font-semibold">일일 마감 정산</a></p>\n        </article>\n\n        <!-- S8 -->'),
        "sit-ai-order": ('</article>\n\n        <!-- S9 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-new-order" class="underline font-semibold">새 주문</a> · <a href="#orders-ai" class="underline font-semibold">2-1 AI 입력</a></p>\n        </article>\n\n        <!-- S9 -->'),
        "sit-customer-point": ('</article>\n\n        <!-- S10 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-customers" class="underline font-semibold">고객 CRM</a> · <a href="#settings-policy" class="underline font-semibold">1-2 포인트</a></p>\n        </article>\n\n        <!-- S10 -->'),
        "sit-revenue-calendar": ('</article>\n\n        <article id="sit-complete"', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#nav-revenue" class="underline font-semibold">매출 캘린더</a> · <a href="#revenue-engine" class="underline font-semibold">3-2 상세</a></p>\n        </article>\n\n        <article id="sit-complete"'),
        "sit-first-day": ('</article>\n\n        <!-- S1 -->', '          <p class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg mt-4">📖 자세히: <a href="#settings-map" class="underline font-semibold">1장 환경 설정</a> · <a href="#nav-home" class="underline font-semibold">업무 홈</a></p>\n        </article>\n\n        <!-- S1 -->'),
    }
    for label, (old, new) in extra_sit.items():
        if old in html:
            html = html.replace(old, new, 1)
        else:
            print(f"WARN: skip sit link {label}")

    # Legacy #dashboard pointer note at intro
    html = sub_once(
        html,
        '<div id="dashboard" class="anchor-offset">',
        '<div id="dashboard" class="anchor-offset"><p class="text-xs text-slate-500 mb-4">※ v4 백과사전: <a href="#nav-home" class="text-emerald-700 underline font-semibold">업무 홈 (M01)</a> — 버튼 레지스트리는 4장을 보세요.</p>',
        "dashboard-legacy-note",
    )

    MANUAL.write_text(html, encoding="utf-8")
    PACK.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(MANUAL, PACK)
    print(f"Wrote {MANUAL} ({len(html)} chars) -> {PACK}")

    # inventory append
    inv = INVENTORY.read_text(encoding="utf-8")
    if "v4.6" not in inv:
        inv = inv.replace("2026-07-04 (v4.5)", "2026-07-04 (v4.6)")
        extra = """
## Tier P5 — v4.6 추가 화면

| 화면 | 경로 | 앵커 | 상태 |
|------|------|------|------|
| 매장 일정 | `/dashboard/schedule` | `#nav-schedule` | 🟢 v4.6 |
| 모바일 픽업 | `/dashboard/mobile/pickup` | `#nav-mobile-pickup` | 🟢 v4.6 |
| 지점 이관 내역 | `/dashboard/orders/transfers` | `#nav-orders-transfers` | 🟢 v4.6 |
| 회원사 수발주 내역 | `/dashboard/orders/partner-orders` | `#nav-partner-orders-page` | 🟢 v4.6 |
| 본사 게시판 | `/dashboard/org-board` | `#nav-org-board` | 🟢 v4.6 |

## v4.6 레지스트리 보강

| 화면 | 앵커 | 비고 |
|------|------|------|
| 빠른 POS | `#nav-pos-quick-header` … | 3존 풀 표 |
| 정산 보고서 | `#nav-reports-kpi` | KPI·스텁 표기 |
| 통계 | `#nav-analytics-header` … | 컨트롤+차트 |
| 세무 | `#nav-tax-header` … | 도우미+KPI |

- [x] P5 누락 5화면
- [x] POS·세무·통계·정산 깊이 보강
- [x] 사이드바·HQ 링크·S→M 📖 링크
- [ ] 실제 PNG 스크린샷 (사장님 촬영)
"""
        inv = inv.replace(
            "- [ ] 실제 PNG 스크린샷 (사장님 촬영)",
            "- [x] P5 누락 5화면 + 얕은 레지스트리 보강 (v4.6)\n- [ ] 실제 PNG 스크린샷 (사장님 촬영)",
        )
        if "## Tier P5" not in inv:
            inv = inv.rstrip() + "\n" + extra
        INVENTORY.write_text(inv, encoding="utf-8")
        print("Updated inventory")


if __name__ == "__main__":
    main()
