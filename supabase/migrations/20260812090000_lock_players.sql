-- Cierra dos huecos de la migración inicial antes de construir el login real:
--
-- 1. La policy "players_select_all" daba SELECT * a anon, lo que incluía
--    `session_token` (la credencial de sesión de cada jugador). Cualquiera
--    con la publishable key podía leer el token de sesión de todo el mundo
--    y suplantar a otro jugador. Se restringe a nivel de columna.
--
-- 2. La policy "players_insert_self" permitía insertar jugadores directo
--    desde el cliente, saltándose el filtro de nombres inapropiados y la
--    comprobación de unicidad (que viven en el servidor). A partir de ahora
--    el alta solo se hace vía Server Action con la secret key.

revoke select on players from anon, authenticated;
grant select (id, name, team_id, is_kicked, created_at) on players to anon, authenticated;

drop policy if exists "players_insert_self" on players;
