CREATE POLICY "Auth gerencia banners storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'banners') WITH CHECK (bucket_id = 'banners');
CREATE POLICY "Auth gerencia chamados storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'chamados') WITH CHECK (bucket_id = 'chamados');