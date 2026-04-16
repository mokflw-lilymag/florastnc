const fs = require('fs');
const path = require('path');

const files = [
  'src/app/dashboard/design-studio/page.tsx',
  'src/components/studio/DraggableImage.tsx',
  'src/components/studio/DraggableText.tsx',
  'src/components/studio/EditorCanvas.tsx',
  'src/components/studio/PhotoEditModal.tsx',
  'src/components/design-studio/DraggableImage.tsx',
  'src/components/design-studio\DraggableText.tsx',
  'src/components/design-studio/EditorCanvas.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');

  // Generic tag fixer for anything that looks like: >???</p> or >?</
  text = text.replace(/>\?+<\/([a-zA-Z0-9]+)>/g, '>텍스트</$1>');
  text = text.replace(/>\?+<\//g, '>텍스트</');
  text = text.replace(/>\?+([^</\w]*<)/g, '>텍스트$1');
  
  // page.tsx specific 
  if (file.includes('page.tsx')) {
    text = text.replace(/text:\s*'\?+,\s*x:/g, "text: '내용을 입력하세요',\n      x:");
    text = text.replace(/text:\s*'\?+',/g, "text: '내용을 입력하세요',");
    text = text.replace(/label="\?+\/?\?+"/g, 'label="글꼴그룹"');
    text = text.replace(/ī\/\s*\?+\/h1>/g, '카드/리본 편집</h1>');
    text = text.replace(/<span.*?>\?+<\/span>/g, '<span>속성값</span>');
  }

  // Remove any remaining raw ?? that break JSX parsing
  text = text.replace(/>\?+/g, '>');
  text = text.replace(/="\?+"/g, '="텍스트"');
  text = text.replace(/'\?+'/g, "'텍스트'");
  text = text.replace(/"\?+"/g, '"텍스트"');
  
  // Make sure string literals are closed properly if they were truncated
  text = text.replace(/toast\.success\('\?+([^')]*)\)/g, "toast.success('완료되었습니다')");
  
  // Fix specifically broken elements on page.tsx
  text = text.replace(/<h1.*?>.*?<\/h1>/g, '<h1 className="text-xl font-black tracking-tight">편집기</h1>');
  text = text.replace(/<TabsTrigger.*?>.*?<\/TabsTrigger>/g, (match) => {
      let m = match.replace(/\?+/g, '');
      if (!m.includes('</TabsTrigger>')) m += '</TabsTrigger>';
      return m;
  });

  // Re-save
  fs.writeFileSync(file, text, 'utf8');
});

console.log('Node js Fix Done.');
