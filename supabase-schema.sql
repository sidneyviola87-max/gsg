-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  country TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  listings_count INTEGER DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  response_time_hours NUMERIC,
  repeat_buyers_pct NUMERIC,
  success_rate NUMERIC,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  dark_mode BOOLEAN DEFAULT false
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DEVICE REGISTRATIONS (fingerprint + IP tracking)
-- Max 2 accounts per device/IP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.device_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own device registrations" ON public.device_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own device registrations" ON public.device_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own device registrations" ON public.device_registrations FOR UPDATE USING (auth.uid() = user_id);
-- Allow reading fingerprint for validation (used by edge functions with service role)
CREATE POLICY "Service role can read all" ON public.device_registrations FOR SELECT USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  country TEXT,
  location TEXT,
  shipping_info TEXT,
  category TEXT DEFAULT 'Other',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft')),
  views INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Sellers can insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own products" ON public.products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own products" ON public.products FOR DELETE USING (auth.uid() = seller_id);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images viewable by everyone" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Sellers can manage product images" ON public.product_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid()));

-- ============================================================
-- PRODUCT VIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert views" ON public.product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Views are readable by everyone" ON public.product_views FOR SELECT USING (true);

-- Auto-increment product views count
CREATE OR REPLACE FUNCTION public.increment_product_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products SET views = views + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_product_view
  AFTER INSERT ON public.product_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_product_views();

-- ============================================================
-- SAVED ITEMS (wishlists)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved items" ON public.saved_items FOR ALL USING (auth.uid() = user_id);

-- Auto-update likes count on products
CREATE OR REPLACE FUNCTION public.update_product_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET likes_count = likes_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_saved_item_change
  AFTER INSERT OR DELETE ON public.saved_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_likes();

-- ============================================================
-- CHATS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  buyer_unread INTEGER DEFAULT 0,
  seller_unread INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id, product_id)
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat participants can view chats" ON public.chats FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Authenticated users can create chats" ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Chat participants can update chats" ON public.chats FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat participants can view messages" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));
CREATE POLICY "Chat participants can send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));
CREATE POLICY "Recipients can mark messages as read" ON public.messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));

-- Update chat last_message on new message
CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS TRIGGER AS $$
DECLARE
  v_chat public.chats;
BEGIN
  SELECT * INTO v_chat FROM public.chats WHERE id = NEW.chat_id;
  UPDATE public.chats SET
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    buyer_unread = CASE WHEN NEW.sender_id = v_chat.seller_id THEN buyer_unread + 1 ELSE buyer_unread END,
    seller_unread = CASE WHEN NEW.sender_id = v_chat.buyer_id THEN seller_unread + 1 ELSE seller_unread END
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message();

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, seller_id, product_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can write reviews" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Update seller rating on new review
CREATE OR REPLACE FUNCTION public.update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET
    rating = (SELECT AVG(rating) FROM public.reviews WHERE seller_id = NEW.seller_id),
    reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE seller_id = NEW.seller_id)
  WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_seller_rating();

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Auto-update follower/following counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- ============================================================
-- BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own blocks" ON public.blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block others" ON public.blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocks FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can report" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters can view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are viewable by everyone" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Service role can insert achievements" ON public.achievements FOR INSERT WITH CHECK (true);

-- ============================================================
-- REALTIME CONFIGURATION
-- Run these in Supabase SQL editor:
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;

-- ============================================================
-- STORAGE BUCKETS
-- Run in Supabase SQL editor or dashboard:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage policies
-- CREATE POLICY "Avatar images publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Product images publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
-- CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
