-- Bloqueia reassinatura e mutações tardias no fluxo público após conclusão.

create or replace function public.public_accept_consent(
  p_token text,
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
    and sr.status in ('awaiting_patient', 'opened')
    and sr.patient_signed_at is null
    and sr.completed_at is null
  limit 1;

  if not found then
    return false;
  end if;

  if v_request.consent_accepted_at is null then
    update public.sign_requests as sr
    set consent_accepted_at = now(),
        updated_at = now()
    where sr.id = v_request.id
      and sr.patient_signed_at is null
      and sr.completed_at is null;

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

create or replace function public.public_accept_document_consent(
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
    and sr.status in ('awaiting_patient', 'opened')
    and sr.patient_signed_at is null
    and sr.completed_at is null
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
    where sr.id = v_request.id
      and sr.patient_signed_at is null
      and sr.completed_at is null;

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

create or replace function public.public_attach_final_document(
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
    and sr.status in ('awaiting_patient', 'opened')
    and sr.patient_signed_at is null
    and sr.completed_at is null
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
    and sr.status in ('awaiting_patient', 'opened')
    and sr.patient_signed_at is null
    and sr.completed_at is null
  limit 1;

  if not found then
    return false;
  end if;

  update public.sign_requests as sr
  set patient_signature = p_patient_signature,
      patient_signed_at = now(),
      completed_at = now(),
      status = 'completed',
      signed_final_pdf_path = p_signed_final_pdf_path,
      document_hash = coalesce(p_document_hash, sr.document_hash),
      updated_at = now()
  where sr.id = v_request.id
    and sr.status in ('awaiting_patient', 'opened')
    and sr.patient_signed_at is null
    and sr.completed_at is null;

  if not found then
    return false;
  end if;

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

  return true;
end;
$$;

grant execute on function public.public_accept_consent(text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_accept_document_consent(text, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.public_attach_final_document(text, uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_patient_sign_request(text, text, text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
