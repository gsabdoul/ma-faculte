-- Policies pour le bucket chat-attachments
-- Exécutez ces commandes UNE PAR UNE dans l'éditeur SQL de Supabase

-- 1. Policy pour l'upload
CREATE POLICY "Users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Policy pour la lecture
CREATE POLICY "Users can read attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Policy pour la suppression
CREATE POLICY "Users can delete attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
