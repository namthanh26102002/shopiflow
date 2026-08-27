-- Create storage bucket for quiz assets (logos, images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-assets', 'quiz-assets', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload quiz assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'quiz-assets' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their files
CREATE POLICY "Users can update their own quiz assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'quiz-assets' AND auth.uid() IS NOT NULL);

-- Allow public read access for quiz assets
CREATE POLICY "Public read access for quiz assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'quiz-assets');