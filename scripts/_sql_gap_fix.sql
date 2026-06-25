-- Gap fix: RLS/policies that failed during bulk apply (data already copied via REST)

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_faq ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read FAQ" ON public.support_faq;
CREATE POLICY "Authenticated users can read FAQ" ON public.support_faq
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Super admin can manage FAQ" ON public.support_faq;
CREATE POLICY "Super admin can manage FAQ" ON public.support_faq
  FOR ALL USING (public.is_super_admin());

ALTER TABLE public.design_gallery_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_gallery_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_gallery_themes_select_auth" ON public.design_gallery_themes;
CREATE POLICY "design_gallery_themes_select_auth"
  ON public.design_gallery_themes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "design_gallery_assets_select_auth" ON public.design_gallery_assets;
CREATE POLICY "design_gallery_assets_select_auth"
  ON public.design_gallery_assets FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_support_faq_category ON public.support_faq(category);
CREATE INDEX IF NOT EXISTS idx_support_faq_featured ON public.support_faq(is_featured);
