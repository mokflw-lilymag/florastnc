const fs = require('fs');
let text = fs.readFileSync('src/app/dashboard/design-studio/page.tsx', 'utf8');

text = text.replace(/카드\/리본 \?자\?\?\/h1>/g, '카드/리본 편집기</h1>');
text = text.replace(/구\?\?\/TabsTrigger>/g, '도구모음</TabsTrigger>');
text = text.replace(/이\?\?\/TabsTrigger>/g, '레이어</TabsTrigger>');

text = text.replace(/글\?자 추\\?<<\/span>/g, '글상자 추가</span>');
text = text.replace(/텍스트\?지 \?입<<\/span>/g, '이미지 삽입</span>');
text = text.replace(/텍스트면 \?점 로고 \?동 배치<<\/span>/g, '로고 자동배치</span>');
text = text.replace(/텍스트\? 가\?드<<\/span>/g, '접지선 가이드</span>');

text = text.replace(/}<<\/span>/g, '}</span>');
text = text.replace(/%<<\/span>/g, '%</span>');
text = text.replace(/°<<\/span>/g, '°</span>');
text = text.replace(/합\?다\.<<\/p>/g, '기능입니다.</p>');
text = text.replace(/다<<\/p>/g, '다.</p>');

fs.writeFileSync('src/app/dashboard/design-studio/page.tsx', text, 'utf8');
