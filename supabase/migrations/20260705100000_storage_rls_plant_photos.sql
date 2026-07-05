-- Storage RLS for the private plant-photos bucket.
-- The bucket is declared in supabase/config.toml but had no storage.objects
-- policies, so every client upload/read was denied. Objects are keyed as
-- <user_id>/<filename>, so scope access to the caller's own folder.

CREATE POLICY "plant_photos_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "plant_photos_storage_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "plant_photos_storage_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "plant_photos_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
