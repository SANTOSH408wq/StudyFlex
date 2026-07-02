# Supabase Database Schema

```sql
-- ==========================================
-- Bucket configuration
-- ==========================================
-- First, make sure the bucket is definitely public
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- Next, create a policy that allows ANY authenticated user to upload/update/delete images in the avatars bucket
CREATE POLICY "Avatar Full Access for Authenticated Users" 
ON storage.objects 
FOR ALL 
TO authenticated 
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- ==========================================
-- 1. PROFILES TABLE (Linked to auth.users)
-- ==========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  theme_preference TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 2. NOTES TABLE
-- ==========================================
CREATE TABLE public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  content TEXT, -- Can store Markdown or rich text HTML
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- 3. DECKS TABLE (Flashcard Decks)
-- ==========================================
CREATE TABLE public.decks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  color_theme TEXT DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_studied_at TIMESTAMP WITH TIME ZONE
);


-- ==========================================
-- 4. FLASHCARDS TABLE
-- ==========================================
CREATE TABLE public.flashcards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE NOT NULL,
  front_content TEXT NOT NULL,
  back_content TEXT NOT NULL,
  mastery_level INTEGER DEFAULT 0, -- 0=New, 1=Learning, 2=Reviewing, 3=Mastered
  next_review_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- 5. STUDY SESSIONS (For Analytics)
-- ==========================================
CREATE TABLE public.study_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE NOT NULL,
  cards_reviewed INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- This ensures users can only read, update, and delete their OWN data.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Notes: Users can do everything to their own notes
CREATE POLICY "Users can manage own notes" ON notes FOR ALL USING (auth.uid() = user_id);

-- Decks: Users can do everything to their own decks
CREATE POLICY "Users can manage own decks" ON decks FOR ALL USING (auth.uid() = user_id);

-- Flashcards: Users can manage cards if they own the parent deck
CREATE POLICY "Users can manage own flashcards" ON flashcards FOR ALL 
USING (
  deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid())
);

-- Study Sessions: Users can manage their own analytics
CREATE POLICY "Users can manage own sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);
```

## How this maps to your app:

1. **Profiles**: When someone signs up, a trigger automatically creates a Profile row. This handles the data in your Settings page (Avatar, Phone, Full Name).
2. **Notes**: Holds the data for the "My Notes" page. It tracks tags and the main rich text content.
3. **Decks**: The main containers in your "Flashcard Decks" page.
4. **Flashcards**: The actual individual cards. I've added a `mastery_level` and `next_review_date` so you can build a spaced-repetition study algorithm later!
5. **Study Sessions**: Every time a user clicks "Study" and finishes a deck, you insert a row here. You can aggregate these rows to easily build the charts in your **Analytics** page (total time studied, accuracy, etc).
