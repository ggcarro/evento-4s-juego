-- Soporte para la subasta de puntos: pruebas.tipo = 'subasta' ya estaba
-- permitido desde el esquema inicial. config.premio (o puntos_base, se
-- reutiliza como el premio) define cuánto se subasta.

create table pujas (
  prueba_id uuid not null references pruebas(id),
  team_id text not null references teams(id),
  cantidad integer not null default 0 check (cantidad >= 0),
  player_id uuid references players(id),
  updated_at timestamptz not null default now(),
  primary key (prueba_id, team_id)
);
alter table pujas enable row level security;
-- sin policies para anon: el envío pasa por Server Action con la secret key

alter table game_state drop constraint if exists game_state_fase_check;
alter table game_state add constraint game_state_fase_check
  check (fase in ('lobby', 'apostando', 'subastando', 'activa', 'revelada', 'leaderboard', 'fin'));
