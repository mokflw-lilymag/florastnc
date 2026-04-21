import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// .env.local 파일 로드
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const targetEmail = 'lilymag0301@gmail.com';
const newPassword = 'password123';

async function resetPassword() {
  console.log(`Resetting password for ${targetEmail}...`);
  
  // 1. 해당 이메일의 유저를 찾음
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  const user = users.find(u => u.email === targetEmail);
  
  if (!user) {
    console.log(`User ${targetEmail} not found. Creating new user...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: { shop_name: '플록싱크 테스트 매장' }
    });
    
    if (createError) {
      console.error('Error creating user:', createError);
    } else {
      console.log('User created successfully:', newUser.user.id);
    }
  } else {
    // 2. 비밀번호 업데이트
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error('Error updating password:', updateError);
    } else {
      console.log('Password updated successfully for user:', user.id);
    }
  }
}

resetPassword();
