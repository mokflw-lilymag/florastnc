---
name: release_checklist
description: "LilyMag ERP v4 빌드 및 릴리즈 전 필수 확인 사항 (브릿지 재컴파일 등 누락 방지)"
---

# LilyMag ERP v4 Release & Build Checklist

이 스킬은 윈도우 앱 (Electron) 및 웹 앱 (Next.js) 빌드, 그리고 GitHub 릴리즈를 진행하기 전에 에이전트가 반드시 수행해야 하는 확인 및 작업 절차를 정의합니다.

## ⚠️ 필수 확인 사항 (사전 점검)

릴리즈 스크립트(`npm run electron:build` 또는 `release:windows`)를 실행하기 전에 **반드시** 아래 항목들을 점검해야 합니다.

### 1. `bridge-app` (PP Bridge) 변경 사항 확인
- `bridge-app/` 내부의 파일(`index.js`, `*.html` 등)을 수정한 적이 있는가?
- 수정한 적이 있다면, **반드시 `bridge-app` 디렉토리 내에서 `npx pkg . --target node18-win-x64 --output ppbridge.exe` 를 실행하여 최신 실행 파일을 새로 빌드**했는가?
- (주의: 이 과정을 누락하면 Electron 빌드 시 과거 버전의 `ppbridge.exe` 가 패키징되어 치명적인 오류를 발생시킵니다.)

### 2. 버전 펌핑 (Version Bump)
- `package.json`의 `version`을 올바르게 업데이트했는가? (예: `0.1.4` -> `0.1.5`)
- 커밋 메시지에 버전 펌핑 사실을 명시했는가?

### 3. Git 커밋 및 푸시 상태
- 재컴파일된 `ppbridge.exe` 와 수정된 소스 코드들이 모두 `git add` 되어 커밋되었는가?
- 로컬 커밋이 원격 저장소(`main` 브랜치)에 정상적으로 `git push` 되었는가?
- (주의: GitHub Release는 원격 저장소의 최신 커밋을 기준으로 동작하므로 푸시 누락 시 이전 코드로 릴리즈됩니다.)

### 4. 기타 의존성 컴파일
- `scripts/`나 네이티브 모듈과 관련된 변경이 있다면 `node scripts/...` 관련 동기화 스크립트를 사전에 실행했는가?

## 🚀 릴리즈 진행 순서

위의 필수 확인 사항을 모두 마쳤다면 다음 순서로 빌드를 진행합니다.

1. **사전 컴파일:** `cd bridge-app && npx pkg . --target node18-win-x64 --output ppbridge.exe`
2. **버전 및 Git 업로드:** `git add . && git commit -m "..." && git push`
3. **Electron 빌드:** 프로젝트 루트에서 `npm run electron:build` 실행
4. **배포 릴리즈:** 빌드 성공 확인 후 `npm run release:windows` 실행

이 체크리스트는 요약된 메모리(스킬)로 작동하며, 이후 "릴리즈해줘"라는 요청이 들어올 때 에이전트는 자동으로 이 스킬을 참조하여 실수를 방지합니다.
- **릴리즈 스크립트:** scripts/publish-github-release.ps1 등 릴리즈 배포 스크립트에 하드코딩된 버전(예: 0.1.4 -> 0.1.5)을 업데이트 했는가?

### 5. 윈도우앱-웹앱 통합 패키징 (핵심 구조) 이해
- 윈도우앱 빌드(
pm run electron:build) 시, 단순히 클라이언트만 빌드되는 것이 아니라 **웹앱 전체(standalone 모드)와 최신 브릿지(ppbridge.exe, 리본 브릿지 등)가 함께 내장(Bundled)**됨을 명심해야 합니다.
- 사용자가 윈도우앱을 설치하면 웹앱과 최신 브릿지가 동시에 설치되며, 윈도우앱 실행 시 백그라운드 웹 브라우저 형태로 웹앱이 구동됩니다. 즉, **윈도우앱은 웹앱 및 PP브릿지를 켜는 '키(Key)' 역할**을 합니다.
- 따라서 웹앱 서버 로직이나 브릿지 로직에 수정이 발생하면, 반드시 위 1~4번 과정을 거쳐 윈도우앱을 새로 빌드하고 배포해야 사용자의 PC에 최신 웹앱과 브릿지가 적용됩니다.
