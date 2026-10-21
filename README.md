# Matemática en práctica

Aplicación estática e independiente para practicar resolución de problemas matemáticos con una dinámica inspirada en los ejemplos de Acredita EMS. No pertenece a ANEP ni a SEA, no reproduce sus recursos gráficos y no entrega una calificación oficial.

## Qué incluye

- Módulo A: **60 ejercicios originales**, diez variantes por cada una de seis posiciones.
- Cada intento elige **una variante aleatoria por posición**, conservando esta estructura:
  1. Precios y sistemas de ecuaciones: dos menús desplegables.
  2. Porcentajes sucesivos: opción múltiple.
  3. Visualización espacial: opción múltiple con ilustraciones.
  4. Áreas y aprovechamiento: opción múltiple con desarrollo del envase.
  5. Modelos lineales: gráfica y opción múltiple.
  6. Comparación de tendencias: respuesta escrita con justificación.
- Dos pistas progresivas por ejercicio y comprobación opcional. Ante un error, orientación específica de la opción y una pregunta para revisar, sin mostrar la respuesta correcta. El planteo completo aparece al acertar.
- Navegación hacia atrás, borrado y revisión antes de finalizar; se puede finalizar con actividades sin responder.
- Resultado automático sobre **cinco respuestas cerradas**. En los resultados, los errores y las actividades vacías tampoco revelan soluciones; permiten reintentar. El puntaje se recalcula con las respuestas actuales al finalizar de nuevo.
- Recorrido de aprendizaje por actividad: primera respuesta comprobada, reintentos con respuestas diferentes y pistas consultadas antes de la primera comprobación. Un resumen separa aciertos iniciales sin pistas, con pistas y después de revisar, sin penalizar la ayuda.
- **Mi progreso:** historial local de bloques finalizados, con fechas, resultados, ayudas, refuerzos y resumen por tema. Empezar otro intento conserva los resúmenes anteriores.
- Refuerzo opcional después de corregir un error: otra variante del mismo tipo con datos distintos, guardada por separado y sin sumar una séptima actividad ni modificar el puntaje principal.
- La respuesta escrita recibe preguntas de reflexión. El modelo y la rúbrica de **autoevaluación** solo se muestran al abrir una comparación explícita: no se pretende corregir lenguaje natural automáticamente.
- Progreso, combinación sorteada y resultados guardados en `localStorage`, solo en ese navegador y origen. Un nuevo intento reemplaza al anterior, previa confirmación. No hay cuentas, analítica ni envío de respuestas.
- Diseño adaptable a celulares, navegación por teclado, controles nativos y gráficas SVG propias sin recursos externos.
- Razonamientos con LaTeX: fracciones, sistemas, potencias y desigualdades mediante KaTeX local, con MathML para accesibilidad. Se mantienen las reglas de mostrar el desarrollo solo al acertar y no resolver los errores.
- B y C aparecen como pendientes hasta incorporar sus bancos completos.
- [Página de orientaciones](./orientaciones.html) con síntesis propia de la sección 3 de ANEP y acceso a la fuente oficial completa. No es una transcripción; distingue los contenidos oficiales del alcance parcial de la app.

Las variantes se sortean de manera independiente. Los ejercicios de áreas y de tendencias incluyen todos sus propios datos: no dependen de la variante elegida en otra posición. Un nuevo intento puede repetir ejercicios; no se garantiza una combinación distinta.

### Banco ampliado del módulo A

Las seis posiciones mantienen su estructura y ahora tienen diez variantes cada una:

| Posición | Variantes | Situaciones |
| --- | --- | --- |
| Sistemas de ecuaciones | 10 | Panadería, papelería, entradas, feria, alquiler de mobiliario, cantina, mercería, piscina, cooperativa y alojamiento. |
| Porcentajes sucesivos | 10 | Pérdidas de masa, descuentos consecutivos, evaporación y filtrado. Se distingue qué cantidad es la base de cada porcentaje. |
| Visualización espacial | 10 | Caras vecinas y opuestas, marcas que no pueden duplicarse y cierre del recorrido alrededor de la base. |
| Áreas y aprovechamiento | 10 | Diferentes bases, paredes, techos y láminas; inventario de piezas, áreas triangulares y redondeo de porcentajes. |
| Modelos lineales | 10 | Metas de ventas, préstamos, reciclaje, reparaciones y alquileres; pendientes enteras o decimales y primer año que supera una meta. |
| Argumentación | 10 | Rectas paralelas, cruces, valores iniciales iguales, distinta rapidez de crecimiento y modelos decrecientes con dominio limitado. |

Se conservan los 18 ejercicios iniciales con sus identificadores y respuestas, para no romper los intentos guardados. Las variantes nuevas usan los sufijos `-4` a `-10`. Tras corregir un error hay nueve variantes alternativas para el refuerzo de esa posición; solo se selecciona una y se conserva al retomarla.

Cada variante nueva incluye dos pistas y una explicación completa. Las preguntas cerradas tienen orientación para todas sus opciones incorrectas; las escritas tienen preguntas de reflexión y rúbrica, sin corrección automática. B y C siguen pendientes y no se presentan como réplicas oficiales.

## Primer intento, reintentos y refuerzo

Una respuesta se registra cuando está completa y se pulsa **Comprobar respuesta** o se entrega al finalizar el bloque. En la actividad escrita se registra al consultar la guía o al finalizar, pero no recibe una evaluación automática. Escribir, elegir y cambiar opciones, navegar o borrar **no cuenta como un intento comprobado**.

La primera respuesta registrada es una instantánea: no cambia al corregir o borrar la respuesta actual. Repetir la comprobación de la misma respuesta consecutiva no aumenta el contador; cambiarla, comprobar otra y volver a la anterior sí registra otra entrega. Finalizar nuevamente sin cambios tampoco duplica el último intento.

El resumen de aprendizaje incluye solo las cinco actividades cerradas:

- **Primer intento sin pistas:** la primera respuesta comprobada fue correcta y no había pistas, orientación ni solución consultadas antes.
- **Primer intento con pistas:** fue correcta en la primera comprobación, después de consultar pistas.
- **Resuelta después de revisar:** ahora está correcta, pero la primera comprobación fue incorrecta o ya había exposición previa a una orientación o solución.
- **Para seguir practicando:** la respuesta actual es incorrecta o está vacía, aunque haya existido un acierto anterior.
- **Sin registro inicial:** la respuesta actual es correcta, pero el intento proviene de una versión anterior o no tiene datos suficientes para atribuir un primer intento.

El puntaje sobre cinco siempre describe las respuestas actuales. Consultar ayudas no descuenta puntos. «Sin pistas» solo describe las ayudas observables de la app: no permite saber si hubo apoyo externo ni implica dominio de todo un tema. Las pistas que se ven después de la primera comprobación no reescriben su registro inicial.

Cuando se corrige una actividad que antes se comprobó incorrectamente, se ofrece un refuerzo usando **otra variante de la misma posición del banco**. Es opcional; las actividades escritas no ofrecen refuerzo automático. La variante se sortea una sola vez por actividad y se conserva al salir y volver. Tiene sus propias respuestas, pistas y comprobaciones; no cambia la combinación de seis ni sus resultados. Se puede consultar su devolución con las mismas reglas: preguntas ante el error y desarrollo al acertar.

El primer acierto del refuerzo sin sus propias pistas permite observar cómo se resolvió ese nuevo problema después de estudiar el original, no certificar aprendizaje permanente. Si una posición solo tiene una variante, no se ofrece un refuerzo inventado.

Los progresos anteriores se conservan, pero se identifican como registros parciales: no se reconstruyen ni se atribuyen primeros intentos que no fueron observados. **Borrar una respuesta no borra su recorrido**. Iniciar otro intento reemplaza el intento editable y sus refuerzos, pero conserva el resumen de los bloques finalizados en «Mi progreso».

## Mi progreso

Accedé desde la cabecera, la portada o los resultados. También podés abrir [index.html#progreso](./index.html#progreso).

- Cada intento tiene una identidad propia y una fecha de inicio. Al finalizar se archiva un resumen de las seis actividades, manteniendo el puntaje automático sobre cinco.
- Volver a finalizar el mismo bloque actualiza su última entrega: **no crea un bloque duplicado**. Su primera fecha de entrega registrada se conserva.
- Las ediciones principales que aún no se volvieron a finalizar no cambian la entrega archivada. Los refuerzos y los criterios de autoevaluación escrita sí se actualizan por separado.
- Los registros guardan resultados, primeros resultados observados, cantidad de comprobaciones, pistas y estado del refuerzo. **No copian las respuestas escritas, las soluciones ni el banco completo**.
- El resumen por tema agrupa cada posición dentro de su módulo. Usa los resultados archivados, sin recalcularlos con versiones nuevas del banco. Muestra cuántas variantes distintas se practicaron para no confundir repeticiones con transferencia.
- La escritura conserva su condición de autoevaluación, nunca se incluye en el puntaje automático ni en los cinco temas cerrados.
- Un resultado previo que siga siendo el intento actual puede recuperarse con fecha de entrega desconocida. Se registra cuándo se guardó el resumen, pero **no se inventa cuándo se hizo el bloque**. Los intentos ya reemplazados antes de esta función no se pueden recuperar.

El historial usa la clave `matematica-historial-v1` de `localStorage`, separada de `matematica-practica-v1` para el intento actual. Solo existe en ese navegador, perfil y origen; no se sincroniza entre dispositivos ni se envía a un servidor. Borrar datos del sitio o cambiar de dominio puede hacer que deje de estar disponible. No se eliminan registros automáticamente para imponer un cupo.

### Borrar el historial

«Borrar historial» pide confirmación y elimina todos los resúmenes, **sin borrar el intento editable actual**. Ese intento queda marcado para que el historial no reaparezca al recargar o al iniciar otro bloque. Si se vuelve a finalizar explícitamente, se archiva otra vez.

El borrado no se puede deshacer. Si el navegador no permite guardar la marca de exclusión o escribir el historial vacío, se muestra un error y no se anuncia un borrado exitoso.

### Fallos de almacenamiento

Si el historial está dañado o tiene otra versión, no se sustituye silenciosamente por uno vacío: «Mi progreso» muestra el error y permite borrarlo explícitamente. El intento actual sigue funcionando de forma independiente.

Si se agota el almacenamiento o falla una escritura, se informa y el intento actual se conserva mientras sea posible. No se permite reemplazar un bloque finalizado cuyo resumen no se pudo archivar: primero hay que volver a finalizar para reintentar o resolver el problema del historial. Esto evita mostrar un éxito que en realidad perdería el bloque.

## Usar localmente

Requiere Python 3 para el servidor de ejemplo. Desde la raíz:

```powershell
python -m http.server 8080
```

Abrí <http://localhost:8080>. También podés usar `npm start` o un servidor estático como Live Server.

**No abrir mediante doble clic (`file://`)**: la carga del JSON mediante `fetch` y los módulos JavaScript requieren un servidor HTTP. Para usar o publicar el contenido ya preparado no hay compilación ni dependencias que instalar: KaTeX y sus fuentes están incluidos en [vendor/katex](./vendor/katex/).

## Publicar en GitHub Pages

1. Subí el contenido del proyecto a tu repositorio, conservando `index.html` en la raíz.
2. En GitHub entrá en **Settings → Pages**.
3. Elegí **Deploy from a branch**, la rama que contiene la app y la carpeta **/(root)**.
4. Guardá y esperá a que GitHub publique el sitio.

Si el repositorio es `Domingo1987/acredita`, la dirección habitual es <https://domingo1987.github.io/acredita/>. La disponibilidad y la URL definitiva se confirman en Settings → Pages. No hace falta un backend ni un proceso de build. Las rutas son relativas, por lo que funcionan también bajo el subdirectorio del repositorio.

No incluyas información privada en el banco: tanto las preguntas como sus soluciones son archivos públicos descargables. Esto es una herramienta de aprendizaje, no un sistema de evaluación segura.

## Dónde se alojan las imágenes y las fórmulas

Las figuras del envase, las opciones de caja y las gráficas **no son archivos PNG ni imágenes de un servicio externo**. [js/visuals.js](./js/visuals.js) dibuja SVG directamente dentro de la página usando los valores del JSON. El navegador los genera en cada renderizado. Al publicar, el código y los datos se sirven desde tu propio sitio de GitHub Pages; no hace falta alojamiento adicional para imágenes.

KaTeX funciona de la misma manera local en cuanto a alojamiento: su JavaScript, CSS y fuentes se sirven desde [vendor/katex](./vendor/katex/). No se usan CDN, fuentes remotas ni servicios para convertir las fórmulas en imágenes. El resultado es HTML y MathML, no una captura.

La copia de KaTeX conserva su licencia MIT. Para restaurar o regenerar sus archivos desde la versión fijada en el proyecto:

```powershell
npm ci
npm run vendor:math
```

Publicá también los archivos de `vendor`, incluida la carpeta `fonts` y la licencia. `node_modules` no se publica. Si el motor matemático no puede cargar, se avisa y los ejercicios siguen disponibles con las fórmulas como texto LaTeX. Una fórmula inválida muestra un aviso visible y queda registrada en consola.

## Archivos

- [index.html](./index.html): entrada de la aplicación.
- [orientaciones.html](./orientaciones.html): preparación y enlace a las orientaciones oficiales.
- [styles.css](./styles.css): presentación y diseño responsive.
- [js/app.js](./js/app.js): pantallas, eventos y persistencia.
- [js/core.js](./js/core.js): validación del banco, sorteo, corrección y restauración.
- [js/visuals.js](./js/visuals.js): diagramas y gráficas SVG locales.
- [js/math.js](./js/math.js): formato seguro de razonamientos con LaTeX.
- [js/history.js](./js/history.js): resúmenes persistentes y agregación por tema.
- [js/history-view.js](./js/history-view.js): vista de «Mi progreso».
- [vendor/katex](./vendor/katex/): biblioteca, fuentes y licencia distribuidas con el sitio.
- [scripts/vendor-math.js](./scripts/vendor-math.js): preparación de los recursos locales.
- [data/activities.json](./data/activities.json): módulos y ejercicios editables.
- [tests/core.test.js](./tests/core.test.js): pruebas del motor y de las respuestas matemáticas.
- [tests/learning.test.js](./tests/learning.test.js): registro de primeros intentos, migración y aislamiento de los refuerzos.
- [tests/history.test.js](./tests/history.test.js): conservación de bloques, fechas, revisiones sin duplicados, resúmenes por tema y privacidad de los datos guardados.

## Agregar ejercicios en JSON

Editá [data/activities.json](./data/activities.json). Cada módulo tiene `id`, `title`, `description`, `status` y `slots`. Un módulo disponible usa `status: "ready"` y exactamente seis posiciones. Cada posición tiene un `title` y una lista `questions`. Podés agregar tantas variantes como quieras: se elige una al azar, con la misma probabilidad para cada variante.

Cada actividad necesita un `id` **único en todo el banco**, `type`, `title`, `prompt` (lista de párrafos de texto plano), `hints` (lista no vacía) y `explanation`. No se admite HTML en los textos: se muestran escapados.

Ejemplo de una variante para la segunda posición (`choice`):

```json
{
  "id": "a-porcentaje-4",
  "type": "choice",
  "title": "Otra receta",
  "prompt": [
    "Una preparación necesita 320 g de alimento cocido. La limpieza elimina el 20 % y la cocción otro 20 % de la masa ya limpia.",
    "¿Cuánto alimento se necesita al principio?"
  ],
  "options": [
    {"id": "a", "label": "400 g"},
    {"id": "b", "label": "450 g"},
    {"id": "c", "label": "500 g"},
    {"id": "d", "label": "550 g"}
  ],
  "answer": "c",
  "errorFeedback": {
    "a": {
      "reason": "Esta elección puede salir al recuperar una sola de las dos pérdidas.",
      "calculation": "400 × 0,8 × 0,8 = 256 g, no los 320 g pedidos.",
      "question": "¿Tu planteo deshace ambas etapas o solo una?"
    },
    "b": {
      "reason": "La masa elegida resulta insuficiente al comprobar las dos reducciones.",
      "calculation": "450 × 0,8 × 0,8 = 288 g.",
      "question": "¿Qué parte se conserva en cada etapa y cómo se encadenan esas partes?"
    },
    "d": {
      "reason": "La elección produce más cantidad que la solicitada.",
      "calculation": "550 × 0,8 × 0,8 = 352 g.",
      "question": "¿Cómo podrías deshacer exactamente las dos transformaciones, en vez de estimar una masa mayor?"
    }
  },
  "hints": [
    "Cada etapa conserva el 80 %.",
    "Dividí 320 entre 0,8 × 0,8."
  ],
  "explanation": "320 ÷ 0,64 = 500 g."
}
```

### Formatos de respuesta

- `select`, posición 1: `fields` con exactamente dos campos. Cada campo tiene `id`, `label`, `options` y `answer`. Las opciones contienen `id` y `label`; para los precios, los identificadores son **cadenas numéricas**, por ejemplo `"60"`. Solo se considera respondida cuando ambos campos están completos. La actividad necesita `errorFeedback` con `reason` y `question`, y dos comprobaciones en `verification`: por ejemplo, `[{"quantities":[4,6],"total":360},{"quantities":[2,4],"total":200}]`. Las cantidades siguen el mismo orden que `fields`. La devolución sustituye los precios elegidos en ambas compras y señala qué total coincide o no; nunca sustituye los precios correctos.
- `choice`, posiciones 2 a 5: `options` con cuatro opciones de `id` y `label`, y `answer` con el identificador correcto. `errorFeedback` debe tener exactamente una entrada por cada identificador incorrecto, sin entrada para el correcto. Cada entrada tiene `reason` (posible confusión o revisión verificable), `question` (pregunta para reorientar) y opcionalmente `calculation` (comprobación o cálculo posible, sin revelar la solución). En la posición espacial, cada opción puede incluir `faces: ["A", "B"]` para dibujar la caja.
- `open`, posición 6: `reflectionQuestions` con preguntas que no revelen la conclusión, `modelAnswer` con una respuesta orientativa y `rubric` con una lista de criterios. El modelo y la rúbrica quedan detrás de una comparación voluntaria. No usar palabras clave para simular una corrección fiable de una justificación.

Las confusiones sugeridas **no son diagnósticos del procedimiento real**: una elección no demuestra qué cálculo hizo la persona. Redactá «esta opción puede aparecer si…» y no «hiciste…». Si incluís un cálculo, verificá sus números. La explicación completa en `explanation` debe contener el planteo, los pasos y una comprobación contextual; solo se muestra automáticamente al acertar. No pongas la solución en `errorFeedback`, en las preguntas de reflexión ni en las pistas.

### Fórmulas LaTeX en razonamientos

Los campos `explanation`, `hints`, `errorFeedback.reason`, `errorFeedback.calculation`, `errorFeedback.question`, `reflectionQuestions`, `modelAnswer` y `rubric` admiten fórmulas. El resto sigue siendo texto plano, incluidas las respuestas escritas por la persona.

- En línea: `\\(x^2\\)`.
- En un bloque destacado: `\\[m=\\frac{810}{0{,}675}\\]`.
- Decimales: `0{,}75`; porcentajes: `25\\%`; unidades: `\\mathrm{cm}^2`.
- Las barras se escriben dobles dentro de un archivo JSON.
- No se usan delimitadores `$...$`: así, los precios como `$200` no se confunden con fórmulas.

Ejemplo de un campo JSON:

```json
{
  "explanation": "Primero escribimos la relación:\\[a=\\frac{b}{2}\\]Después verificamos si se cumple en el contexto."
}
```

Los textos se escapan como HTML y KaTeX se ejecuta con `trust: false`. No se permite usar LaTeX para insertar enlaces o HTML arbitrario. Los bloques largos permiten desplazamiento horizontal dentro de la tarjeta, sin ensanchar toda la página.

### Ilustraciones opcionales

`visual` puede ser:

- Desarrollo de caja: `{"kind":"net","base":24,"wall":6,"height":12,"symbols":["A","B","C","D"],"dimensions":true}`. Los símbolos siguen el orden **arriba, derecha, abajo, izquierda**. `base` es el lado del cuadrado, `wall` la altura de pared y `height` la altura de los triángulos del desarrollo, no la altura vertical del techo armado. Se dibuja un esquema sin escala; las medidas escritas son las que se usan para calcular.
- Gráfica: `{"kind":"chart","baseYear":2024,"unit":"Préstamos mensuales","series":[{"label":"Libros","slope":12,"intercept":250},{"label":"Revistas","slope":5,"intercept":100}]}`. Cada serie corresponde a `y = slope × x + intercept`. Se muestran los valores de x entre 0 y 5 y las ecuaciones como texto; las preguntas pueden pedir extrapolar fuera del gráfico.

### Habilitar B o C

Completá las seis posiciones de su `slots`, siguiendo los mismos formatos, y cambiá `status` de `"pending"` a `"ready"`. La portada los habilita sin modificar el JavaScript. No basta con cambiar el estado: un banco incompleto se rechaza explícitamente.

Si querés otra estructura o más de seis posiciones en un futuro módulo, habrá que adaptar el contrato y la navegación, no solo el JSON.

## Validación

Con Node.js 20 o superior:

```powershell
npm test
```

Las pruebas verifican las seis posiciones y sus diez variantes, selección independiente, corrección, restauración de progreso, rechazo de datos inválidos, formatos SVG y **cálculos de las soluciones**: sistemas con solución única, porcentajes sucesivos, vecindad de caras, áreas, desigualdades estrictas y tendencias crecientes o decrecientes. Se recorren las 120 opciones incorrectas y las 150 parejas incorrectas de precios, se valida LaTeX y se comprueba la compatibilidad de los ejercicios anteriores, el registro inmutable del primer intento, la deduplicación de entregas, la migración de progresos anteriores y el aislamiento del refuerzo.

Después de editar el banco, ejecutá las pruebas y revisá el flujo en el navegador. El validador detecta varios errores de estructura, pero no sustituye la revisión pedagógica ni comprueba automáticamente cualquier ejercicio nuevo.

Si el almacenamiento está bloqueado o el progreso anterior es incompatible con cambios en el banco, se muestra una advertencia. Se puede continuar con un intento nuevo; su persistencia depende de que el navegador permita guardar datos. Si falla la carga o el formato del JSON, la app muestra un error y no inventa un banco de respaldo.