-- Photo management: retouch status/replies, photo size/version, replace bookkeeping.
-- Run once in the Supabase SQL editor after 0002_client_proofing.sql.

-- ---------------------------------------------------------------------------
-- selections
-- ---------------------------------------------------------------------------

alter table public.selections
  add column retouch_status text not null default 'pending',
  add column admin_reply text,
  add column admin_replied_at timestamptz;

alter table public.selections
  add constraint selections_retouch_status_check check (
    retouch_status in ('pending', 'in_progress', 'completed', 'declined')
  );

alter table public.selections
  add constraint selections_admin_reply_length_check check (
    admin_reply is null or char_length(admin_reply) <= 2000
  );

grant update (retouch_status, admin_reply, admin_replied_at) on table public.selections to authenticated;

create or replace function private.protect_selection_admin_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    if new.retouch_status is distinct from old.retouch_status
      or new.admin_reply is distinct from old.admin_reply
      or new.admin_replied_at is distinct from old.admin_replied_at then
      raise exception 'only admins can change retouch status or studio reply';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_selection_admin_fields() from public;
grant execute on function private.protect_selection_admin_fields() to authenticated, service_role;

create trigger selections_protect_admin_fields
  before update on public.selections
  for each row
  execute function private.protect_selection_admin_fields();

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------

alter table public.photos
  add column file_size_bytes bigint,
  add column version integer not null default 1,
  add column superseded_s3_keys text[];

alter table public.photos
  add constraint photos_file_size_bytes_check check (
    file_size_bytes is null or file_size_bytes >= 0
  );

alter table public.photos
  add constraint photos_version_check check (version >= 1);