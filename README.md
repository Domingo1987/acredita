# Matemática en práctica

Aplicación estática e independiente para practicar resolución de problemas matemáticos con una dinámica inspirada en los ejemplos de Acredita EMS. No pertenece a ANEP ni a SEA, no reproduce sus recursos gráficos y no entrega una calificación oficial.

## Qué incluye

- Módulo A: **18 ejercicios originales**, tres variantes por cada una de seis posiciones.
- Cada intento elige **una variante aleatoria por posición**, conservando esta estructura:
  1. Precios y sistemas de ecuaciones: dos menús desplegables.
  2. Porcentajes sucesivos: opción múltiple.
  3. Visualización espacial: opción múltiple con ilustraciones.
  4. Áreas y aprovechamiento: opción múltiple con desarrollo del envase.
  5. Modelos lineales: gráfica y opción múltiple.
  6. Comparación de tendencias: respuesta escrita con justificación.
- Dos pistas progresivas por ejercicio, comprobación opcional y explicación.
- Navegación hacia atrás, borrado y revisión antes de finalizar; se puede finalizar con actividades sin responder.
- Resultado automático sobre **cinco respuestas cerradas**. La respuesta escrita se compara con un modelo y una rúbrica de **autoevaluación**: no se pretende corregir lenguaje natural automáticamente.
- Progreso, combinación sorteada y resultados guardados en `localStorage`, solo en ese navegador y origen. Un nuevo intento reemplaza al anterior, previa confirmación. No hay cuentas, analítica ni envío de respuestas.
- Diseño adaptable a celulares, navegación por teclado, controles nativos y gráficas SVG propias sin recursos externos.
- B y C aparecen como pendientes hasta incorporar sus bancos completos.

Las variantes se sortean de manera independiente. Los ejercicios de áreas y de tendencias incluyen todos sus propios datos: no dependen de la variante elegida en otra posición. Un nuevo intento puede repetir ejercicios; no se garantiza una combinación distinta.

## Usar localmente

Requiere Python 3 para el servidor de ejemplo. Desde la raíz:

```powershell
python -m http.server 8080
```

Abrí <http://localhost:8080>. También podés usar `npm start` o un servidor estático como Live Server.

**No abrir mediante doble clic (`file://`)**: la carga del JSON mediante `fetch` y los módulos JavaScript requieren un servidor HTTP. No hay compilación ni dependencias que instalar.

## Publicar en GitHub Pages

1. Subí el contenido del proyecto a tu repositorio, conservando `index.html` en la raíz.
2. En GitHub entrá en **Settings → Pages**.
3. Elegí **Deploy from a branch**, la rama que contiene la app y la carpeta **/(root)**.
4. Guardá y esperá a que GitHub publique el sitio.

Si el repositorio es `Domingo1987/acredita`, la dirección habitual es <https://domingo1987.github.io/acredita/>. La disponibilidad y la URL definitiva se confirman en Settings → Pages. No hace falta un backend ni un proceso de build. Las rutas son relativas, por lo que funcionan también bajo el subdirectorio del repositorio.

No incluyas información privada en el banco: tanto las preguntas como sus soluciones son archivos públicos descargables. Esto es una herramienta de aprendizaje, no un sistema de evaluación segura.

## Archivos

- [index.html](./index.html): entrada de la aplicación.
- [styles.css](./styles.css): presentación y diseño responsive.
- [js/app.js](./js/app.js): pantallas, eventos y persistencia.
- [js/core.js](./js/core.js): validación del banco, sorteo, corrección y restauración.
- [js/visuals.js](./js/visuals.js): diagramas y gráficas SVG locales.
- [data/activities.json](./data/activities.json): módulos y ejercicios editables.
- [tests/core.test.js](./tests/core.test.js): pruebas del motor y de las respuestas matemáticas.

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
  "hints": [
    "Cada etapa conserva el 80 %.",
    "Dividí 320 entre 0,8 × 0,8."
  ],
  "explanation": "320 ÷ 0,64 = 500 g."
}
```

### Formatos de respuesta

- `select`, posición 1: `fields` con exactamente dos campos. Cada campo tiene `id`, `label`, `options` y `answer`. Las opciones contienen `id` y `label`; `answer` es el identificador correcto, **siempre una cadena**. Solo se considera respondida cuando ambos campos están completos.
- `choice`, posiciones 2 a 5: `options` con cuatro opciones de `id` y `label`, y `answer` con el identificador correcto. En la posición espacial, cada opción puede incluir `faces: ["A", "B"]` para dibujar la caja.
- `open`, posición 6: `modelAnswer` con una respuesta orientativa y `rubric` con una lista de criterios. La persona marca cuáles cumple. No usar palabras clave para simular una corrección fiable de una justificación.

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

Las pruebas verifican las seis posiciones y sus tres variantes, selección independiente, corrección, restauración de progreso, rechazo de datos inválidos, formatos SVG y **cálculos de las soluciones**: sistemas, porcentajes sucesivos, vecindad de caras, áreas, desigualdades estrictas y tendencias.

Después de editar el banco, ejecutá las pruebas y revisá el flujo en el navegador. El validador detecta varios errores de estructura, pero no sustituye la revisión pedagógica ni comprueba automáticamente cualquier ejercicio nuevo.

Si el almacenamiento está bloqueado o el progreso anterior es incompatible con cambios en el banco, se muestra una advertencia. Se puede continuar con un intento nuevo; su persistencia depende de que el navegador permita guardar datos. Si falla la carga o el formato del JSON, la app muestra un error y no inventa un banco de respaldo.