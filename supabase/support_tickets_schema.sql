-- Floxync 고객센터(1:1 문의) 스키마
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS public.support_ticket_daily_seq (
  day DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  last_num INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.next_support_ticket_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE := CURRENT_DATE;
  n INTEGER;
BEGIN
  INSERT INTO public.support_ticket_daily_seq (day, last_num)
  VALUES (d, 1)
  ON CONFLICT (day) DO UPDATE
    SET last_num = public.support_ticket_daily_seq.last_num + 1
  RETURNING last_num INTO n;

  RETURN 'SR-' || to_char(d, 'YYYYMMDD') || '-' || lpad(n::text, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  body_locale TEXT NOT NULL DEFAULT 'ko',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  is_private BOOLEAN NOT NULL DEFAULT true,
  has_admin_reply BOOLEAN NOT NULL DEFAULT false,
  attachment_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_read_at TIMESTAMPTZ,
  author_reply_read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reply_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('user', 'admin')),
  body_original TEXT NOT NULL,
  body_translated TEXT,
  original_locale TEXT,
  target_locale TEXT,
  attachment_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_author ON public.support_tickets(author_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_deleted ON public.support_tickets(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket ON public.support_ticket_replies(ticket_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_audit ENABLE ROW LEVEL SECURITY;

-- API Route + service role 주 사용. authenticated 기본 차단 후 API에서 검증.
DROP POLICY IF EXISTS "support_tickets_auth_select" ON public.support_tickets;
CREATE POLICY "support_tickets_auth_select" ON public.support_tickets
  FOR SELECT TO authenticated USING (false);

DROP POLICY IF EXISTS "support_tickets_auth_insert" ON public.support_tickets;
CREATE POLICY "support_tickets_auth_insert" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "support_ticket_replies_auth_select" ON public.support_ticket_replies;
CREATE POLICY "support_ticket_replies_auth_select" ON public.support_ticket_replies
  FOR SELECT TO authenticated USING (false);

COMMENT ON TABLE public.support_tickets IS 'FloXync 고객센터 1:1 문의. 제목 공개, 본문 비밀.';
COMMENT ON TABLE public.support_ticket_replies IS '문의 답변 스레드';

-- Storage (private bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-tickets',
  'support-tickets',
  false,
  524288,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
