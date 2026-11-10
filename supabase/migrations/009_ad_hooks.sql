-- ============================================================
-- AD HOOKS TABLE — Pre-defined hook templates for AI generation
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE public.ad_hooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('curiosity', 'problem', 'social_proof', 'before_after', 'listicle', 'story', 'urgency', 'authority')),
    template TEXT NOT NULL,
    example TEXT,
    best_for TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ad_hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ad hooks" ON public.ad_hooks
    FOR SELECT USING (true);

-- Insert default hooks (from ad-studio.ts)
INSERT INTO public.ad_hooks (id, name, category, template, example, best_for) VALUES
-- Curiosity hooks
('curiosity_1', 'Secret Revealed', 'curiosity', 'Maine {timeframe} pehle ye secret dhundha jo {benefit} mein badal diya...', 'Maine 30 din pehle ye secret dhundha jo meri neend ko puri tarah badal diya...', ARRAY['health', 'beauty', 'self-improvement']),
('curiosity_2', 'What Nobody Tells You', 'curiosity', 'Koi nahi batata ki {product_category} mein asli game {hidden_factor} hai...', 'Koi nahi batata ki protein powder mein asli game absorption rate hai...', ARRAY['supplements', 'tech', 'finance']),
('curiosity_3', 'The Hidden Feature', 'curiosity', 'Ye {feature} dekho - 99% log isse miss kar dete hain...', 'Ye hidden pocket dekho - 99% log isse miss kar dete hain...', ARRAY['fashion', 'bags', 'gadgets']),

-- Problem hooks
('problem_1', 'Pain Point Agitation', 'problem', 'Thak gaye ho {pain_point} se? Maine bhi {timeframe} tak same face kiya...', 'Thak gaye ho back pain se? Maine bhi 2 saal tak same face kiya...', ARRAY['health', 'posture', 'pain-relief']),
('problem_2', 'Wasted Money', 'problem', '{amount} waste kiye {wrong_solution} pe? Ye {product} ne bacha liya...', '5000 waste kiye cheap headphones pe? Ye Sony WH-1000XM5 ne bacha liya...', ARRAY['electronics', 'courses', 'subscriptions']),
('problem_3', 'Common Mistake', 'problem', 'Sab {common_mistake} karte hain - main bhi karta tha, tabhi {result}...', 'Sab galat tarike se protein lete hain - main bhi karta tha, tabhi gains nahi aaye...', ARRAY['fitness', 'nutrition', 'skincare']),

-- Social Proof hooks
('social_1', 'Real Results', 'social_proof', '{number} log already use kar rahe hain - results dekho...', '10,000+ log already use kar rahe hain - results dekho...', ARRAY['viral-products', 'apps', 'courses']),
('social_2', 'Expert/Influencer', 'social_proof', 'Jab {expert_name} ne recommend kiya, toh maine try kiya - ye hua...', 'Jab Dr. Berg ne recommend kiya, toh maine try kiya - ye hua...', ARRAY['health', 'supplements', 'tech']),
('social_3', 'Before/After Crowd', 'social_proof', 'Mere {community_size} followers ne try kiya - {percentage}% ko fayda hua...', 'Mere 50k followers ne try kiya - 87% ko fayda hua...', ARRAY['creator-products', 'courses', 'challenges']),

-- Before/After hooks
('before_after_1', 'Dramatic Transformation', 'before_after', 'Day 1 vs Day {days} - khud dekho difference...', 'Day 1 vs Day 30 - khud dekho skin difference...', ARRAY['skincare', 'fitness', 'hair']),
('before_after_2', 'Side by Side', 'before_after', 'Left: {before_state} | Right: {after_state} - same {timeframe}, alag product...', 'Left: frizzy hair | Right: smooth hair - same 14 din, alag serum...', ARRAY['hair', 'skin', 'beauty']),

-- Listicle hooks
('listicle_1', 'Top N Reasons', 'listicle', '{number} reasons why {product} is the best {category} investment...', '5 reasons why this air fryer is the best kitchen investment...', ARRAY['kitchen', 'gadgets', 'home']),
('listicle_2', 'Mistakes to Avoid', 'listicle', '{number} mistakes maine {topic} mein kiye - tum mat karna...', '3 mistakes maine skincare routine mein kiye - tum mat karna...', ARRAY['education', 'skincare', 'fitness']),

-- Story hooks
('story_1', 'Personal Journey', 'story', '{timeframe} pehle main {starting_state} tha - aaj {ending_state} hoon, kaise?', '6 mahine pehle main 95kg tha - aaj 72kg hoon, kaise?', ARRAY['weight-loss', 'transformation', 'habits']),
('story_2', 'Discovery Story', 'story', 'Mujhe {problem} tha, doctor ne bola {advice}, phir maine dhundha {solution}...', 'Mujhe acidity thi, doctor ne bola lifestyle change karo, phir maine dhundha ye tea...', ARRAY['health', 'medical', 'wellness']),

-- Urgency hooks
('urgency_1', 'Limited Stock', 'urgency', 'Sirf {count} pieces bache hain - {discount}% off abhi...', 'Sirf 47 pieces bache hain - 40% off abhi...', ARRAY['deals', 'limited-edition', 'sales']),
('urgency_2', 'Price Going Up', 'urgency', 'Price {date} se badh raha hai - abhi lock kar lo {current_price} mein...', 'Price 1st Jan se badh raha hai - abhi lock kar lo ₹2,999 mein...', ARRAY['subscriptions', 'courses', 'early-bird']),

-- Authority hooks
('authority_1', 'Science-Backed', 'authority', '{study_name} study ne prove kiya - {claim}...', 'Harvard study ne prove kiya - ye ingredient 40% better absorption deta hai...', ARRAY['supplements', 'skincare', 'tech']),
('authority_2', 'Professional Choice', 'authority', '{percentage}% {professionals} yehi use karte hain - reason yeh hai...', '90% dermatologists yehi serum recommend karte hain - reason yeh hai...', ARRAY['professional-tools', 'medical', 'pro-gear'])
ON CONFLICT (id) DO NOTHING;

-- Index for category filtering
CREATE INDEX idx_ad_hooks_category ON public.ad_hooks(category);