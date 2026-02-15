-- 1. Enable RLS on the storage.objects table (usually enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Allow Public Read Access (SELECT)
-- This allows anyone to view images in the bucket
CREATE POLICY "Public Access Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vork-profilepic-bucket' );

-- 3. Allow Public Upload Access (INSERT)
-- This allows your Firebase-authenticated users (who appear generic to Supabase) to upload
CREATE POLICY "Public Access Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'vork-profilepic-bucket' );

-- 4. Allow Public Update Access (UPDATE)
-- This allows overwriting files if 'upsert' is true
CREATE POLICY "Public Access Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'vork-profilepic-bucket' );

-- 5. Allow Public Delete Access (DELETE)
-- Optional: Only if you want users to be able to delete images
CREATE POLICY "Public Access Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'vork-profilepic-bucket' );
