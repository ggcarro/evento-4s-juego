# Puesta en marcha

## 1. Crear el proyecto en Supabase

1. Entra en https://supabase.com/dashboard y crea un proyecto nuevo (elige la región más cercana a donde se celebre el evento).
2. **Importante para 200 usuarios simultáneos**: el plan Free de Supabase limita bastante las conexiones concurrentes de Realtime. Para el día del evento conviene tener el proyecto en plan **Pro** (se puede activar solo el mes del evento y volver a Free después).
3. Ve a `SQL Editor` y ejecuta, en este orden:
   - el contenido de [`supabase/migrations/20260810120000_init.sql`](supabase/migrations/20260810120000_init.sql)
   - el contenido de [`supabase/seed.sql`](supabase/seed.sql)
4. Ve a `Project Settings > API` y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Publishable key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `Secret key` → `SUPABASE_SECRET_KEY` (secreta, no la compartas ni la subas al repo)

## 2. Configurar variables de entorno en local

```bash
cp .env.local.example .env.local
```

Rellena los 4 valores (las 3 de Supabase del paso anterior + un `MASTER_PIN` que os invente para entrar al panel del master).

## 3. Arrancar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## 4. Desplegar en Vercel (cuando estemos listos)

1. Crea un proyecto en https://vercel.com/new e impórtalo desde el repo de GitHub (te aviso cuando lo subamos).
2. En `Settings > Environment Variables` de Vercel, añade las mismas 4 variables de `.env.local`.
3. El despliegue lo lanzamos juntos cuando quieras publicar (no lo haré sin que me lo pidas explícitamente).

## Estado del esquema

- `teams`, `players`, `game_state`: legibles por el cliente (publishable key).
- `pruebas`, `respuestas`, `banned_words`: bloqueadas para el cliente a propósito — todo pasa por rutas de servidor con la `secret` key, para que nadie pueda leer la respuesta correcta desde el navegador ni falsificar su puntuación.
