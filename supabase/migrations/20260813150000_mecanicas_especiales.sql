-- Soporte para las rondas especiales: portavoz secreto, doble aleatorio,
-- apuesta ciega y tira y afloja.

alter table pruebas
  add column mecanica text check (mecanica in ('portavoz_secreto', 'doble_aleatorio', 'apuesta_ciega'));

-- Quién es el "elegido" de cada equipo en la prueba activa (portavoz_secreto /
-- doble_aleatorio). Nunca se manda por Broadcast durante la fase activa, solo
-- se revela al hacer "revelar respuesta".
alter table game_state add column elegidos jsonb;

alter table game_state drop constraint if exists game_state_fase_check;
alter table game_state add constraint game_state_fase_check
  check (fase in ('lobby', 'apostando', 'activa', 'revelada', 'leaderboard', 'fin'));

-- Apuestas ciegas: cada jugador arriesga puntos antes de ver la pregunta.
create table apuestas (
  id uuid primary key default gen_random_uuid(),
  prueba_id uuid not null references pruebas(id),
  player_id uuid not null references players(id),
  cantidad integer not null check (cantidad >= 0),
  created_at timestamptz not null default now(),
  unique (prueba_id, player_id)
);
alter table apuestas enable row level security;
-- sin policies para anon: el envío pasa por Server Action con la secret key

-- Tira y afloja: recuento de pulsaciones por jugador en la prueba activa.
create table tira_afloja_taps (
  prueba_id uuid not null references pruebas(id),
  player_id uuid not null references players(id),
  taps integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (prueba_id, player_id)
);
alter table tira_afloja_taps enable row level security;
-- sin policies para anon: el envío pasa por Server Action con la secret key
