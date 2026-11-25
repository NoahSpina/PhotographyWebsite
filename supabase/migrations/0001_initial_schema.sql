-- Initial schema for the photography studio.
-- Profiles, packages, albums, photos, selections, and orders,
-- plus row-level security. Run once in the Supabase SQL editor.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Shared updated_at trigger. search_path is empty so the function
-- cannot be tricked into calling a same-named object in another schema.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
grant execute on function private.set_updated_at() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'client',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint profiles_role_check check (role in ('admin', 'client')),
  constraint profiles_email_not_blank check (email is null or char_length(btrim(email)) > 0)
);

comment on table public.profiles is
  'Application profile for each auth user. role is the studio RBAC source of truth.';

create unique index profiles_email_key
  on public.profiles (email)
  where email is not null;

-- Reads the caller's own row and returns whether they are an admin.
-- security definer is required so policies can call this without
-- recursively re-entering profiles RLS. The body only checks auth.uid().
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated, service_role;

create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile id cannot be changed';
  end if;

  new.created_at = old.created_at;

  -- auth.uid() is null for the SQL editor and the service role, which is
  -- how a test account is promoted. Signed-in non-admins cannot change it.
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    if new.role is distinct from old.role then
      raise exception 'only admins can change role';
    end if;

    if new.email is distinct from old.email then
      raise exception 'only admins can change email';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_privileges() from public;
grant execute on function private.protect_profile_privileges() to authenticated, service_role;

create trigger profiles_protect_privileges
  before update on public.profiles
  for each row
  execute function private.protect_profile_privileges();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

-- Creates the profile when Supabase Auth inserts a user.
-- Role always starts as client; raw_user_meta_data is user-editable
-- and is only used for the display name.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    nullif(btrim(new.email), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
grant execute on function private.handle_new_user() to supabase_auth_admin;
grant usage on schema private to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- Accounts created before this migration have no profile row yet.
insert into public.profiles (id, email, full_name)
select
  users.id,
  nullif(btrim(users.email), ''),
  nullif(btrim(users.raw_user_meta_data ->> 'full_name'), '')
from auth.users as users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

-- ---------------------------------------------------------------------------
-- packages
-- ---------------------------------------------------------------------------

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null,
  download_limit integer,
  includes_prints boolean not null default false,
  extra_photo_price_cents integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  constraint packages_name_key unique (name),
  constraint packages_name_not_blank check (char_length(btrim(name)) > 0),
  constraint packages_price_cents_check check (price_cents >= 0),
  constraint packages_download_limit_check check (
    download_limit is null or download_limit > 0
  ),
  constraint packages_extra_photo_price_cents_check check (
    extra_photo_price_cents >= 0
  )
);

comment on column public.packages.download_limit is
  'Null means unlimited downloads.';

comment on column public.packages.price_cents is
  'Package price in the smallest currency unit.';

create index packages_active_sort_idx
  on public.packages (sort_order, id)
  where is_active;

-- ---------------------------------------------------------------------------
-- albums
-- ---------------------------------------------------------------------------

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  shoot_date date,
  client_id uuid,
  client_email text,
  status text not null default 'draft',
  cover_photo_id uuid,
  assigned_package_id uuid,
  is_public_portfolio boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint albums_slug_key unique (slug),
  constraint albums_title_not_blank check (char_length(btrim(title)) > 0),
  constraint albums_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint albums_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint albums_client_id_fkey
    foreign key (client_id) references public.profiles (id) on delete set null,
  constraint albums_assigned_package_id_fkey
    foreign key (assigned_package_id) references public.packages (id) on delete set null
);

create index albums_client_id_idx on public.albums (client_id);
create index albums_assigned_package_id_idx on public.albums (assigned_package_id);

create index albums_public_published_idx
  on public.albums (shoot_date desc, id)
  where is_public_portfolio and status = 'published';

create trigger albums_set_updated_at
  before update on public.albums
  for each row
  execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null,
  master_s3_key text,
  proof_s3_key text,
  thumb_s3_key text,
  status text not null default 'uploading',
  width integer,
  height integer,
  sort_order integer not null default 0,
  exif jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint photos_album_id_fkey
    foreign key (album_id) references public.albums (id) on delete cascade,
  constraint photos_id_album_id_key unique (id, album_id),
  constraint photos_status_check check (
    status in ('uploading', 'processing', 'ready', 'failed')
  ),
  constraint photos_width_check check (width is null or width > 0),
  constraint photos_height_check check (height is null or height > 0),
  constraint photos_exif_object_check check (jsonb_typeof(exif) = 'object')
);

create index photos_album_id_status_sort_idx
  on public.photos (album_id, status, sort_order);

create trigger photos_set_updated_at
  before update on public.photos
  for each row
  execute function private.set_updated_at();

-- Deferred so deleting an album can cascade its photos while the album
-- still points at one of those photos as the cover.
alter table public.albums
  add constraint albums_cover_photo_id_fkey
  foreign key (cover_photo_id) references public.photos (id)
  on delete set null
  deferrable initially deferred;

create index albums_cover_photo_id_idx on public.albums (cover_photo_id);

-- ---------------------------------------------------------------------------
-- selections
-- ---------------------------------------------------------------------------

create table public.selections (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null,
  photo_id uuid not null,
  client_id uuid not null,
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint selections_album_photo_client_key unique (album_id, photo_id, client_id),
  constraint selections_album_id_fkey
    foreign key (album_id) references public.albums (id) on delete cascade,
  constraint selections_photo_id_fkey
    foreign key (photo_id) references public.photos (id) on delete cascade,
  constraint selections_client_id_fkey
    foreign key (client_id) references public.profiles (id) on delete cascade,
  constraint selections_photo_album_fkey
    foreign key (photo_id, album_id) references public.photos (id, album_id)
    on delete cascade
);

create index selections_client_id_idx on public.selections (client_id);
create index selections_photo_id_idx on public.selections (photo_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  album_id uuid,
  package_id uuid not null,
  order_type text not null,
  status text not null default 'pending',
  amount_cents integer not null,
  download_limit_granted integer,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  session_date date,
  booking_notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint orders_client_id_fkey
    foreign key (client_id) references public.profiles (id) on delete restrict,
  constraint orders_album_id_fkey
    foreign key (album_id) references public.albums (id) on delete set null,
  constraint orders_package_id_fkey
    foreign key (package_id) references public.packages (id) on delete restrict,
  constraint orders_stripe_checkout_session_id_key unique (stripe_checkout_session_id),
  constraint orders_order_type_check check (
    order_type in ('booking', 'gallery_upgrade', 'extra_photos')
  ),
  constraint orders_status_check check (status in ('pending', 'paid', 'refunded')),
  constraint orders_amount_cents_check check (amount_cents >= 0),
  constraint orders_download_limit_granted_check check (
    download_limit_granted is null or download_limit_granted >= 0
  )
);

comment on column public.orders.album_id is
  'Null for a pre-shoot booking that is not attached to a gallery yet.';

comment on column public.orders.download_limit_granted is
  'Null means unlimited downloads were granted.';

create index orders_client_id_idx on public.orders (client_id);
create index orders_album_id_idx on public.orders (album_id);
create index orders_package_id_idx on public.orders (package_id);
create index orders_stripe_payment_intent_id_idx
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- privileges
-- Both studio admins and clients use the authenticated role.
-- RLS, not grants, distinguishes them. anon can only read the public catalog.
-- ---------------------------------------------------------------------------

revoke all on table
  public.profiles,
  public.packages,
  public.albums,
  public.photos,
  public.selections,
  public.orders
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.packages,
  public.albums,
  public.photos,
  public.selections,
  public.orders
to authenticated, service_role;

grant select on table
  public.packages,
  public.albums,
  public.photos
to anon;

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.albums enable row level security;
alter table public.photos enable row level security;
alter table public.selections enable row level security;
alter table public.orders enable row level security;

create policy profiles_admin_all
  on public.profiles
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy packages_admin_all
  on public.packages
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy packages_select_active
  on public.packages
  for select
  to anon, authenticated
  using (is_active = true);

create policy albums_admin_all
  on public.albums
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy albums_select_own_published
  on public.albums
  for select
  to authenticated
  using (
    client_id = (select auth.uid())
    and status = 'published'
  );

create policy albums_select_public
  on public.albums
  for select
  to anon, authenticated
  using (
    is_public_portfolio = true
    and status = 'published'
  );

create policy photos_admin_all
  on public.photos
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy photos_select_own_ready
  on public.photos
  for select
  to authenticated
  using (
    status = 'ready'
    and exists (
      select 1
      from public.albums
      where albums.id = photos.album_id
        and albums.client_id = (select auth.uid())
        and albums.status = 'published'
    )
  );

create policy photos_select_public_ready
  on public.photos
  for select
  to anon, authenticated
  using (
    status = 'ready'
    and exists (
      select 1
      from public.albums
      where albums.id = photos.album_id
        and albums.is_public_portfolio = true
        and albums.status = 'published'
    )
  );

create policy selections_admin_all
  on public.selections
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy selections_select_own
  on public.selections
  for select
  to authenticated
  using (client_id = (select auth.uid()));

create policy selections_insert_own
  on public.selections
  for insert
  to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1
      from public.albums
      where albums.id = album_id
        and albums.client_id = (select auth.uid())
        and albums.status = 'published'
    )
    and exists (
      select 1
      from public.photos
      where photos.id = photo_id
        and photos.album_id = selections.album_id
        and photos.status = 'ready'
    )
  );

create policy selections_delete_own
  on public.selections
  for delete
  to authenticated
  using (client_id = (select auth.uid()));

create policy orders_admin_all
  on public.orders
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy orders_select_own
  on public.orders
  for select
  to authenticated
  using (client_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- starter packages
-- download_limit null means unlimited.
-- ---------------------------------------------------------------------------

insert into public.packages (
  name,
  description,
  price_cents,
  download_limit,
  includes_prints,
  extra_photo_price_cents,
  is_active,
  sort_order
)
values
  (
    'Five Photographs',
    'Choose five finished photographs from the gallery.',
    15000,
    5,
    false,
    2500,
    true,
    1
  ),
  (
    'Full Gallery',
    'Download the full gallery. No print credit included.',
    35000,
    null,
    false,
    0,
    true,
    2
  ),
  (
    'Full Gallery + Prints',
    'Download the full gallery, with a print credit included.',
    50000,
    null,
    true,
    0,
    true,
    3
  );
