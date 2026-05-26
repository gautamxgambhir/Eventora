-- Create table for Eventora Passes
CREATE TABLE IF NOT EXISTS public.passes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    ticket_type TEXT NOT NULL DEFAULT 'Non-Alcoholic', -- 'Alcoholic' or 'Non-Alcoholic'
    amount_paid NUMERIC NOT NULL DEFAULT 0.00,        -- Amount actually paid (allows negotiation)
    checked_in BOOLEAN DEFAULT false NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    ticket_code TEXT UNIQUE NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- Policy to allow anonymous insert (anyone can buy a ticket)
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.passes;
CREATE POLICY "Allow anonymous insert" 
ON public.passes 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Policy to allow anonymous select (anyone can read the guest list for this demo app)
DROP POLICY IF EXISTS "Allow anonymous select" ON public.passes;
CREATE POLICY "Allow anonymous select" 
ON public.passes 
FOR SELECT 
TO anon 
USING (true);

-- Policy to allow anonymous update (for checking in guests from the dashboard)
DROP POLICY IF EXISTS "Allow anonymous update" ON public.passes;
CREATE POLICY "Allow anonymous update" 
ON public.passes 
FOR UPDATE 
TO anon 
USING (true)
WITH CHECK (true);

-- Policy to allow anonymous delete (for removing guests from the dashboard)
DROP POLICY IF EXISTS "Allow anonymous delete" ON public.passes;
CREATE POLICY "Allow anonymous delete" 
ON public.passes 
FOR DELETE 
TO anon 
USING (true);
