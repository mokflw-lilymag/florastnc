const fs = require('fs');

let path = 'D:\\mapp\\floxync.com\\src\\app\\dashboard\\mobile\\pickup\\page.tsx';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split(/\r?\n/);

// We want to keep lines up to 397 (0-indexed 396)
// Line 396 is `      </div>`
// Line 397 is `      `
// Line 398 is `      {/* Expanded Details */}`

let before = lines.slice(0, 397);
let after = lines.slice(454); // starts from 455 (0-indexed 454 which is `    </div>`)

fs.writeFileSync(path, [...before, ...after].join('\n'));
console.log("Expanded details block cleanly removed.");
