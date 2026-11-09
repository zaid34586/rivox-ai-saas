-- ============================================================
-- Generated Images Table (Phase 2 Task 2.2)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.ad_creatives(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    style TEXT NOT NULL,
    platform TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'mock',
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'selected', 'rejected', 'published')),
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_product_id ON public.generated_images(product_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_variant_id ON public.generated_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON public.generated_images(status);
CREATE INDEX IF NOT EXISTS idx_generated_images_selected ON public.generated_images(selected) WHERE selected = TRUE;

-- RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own generated images" ON public.generated_images
    FOR ALL USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER generated_images_updated_at
    BEFORE UPDATE ON public.generated_images
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for generated images
-- Run in Supabase Dashboard → Storage:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated-images', 'generated-images', true);
-- CREATE POLICY "Users can upload own generated images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view own generated images" ON storage.objects FOR SELECT USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Public can view generated images" ON storage.objects FOR SELECT USING (bucket_id = 'generated-images');