const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'node_modules', 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe');
try {
  const stat = fs.statSync(src);
  console.log('Exists in snapshot! Size:', stat.size);
} catch(e) {
  console.error('Not in snapshot!', e.message);
}
