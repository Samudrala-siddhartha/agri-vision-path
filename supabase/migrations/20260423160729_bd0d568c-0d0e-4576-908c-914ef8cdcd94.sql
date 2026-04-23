DROP POLICY IF EXISTS "farming_gallery_public_read" ON storage.objects;

CREATE POLICY "farming_gallery_public_direct_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'farming-gallery' AND owner IS NOT NULL);