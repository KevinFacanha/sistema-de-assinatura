drop policy if exists sign_requests_delete_own on public.sign_requests;
create policy sign_requests_delete_own
on public.sign_requests
for delete
to authenticated
using (auth.uid() = professional_user_id);

notify pgrst, 'reload schema';
