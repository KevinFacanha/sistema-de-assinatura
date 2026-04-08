-- Fixa RLS do Storage para o fluxo "upload primeiro" da criacao de solicitacao.
-- O upload do PDF original ocorre antes do insert em sign_requests.
-- Portanto, policies que exigem sign_requests existente durante retorno/leitura do objeto
-- podem bloquear a operacao inicial com "new row violates row-level security policy".

drop policy if exists storage_documents_auth_insert on storage.objects;
create policy storage_documents_auth_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and split_part(name, '/', 2) <> ''
  and split_part(name, '/', 3) in ('original', 'professional', 'final')
);

drop policy if exists storage_documents_auth_select on storage.objects;
create policy storage_documents_auth_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and (
    owner = auth.uid()
    or exists (
      select 1
      from public.sign_requests sr
      where sr.professional_user_id = auth.uid()
        and sr.sign_token = split_part(storage.objects.name, '/', 2)
    )
  )
);

drop policy if exists storage_documents_auth_update on storage.objects;
create policy storage_documents_auth_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and (
    owner = auth.uid()
    or exists (
      select 1
      from public.sign_requests sr
      where sr.professional_user_id = auth.uid()
        and sr.sign_token = split_part(storage.objects.name, '/', 2)
    )
  )
)
with check (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and (
    owner = auth.uid()
    or exists (
      select 1
      from public.sign_requests sr
      where sr.professional_user_id = auth.uid()
        and sr.sign_token = split_part(storage.objects.name, '/', 2)
    )
  )
);

drop policy if exists storage_documents_auth_delete on storage.objects;
create policy storage_documents_auth_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and (
    owner = auth.uid()
    or exists (
      select 1
      from public.sign_requests sr
      where sr.professional_user_id = auth.uid()
        and sr.sign_token = split_part(storage.objects.name, '/', 2)
    )
  )
);

