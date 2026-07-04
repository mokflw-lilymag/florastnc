"""Generate labeled SVG placeholders for manual screenshots missing PNG."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs" / "manual-screenshots"

LABELS = {
    "home-01-dashboard": "업무 홈 — 오늘 주문·매출·일정",
    "settings-01-store-info": "환경 설정 → 상점 정보",
    "settings-02-order-policy": "환경 설정 → 주문/할인/포인트",
    "settings-03-delivery-fee": "환경 설정 → 배송",
    "settings-04-categories": "환경 설정 → 카테고리",
    "settings-06-automation-solapi": "연동 → 솔라피·카카오",
    "settings-07-regional": "국가별 연동 카드",
    "orders-01-ai-entry": "새 주문 — AI 주문 붙여넣기",
    "orders-02-detail-annotated": "주문 상세 — 상태·인쇄",
    "orders-03-photo-notify": "완성 사진 · 알림",
    "crm-01-customer-list": "고객 CRM 목록",
    "crm-02-anniversary-form": "고객 기념일 등록",
    "calendar-01-delivery-schedule": "배송·픽업 일정",
    "revenue-01-overview": "매출 캘린더 전체",
    "revenue-02-anniversary-d7": "기념일 D-7",
    "revenue-03-post-purchase": "구매 후 메시지",
    "revenue-04-templates": "메시지 템플릿",
    "revenue-05-instagram-connect": "Instagram 연결",
    "revenue-06-report": "성과 리포트",
    "ribbon-01-overview": "리본 프린터 화면",
    "ribbon-02-sidebar-printer": "출력 프린터 선택",
    "ribbon-03-floating-toolbar": "PRINT · 미리보기",
    "sit-06-mobile-order": "모바일 주문 접수",
    "sit-07-daily-settlement": "일일 마감 정산",
    "sit-08-ai-order": "AI 주문 입력",
    "sit-09-customer": "단골·포인트",
    "sit-10-revenue": "매출 캘린더 시작",
    "sit-11-first-day": "첫날 30분 체크리스트",
    "sit-00-login": "로그인 · 첫 화면",
    "nav-notifications": "알림 · 공지",
}


def svg(name: str, label: str) -> str:
    safe = label.replace("&", "&amp;").replace("<", "&lt;")
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 400" role="img">
  <rect width="920" height="400" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="24" y="24" width="872" height="48" rx="8" fill="#ecfdf5"/>
  <text x="440" y="54" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="14" font-weight="700" fill="#047857">FloXync</text>
  <text x="440" y="200" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="18" font-weight="700" fill="#0f172a">{safe}</text>
  <text x="440" y="230" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="12" fill="#64748b">{name}.svg</text>
  <text x="440" y="360" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="10" fill="#94a3b8">안내 목업 — 실제 캡처(PNG)로 교체 가능</text>
</svg>
'''


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, label in LABELS.items():
        path = ROOT / f"{name}.svg"
        if path.name in ("settings-05-printer.svg", "appendix-apps.svg", "sit-01-print-flow.svg"):
            continue
        if path.exists() and name.startswith("sit-0") and name in ("sit-02-ribbon", "sit-03-delivery-fee", "sit-04-quick-pos", "sit-05-delivery-close"):
            continue
        content = svg(name, label)
        path.write_text(content, encoding="utf-8")
        print("wrote", path.name)


if __name__ == "__main__":
    main()
