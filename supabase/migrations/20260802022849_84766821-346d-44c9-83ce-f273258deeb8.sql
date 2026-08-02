do $$ begin
  create type public.app_role as enum ('admin','operador');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

drop policy if exists "Staff le roles" on public.user_roles;
create policy "Staff le roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "Admin gerencia roles" on public.user_roles;
create policy "Admin gerencia roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
on conflict do nothing;

do $$
declare t text; p record;
begin
  foreach t in array array['avisos','aviso_leituras','banners','ceo_emendas','chamados',
    'chamado_mensagens','clientes','configuracoes_empresa','cto_portas','ctos',
    'eventos_conexao','indicacoes','parcelas','rotas_fibra','roteadores','notificacoes']
  loop
    if to_regclass('public.'||t) is null then continue; end if;
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format($f$create policy "Staff gerencia %1$s" on public.%1$I for all to authenticated
      using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()))$f$, t);
  end loop;
end $$;

drop policy if exists "Auth gerencia banners storage" on storage.objects;
drop policy if exists "Auth gerencia chamados storage" on storage.objects;
create policy "Staff gerencia banners storage" on storage.objects for all to authenticated
  using (bucket_id = 'banners' and public.is_staff(auth.uid()))
  with check (bucket_id = 'banners' and public.is_staff(auth.uid()));
create policy "Staff gerencia chamados storage" on storage.objects for all to authenticated
  using (bucket_id = 'chamados' and public.is_staff(auth.uid()))
  with check (bucket_id = 'chamados' and public.is_staff(auth.uid()));