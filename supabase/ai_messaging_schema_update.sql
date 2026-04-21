-- ============================================================
-- Floxync AI 메시지 센터 DB 업데이트
-- Supabase SQL Editor에 전체 복사 후 Run 클릭
-- ============================================================

-- 1. chat_rooms 컬럼 추가
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS active_counselor TEXT DEFAULT 'ai',
ADD COLUMN IF NOT EXISTS needs_human BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_summary TEXT;

-- 2. chat_messages 컬럼 추가 (AI 메시지 구분용)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_sender_name TEXT;

-- 3. ★ 핵심 ★ sender_id NOT NULL 제약 해제
--    AI 봇은 auth.users에 없으므로 sender_id 없이 insert해야 함
ALTER TABLE chat_messages 
ALTER COLUMN sender_id DROP NOT NULL;

-- 4. 주석
COMMENT ON COLUMN chat_rooms.active_counselor IS '현재 응대 주체 (ai/human)';
COMMENT ON COLUMN chat_rooms.needs_human IS '사람 상담원 필요 여부';
COMMENT ON COLUMN chat_rooms.last_activity_at IS '자동 종료용 마지막 활동 시각';
COMMENT ON COLUMN chat_messages.is_ai IS 'AI 자동 응답 여부';
COMMENT ON COLUMN chat_messages.ai_sender_name IS 'AI 표시 이름';
