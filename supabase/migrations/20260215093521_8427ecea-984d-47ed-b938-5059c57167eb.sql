
-- Fix: Storage Upload Without Owner Validation
-- Add path-based ownership so users can only upload to their own folder

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload quiz assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own quiz assets" ON storage.objects;

-- Create owner-scoped upload policy
CREATE POLICY "Users can upload to their own path"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'quiz-assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create owner-scoped update policy
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'quiz-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
