# Los Ecos de la Casa Montenegro

Mini webapp para un juego de misterio en casa (2 equipos, 30–60 min). Sin dependencias ni build: abre `index.html` con cualquier servidor estático.

- `#/` pantalla principal (TV/laptop): cronómetro, fases narradas por el fantasma, sospechosos, tablero de evidencias, línea de tiempo, ouija, visiones, acertijos relámpago y acusación final.
- `#/e/CÓDIGO` vista de celular a la que apuntan los QR: pregunta → pista → sello para reclamar puntos.
- `#/imprimir` tarjetas con QR, hoja del detective y la nota en espejo.
- `#/guia` guía del presentador con escondites editables y la solución (spoilers).

Toda la historia está en `js/data.js`. Local: `python3 -m http.server 8080`.
