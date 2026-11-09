-- ============================================================
-- Generated Videos Table (Phase 2 Task 2.3)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.generated_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER NOT NULL, -- seconds
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    voice_id TEXT NOT NULL,
    music_track TEXT NOT NULL,
    subtitle_style TEXT NOT NULL,
    aspect_ratio TEXT NOT NULL DEFAULT '9:16',
    provider TEXT NOT NULL DEFAULT 'mock',
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'selected', 'rejected', 'published', 'rendering', 'failed')),
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    render_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON public.generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_variant_id ON public.generated_videos(variant_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_status ON public.generated_videos(status);
CREATE INDEX IF NOT EXISTS idx_generated_videos_selected ON public.generated_videos(selected) WHERE selected = TRUE;

-- RLS
ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own generated videos" ON public.generated_videos
    FOR ALL USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER generated_videos_updated_at
    BEFORE UPDATE ON public.generated_videos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for generated videos
-- Run in Supabase Dashboard → Storage:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated-videos', 'generated-videos', true);
-- CREATE POLICY "Users can upload own generated videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view own generated videos" ON storage.objects FOR SELECT USING (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Public can view generated videos" ON storage.objects FOR SELECT USING (bucket_id = 'generated-videos');