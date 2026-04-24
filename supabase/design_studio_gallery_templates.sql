-- 디자인 스튜디오 템플릿 보관함: 테마·이미지 URL 관리 (관리자 API에서 서비스 롤로 쓰기)
-- 적용: Supabase SQL Editor 또는 마이그레이션 파이프라인

CREATE TABLE IF NOT EXISTS public.design_gallery_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.design_gallery_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES public.design_gallery_themes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_gallery_assets_theme_sort
  ON public.design_gallery_assets(theme_id, sort_order);

ALTER TABLE public.design_gallery_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_gallery_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_gallery_themes_select_auth" ON public.design_gallery_themes;
CREATE POLICY "design_gallery_themes_select_auth"
  ON public.design_gallery_themes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "design_gallery_assets_select_auth" ON public.design_gallery_assets;
CREATE POLICY "design_gallery_assets_select_auth"
  ON public.design_gallery_assets FOR SELECT TO authenticated
  USING (true);

-- 쓰기는 서비스 롤(관리자 API)만 사용 — 테넌트 사용자는 SELECT만

-- 시드: 기존 constants/templates.ts 와 동일한 기본 카탈로그
INSERT INTO public.design_gallery_themes (slug, label, sort_order, is_active) VALUES
  ('birthday', '🎂 생일', 10, true),
  ('thanks', '🙏 감사', 20, true),
  ('respect', '💐 존경', 30, true),
  ('lover', '💕 연인', 40, true),
  ('christmas', '🎄 크리스마스', 50, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.design_gallery_assets (theme_id, image_url, sort_order)
SELECT t.id, v.url, v.ord FROM public.design_gallery_themes t
CROSS JOIN (VALUES
  ('birthday', 0, 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&w=800&q=80'),
  ('birthday', 1, 'https://images.unsplash.com/photo-1530103862676-de889acbbac8?auto=format&fit=crop&w=800&q=80'),
  ('birthday', 2, 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80'),
  ('birthday', 3, 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80'),
  ('birthday', 4, 'https://images.unsplash.com/photo-1542840410-3092f99611a3?auto=format&fit=crop&w=800&q=80'),
  ('birthday', 5, 'https://images.unsplash.com/photo-1572451452942-0f18bd84c8a5?auto=format&fit=crop&w=800&q=80'),
  ('lover', 0, 'https://images.unsplash.com/photo-1557672172282-c80d32f0853f?auto=format&fit=crop&w=800&q=80'),
  ('lover', 1, 'https://images.unsplash.com/photo-1518640467708-62f1280d43f1?auto=format&fit=crop&w=800&q=80'),
  ('lover', 2, 'https://images.unsplash.com/photo-1522262590532-a991489a0253?auto=format&fit=crop&w=800&q=80'),
  ('lover', 3, 'https://images.unsplash.com/photo-1604076913837-52f514d6b566?auto=format&fit=crop&w=800&q=80'),
  ('lover', 4, 'https://plus.unsplash.com/premium_photo-1661767552224-ef72bf6b9a14?auto=format&fit=crop&w=800&q=80'),
  ('lover', 5, 'https://images.unsplash.com/photo-1563241527-300ecebe5fa4?auto=format&fit=crop&w=800&q=80'),
  ('lover', 6, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'),
  ('lover', 7, 'https://images.unsplash.com/photo-1567359781-5f4ed15d5e5b?auto=format&fit=crop&w=800&q=80'),
  ('lover', 8, 'https://images.unsplash.com/photo-1602631592596-f30db0f557cc?auto=format&fit=crop&w=800&q=80'),
  ('lover', 9, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 0, 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 1, 'https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 2, 'https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 3, 'https://images.unsplash.com/photo-1518895949257-7621bf272d8a?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 4, 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 5, 'https://images.unsplash.com/photo-1463123081488-789f998ac9c4?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 6, 'https://images.unsplash.com/photo-1558591710-4b4a3822878d?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 7, 'https://images.unsplash.com/photo-1444464666168-49b626d49cb4?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 8, 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'),
  ('thanks', 9, 'https://images.unsplash.com/photo-1476842634003-7dcca8f822cd?auto=format&fit=crop&w=800&q=80'),
  ('respect', 0, 'https://images.unsplash.com/photo-1546410531-ea854aa7a80b?auto=format&fit=crop&w=800&q=80'),
  ('respect', 1, 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=800&q=80'),
  ('respect', 2, 'https://images.unsplash.com/photo-1574169208507-84376144848b?auto=format&fit=crop&w=800&q=80'),
  ('respect', 3, 'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=800&q=80'),
  ('respect', 4, 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80'),
  ('respect', 5, 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80'),
  ('respect', 6, 'https://images.unsplash.com/photo-1505934333218-8fe21faf6eb9?auto=format&fit=crop&w=800&q=80'),
  ('respect', 7, 'https://images.unsplash.com/photo-1557672172282-c80d32f0853f?auto=format&fit=crop&w=800&q=80'),
  ('respect', 8, 'https://images.unsplash.com/photo-1515006456075-8bd02cdbb7b6?auto=format&fit=crop&w=800&q=80'),
  ('respect', 9, 'https://images.unsplash.com/photo-1520038419-5d2bc5061611?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 0, 'https://images.unsplash.com/photo-1512686127411-cf2edbeae698?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 1, 'https://images.unsplash.com/photo-1543884877-e6f77cc6ec3c?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 2, 'https://images.unsplash.com/photo-1543004543-34e8f3b236fa?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 3, 'https://images.unsplash.com/photo-1608681282126-78c772cb3f0e?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 4, 'https://images.unsplash.com/photo-1544067137-a25e6480b06b?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 5, 'https://images.unsplash.com/photo-1577038166708-5d3c87fdb0e3?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 6, 'https://images.unsplash.com/photo-1606830733555-d41c888ee2af?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 7, 'https://images.unsplash.com/photo-1606757270258-00aee69766cd?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 8, 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?auto=format&fit=crop&w=800&q=80'),
  ('christmas', 9, 'https://images.unsplash.com/photo-1608678229447-97d81a9ad781?auto=format&fit=crop&w=800&q=80')
) AS v(slug, ord, url)
WHERE t.slug = v.slug
  AND NOT EXISTS (
    SELECT 1 FROM public.design_gallery_assets a WHERE a.theme_id = t.id
  );
