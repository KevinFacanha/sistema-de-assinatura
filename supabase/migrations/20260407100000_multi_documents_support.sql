create table if not exists public.sign_request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.sign_requests(id) on delete cascade,
  document_type text not null,
  title text not null,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  original_pdf_hash text not null,
  signed_professional_pdf_path text,
  signed_final_pdf_path text,
  document_hash text not null,
  sort_order integer not null default 1,
  is_required boolean not null default true,
  consent_accepted_at timestamptz,
  professional_signed_at timestamptz,
  patient_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sign_request_documents_request_id_idx on public.sign_request_documents(request_id);
create index if not exists sign_request_documents_sort_order_idx on public.sign_request_documents(request_id, sort_order);

alter table public.sign_request_documents enable row level security;

drop policy if exists sign_request_documents_select_own on public.sign_request_documents;
create policy sign_request_documents_select_own
on public.sign_request_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.sign_requests sr
    where sr.id = sign_request_documents.request_id
      and sr.professional_user_id = auth.uid()
  )
);

drop policy if exists sign_request_documents_insert_own on public.sign_request_documents;
create policy sign_request_documents_insert_own
on public.sign_request_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sign_requests sr
    where sr.id = sign_request_documents.request_id
      and sr.professional_user_id = auth.uid()
  )
);

drop policy if exists sign_request_documents_update_own on public.sign_request_documents;
create policy sign_request_documents_update_own
on public.sign_request_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.sign_requests sr
    where sr.id = sign_request_documents.request_id
      and sr.professional_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.sign_requests sr
    where sr.id = sign_request_documents.request_id
      and sr.professional_user_id = auth.uid()
  )
);

drop trigger if exists sign_request_documents_set_updated_at on public.sign_request_documents;
create trigger sign_request_documents_set_updated_at
before update on public.sign_request_documents
for each row
execute function public.tg_set_updated_at();

drop function if exists public.public_get_review_documents(text);
create function public.public_get_review_documents(
  p_token text
)
returns table (
  id uuid,
  request_id uuid,
  document_type text,
  title text,
  file_name text,
  sort_order integer,
  is_required boolean,
  signed_professional_pdf_path text,
  signed_final_pdf_path text,
  document_hash text,
  consent_accepted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    d.id,
    d.request_id,
    d.document_type,
    d.title,
    d.file_name,
    d.sort_order,
    d.is_required,
    d.signed_professional_pdf_path,
    d.signed_final_pdf_path,
    d.document_hash,
    d.consent_accepted_at
  from public.sign_request_documents d
  join public.sign_requests sr on sr.id = d.request_id
  where sr.sign_token = p_token
    and sr.access_code_validated_at is not null
    and d.signed_professional_pdf_path is not null
  order by d.sort_order asc, d.created_at asc;
$$;

drop function if exists public.public_accept_document_consent(text, uuid, text, text, text, text);
create function public.public_accept_document_consent(
  p_token text,
  p_document_id uuid,
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
  v_required_pending bigint;
begin
  select *
    into v_request
  from public.sign_requests sr
  where sr.sign_token = p_token
    and sr.access_code_validated_at is not null
    and sr.status in ('awaiting_patient', 'opened', 'completed')
  limit 1;

  if not found then
    return false;
  end if;

  update public.sign_request_documents as d
  set consent_accepted_at = coalesce(d.consent_accepted_at, now()),
      updated_at = now()
  where d.id = p_document_id
    and d.request_id = v_request.id;

  if not found then
    return false;
  end if;

  select count(*)
    into v_required_pending
  from public.sign_request_documents d
  where d.request_id = v_request.id
    and d.is_required is true
    and d.consent_accepted_at is null;

  if v_required_pending = 0 and v_request.consent_accepted_at is null then
    update public.sign_requests as sr
    set consent_accepted_at = now(),
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
      'consent_accepted',
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

drop function if exists public.public_attach_final_document(text, uuid, text, text, text, text, text, text);
create function public.public_attach_final_document(
  p_token text,
  p_document_id uuid,
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
    and sr.status in ('awaiting_patient', 'opened', 'completed')
  limit 1;

  if not found then
    return false;
  end if;

  update public.sign_request_documents as d
  set signed_final_pdf_path = p_signed_final_pdf_path,
      document_hash = coalesce(p_document_hash, d.document_hash),
      patient_signed_at = now(),
      updated_at = now()
  where d.id = p_document_id
    and d.request_id = v_request.id;

  return found;
end;
$$;

grant execute on function public.public_get_review_documents(text) to anon, authenticated;
grant execute on function public.public_accept_document_consent(text, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.public_attach_final_document(text, uuid, text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

