create or replace function public.public_open_request(
  p_token text,
  p_user_agent text default null,
  p_timezone text default null,
  p_locale text default null,
  p_route_or_origin text default null
)
returns table (
  id uuid,
  document_title text,
  request_status public.request_status,
  professional_signed_at timestamptz,
  patient_opened_at timestamptz,
  completed_at timestamptz
)
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
    and sr.status in ('awaiting_patient', 'opened', 'completed')
  limit 1;

  if not found then
    return;
  end if;

  if v_request.patient_opened_at is null then
    update public.sign_requests as sr
    set patient_opened_at = now(),
        status = case when sr.status = 'awaiting_patient' then 'opened' else sr.status end,
        updated_at = now()
    where sr.id = v_request.id
    returning * into v_request;

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
      'link_opened',
      'patient',
      p_user_agent,
      p_timezone,
      p_locale,
      p_route_or_origin
    );
  end if;

  return query
  select
    v_request.id,
    v_request.document_title,
    v_request.status as request_status,
    v_request.professional_signed_at,
    v_request.patient_opened_at,
    v_request.completed_at;
end;
$$;

create or replace function public.public_validate_access_code(
  p_token text,
  p_access_code text,
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
    and sr.status in ('awaiting_patient', 'opened', 'completed')
  limit 1;

  if not found then
    return false;
  end if;

  if p_access_code is null or trim(v_request.access_code) <> trim(p_access_code) then
    return false;
  end if;

  if v_request.access_code_validated_at is null then
    update public.sign_requests as sr
    set access_code_validated_at = now(),
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
      'access_code_validated',
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
  completed_at timestamptz
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
    sr.completed_at
  from public.sign_requests sr
  where sr.sign_token = p_token
    and sr.access_code_validated_at is not null;
$$;

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
    and sr.status in ('awaiting_patient', 'opened', 'completed')
  limit 1;

  if not found then
    return false;
  end if;

  if v_request.consent_accepted_at is null then
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

create or replace function public.public_patient_sign_request(
  p_token text,
  p_patient_signature text,
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

grant execute on function public.public_open_request(text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_validate_access_code(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_get_review_request(text) to anon, authenticated;
grant execute on function public.public_accept_consent(text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_patient_sign_request(text, text, text, text, text, text) to anon, authenticated;

