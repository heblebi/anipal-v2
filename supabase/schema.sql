-- ============================================================
-- Hebleani — Supabase Schema
-- Supabase SQL Editor'de çalıştır
-- ============================================================

-- PROFILES (auth.users ile bağlantılı)
create table public.profiles (
  id              uuid references auth.users on delete cascade primary key,
  username        text unique not null,
  email           text unique not null,
  role            text not null default 'user',
  avatar          text default '',
  cover_image     text default '',
  bio             text default '',
  xp              integer not null default 0,
  level           integer not null default 1,
  is_banned       boolean not null default false,
  show_anime_list boolean not null default true,
  watchlist           text[]  not null default '{}',
  watched_episodes    text[]  not null default '{}',
  liked_episodes      text[]  not null default '{}',
  earned_achievements text[]  not null default '{}',
  displayed_badges    text[]  not null default '{}',
  anime_list      jsonb not null default '[]',
  custom_lists    jsonb not null default '[]',
  notifications   jsonb not null default '[]',
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Profiles are publicly readable"         on public.profiles for select using (true);
create policy "Users can insert their own profile"     on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"     on public.profiles for update using (auth.uid() = id);

-- Yeni kayıt olunca profil otomatik oluştur
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username, email, role, avatar, earned_achievements, displayed_badges)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    'user',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    array['lvl-1'],
    array['lvl-1']
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ANIMES
create table public.animes (
  id             uuid default gen_random_uuid() primary key,
  title          text not null,
  description    text default '',
  cover_image    text default '',
  banner_image   text default '',
  genres         text[] default '{}',
  episodes       jsonb default '[]',
  status         text not null default 'pending',
  uploaded_by    uuid references public.profiles(id) on delete set null,
  average_rating numeric default 0,
  ratings_count  integer default 0,
  characters     jsonb default '[]',
  created_at     timestamptz not null default now()
);

alter table public.animes enable row level security;
create policy "Approved animes are public"            on public.animes for select using (status = 'approved');
create policy "Authenticated users can read all"      on public.animes for select using (auth.uid() is not null);
create policy "Authenticated users can create animes" on public.animes for insert with check (auth.uid() is not null);
create policy "Authenticated users can update animes" on public.animes for update using (auth.uid() is not null);
create policy "Authenticated users can delete animes" on public.animes for delete using (auth.uid() is not null);

-- ANIME RATINGS (ortalama hesaplamak için)
create table public.anime_ratings (
  user_id    uuid references public.profiles(id) on delete cascade,
  anime_id   uuid references public.animes(id) on delete cascade,
  rating     numeric not null check (rating >= 1 and rating <= 10),
  updated_at timestamptz default now(),
  primary key (user_id, anime_id)
);

alter table public.anime_ratings enable row level security;
create policy "Ratings are public"                    on public.anime_ratings for select using (true);
create policy "Authenticated users can rate"          on public.anime_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their rating"         on public.anime_ratings for update using (auth.uid() = user_id);

-- COMMENTS
create table public.comments (
  id          uuid default gen_random_uuid() primary key,
  episode_id  text not null,
  user_id     uuid references public.profiles(id) on delete cascade,
  username    text not null,
  content     text not null,
  is_spoiler  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.comments enable row level security;
create policy "Comments are publicly readable"        on public.comments for select using (true);
create policy "Authenticated users can comment"       on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own comments"   on public.comments for delete using (auth.uid() = user_id);
create policy "Admins can delete any comment"         on public.comments for delete using (auth.uid() is not null);

-- NEWS
create table public.news (
  id         uuid default gen_random_uuid() primary key,
  title      text not null,
  excerpt    text default '',
  content    text default '',
  image      text default '',
  category   text default 'Genel',
  status     text not null default 'pending',
  author_id  uuid references public.profiles(id) on delete set null,
  links      jsonb default '[]',
  created_at timestamptz not null default now()
);

alter table public.news enable row level security;
create policy "Published news are public"             on public.news for select using (status = 'published');
create policy "Authenticated users can read all news" on public.news for select using (auth.uid() is not null);
create policy "Authenticated users can create news"   on public.news for insert with check (auth.uid() is not null);
create policy "Authors can update news"               on public.news for update using (auth.uid() = author_id or auth.uid() is not null);
create policy "Authenticated users can delete news"   on public.news for delete using (auth.uid() is not null);
