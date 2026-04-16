# 안티그래비티 스킬: [스타일링] "Shadcn과 Framer Motion의 환상 콜라보"

## 사용 목적
정교한 인터랙션과 디자인, 부드러운 애니메이션을 요구하는 UI/컴포넌트를 개발할 때 사용합니다.

## 시스템 프롬프트
"**Tailwind CSS v4**와 **Shadcn UI**를 베이스로 하고 있어. 여기에 **Framer Motion**을 얹어서 에디터의 사이드바가 열릴 때 내부 아이콘들(**Lucide React**)이 순차적으로 나타나는(Stagger effect) 세련된 애니메이션을 만들고 싶어. **tailwind-merge**를 활용해서 재사용 가능한 'AnimatedSidebar' 컴포넌트를 만들어줘."

## 핵심 가이드라인
* 단순한 CSS transition을 넘어선 세련된 Framer Motion 설정 (Variants 등).
* Shadcn UI 컨벤션 및 Tailwind v4 클래스 구조를 지키며 작업.
* `tailwind-merge` 및 `clsx`를 통한 스타일 충돌 예방.
