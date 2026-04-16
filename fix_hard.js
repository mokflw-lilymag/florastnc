const fs = require('fs');
let text = fs.readFileSync('src/app/dashboard/design-studio/page.tsx', 'utf8');

text = text.replace(/text:\s*'[^,]+,/g, "text: '내용을 입력하세요',");
text = text.replace(/<h1.*?>.*?<\/h1>/g, '<h1 className="text-xl font-black tracking-tight">디자인 편집기</h1>');
text = text.replace(/toast\.success\([^)]*\)/g, "toast.success('완료되었습니다')");
text = text.replace(/<TabsTrigger.*?>.*?<\/TabsTrigger>/g, (m) => m.replace(/<TabsTrigger(.*?)>.*?<\/TabsTrigger>/, '<TabsTrigger>탭메뉴</TabsTrigger>'));

// Fix broken HTML tags that end abruptly
text = text.replace(/<Button[^>]*>\s*[^\s<]*\s*<\/Button>/gi, (m) => {
   if (m.indexOf('/>') !== -1) return m; 
   let clean = m.replace(/[^<>\w\s"-/=]/g, '');
   return clean;
});
text = text.replace(/>\s*[^<>\w\s={}()\[\]\-'"\/:]+\s*<\/p>/g, '>설명</p>');
text = text.replace(/<optgroup([^>]+)>.*?<\/optgroup>/gs, '<optgroup><option value="var(--font-inter)">기본 글꼴</option></optgroup>');
text = text.replace(/<label([^>]+)>.*?<\/label>/g, '<label>설정 라벨</label>');
text = text.replace(/<span>.*?<\/span>/g, '<span>라벨</span>');

fs.writeFileSync('src/app/dashboard/design-studio/page.tsx', text, 'utf8');
