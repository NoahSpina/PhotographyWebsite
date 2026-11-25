-- Client proofing: quota-checked selections, retouching notes, and
-- entitlement package reads. Run once in the Supabase SQL editor after
-- 0001_initial_schema.sql.

-- ---------------------------------------------------------------------------
-- selections
-- ---------------------------------------------------------------------------

-- The download limit is enforced by the toggleSelection Server Action,
-- which inserts with the service role after checking ownership and quota.
-- A client inserting through the Data API with their own session would
-- skip that check, so clients no longer have an insert policy. Deleting
-- their own selections stays allowed because it can only lower the count.
drop policy if exists selections_insert_own on public.selections;

-- After insert, only the retouching note can change.
revoke update on table public.selections from authenticated;
grant update (notes) on table public.selections to authenticated;

alter table public.selections
  add constraint selections_notes_length_check
  check (notes is null or char_length(notes) <= 2000);

create policy selections_update_own_notes
  on public.selections
  for update
  to authenticated
  using (
    client_id = (select auth.uid())
    and exists (
      select 1
      from public.albums
      where albums.id = selections.album_id
        and albums.client_id = (select auth.uid())
        and albums.status = 'published'
    )
  )
  with check (client_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- packages
-- ---------------------------------------------------------------------------

-- packages_select_active only shows the live catalog. A client must still
-- read a retired package that is assigned to their album or that they
-- ordered, or their download limit would silently drop.
create policy packages_select_entitled
  on public.packages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.albums
      where albums.assigned_package_id = packages.id
        and albums.client_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.orders
      where orders.package_id = packages.id
        and orders.client_id = (select auth.uid())
    )
  );
