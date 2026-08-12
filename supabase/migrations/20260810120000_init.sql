-- Esquema inicial del juego del evento.
--
-- Modelo de acceso:
--   * anon key (cliente): puede leer teams, leer/insertar players, leer game_state.
--   * pruebas y respuestas quedan SIN políticas para anon -> bloqueadas del todo.
--     Los jugadores nunca ven la solución de una prueba ni pueden puntuarse a
--     sí mismos: todo pasa por Route Handlers que usan la service role key
--     (ver src/lib/supabase/admin.ts) y emiten el estado público por Realtime
--     Broadcast, no por lectura directa de la tabla.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- ============ teams ============
create table teams (
  id text primary key,
  name text not null,
  color text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

alter table teams enable row level security;

create policy "teams_select_all"
  on teams for select
  to anon, authenticated
  using (true);

-- ============ players ============
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id text not null references teams(id),
  session_token uuid not null default gen_random_uuid(),
  is_kicked boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index players_name_lower_key on players (lower(name));

alter table players enable row level security;

create policy "players_select_all"
  on players for select
  to anon, authenticated
  using (true);

create policy "players_insert_self"
  on players for insert
  to anon, authenticated
  with check (is_kicked = false);

-- sin policy de update/delete para anon: renombrar/expulsar exige service role

-- ============ banned_words ============
-- Lista de nombres/palabras no permitidas. Sin policies -> solo accesible
-- con la service role key (comprobación server-side al registrarse).
create table banned_words (
  id serial primary key,
  word text not null unique,
  created_at timestamptz not null default now()
);

alter table banned_words enable row level security;

-- ============ pruebas ============
create table pruebas (
  id uuid primary key default gen_random_uuid(),
  orden integer not null,
  tipo text not null check (tipo in (
    'quiz', 'slider', 'true_false', 'votacion', 'tira_afloja',
    'apuesta_ciega', 'doble_o_nada', 'subasta', 'duelo', 'portavoz_secreto'
  )),
  equipo_referido text references teams(id),
  dificultad text not null check (dificultad in ('facil', 'media', 'dificil')),
  enunciado text not null,
  -- config: todo lo necesario para RENDERIZAR la prueba (opciones, rango del
  -- slider...) sin desvelar la respuesta correcta.
  config jsonb not null default '{}'::jsonb,
  -- solucion: respuesta correcta / parámetros de puntuación. Nunca se expone
  -- al cliente directamente, solo se usa server-side al puntuar.
  solucion jsonb not null default '{}'::jsonb,
  puntos_base integer not null default 100,
  duracion_segundos integer not null default 20,
  created_at timestamptz not null default now()
);

alter table pruebas enable row level security;
-- sin policies para anon: tabla bloqueada, solo accesible via admin client

-- ============ game_state ============
-- Fila única (singleton) con el estado actual de la partida.
create table game_state (
  id boolean primary key default true,
  constraint game_state_singleton check (id),
  prueba_actual_id uuid references pruebas(id),
  fase text not null default 'lobby' check (fase in (
    'lobby', 'activa', 'revelada', 'leaderboard', 'fin'
  )),
  ends_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table game_state enable row level security;

create policy "game_state_select_all"
  on game_state for select
  to anon, authenticated
  using (true);

-- sin policy de update para anon: solo el master (admin client) la cambia

-- ============ respuestas ============
create table respuestas (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  prueba_id uuid not null references pruebas(id),
  respuesta jsonb not null,
  tiempo_respuesta_ms integer,
  puntos integer not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, prueba_id)
);

alter table respuestas enable row level security;
-- sin policies para anon: el envío de respuestas pasa por un Route Handler
-- que valida el session_token, calcula los puntos con la solución real y
-- hace el insert con la service role key.
