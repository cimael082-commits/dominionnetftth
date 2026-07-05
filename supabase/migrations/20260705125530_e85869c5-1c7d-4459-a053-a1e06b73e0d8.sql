
DROP POLICY IF EXISTS "Autenticados gerenciam clientes" ON public.clientes;
DROP POLICY IF EXISTS "Autenticados gerenciam parcelas" ON public.parcelas;
DROP POLICY IF EXISTS "Autenticados gerenciam config" ON public.configuracoes_empresa;

CREATE POLICY "Autenticados leem clientes" ON public.clientes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados inserem clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam clientes" ON public.clientes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam clientes" ON public.clientes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados leem parcelas" ON public.parcelas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados inserem parcelas" ON public.parcelas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam parcelas" ON public.parcelas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam parcelas" ON public.parcelas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados leem config" ON public.configuracoes_empresa FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados inserem config" ON public.configuracoes_empresa FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam config" ON public.configuracoes_empresa FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam config" ON public.configuracoes_empresa FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
