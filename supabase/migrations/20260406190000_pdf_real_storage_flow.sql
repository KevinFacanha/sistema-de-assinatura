alter table public.sign_requests
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text,
  add column if not exists original_pdf_hash text,
  add column if not exists signed_professional_pdf_path text,
  add column if not exists signed_final_pdf_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinicalsign-documents',
  'clinicalsign-documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

drop policy if exists storage_documents_auth_insert on storage.objects;
create policy storage_documents_auth_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and split_part(name, '/', 2) <> ''
);

drop policy if exists storage_documents_auth_select on storage.objects;
create policy storage_documents_auth_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'clinicalsign-documents'
  and exists (
    select 1
    from public.sign_requests sr
    where sr.professional_user_id = auth.uid()
      and sr.sign_token = split_part(storage.objects.name, '/', 2)
  )
);

drop policy if exists storage_documents_auth_update on storage.objects;
create policy storage_documents_auth_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'clinicalsign-documents'
  and exists (
    select 1
    from public.sign_requests sr
    where sr.professional_user_id = auth.uid()
      and sr.sign_token = split_part(storage.objects.name, '/', 2)
  )
)
with check (
  bucket_id = 'clinicalsign-documents'
  and exists (
    select 1
    from public.sign_requests sr
    where sr.professional_user_id = auth.uid()
      and sr.sign_token = split_part(storage.objects.name, '/', 2)
  )
);

drop policy if exists storage_documents_auth_delete on storage.objects;
create policy storage_documents_auth_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'clinicalsign-documents'
  and exists (
    select 1
    from public.sign_requests sr
    where sr.professional_user_id = auth.uid()
      and sr.sign_token = split_part(storage.objects.name, '/', 2)
  )
);

drop policy if exists storage_documents_anon_select_signed on storage.objects;
create policy storage_documents_anon_select_signed
on storage.objects
for select
to anon
using (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and split_part(name, '/', 3) in ('professional', 'final')
  and exists (
    select 1
    from public.sign_requests sr
    where sr.sign_token = split_part(storage.objects.name, '/', 2)
      and sr.access_code_validated_at is not null
  )
);

drop policy if exists storage_documents_anon_insert_final on storage.objects;
create policy storage_documents_anon_insert_final
on storage.objects
for insert
to anon
with check (
  bucket_id = 'clinicalsign-documents'
  and split_part(name, '/', 1) = 'requests'
  and split_part(name, '/', 3) = 'final'
  and exists (
    select 1
    from public.sign_requests sr
    where sr.sign_token = split_part(storage.objects.name, '/', 2)
      and sr.access_code_validated_at is not null
  )
);

create or replace function public.public_get_review_request(
  p_token text
)
returns table (
  id uuid,
  patient_name text,
  document_title text,
  document_snapshot text,
  document_hash text,
  professional_signature text,
  request_status public.request_status,
  consent_accepted_at timestamptz,
  patient_signed_at timestamptz,
  completed_at timestamptz,
  signed_professional_pdf_path text,
  signed_final_pdf_path text,
  file_name text,
  mime_type text
)
language sql
security definer
set search_path = public
as $$
  select
    sr.id,
    sr.patient_name,
    sr.document_title,
    sr.document_snapshot,
    sr.document_hash,
    sr.professional_signature,
    sr.status as request_status,
    sr.consent_accepted_at,
    sr.patient_signed_at,
    sr.completed_at,
    sr.signed_professional_pdf_path,
    sr.signed_final_pdf_path,
    sr.file_name,
    sr.mime_type
  from public.sign_requests sr
  where sr.sign_token = p_token
    and sr.access_code_validated_at is not null
    and sr.signed_professional_pdf_path is not null;
$$;

drop function if exists public.public_patient_sign_request(text, text, text, text, text, text);

create or replace function public.public_patient_sign_request(
  p_token text,
  p_patient_signature text,
  p_signed_final_pdf_path text,
  p_document_hash text,
  p_user_agent text default null,
  p_timezone text default null,
  p_locale text default null,
  p_route_or_origin text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.sign_requests%rowtype;
begin
  select *
    into v_request
  from public.sign_requests sr
  where sr.sign_token = p_token
    and sr.access_code_validated_at is not null
    and sr.consent_accepted_at is not null
    and sr.status in ('awaiting_patient', 'opened', 'completed')
  limit 1;

  if not found then
    return false;
  end if;

  if v_request.patient_signed_at is null then
    update public.sign_requests as sr
    set patient_signature = p_patient_signature,
        patient_signed_at = now(),
        completed_at = now(),
        status = 'completed',
        signed_final_pdf_path = p_signed_final_pdf_path,
        document_hash = coalesce(p_document_hash, sr.document_hash),
        updated_at = now()
    where sr.id = v_request.id;

    insert into public.request_events (
      request_id,
      event_type,
      actor_type,
      user_agent,
      timezone,
      locale,
      route_or_origin
    )
    values (
      v_request.id,
      'patient_signed',
      'patient',
      p_user_agent,
      p_timezone,
      p_locale,
      p_route_or_origin
    );

    insert into public.request_events (
      request_id,
      event_type,
      actor_type,
      user_agent,
      timezone,
      locale,
      route_or_origin
    )
    values (
      v_request.id,
      'request_completed',
      'patient',
      p_user_agent,
      p_timezone,
      p_locale,
      p_route_or_origin
    );
  end if;

  return true;
end;
$$;

grant execute on function public.public_get_review_request(text) to anon, authenticated;
grant execute on function public.public_patient_sign_request(text, text, text, text, text, text, text, text) to anon, authenticated;

