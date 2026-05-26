drop policy if exists "patients delete accessible writers" on public.patients;

create policy "patients delete accessible writers"
on public.patients for delete
to authenticated
using (public.can_write_patient(id, auth.uid()));
