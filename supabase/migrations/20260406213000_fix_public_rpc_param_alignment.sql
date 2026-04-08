-- Alinhamento definitivo das RPCs publicas restantes com os parametros enviados pelo frontend.
-- Recria funcoes com nomes exatos:
-- - public_get_review_request(p_token)
-- - public_accept_consent(p_token, p_user_agent, p_timezone, p_locale, p_route_or_origin)
-- - public_patient_sign_request(
--     p_token, p_patient_signature, p_signed_final_pdf_path, p_document_hash,
--     p_user_agent, p_timezone, p_locale, p_route_or_origin
--   )

drop function if exists public.public_get_review_request(text);
drop function if exists public.public_get_review_request(text, text, text, text, text);

create function public.public_get_review_request(
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

drop function if exists public.public_accept_consent(text);
drop function if exists public.public_accept_consent(text, text, text, text);
drop function if exists public.public_accept_consent(text, text, text, text, text);

create function public.public_accept_consent(
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

drop function if exists public.public_patient_sign_request(text, text);
drop function if exists public.public_patient_sign_request(text, text, text, text, text, text);
drop function if exists public.public_patient_sign_request(text, text, text, text, text, text, text, text);

create function public.public_patient_sign_request(
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
grant execute on function public.public_accept_consent(text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_patient_sign_request(text, text, text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

