import os
import re

file_path = 'src/app/dashboard/design-studio/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Unterminated String
text = re.sub(r"text: '\?+,\s*x: 105", "text: '내용을 입력하세요',\n      x: 105", text)
text = text.replace("text: '??????????,", "text: '내용을 입력하세요',")

# Fix Headers & Tabs
text = re.sub(r"ī/ \?+/h1>", "카드/리본 편집</h1>", text)
text = re.sub(r">\?+/\?+</Button>", ">앞면/외부</Button>", text)
text = re.sub(r">\?+\(\?+\)</Button>", ">뒷면(내부)</Button>", text)
text = re.sub(r"Save.*?/> \?+          </Button>", "Save className=\"w-4 h-4\" /> 저장하기</Button>", text)
text = re.sub(r">\?\?</TabsTrigger>", ">속성</TabsTrigger>", text)
text = re.sub(r">\?+/\?+</TabsTrigger>", ">출력/설정</TabsTrigger>", text)
text = re.sub(r">(\?+)(/TabsTrigger>)", r">메뉴\2", text)
text = re.sub(r">\?+</TabsTrigger>", ">레이어</TabsTrigger>", text)
text = re.sub(r">\?\? \?\?</span>", ">텍스트 추가</span>", text)

# Fix OptGroups and Options
text = re.sub(r'label="\?+/\?+"', 'label="글꼴그룹"', text)
text = re.sub(r"option value=\"var\(--font-bagel\)\">.*?/option>", "option value=\"var(--font-bagel)\">베이글</option>", text)
text = re.sub(r"option value=\"var\(--font-black-han\)\">.*?/option>", "option value=\"var(--font-black-han)\">검은고딕</option>", text)
text = re.sub(r"option value=\"var\(--font-do-hyeon\)\">.*?/option>", "option value=\"var(--font-do-hyeon)\">도현</option>", text)
text = re.sub(r'label="/"', 'label="고딕/명조"', text)
text = re.sub(r"option value=\"var\(--font-inter\)\">Inter.*?/option>", "option value=\"var(--font-inter)\">Inter (기본)</option>", text)
text = re.sub(r"option value=\"var\(--font-gowun\)\">.*?/option>", "option value=\"var(--font-gowun)\">고운돋움</option>", text)
text = re.sub(r'label="\?+"', 'label="손글씨"', text)
text = re.sub(r"option value=\"var\(--font-nanum-pen\)\">.*?/option>", "option value=\"var(--font-nanum-pen)\">나눔펜</option>", text)
text = re.sub(r"option value=\"var\(--font-gaegu\)\">.*?/option>", "option value=\"var(--font-gaegu)\">개구</option>", text)
text = re.sub(r"option value=\"var\(--font-yeon-sung\)\">.*?/option>", "option value=\"var(--font-yeon-sung)\">연성</option>", text)

# Fix Labels
text = re.sub(r"<label.*?>\?+ \?+</label>", "<label className=\"text-[10px] font-black text-slate-400 uppercase tracking-widest\">텍스트 정렬</label>", text)
text = re.sub(r"<span>\?+</span>", "<span>속성값</span>", text)

# Fix JSX structure issues caused by previous wrong powershell replace
text = text.replace("</</", "</")
text = text.replace("</p>", "</p>\n")

# Generic cleanup of dangling ?? tags making sure closing tags exist
text = re.sub(r">\?+</p>", ">요소 설명</p>", text)
text = re.sub(r">\?+</label>", ">라벨</label>", text)
text = re.sub(r">\?+</span", ">라벨</span", text)
text = re.sub(r">\?+", ">", text) # Blank out any remaining raw question marks in JSX text
text = re.sub(r"\?+/", "/", text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Python Fix Done.')
