-- Run this SQL in your Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('admin', 'user')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure the 'id' column exists if the table was created differently before
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='id') THEN
        ALTER TABLE public.profiles ADD COLUMN id uuid references auth.users on delete cascade primary key;
    END IF;
END $$;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles (to avoid recursion errors)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Check if this is the first user to sign up
  SELECT count(*) = 0 INTO is_first_user FROM public.profiles;
  
  INSERT INTO public.profiles (id, role)
  VALUES (
    new.id, 
    CASE 
      WHEN is_first_user OR new.email = 'pnganga813@gmail.com' THEN 'admin' 
      ELSE 'user' 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  price numeric not null default 0,
  category text,
  stock_quantity integer not null default 0,
  media_url text,
  video_url text,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read products
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

-- Allow authenticated users to manage products (Simplified)
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
CREATE POLICY "Authenticated users can delete products" ON public.products
  FOR DELETE USING (true);

-- 3. Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  media_url text,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read videos
CREATE POLICY "Anyone can view videos" ON public.videos
  FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete videos
CREATE POLICY "Authenticated users can insert videos" ON public.videos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update videos" ON public.videos
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete videos" ON public.videos
  FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Create featured_items table
CREATE TABLE IF NOT EXISTS public.featured_items (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on featured_items
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read featured_items
CREATE POLICY "Anyone can view featured_items" ON public.featured_items
  FOR SELECT USING (true);

-- Allow authenticated users to manage featured_items
CREATE POLICY "Authenticated users can manage featured_items" ON public.featured_items
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  address text,
  product_variant text not null,
  quantity integer not null default 1,
  status text check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert orders (for customers)
CREATE POLICY "Anyone can insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to manage orders
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON public.orders;
CREATE POLICY "Authenticated users can manage orders" ON public.orders
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Storage Setup (Run this to fix photo/video upload issues)
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public access to read files
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'products');

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Allow users to update/delete their own files
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
CREATE POLICY "Owner Update" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'products' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
CREATE POLICY "Owner Delete" ON storage.objects 
  FOR DELETE USING (bucket_id = 'products' AND auth.uid() = owner);

-- 7. Create hero_slides table
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id uuid default gen_random_uuid() primary key,
  photo_url text not null,
  title text not null,
  description text,
  price numeric not null default 0,
  order_text text default 'Order Now',
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on hero_slides
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read hero_slides
CREATE POLICY "Anyone can view hero_slides" ON public.hero_slides
  FOR SELECT USING (true);

-- Allow authenticated users to manage hero_slides
DROP POLICY IF EXISTS "Authenticated users can manage hero_slides" ON public.hero_slides;
CREATE POLICY "Authenticated users can manage hero_slides" ON public.hero_slides
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. Bootstrap Admin (Run this manually in SQL Editor if needed)
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
-- OR
-- UPDATE public.profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'pnganga813@gmail.com');
