# ngrok 고정 도메인 설정 가이드 (n8n용)

매번 바뀌는 ngrok 주소 때문에 고생하셨죠? 무료 계정에서도 1개의 도메인은 고정으로 사용할 수 있습니다.

## 1단계: ngrok 대시보드에서 도메인 확보
1. [ngrok Domains 페이지](https://dashboard.ngrok.com/cloud-edge/domains)에 접속합니다.
2. **"Create Domain"** 버튼을 클릭합니다.
3. 생성된 주소(예: `minta-fruitily.ngrok-free.app`)를 복사해둡니다.

## 2단계: 터미널에서 고정 도메인으로 실행
n8n이 실행 중인 포트(보통 5678)를 이 도메인으로 연결합니다.

```bash
# 아래 명령어를 터미널에 입력하세요 (복사한 도메인 주소로 변경)
ngrok http 5678 --domain=당신의도메인.ngrok-free.app
```

## 3단계: Floxync 앱 설정 업데이트
주소가 확정되면 저(AI)에게 알려주세요. 제가 `.env.local`과 Supabase의 `n8n_master_url`을 이 고정 주소로 업데이트하겠습니다.

---
**Tip**: 이렇게 설정하면 앞으로는 ngrok을 껐다 켜도 주소가 바뀌지 않아 마케팅 자동화가 끊기지 않습니다!
