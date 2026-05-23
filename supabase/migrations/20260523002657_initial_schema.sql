-- Initial schema for Claude Garden.
-- Tables match the spec; `follows` replaces `friendships` (one-way Twitter-style).

create extension if not exists "pgcrypto";

create type visibility as enum ('public', 'private');
create type task_type as enum ('sow', 'water', 'harvest');
create type task_status as enum ('pending', 'done', 'skipped');

create table profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  display_name     text not null,
  zip              text,
  hardiness_zone   text,
  last_frost_date  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table plants (
  id                    uuid primary key default gen_random_uuid(),
  permapeople_id        integer unique,
  common_name           text not null,
  scientific_name       text not null,
  spacing_inches        integer,
  zones                 text[] not null default '{}',
  days_to_harvest       integer,
  companion_plant_ids   uuid[] not null default '{}',
  antagonist_plant_ids  uuid[] not null default '{}',
  created_at            timestamptz not null default now()
);

create table gardens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(user_id) on delete cascade,
  name        text not null,
  visibility  visibility not null default 'private',
  created_at  timestamptz not null default now()
);
create index gardens_user_id_idx     on gardens(user_id);
create index gardens_visibility_idx  on gardens(visibility);

create table beds (
  id             uuid primary key default gen_random_uuid(),
  garden_id      uuid not null references gardens(id) on delete cascade,
  width_inches   integer not null check (width_inches  > 0),
  height_inches  integer not null check (height_inches > 0),
  created_at     timestamptz not null default now()
);
create index beds_garden_id_idx on beds(garden_id);

create table bed_plants (
  id             uuid primary key default gen_random_uuid(),
  bed_id         uuid not null references beds(id)   on delete cascade,
  plant_id       uuid not null references plants(id) on delete restrict,
  x_inches       numeric(6,2) not null check (x_inches >= 0),
  y_inches       numeric(6,2) not null check (y_inches >= 0),
  planted_date   date not null,
  created_at     timestamptz not null default now()
);
create index bed_plants_bed_id_idx on bed_plants(bed_id);

create table tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(user_id) on delete cascade,
  bed_plant_id  uuid not null references bed_plants(id)    on delete cascade,
  task_type     task_type   not null,
  due_date      date        not null,
  status        task_status not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (bed_plant_id, task_type, due_date)
);
create index tasks_user_id_due_idx on tasks(user_id, due_date);
create index tasks_pending_idx     on tasks(due_date) where status = 'pending';

create table posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(user_id) on delete cascade,
  garden_id   uuid references gardens(id) on delete set null,
  image_url   text,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index posts_user_id_created_idx on posts(user_id, created_at desc);

-- One-way follow (Twitter-style). Replaces friendships from original spec.
create table follows (
  follower_id  uuid not null references profiles(user_id) on delete cascade,
  followee_id  uuid not null references profiles(user_id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on follows(followee_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();
