import re

path = 'docs/floxync-manual.html'
text = open(path, encoding='utf-8').read()

# 1. 1091 라인의 포트 주소와 n8n 웹훅 등 비전문가 사장님용 문구 제거
text = text.replace(
    '<li>실제 리본 프린터로 리본을 뽑으시려면 매장 PC 화면 우측 하단(윈도우 작업 표시줄 트레이)에 <strong>플록싱크 프린트 브릿지 아이콘</strong>이 실행되어 켜져 있어야 합니다.</li>\n            <li>실제 리본 프린터로 리본을 뽑으시려면 매장 PC 화면 우측 하단(윈도우 작업 표시줄 트레이)에 <strong>플록싱크 프린트 브릿지 아이콘</strong>이 실행되어 켜져 있어야 합니다.</li>',
    '<li>실제 리본 프린터로 리본을 뽑으시려면 매장 PC 화면 우측 하단(윈도우 작업 표시줄 트레이)에 <strong>플록싱크 프린트 브릿지 아이콘</strong>이 실행되어 켜져 있어야 합니다.</li>'
)

# 2. 리본 프린터 상세의 1121~1122 라인 포트 및 API 주소 언급 삭제 및 쉬운 한글 대체
text = text.replace(
    '<li>같은 줄 오른쪽 <strong>새로고침(↻)</strong> 아이콘을 누르면 <code>127.0.0.1:8002/api/printers</code> 를 다시 읽습니다. 반응이 없으면 브릿지 미실행 또는 방화벽입니다.</li>',
    '<li>오른쪽의 <strong>새로고침(↻)</strong> 아이콘을 누르면 연결된 프린터 목록을 다시 가져옵니다. 연결이 안 되면 브릿지 앱이 실행 중인지 확인하세요.</li>'
)
text = text.replace(
    '패널 하단의 <strong>「브릿지 연결 문제 해결 및 초기화」</strong> 를 누르면 안내 모달이 열립니다(작업표시줄 R 아이콘, 8002 포트, 설정 초기화 등).',
    '패널 하단의 <strong>「브릿지 연결 문제 해결」</strong> 버튼을 누르면 자가 진단 및 상세 해결 방법 안내 창이 열립니다.'
)

# 3. 1168 라인의 포트 주소 및 기술 단어 삭제
text = text.replace(
    '<li>PRINT가 안 되면: 브릿지 실행 여부 → 8002 포트 → 백신 예외 → 브라우저가 <code>127.0.0.1</code> 차단 아닌지 순서로 확인.</li>',
    '<li>출력이 전혀 안 되면: 매장 PC 화면 오른쪽 아래 시계 옆에 프린트 브릿지 앱이 실행 중인지 확인하고, 컴퓨터를 껐다 켜보세요.</li>'
)

# 4. 매출 캘린더 등에서 보이는 n8n 웹훅 등 비전문가용 삭제
text = text.replace(
    '<li>예전 n8n 웹훅 설정은 더 이상 쓰지 않습니다 — 매출 캘린더만 사용하세요</li>',
    '<li>예전 알림톡 발송 방식은 쓰지 않으며, 모든 발송 결과는 <strong>매출 캘린더</strong> 화면에서만 직관적으로 통합 조회됩니다.</li>'
)

# 5. 673~677 라인 등 데이터베이스 필드명 언급 삭제
text = text.replace(
    '성공 시 토스트로 저장되었음을 알립니다. 저장 필드 개념은 <code>previous_vault_balance</code>, <code>cash_sales_today</code>, <code>delivery_cost_cash_today</code>, <code>cash_expense_today</code>, <code>vault_deposit</code> 등으로 이해하시면 됩니다.',
    '성공 시 화면 하단에 완료 메시지가 표시됩니다.'
)

open(path, 'w', encoding='utf-8').write(text)
print("Comprehensive technical wording simplified in docs/floxync-manual.html!")
