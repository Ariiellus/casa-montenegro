# Los Ecos de la Casa Montenegro

Mini webapp para un juego de misterio en casa (2 equipos, 30–60 min). Sin dependencias ni build: abre `index.html` con cualquier servidor estático.

- `#/` pantalla principal (TV/laptop): cronómetro, fases narradas por el fantasma, sospechosos, tablero de evidencias, línea de tiempo, ouija, visiones, acertijos relámpago y acusación final.
- `#/e/CÓDIGO` vista de celular a la que apuntan los QR: pregunta → pista → sello para reclamar puntos.
- `#/imprimir` tarjetas con QR, hoja del detective y la nota en espejo.
- `#/guia` guía del presentador con escondites editables y la solución (spoilers).

Toda la historia está en `js/data.js`. Local: `python3 -m http.server 8080`.

## Voz del fantasma

Las narraciones están pre-grabadas en `audio/voz/` con [Piper TTS](https://github.com/rhasspy/piper), voz `es_AR-daniela-high` (dataset [OpenSLR 61](https://www.openslr.org/61/), licencia CC BY-SA 4.0). Si cambias textos en `js/data.js`, regenera con `pip install piper-tts` y `python3 tools/gen_voice.py lines.json` (lista JSON de los textos). Los textos sin grabación usan la voz del sistema; en el panel del presentador se puede elegir otra voz.

## Publicar (Vercel)

Publicado en https://casa-montenegro-one.vercel.app (proyecto `casa-montenegro`).
Para volver a publicar tras cambios: `VERCEL_TOKEN=... python3 tools/deploy_vercel.py` (sube los archivos por la API de Vercel; no necesita Node). Después, reimprime las tarjetas desde `#/imprimir` en la URL publicada para que los QR apunten ahí.
