-- Corrige mismatch entre assinatura RPC esperada pelo frontend e assinatura existente no banco.
-- Frontend envia:
--   p_token, p_user_agent, p_timezone, p_locale, p_route_or_origin
-- Esta migration remove overloads conflitantes e recria a function com nomes exatos.

drop function if exists public.public_open_request(text);
drop function if exists public.public_open_request(text, text, text, text, text);

create function public.public_open_request(
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

grant execute on function public.public_open_request(text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

