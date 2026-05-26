-- Drop existing tables to start clean
DROP TABLE IF EXISTS public.party_admins CASCADE;
DROP TABLE IF EXISTS public.passes CASCADE;
DROP TABLE IF EXISTS public.parties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create table for Profiles (linked to Supabase Auth users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT,
    email TEXT,
    avatar_url TEXT
);

-- Create table for Parties
CREATE TABLE public.parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    location TEXT,
    code TEXT UNIQUE NOT NULL -- 6-character unique access code e.g. "SUMMER"
);

-- Create table for Party Admins/Members
CREATE TABLE public.party_admins (
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Admin', -- 'Organizer' or 'Admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (party_id, user_id)
);

-- Create table for Passes linked to Parties and tracked by Admin profiles
CREATE TABLE public.passes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Track admin who added the guest
    name TEXT NOT NULL,
    email TEXT,
    ticket_type TEXT NOT NULL DEFAULT 'Non-Alcoholic', -- 'Alcoholic' or 'Non-Alcoholic'
    amount_paid NUMERIC NOT NULL DEFAULT 0.00,        -- Negotiated price
    checked_in BOOLEAN DEFAULT false NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    ticket_code TEXT UNIQUE NOT NULL
);

-- Setup automatic profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=' || new.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
-- Profiles: Users can read all profiles (to see other admins in party) but only update their own
DROP POLICY IF EXISTS "Allow public read on profiles" ON public.profiles;
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Parties: Users who are signed in can create parties. Any authenticated user can select parties by code or if they are member.
DROP POLICY IF EXISTS "Allow authenticated read on parties" ON public.parties;
CREATE POLICY "Allow authenticated read on parties" ON public.parties FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on parties" ON public.parties;
CREATE POLICY "Allow authenticated insert on parties" ON public.parties FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on parties" ON public.parties;
CREATE POLICY "Allow authenticated update on parties" ON public.parties FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete on parties" ON public.parties;
CREATE POLICY "Allow authenticated delete on parties" ON public.parties FOR DELETE TO authenticated USING (true);

-- Party Admins:
DROP POLICY IF EXISTS "Allow authenticated select on party_admins" ON public.party_admins;
CREATE POLICY "Allow authenticated select on party_admins" ON public.party_admins FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on party_admins" ON public.party_admins;
CREATE POLICY "Allow authenticated insert on party_admins" ON public.party_admins FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on party_admins" ON public.party_admins;
CREATE POLICY "Allow authenticated delete on party_admins" ON public.party_admins FOR DELETE TO authenticated USING (true);

-- Passes:
DROP POLICY IF EXISTS "Allow authenticated select on passes" ON public.passes;
CREATE POLICY "Allow authenticated select on passes" ON public.passes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on passes" ON public.passes;
CREATE POLICY "Allow authenticated insert on passes" ON public.passes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on passes" ON public.passes;
CREATE POLICY "Allow authenticated update on passes" ON public.passes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete on passes" ON public.passes;
CREATE POLICY "Allow authenticated delete on passes" ON public.passes FOR DELETE TO authenticated USING (true);
