alter table public.sign_requests enable row level security;
alter table public.sign_request_documents enable row level security;

drop policy if exists sign_requests_delete_own on public.sign_requests;
create policy sign_requests_delete_own
on public.sign_requests
for delete
to authenticated
using (auth.uid() = professional_user_id);

drop policy if exists sign_request_documents_delete_own on public.sign_request_documents;
create policy sign_request_documents_delete_own
on public.sign_request_documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.sign_requests sr
    where sr.id = sign_request_documents.request_id
      and sr.professional_user_id = auth.uid()
  )
);

grant delete on table public.sign_requests to authenticated;
grant delete on table public.sign_request_documents to authenticated;

notify pgrst, 'reload schema';
