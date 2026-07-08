const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/admin/staff/page.tsx', 'utf8');

c = c.replace(
  /<DialogTrigger asChild>\s*<Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-\[1\.2rem\] h-10 px-5 font-black gap-2\">\s*<UserPlus className="w-4 h-4" \/>\s*\{tf\.f01956\}\s*<\/Button>\s*<\/DialogTrigger>/,
  `<DialogTrigger render={<Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-[1.2rem] h-10 px-5 font-black gap-2"><UserPlus className="w-4 h-4" />{tf.f01956}</Button>} />`
);

fs.writeFileSync('src/app/dashboard/admin/staff/page.tsx', c);
