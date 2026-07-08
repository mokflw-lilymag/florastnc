const fs = require('fs');
let c = fs.readFileSync('src/app/login/page.tsx', 'utf8');

const target = `      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: \`\${window.location.origin}/auth/reset-password\`,
      });

      if (error) throw error;
      
      toast.success(L.toastResetSent, {
        description: L.toastResetSentDesc,
      });`;

const replacement = `      const res = await fetch('/api/public/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '발송 실패');

      toast.success('임시 비밀번호 발송 완료!', {
        description: '이메일로 임시 비밀번호가 발송되었습니다. 로그인 후 비밀번호를 꼭 변경해 주세요.',
      });`;

c = c.replace(target, replacement);

fs.writeFileSync('src/app/login/page.tsx', c);
console.log('done');
