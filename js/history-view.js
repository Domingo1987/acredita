import { escapeHTML as e } from "./visuals.js";
import { entryCounts, topicsSummary, LEARNING_LABELS } from "./history.js";

const outcomes = { correct: "Correcta", incorrect: "Para revisar", unanswered: "Sin responder", manual: "Autoevaluación", inProgress: "En curso" };
const date = value => new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function categoriesHTML(counts) {
  return `<dl class="history-categories">${Object.entries(LEARNING_LABELS).filter(([key]) => key !== "unknown" || counts[key] > 0)
    .map(([key, label]) => `<div><dt>${e(label)}</dt><dd>${counts[key]}</dd></div>`).join("")}</dl>`;
}

function responseHTML(activity) {
  return `<p>${activity.submissions} respuestas comprobadas · ${activity.hints} pistas consultadas.</p>
    <p class="field-note">${activity.first ? `Primera comprobación registrada: ${e(outcomes[activity.first.outcome])}; ${activity.first.hintsUsed} pistas vistas antes.` : "No hay una primera comprobación registrada."}
    ${activity.partial ? " El registro inicial es parcial." : ""}</p>`;
}

function entryHTML(entry) {
  const counts = entryCounts(entry);
  return `<details class="history-card"><summary><span><strong>Módulo ${e(entry.moduleId)} · ${e(entry.moduleTitle)}</strong>
    <span class="history-date">${entry.completedAt ? `Primera entrega registrada: ${e(date(entry.completedAt))}` : "Resultado anterior: fecha de entrega desconocida"}</span></span>
    <span class="history-score">${counts.correct} / ${counts.automaticTotal}</span></summary>
    <div class="history-content"><p class="field-note">Inicio del intento: ${entry.startedAt ? e(date(entry.startedAt)) : "fecha desconocida"}. Última actualización: ${e(date(entry.updatedAt))}. Se conserva la última entrega de este bloque; volver a finalizarlo no crea otro bloque.</p>
      ${categoriesHTML(counts)}
      <ol class="history-activities">${entry.activities.map(activity => `<li><h3>${e(activity.title)} <span class="badge">${e(outcomes[activity.outcome])}</span></h3>
        <p class="field-note">${e(activity.topicTitle)} · ${activity.type === "open" ? "Respuesta escrita, sin puntaje automático" : e(LEARNING_LABELS[activity.category])}</p>
        ${responseHTML(activity)}
        ${activity.rubric ? `<p class="field-note">Criterios marcados por la persona: ${activity.rubric.checked} de ${activity.rubric.total}. Esto no es una corrección automática.</p>` : ""}
        ${activity.reinforcement ? `<div class="history-reinforcement"><strong>Refuerzo: ${e(activity.reinforcement.title)}</strong>
          <p>${e(outcomes[activity.reinforcement.outcome])}${activity.reinforcement.category ? ` · ${e(LEARNING_LABELS[activity.reinforcement.category])}` : ""}</p>
          ${responseHTML(activity.reinforcement)}</div>` : ""}
      </li>`).join("")}</ol>
    </div></details>`;
}

export function progressHTML(history, { error = "", status = "", hasAttempt = false } = {}) {
  const controls = `<div class="actions"><button type="button" data-action="home">← Volver a módulos</button>
    ${hasAttempt ? '<button type="button" data-action="resume" class="primary">Retomar mi intento actual →</button>' : ""}</div>`;
  const clear = `<button type="button" data-action="clear-history" class="danger-button" ${!error && !history?.entries.length ? "disabled" : ""}>Borrar historial</button>`;
  if (error) return `<header class="review-header"><p class="eyebrow">Tu cuaderno de aprendizaje</p><h1>Mi progreso</h1></header>
    <section class="fatal" role="alert"><h2>No pudimos leer el historial</h2><p>${e(error)}</p><p>No lo reemplazamos por uno vacío. Tu intento actual sigue separado. Podés corregir el almacenamiento y recargar, o borrar explícitamente el historial dañado.</p>${clear}</section>${controls}`;
  const entries = history.entries.slice().sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "") || b.updatedAt.localeCompare(a.updatedAt));
  const counts = entries.map(entryCounts);
  const total = key => counts.reduce((sum, item) => sum + item[key], 0);
  return `<header class="review-header"><p class="eyebrow">Tu cuaderno de aprendizaje</p><h1>Mi progreso</h1>
    <p>Una mirada a tus bloques finalizados, las ayudas que usaste y los problemas de refuerzo. Sin competir y sin descontar puntos por pedir ayuda.</p></header>
    ${status ? `<p class="history-status" role="status">${e(status)}</p>` : ""}
    <aside class="intro-note"><p><strong>Solo en este navegador.</strong> El historial no se envía a un servidor ni se comparte entre dispositivos. Si borrás los datos del sitio, se pierde. El intento en curso se guarda por separado.</p></aside>
    ${entries.length ? `<section class="history-overview" aria-label="Resumen del historial">
      <div><span>Bloques finalizados</span><strong>${entries.length}</strong></div>
      <div><span>Aciertos en las últimas entregas</span><strong>${total("correct")} / ${total("automaticTotal")}</strong></div>
      <div><span>Pistas en los bloques</span><strong>${total("hints")}</strong></div>
      <div><span>Refuerzos iniciados</span><strong>${total("reinforcements")}</strong></div>
    </section><p class="field-note">Refuerzos: ${total("reinforcementChecked")} con respuesta comprobada; ${total("reinforcementCorrect")} correctos. Se cuentan aparte del puntaje del bloque. La escritura no recibe puntaje automático.</p>
    <section aria-labelledby="topics-title"><h2 id="topics-title">Tu recorrido por tema</h2>
      <p class="field-note">Son datos de práctica, no una certificación de dominio. Repetir una variante puede ayudarte, pero reconocer su respuesta no demuestra transferencia.</p>
      <div class="history-topics">${topicsSummary(history).map(topic => `<article class="history-topic">
        <p class="eyebrow">Módulo ${e(topic.moduleId)}</p><h3>${e(topic.title)}</h3>
        <p>${topic.blocks} bloques · ${topic.distinctQuestions} variantes distintas · ${topic.correct} respuestas finales correctas.</p>
        ${categoriesHTML(topic.categories)}
        <p class="field-note">${topic.hints} pistas consultadas en total. Refuerzos: ${topic.reinforcementCorrect} correctos de ${topic.reinforcements} iniciados; ${topic.reinforcementIndependent} con primer acierto sin sus propias pistas.</p>
      </article>`).join("")}</div>
    </section><section aria-labelledby="blocks-title"><h2 id="blocks-title">Mis bloques finalizados</h2>
      <p class="field-note">Los datos de cada bloque corresponden a su última entrega. Los refuerzos y la autoevaluación escrita se actualizan por separado. Los intentos nuevos no borran estos resúmenes.</p>
      ${entries.map(entryHTML).join("")}</section>` :
    `<section class="history-empty"><h2>Tu cuaderno está por empezar</h2><p>Al finalizar un bloque, su resumen aparecerá acá. Un intento sin terminar no se archiva.</p><p>Los resultados anteriores que todavía estén guardados pueden recuperarse, pero sin inventar su fecha de entrega.</p></section>`}
    ${controls}<div class="history-delete"><p class="field-note">Borrar el historial no borra el intento actual. No hay recuperación del historial borrado.</p>${clear}</div>`;
}
