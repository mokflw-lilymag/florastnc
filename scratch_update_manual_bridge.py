import re

path = 'docs/floxync-manual.html'
text = open(path, encoding='utf-8').read()

# Replace the target explanation in the Windows App Only card to include the 2-in-1 bridge installation details.
old_target = "<strong>윈도우 전용 데스크톱 브릿지 앱</strong>이 필수로 구동되어야 합니다."
new_target = "<strong>윈도우 전용 데스크톱 브릿지 앱</strong>이 필수로 구동되어야 합니다. 특히 윈도우 앱을 설치 및 구동하시면, 웹앱의 핵심 인쇄 일꾼인 <strong>[1. 리본 인쇄 브릿지]와 [2. 인수증/영수증 인쇄 브릿지] 2개의 브릿지가 동시에 자동 설치 및 연결</strong>되어 별도 세팅 없이 모든 종류의 출력을 한번에 시작하실 수 있습니다."

if old_target in text:
    text = text.replace(old_target, new_target)
    open(path, 'w', encoding='utf-8').write(text)
    print("Manual updated with dual-bridge description!")
else:
    print("Target text not found in manual HTML.")
