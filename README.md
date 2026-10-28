# Los Ecos de la Casa Montenegro

Mini webapp para un juego de misterio en casa (2 equipos, 30–60 min). Sin dependencias ni build: abre `index.html` con cualquier servidor estático.

- `#/` pantalla principal (TV/laptop): cronómetro, fases narradas por el fantasma, sospechosos, tablero de evidencias, línea de tiempo, ouija, visiones, acertijos relámpago y acusación final.
- `#/e/CÓDIGO` vista de celular a la que apuntan los QR: pregunta → «Pista del crimen» + «Siguiente escondite»; los puntos se reclaman solos si el celular está en la sesión.
- `#/imprimir` tarjetas con QR, hoja del detective y la nota en espejo.
- `#/guia` guía del presentador con escondites editables y la solución (spoilers).

Toda la historia está en `js/data.js`. Local: `python3 -m http.server 8080`.

## Voz del fantasma

Las narraciones están pre-grabadas en `audio/voz/` con [Piper TTS](https://github.com/rhasspy/piper), voz `es_AR-daniela-high` (dataset [OpenSLR 61](https://www.openslr.org/61/), licencia CC BY-SA 4.0). Si cambias textos en `js/data.js`, regenera con `pip install piper-tts` y `python3 tools/gen_voice.py lines.json` (lista JSON de los textos). Los textos sin grabación usan la voz del sistema; en el panel del presentador se puede elegir otra voz.

## Publicar (Vercel)

Publicado en https://casa-montenegro-one.vercel.app (proyecto `casa-montenegro`).
Para volver a publicar tras cambios: `VERCEL_TOKEN=... python3 tools/deploy_vercel.py` (sube los archivos por la API de Vercel; no necesita Node). Después, reimprime las tarjetas desde `#/imprimir` en la URL publicada para que los QR apunten ahí.

## Variables de entorno

Las claves no van en el código. Copia `.env.example` a `.env` (ignorado por git) y rellena:

- `SUPABASE_URL` y `SUPABASE_ANON_KEY`: las usa `api/config.js`, que las entrega al navegador, y `api/keepalive.js`. `tools/deploy_vercel.py` las sube como Environment Variables del proyecto en Vercel.
- `VERCEL_TOKEN`: solo para publicar.

La clave anon de Supabase es pública por diseño (el navegador la necesita); la seguridad depende de las políticas RLS de las tablas `mg_`. Sin `/api/config.js` (por ejemplo, con un servidor estático local) la app funciona en modo manual, sin sesiones.

## Sesiones TV ↔ celulares

- La TV crea una sesión de 4 letras (QR en la pantalla de inicio y botón «Sesión» arriba).
- Cada celular entra con `#/j/CODIGO`, recibe un nombre al azar (p. ej. `cute-kitty`, tabla `mg_players`), elige equipo y al resolver una pista la reclama sola (`mg_claims`, una por pista y sesión). `#/yo` tiene pestañas Caso, Sospechosos, Evidencias (del equipo + reveladas), Línea y Acusación (`mg_accusations`, una por equipo; la TV habilita «Revelar la verdad» cuando votaron los dos). El fantasma solo está en la TV.
- Ya iniciada la partida, entrar desde un celular nuevo o cambiar de equipo deja al jugador «en espera» (`mg_players.status`) hasta que el organizador lo aprueba en la TV.
- Backend: Supabase proyecto `miscprojects` (tablas `mg_sessions`, `mg_claims`, `mg_players`, `mg_accusations`). Solo se usa la clave pública (anon).
- `api/keepalive.js` + `vercel.json`: cron diario de Vercel que mantiene activo Supabase y borra sesiones de más de 3 días.
- Sin conexión, la app vuelve al modo manual: código de la tarjeta en la TV + botón del equipo.
- Cada equipo puede reclamar como máximo 2 de los 4 sellos EM (`SEAL_MAX`); el celular y la TV bloquean el tercero.
