// Toda la historia vive aquí. Edita textos, preguntas y escondites libremente.
window.CASE = {
  title: "Los Ecos de la Casa Montenegro",
  subtitle: "Un misterio para vivos, contado por una muerta",
  year: 1957,
  victim: "Doña Elvira Montenegro",

  teams: [
    { id: "a", name: "Equipo Vela", color: "#e8b04a" },
    { id: "b", name: "Equipo Cuervo", color: "#8fb3ff" }
  ],

  points: { evidence: 2, puzzle: 3, riddle: 1, vision: -2, culprit: 5, method: 3, motive: 3, accomplice: 2, source: 2 },

  phases: [
    {
      id: "busqueda", name: "Fase I · La búsqueda", at: 0,
      narration: [
        "Bienvenidos, vivos. No se asusten por el frío: soy yo.",
        "Me llamo Elvira Montenegro. Esta casa fue mía. La noche del 24 de octubre de 1957, durante el Baile de Ánimas, alguien me mató aquí dentro.",
        "La muerte me robó el recuerdo de esa noche. No sé quién fue. Por eso no puedo irme.",
        "Mis secretos siguen escondidos entre estas paredes: entre los libros, bajo las velas, detrás de los cuadros, entre las plantas y hasta en el tablero de ajedrez.",
        "Cada pista guarda una pregunta. Respóndanla y les mostraré lo que esconde.",
        "Solo cuatro de mis escondites llevan mi sello de cera. Los demás… se los susurrará el eco de cada secreto que descubran.",
        "Tienen hasta que el reloj llegue a cero. Si no descubren quién me mató, cómo y por qué… quedaré atrapada otro siglo. Y quizás alguno de ustedes se quede conmigo."
      ],
      evidence: ["forense"]
    },
    {
      id: "apagon", name: "Fase II · El apagón", at: 1 / 3,
      narration: [
        "Recuerdo algo… a las once y veinticinco se fue la luz.",
        "Todos encendieron velas. Alguien seguía tocando el piano en la oscuridad. Y oí pasos en la escalera de servicio.",
        "El inspector Ríos acaba de traer el informe del laboratorio. Léanlo con cuidado: no morí como todos creen."
      ],
      evidence: ["toxico"]
    },
    {
      id: "medianoche", name: "Fase III · Medianoche", at: 2 / 3,
      narration: [
        "El frío me sube por los huesos. Se acerca la medianoche.",
        "Mis secretos más hondos están bajo llave: el tablero de ajedrez, mi caja fuerte, mi diario.",
        "Quien mintió sobre dónde estaba esa noche… sigue mintiendo."
      ],
      evidence: []
    }
  ],

  finale: {
    narration: [
      "El reloj se ha detenido. Ya no hay más tiempo.",
      "Cada equipo debe decirme, en voz alta y sin miedo: quién me mató, cómo lo hizo y por qué."
    ]
  },

  reveal: [
    "Esa noche, Camila Reyes recibió los abrigos de los invitados en el guardarropa. Tenía la única llave.",
    "Allí estaba el maletín de la doctora Calderón. De él sacó un frasco de digitalina. Del abrigo de Teodoro Vargas tomó su pañuelo bordado.",
    "A las once, Camila fingió una migraña y se retiró. Le pidió a Bruno que se fuera temprano: ella me subiría el té.",
    "A las once y veinticinco se fue la luz. Con una vela roja de su cuarto subió por la escalera de servicio hasta mi estudio.",
    "Me sirvió el té y, en la oscuridad, vertió la digitalina en mi taza. No en la tetera: en mi taza.",
    "Luego escondió el frasco en la cisterna del baño, envuelto en el pañuelo de Teo, para culparlo a él. Pero la cera roja la delató.",
    "¿Por qué? Porque esa tarde yo encontré el libro de cuentas. Durante años, Camila y Teo vendieron mis cuadros originales y colgaron copias en mis paredes. Al día siguiente yo iba a llamar al inspector.",
    "Teo era su cómplice en el fraude, pero se fue en taxi a las 22:47. Julián estaba en el patio, la doctora al piano, Bruno en el tranvía.",
    "La asesina fue Camila Reyes. Gracias, vivos. Por fin… puedo descansar."
  ],

  solution: {
    culprit: "camila",
    method: "taza",
    motive: "fraude",
    accomplice: "teo",
    source: "maletin"
  },

  accusation: {
    culprit: { label: "¿Quién mató a Elvira?", options: "suspects" },
    method: {
      label: "¿Cómo la mató?",
      options: [
        ["vino", "Veneno en el vino de la cena"],
        ["tetera", "Veneno en la tetera, en la cocina"],
        ["taza", "Veneno en la taza de té, ya servida"],
        ["escalera", "La empujó por la escalera"],
        ["cojin", "La asfixió con un cojín"]
      ]
    },
    motive: {
      label: "¿Por qué?",
      options: [
        ["herencia", "Para cobrar la herencia"],
        ["despido", "Venganza por un despido"],
        ["clinica", "Venganza por la clínica que le quitó del testamento"],
        ["fraude", "Para ocultar el fraude de los cuadros falsos"],
        ["celos", "Por celos amorosos"]
      ]
    },
    accomplice: { label: "¿Quién fue cómplice del fraude de los cuadros?", options: "suspects+nadie" },
    source: {
      label: "¿De dónde salió el veneno?",
      options: [
        ["maletin", "Del maletín de la doctora, en el guardarropa"],
        ["dedalera", "De las dedaleras del patio"],
        ["raticida", "Del raticida de la cocina"],
        ["botiquin", "Del botiquín del baño"]
      ]
    }
  },

  suspects: [
    {
      id: "julian", name: "Julián Montenegro", role: "Sobrino y heredero", age: 34, color: "#b5523b",
      bio: "Encantador, apostador y siempre corto de dinero. Vivía en la casa desde niño.",
      statement: "Estuve en el patio fumando desde las once y cuarto hasta casi medianoche. A las doce y cuarto subí a darle las buenas noches a mi tía… y la encontré. Sí, debo dinero. ¿Y qué? Yo la quería.",
      later: "Nadie entró ni salió por el portón mientras yo estuve afuera. El fotógrafo me sacó una foto, pregúntenle."
    },
    {
      id: "ines", name: "Dra. Inés Calderón", role: "Médica de la familia", age: 51, color: "#6f8f6a",
      bio: "Brillante y orgullosa. Elvira iba a financiar su clínica… hasta hace poco.",
      statement: "Toqué el piano desde las once hasta la medianoche, todos me vieron. Mi maletín se quedó en el guardarropa toda la noche.",
      later: "A las doce y media revisé mi maletín y faltaba un frasco de digitalina. Alguien lo sacó de ahí."
    },
    {
      id: "bruno", name: "Bruno Salazar", role: "Cocinero", age: 45, color: "#c9a35b",
      bio: "Veinte años cocinando para la señora. Silencioso, puntual, de manos grandes.",
      statement: "Serví la cena y a las once preparé la bandeja del té de la señora, como todas las noches. Luego me fui a casa.",
      later: "La señorita Camila me dijo que ella subiría el té, que me fuera temprano. Le dejé una nota y alcancé el último tranvía."
    },
    {
      id: "camila", name: "Camila Reyes", role: "Ama de llaves y secretaria", age: 29, color: "#8e5a9b",
      bio: "Eficiente, discreta y de absoluta confianza. Vivía en el cuarto de servicio y tenía casi todas las llaves.",
      statement: "A las once me retiré a mi cuarto con una migraña terrible. No salí hasta que oí los gritos del señor Julián.",
      later: "Yo recibí los abrigos, sí. Es mi trabajo. Cualquiera pudo entrar al guardarropa."
    },
    {
      id: "teo", name: "Teodoro Vargas", role: "Marchante de arte", age: 48, color: "#4f7aa8",
      bio: "Elegante, viajero, sonrisa de vendedor. Asesoraba a Elvira con su colección.",
      statement: "Discutimos por negocios, nada más. Me fui en taxi a las diez cuarenta y cinco. No sé nada de cuadros falsos.",
      later: "Ese pañuelo es mío, pero lo dejé en mi abrigo al llegar. Alguien quiere culparme."
    }
  ],

  // Evidencia automática (aparece sola en cada fase)
  autoEvidence: {
    forense: {
      title: "Informe del forense", kind: "Documento oficial",
      html: `<h3>Juzgado del Puerto · Informe preliminar</h3>
<p><b>Fallecida:</b> Elvira Montenegro, 67 años.</p>
<p><b>Hallazgo:</b> 00:15 h, por su sobrino Julián, en el estudio del piso superior. Sentada en su sillón, junto a una taza de té a medio beber.</p>
<p><b>Hora estimada de la muerte:</b> entre las 23:30 y las 00:00 h.</p>
<p><b>Observaciones:</b> sin golpes ni heridas. Pupilas dilatadas, signos de arritmia cardiaca. Posible envenenamiento.</p>
<p><b>Nota:</b> hubo un apagón en toda la casa de 23:25 a 00:20 h.</p>`,
      timeline: [["23:25", "Se va la luz en toda la casa"], ["00:15", "Julián encuentra a Elvira muerta en el estudio"]]
    },
    toxico: {
      title: "Informe del laboratorio", kind: "Documento oficial",
      html: `<h3>Laboratorio Forense · Análisis toxicológico</h3>
<p><b>Causa de muerte:</b> envenenamiento por <b>digitalina</b> (medicamento para el corazón).</p>
<table class="doc-table"><tr><td>Copa de vino de la cena</td><td>Limpia</td></tr>
<tr><td>Tetera (bandeja del té)</td><td>Limpia</td></tr>
<tr><td>Taza de té de la víctima</td><td><b>Positivo · digitalina</b></td></tr></table>
<p><b>Conclusión:</b> el veneno se añadió <u>directamente a la taza</u>, después de servir el té, en el estudio.</p>
<p><b>Declaración anexa:</b> la Dra. Calderón informa que falta un frasco de digitalina de su maletín.</p>`,
      timeline: [["23:30", "Alguien sirve el té en el estudio y envenena la taza"]]
    }
  },

  // Pistas escondidas. code = lo que está impreso en la tarjeta. seal = palabra que da el celular para reclamar puntos.
  evidence: [
    {
      code: "TX47", seal: "FARO", title: "Boleto de taxi", kind: "Recibo", room: "Sala", spot: "Dentro de un libro del librero (entre las páginas)",
      hint: "Viajó lejos sin moverse: duerme entre las páginas de un libro de la sala.",
      q: { type: "Libros", text: "¿En qué pueblo ficticio transcurre «Cien años de soledad»?", answers: ["macondo"] },
      html: `<h3>Taxis El Faro · Servicio nº 0447</h3>
<p><b>Recogida:</b> Casa Montenegro · <b>22:47 h</b></p><p><b>Destino:</b> Hotel del Puerto · llegada 23:05 h</p>
<p><b>Pasajero:</b> Sr. T. Vargas</p><p class="hand">Pagó en efectivo, con prisa. No volvió a salir del hotel en toda la noche. — El conductor</p>`,
      timeline: [["22:47", "Teo Vargas se va en taxi al Hotel del Puerto"]]
    },
    {
      code: "GR20", start: true, next: "AJ18", seal: "ABRIGO", title: "Lista del guardarropa", kind: "Nota manuscrita", room: "Sala", spot: "Debajo de una vela o candelabro",
      hint: "Donde la llama llora cera, algo espera debajo.",
      q: { type: "Acertijo", text: "Cuanto más me quitas, más grande soy. ¿Qué soy?", answers: ["hoyo", "un hoyo", "agujero", "un agujero", "pozo", "un pozo", "hueco", "un hueco"] },
      html: `<h3>Guardarropa · Baile de Ánimas</h3>
<p class="hand">20:05 — Sr. Vargas: abrigo gris, pañuelo bordado «T.V.»<br>
20:10 — Dra. Calderón: abrigo y <b>maletín médico</b> (¡no mover!)<br>
20:12 — Sr. Julián: sombrero<br>
20:30 — se cierra con llave.</p>
<p><b>Recibido por:</b> C. Reyes · <b>Única llave:</b> C. Reyes</p>`,
      timeline: [["20:10", "Camila guarda el maletín de la doctora en el guardarropa (solo ella tiene la llave)"]]
    },
    {
      code: "TS57", start: true, next: "RB08", seal: "TINTA", title: "Testamento y pagaré", kind: "Documento legal", room: "Sala", spot: "Detrás de un cuadro",
      hint: "Alguien me observa desde la pared. Mira detrás de su mirada.",
      q: { type: "Lógica", text: "Escrito en español, ¿qué número del 1 al 10 tiene tantas letras como su propio valor?", answers: ["5", "cinco", "el cinco"] },
      html: `<h3>Testamento de Elvira Montenegro</h3>
<p>· Julián Montenegro (sobrino): <b>70 %</b> de los bienes y la casa.<br>
· Camila Reyes: 10 % y derecho a vivir en la casa.<br>
· Bruno Salazar: una suma de gratitud.<br>
· Clínica de la Dra. Calderón: <s>donación</s> <b>revocada el 20/10/1957</b>.</p>
<hr><p class="hand">PAGARÉ — Julián Montenegro debe 30.000 pesos al Casino del Puerto. Vence el 1 de noviembre de 1957.</p>`,
      timeline: []
    },
    {
      code: "DS31", next: "VR25", seal: "SARTEN", title: "Carta de despido", kind: "Carta", room: "Cocina", spot: "Dentro de una lata o frasco de la alacena",
      hint: "Entre azúcar, sal y harina, una carta amarga se esconde en la cocina.",
      q: { type: "Matemática", text: "Un bate y una pelota cuestan 1,10 en total. El bate cuesta 1,00 más que la pelota. ¿Cuánto cuesta la pelota?", answers: ["0.05", "0,05", ".05", ",05", "5 centavos", "cinco centavos", "5"] },
      html: `<h3>Para Bruno Salazar</h3>
<p class="hand">Bruno: después de veinte años, he decidido prescindir de sus servicios a partir del 1 de noviembre. Le ruego no lo tome como algo personal.<br>— E. Montenegro, 20 de octubre de 1957</p>`,
      timeline: []
    },
    {
      code: "RB08", next: "DI06", seal: "LAZO", title: "Retrato de Bombón", kind: "Fotografía", room: "Sala", spot: "Detrás de otro cuadro o portarretratos",
      hint: "Un fiel guardián posa en un marco. Dale la vuelta a un recuerdo.",
      q: { type: "Libros", text: "En la novela de Bram Stoker, ¿de qué región viene el conde Drácula?", answers: ["transilvania", "transylvania", "rumania", "rumanía"] },
      html: `<h3>Fotografía, 1955</h3>
<p>Doña Elvira sonríe con un pequeño perro caniche en brazos.</p>
<p class="hand">Al reverso: «A mi fiel <b>Bombón</b>, guardián de todos mis secretos. A ti te confío la llave de mi diario.»</p>`,
      timeline: []
    },
    {
      code: "AJ18", next: "CF71", seal: "ALFIL", title: "Página del diario (22:00)", kind: "Acertijo · Ajedrez", room: "Sala", spot: "Debajo del rey o la dama del tablero de ajedrez", puzzle: true,
      hint: "El rey nunca se mueve más de un paso… pero sabe lo que hay debajo de sus pies.",
      q: { type: "Lógica", text: "El cofre del ajedrez se abre con un número.\n♜ + ♜ + ♜ = 15\n♜ + ♞ + ♞ = 11\n♞ + ♝ × ♝ = 12\n♛ − ♜ = 4\n¿Cuánto vale ♛ + ♞ × ♝ ?", answers: ["18"] },
      html: `<h3>Diario de Elvira · 24 de octubre, 22:00</h3>
<p class="hand">Discutí con Teo en el estudio. Le grité: «¡Falsificaciones bajo mi propio techo!». Juró que él no cambia los cuadros, que <b>alguien de esta casa</b> le entrega los originales.<br><br>
Guardé el libro de cuentas en la caja fuerte. Para no olvidar la combinación la escondí en un acertijo de números, como me enseñó papá.</p>`,
      timeline: [["22:00", "Elvira y Teo discuten por los cuadros falsos"]]
    },
    {
      code: "NB23", start: true, next: "DS31", seal: "MIEL", title: "Nota de Bruno y boleto de tranvía", kind: "Nota manuscrita", room: "Cocina", spot: "Dentro de la caja de té, debajo de la tetera o entre las tazas",
      hint: "Huele a manzanilla. Busca donde se guarda el té.",
      q: { type: "Acertijo", text: "Encendí 7 velas. El viento apagó 3. Al final de la noche, ¿cuántas velas me quedaron?", answers: ["3", "tres"] },
      html: `<h3>Nota sobre la mesa de la cocina</h3>
<p class="hand">Srta. Camila: dejé lista la bandeja del té de la señora (tetera, taza y miel). Gracias por subírsela <b>usted</b> esta noche, así alcanzo el último tranvía. — B. (23:00)</p>
<hr><p><b>Tranvía Línea 4</b> · Boleto nº 2210 · <b>23:12 h</b> · Parada Casa Montenegro → Barrio Sur</p>`,
      timeline: [["23:00", "Bruno deja la bandeja del té lista: Camila se la subirá a Elvira"], ["23:12", "Bruno toma el último tranvía"]]
    },
    {
      code: "FP35", start: true, next: "VZ02", seal: "HUMO", title: "Fotografía del patio", kind: "Fotografía", room: "Patio", spot: "Entre las plantas o macetas del patio",
      hint: "Donde las hojas respiran de noche, una imagen espera entre raíces.",
      q: { type: "Matemática", text: "¿Qué número sigue? 2, 3, 5, 9, 17, …", answers: ["33", "treinta y tres"] },
      html: `<h3>Foto 12/36 · Baile de Ánimas</h3>
<p>El Sr. Julián Montenegro fuma junto a la fuente del patio. Al fondo, el reloj de la iglesia marca las <b>23:35</b>.</p>
<p class="hand">Estuve en el patio de 23:15 a 23:50 y el Sr. Julián no se movió de la fuente. Nadie entró ni salió por el portón. — A. Duarte, fotógrafo</p>`,
      timeline: [["23:35", "Julián está en el patio (foto con el reloj de la iglesia)"]]
    },
    {
      code: "PR23", next: "TX47", seal: "NOCTURNO", title: "Programa del baile", kind: "Impreso", room: "Sala", spot: "Debajo de un peón del ajedrez o dentro de un libro de música",
      hint: "Ocho pequeños soldados cuidan la primera fila. Uno de ellos guarda un papel.",
      q: { type: "Lógica", text: "Si 5 gatos cazan 5 ratones en 5 minutos, ¿cuántos gatos hacen falta para cazar 100 ratones en 100 minutos?", answers: ["5", "cinco"] },
      html: `<h3>Programa · Baile de Ánimas 1957</h3>
<p>20:30 Cena · 22:00 Baile · <b>23:00 – 00:00 Recital a la luz de las velas: Dra. Inés Calderón al piano</b></p>
<p class="hand">Nota de un invitado al margen: «Se fue la luz a las 23:25 y la doctora siguió tocando de memoria. ¡Ni un minuto de pausa en toda la hora! Bravo.»</p>`,
      timeline: [["23:00", "La Dra. Calderón toca el piano frente a todos hasta medianoche"]]
    },
    {
      code: "FR40", next: "EP12", seal: "CISTERNA", title: "Frasco envuelto en un pañuelo", kind: "Objeto", room: "Baño", spot: "En la tapa del tanque del inodoro (en bolsa plástica) o detrás de él",
      hint: "El agua guarda secretos fríos. Levanta la tapa de lo que nadie mira.",
      q: { type: "Libros", text: "¿Cómo se llama el médico amigo de Sherlock Holmes que narra sus aventuras?", answers: ["watson", "john watson", "doctor watson", "dr watson", "dr. watson", "john h watson"] },
      html: `<h3>Objeto encontrado en la cisterna del baño</h3>
<p>Frasco vacío: <b>DIGITALINA 0,1 mg</b> · Farmacia del Puerto · Propiedad de la Dra. I. Calderón.</p>
<p>Envuelto en un pañuelo de seda bordado con las iniciales <b>«T.V.»</b></p>`,
      timeline: [["23:45", "Alguien esconde el frasco de digitalina en la cisterna del baño"]]
    },
    {
      code: "VR25", next: "FR40", seal: "CERA", title: "Inventario de velas", kind: "Nota manuscrita", room: "Cocina", spot: "En el cajón o caja donde se guardan las velas / bajo una vela de la cocina",
      hint: "Rojas como la sangre, blancas como el miedo. Cuéntalas donde se guardan.",
      q: { type: "Cultura general", text: "¿Qué elemento químico tiene el símbolo «W»?", answers: ["wolframio", "tungsteno", "el wolframio", "el tungsteno", "wolfram"] },
      html: `<h3>Inventario de la cocina (letra de Bruno)</h3>
<p class="hand">Velas blancas: 40 — para toda la casa.<br>Velas <b>rojas</b> perfumadas: 6 — <b>solo para el cuarto de la Srta. Camila</b> (las pidió ella).</p>
<hr><p><b>Nota del inspector:</b> se hallaron gotas de cera <b>roja</b> en la escalera de servicio, frente a la puerta del estudio y sobre la tapa de la cisterna del baño.</p>`,
      timeline: [["23:30", "Alguien con una vela roja sube por la escalera de servicio al estudio"]]
    },
    {
      code: "EP12", seal: "REFLEJO", title: "Nota escrita al revés", kind: "Nota manuscrita · Espejo", room: "Baño", spot: "Pegada frente al espejo o detrás de la puerta del baño", mirror: true,
      hint: "Hay palabras que solo dicen la verdad cuando se miran a sí mismas.",
      q: { type: "Acertijo", text: "El padre de Ana tiene cinco hijas: Lala, Lele, Lili y Lolo. ¿Cómo se llama la quinta?", answers: ["ana"] },
      html: `<h3>Borrador encontrado en el baño</h3>
<p class="hand mirror">T.: Ella encontró el libro de cuentas. Si mañana habla con el inspector, caemos los dos. Yo me encargo esta noche. No vuelvas. — C.</p>
<p><i>(Usa un espejo para leerla)</i></p>`,
      timeline: []
    },
    {
      code: "VZ02", next: "PR23", seal: "MUELLE", title: "Nota de Teo", kind: "Nota manuscrita", room: "Patio", spot: "Debajo de una maceta o dentro de un farol / vela del patio",
      hint: "Afuera, donde la noche pisa la tierra, levanta lo que sostiene una planta.",
      q: { type: "Libros", text: "¿Cómo se llama el caballo de Don Quijote?", answers: ["rocinante", "rocinante el caballo"] },
      html: `<h3>Nota doblada en el bolsillo de un delantal</h3>
<p class="hand">C.: Ella sospecha de mí, no de ti. Me voy esta noche. Nadie debe saber lo nuestro ni lo de los cuadros. Mañana en el muelle, como acordamos. — T.</p>`,
      timeline: [["22:45", "Teo deja una nota secreta para «C.» antes de irse"]]
    },
    {
      code: "CF71", seal: "CANDADO", title: "Libro de cuentas", kind: "Acertijo · Caja fuerte", room: "Sala", spot: "Dentro del libro más grueso del librero", puzzle: true,
      hint: "El más pesado de los libros guarda la combinación del hierro.",
      q: { type: "Lógica", text: "La caja fuerte tiene 4 dígitos distintos.\n8 6 4 0 → un dígito correcto y en su lugar\n5 8 6 4 → nada es correcto\n4 5 3 8 → un dígito correcto y en su lugar\n2 8 3 0 → dos dígitos correctos y en su lugar\n1 7 5 2 → dos dígitos correctos pero en el lugar equivocado\n¿Cuál es la combinación?", answers: ["7130"] },
      html: `<h3>Libro de cuentas (caja fuerte)</h3>
<table class="doc-table">
<tr><td>«Dama de blanco» (Sorolla)</td><td>Original vendido en Nueva York vía T.V.</td><td>Copia en la sala</td></tr>
<tr><td>«Marina al atardecer»</td><td>Original vendido en Lisboa vía T.V.</td><td>Copia en el estudio</td></tr>
<tr><td>«Bodegón con limones»</td><td>Original vendido en París vía T.V.</td><td>Copia en el comedor</td></tr></table>
<p class="hand">Comisión de quien saca los originales de la casa: 40 % — firmado: <b>C.R.</b></p>`,
      timeline: []
    },
    {
      code: "DI06", seal: "BOMBON", title: "Última entrada del diario", kind: "Acertijo · Diario con candado", room: "Patio", spot: "Dentro de una caja o junto a una vela del patio", puzzle: true,
      hint: "Mi diario lo cuida quien siempre me cuidó. ¿Recuerdas su nombre?",
      q: { type: "Acertijo", text: "El diario de Elvira tiene un candado de 6 letras. Ella decía que la llave la guardaba su fiel compañero. ¿Cuál es la clave?", answers: ["bombon"] },
      html: `<h3>Diario de Elvira · 24 de octubre, 23:10</h3>
<p class="hand">Esta tarde encontré el libro de cuentas escondido en el <b>cuarto de servicio</b>, con unas iniciales que conozco demasiado bien. Teo no lo hacía solo.<br><br>
Mañana a primera hora le escribiré al inspector Ríos. Esta noche, como siempre, beberé mi té y fingiré no saber nada.<br><br>
Bombón, tú me entiendes.</p>`,
      timeline: [["23:10", "Elvira escribe en su diario: mañana denunciará el fraude"]]
    }
  ],

  // Acertijos rápidos que el presentador lanza para puntos extra
  riddles: [
    { q: "Tengo ciudades pero no casas, ríos pero no agua, bosques pero no árboles. ¿Qué soy?", a: "Un mapa" },
    { q: "¿Qué tiene dientes pero no puede morder?", a: "Un peine (o una llave, o un ajo)" },
    { q: "Un hombre mira un retrato y dice: «No tengo hermanos ni hermanas, pero el padre de este hombre es el hijo de mi padre». ¿Quién está en el retrato?", a: "Su hijo" },
    { q: "Si me nombras, desaparezco. ¿Qué soy?", a: "El silencio" },
    { q: "¿Cuántos meses tienen 28 días?", a: "Todos (los 12)" },
    { q: "¿Qué autor escribió «El cuervo» y «El corazón delator»?", a: "Edgar Allan Poe" },
    { q: "Una vela mide 12 cm y se consume 1 cm cada 5 minutos. ¿Cuánto dura encendida?", a: "Una hora (60 minutos)" },
    { q: "¿Qué planeta del sistema solar tiene el día más largo que su año?", a: "Venus" },
    { q: "En «Frankenstein», ¿cómo se llama el creador del monstruo?", a: "Víctor Frankenstein" },
    { q: "Estás en una carrera y adelantas al segundo. ¿En qué lugar quedas?", a: "Segundo" }
  ],

  ouija: ["SÍ", "NO", "QUIZÁS", "NO LO SÉ", "PREGUNTA OTRA COSA"]
};
