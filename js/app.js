import {
  STORAGE_KEY, validateBank, createAttempt, questionsFor, isAnswered, grade, errorGuidance, summarize, restoreAttempt,
  recordSubmission, markFeedback, markModelViewed, learningCategory, learningSummary,
  reinforcementCandidates, startReinforcement, reinforcementQuestion
} from "./core.js";
import { escapeHTML as e, visualHTML, boxSVG } from "./visuals.js";
import { initializeMath, reasoningHTML as math } from "./math.js";
import {
  HISTORY_KEY, LEARNING_LABELS as learningLabels, emptyHistory, validateHistory,
  snapshotAttempt, upsertHistory, updateArchivedExtras
} from "./history.js";
import { progressHTML } from "./history-view.js";

const root = document.querySelector("#app");
const notice = document.querySelector("#notice");
const labels = { correct: "Correcta", incorrect: "Para repasar", unanswered: "Sin responder", manual: "Autoevaluación" };
let bank;
let attempt = null;
let screen = "home";
let archive = emptyHistory();
let archiveError = "";
let historyStatus = "";

function activityContext() {
  if (attempt.activeReinforcement) {
    return { q: reinforcementQuestion(bank, attempt), state: attempt.reinforcements[attempt.activeReinforcement], reinforcement: true };
  }
  return { q: questionsFor(bank, attempt)[attempt.index], state: attempt, reinforcement: false };
}

function warn(message, error) {
  console.error(message, error);
  notice.textContent = message;
  notice.hidden = false;
}

function persistAttempt() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
    return true;
  } catch (error) {
    warn("No se pudo guardar el progreso en este navegador. Podés seguir practicando, pero al cerrar o recargar se perderán los cambios no guardados.", error);
    return false;
  }
}

function persistArchive(next) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    archive = next;
    if (next.entries.length) historyStatus = "";
    return true;
  } catch (error) {
    warn("No se pudo guardar el historial. Los cambios no archivados pueden perderse al recargar. Conservá esta pestaña y reintentá antes de empezar otro bloque.", error);
    return false;
  }
}

function save() {
  const saved = persistAttempt();
  if (!archive || !attempt || attempt.historyExcluded) return saved;
  const next = updateArchivedExtras(bank, archive, attempt);
  return next === archive ? saved : persistArchive(next) && saved;
}

function archiveCurrent() {
  if (!attempt || attempt.historyExcluded) return true;
  if (!archive) {
    warn("El historial no está disponible. No reemplazamos el bloque finalizado: revisá «Mi progreso» antes de iniciar otro.", new Error(archiveError));
    return false;
  }
  if (attempt.phase !== "results") {
    if (archive.entries.some(entry => entry.id === attempt.id)) return true;
    warn("Este bloque tuvo una entrega que no se pudo archivar. Volvé a finalizarlo antes de iniciar otro para conservar su resumen.", new Error("Falta el resumen finalizado."));
    return false;
  }
  return persistArchive(upsertHistory(archive, snapshotAttempt(bank, attempt)));
}

function loadArchive() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    archive = saved === null ? emptyHistory() : validateHistory(JSON.parse(saved));
  } catch (error) {
    archive = null;
    archiveError = error.message;
    warn("No se pudo leer el historial. No lo sobrescribimos; podés revisarlo en «Mi progreso». Tu intento actual se mantiene separado.", error);
  }
}

function showScreen(next) {
  screen = next;
  globalThis.history.replaceState(null, "", next === "progress" ? "#progreso" : location.pathname + location.search);
  render(true);
}

function button(action, text, style = "", extra = "") {
  return `<button type="button" data-action="${action}" class="${style}" ${extra}>${text}</button>`;
}

function badge(status) {
  return `<span class="badge ${status}">${labels[status]}</span>`;
}

function render(focus = false) {
  root.innerHTML = screen === "home" ? homeHTML() :
    screen === "progress" ? progressHTML(archive, { error: archiveError, status: historyStatus, hasAttempt: Boolean(attempt) }) :
    attempt.activeReinforcement || attempt.phase === "exercise" ? exerciseHTML() :
    attempt.phase === "review" ? reviewHTML() : resultsHTML();
  if (focus) {
    root.focus();
    root.scrollIntoView({ block: "start", behavior: "instant" });
  }
}

function homeHTML() {
  return `<section class="hero">
    <div><p class="eyebrow">Resolución de problemas matemáticos</p>
      <h1>Practicá hoy.<br><em>Confiá en lo que sabés.</em></h1>
      <p class="hero-description">Un espacio para pensar, probar y aprender. Prepará tu prueba con situaciones cotidianas, pistas cuando las necesites y explicaciones paso a paso.</p>
      <div class="hero-pills"><span>Sin registro</span><span>A tu ritmo</span><span>Intentos ilimitados</span></div>
    </div>
    <div class="notebook" aria-hidden="true"><div class="notebook-sheet">
      <p class="small-label">TU PRÓXIMO PASO EMPIEZA ACÁ</p><div class="scribble">¿Y si lo resolvemos?</div>
      <svg class="mini-chart" viewBox="0 0 300 100"><path d="M12 5V83H287" fill="none" stroke="#92a183"/><path d="m25 73 49-9 47-15 44-8 48-19 55-12" fill="none" stroke="#216347" stroke-width="3"/><g fill="#216347"><circle cx="25" cy="73" r="4"/><circle cx="121" cy="49" r="4"/><circle cx="213" cy="22" r="4"/><circle cx="268" cy="10" r="4"/></g></svg>
      <p>No se trata de hacerlo rápido.<br>Se trata de entender cómo.</p>
    </div></div>
  </section>
  <aside class="progress-invite"><div><h2>Tu práctica deja un recorrido</h2><p>${archive ? `${archive.entries.length} bloques finalizados guardados en este navegador.` : "El historial necesita atención; tu intento actual sigue disponible."}</p></div>${button("progress", "Ver mi progreso →")}</aside>
  <section aria-labelledby="modules-title"><div class="section-heading"><h2 id="modules-title">Elegí tu módulo de práctica</h2><span>6 actividades por intento · Nuevas combinaciones</span></div>
    <div class="modules">${bank.modules.map(module => {
      const ready = module.status === "ready";
      const count = module.slots.reduce((n, s) => n + s.questions.length, 0);
      const resumable = attempt?.moduleId === module.id;
      return `<article class="module-card ${ready ? "available" : ""}">
        <div class="module-top"><span class="module-letter">${e(module.id)}</span><span class="badge">${ready ? "Disponible" : "Próximamente"}</span></div>
        <h3>${e(module.title)}</h3><p>${e(module.description)}</p>
        <div class="module-meta">${ready ? `${count} ejercicios en el banco · 6 por intento` : "Banco de actividades pendiente"}</div>
        ${ready ? button(resumable ? "resume" : "new", resumable ? (attempt.phase === "results" && !attempt.activeReinforcement ? "Ver mis resultados →" : "Continuar mi práctica →") : "Comenzar módulo " + e(module.id) + " →", "primary", `data-module="${e(module.id)}"`) : '<button type="button" disabled>Aún no disponible</button>'}
        ${resumable ? button("new", "Iniciar otro intento", "text-button", `data-module="${e(module.id)}"`) : ""}
      </article>`;
    }).join("")}</div>
  </section>
  <aside class="intro-note"><span aria-hidden="true">✎</span><p><strong>Antes de empezar, tené a mano lápiz, papel y calculadora.</strong><br>Elegimos al azar un ejercicio de cada tipo. Podés volver atrás, pedir pistas y revisar tus respuestas antes de terminar. El progreso se guarda solo en este navegador.</p></aside>
  <aside class="intro-note"><p><strong>¿Qué se evalúa y cómo prepararse?</strong><br>Consultá nuestra síntesis de las orientaciones de ANEP y accedé al documento oficial completo.</p><a class="button" href="./orientaciones.html">Ver orientaciones →</a></aside>
  <p class="field-note">Material original de práctica inspirado en la dinámica de los ejemplos de Acredita EMS. No reproduce una prueba oficial ni predice su resultado.</p>`;
}

function promptHTML(q) {
  return q.prompt.map(p => `<p>${e(p)}</p>`).join("") + visualHTML(q.visual);
}

function answerHTML(q, state = attempt) {
  const value = state.answers[q.id];
  if (q.type === "select") {
    return `<fieldset><legend>Completá los dos espacios</legend><div class="select-row">${q.fields.map(f => `<label>${e(f.label)}<select data-field="${e(f.id)}" aria-label="${e(f.label)}"><option value="">Elegí una opción</option>${f.options.map(o => `<option value="${e(o.id)}" ${value?.[f.id] === o.id ? "selected" : ""}>${e(o.label)}</option>`).join("")}</select></label>`).join("")}</div></fieldset>`;
  }
  if (q.type === "choice") {
    return `<fieldset><legend>Seleccioná una sola opción</legend><div class="${q.options.some(o => o.faces) ? "illustrated-options" : ""}">${q.options.map((o, i) => `<label class="option"><input type="radio" name="answer" value="${e(o.id)}" ${value === o.id ? "checked" : ""}><span class="option-letter">${String.fromCharCode(65 + i)}</span>${o.faces ? boxSVG(o.faces) : ""}<span class="option-label">${e(o.label)}</span></label>`).join("")}</div></fieldset>`;
  }
  return `<label class="answer-label" for="written-answer">Escribí tu respuesta y explicá cómo lo pensaste</label>
    <textarea id="written-answer" maxlength="6000" placeholder="Mi conclusión es… porque…" aria-describedby="written-note">${e(value ?? "")}</textarea>
    <p id="written-note" class="field-note">Hasta 6000 caracteres. Esta respuesta no tiene corrección automática: podrás compararla con una solución orientativa y una lista de criterios.</p>`;
}

function feedbackHTML(q, state = attempt, reinforcement = false) {
  const status = grade(q, state.answers[q.id]);
  let content;
  if (status === "incorrect") {
    const guidance = errorGuidance(q, state.answers[q.id]);
    const index = reinforcement ? null : questionsFor(bank, attempt).findIndex(item => item.id === q.id);
    content = `<p>${math(guidance.reason)}</p>
      ${guidance.calculation ? `<h4>Para revisar el cálculo</h4><p class="calculation">${math(guidance.calculation)}</p>` : ""}
      <h4>La pregunta para hacerte</h4><blockquote class="reflection-question">${math(guidance.question)}</blockquote>
      <p class="field-note">La orientación parte de tu elección: no permite saber con certeza qué procedimiento hiciste. No mostramos la solución para que puedas revisar tu estrategia.</p>
      ${button("retry", "Volver a intentarlo", "", reinforcement ? "" : `data-index="${index}"`)}`;
  } else if (status === "manual") {
    content = `<p>Tu texto necesita una revisión personal: no podemos afirmar automáticamente si está bien o mal. Antes de mirar una solución, preguntate:</p>
      <ul>${q.reflectionQuestions.map(question => `<li>${math(question)}</li>`).join("")}</ul>
      <details class="model-answer" data-model-question="${e(q.id)}"><summary>Comparar con un modelo (muestra una posible solución)</summary>
        <p>${math(q.explanation)}</p><h4>Una respuesta posible</h4><p>${math(q.modelAnswer)}</p>${rubricHTML(q)}
      </details>`;
  } else if (status === "correct") {
    content = `<p>Respuesta verificada: <strong>${e(expectedAnswer(q))}</strong></p>
      <h4>Planteo y resolución completa</h4><p class="worked-solution">${math(q.explanation)}</p>
      ${reinforcement ? `<p class="transfer-note"><strong>${e(learningLabels[learningCategory(q, state)])} en este refuerzo.</strong> Este resultado describe una variante nueva, no demuestra por sí solo el dominio de todo el tema.</p>` : reinforcementOfferHTML(q)}`;
  } else {
    throw new Error("No se puede mostrar una devolución sin una respuesta completa.");
  }
  return `<section class="feedback ${status === "correct" ? "correct" : ""}" tabindex="-1" aria-label="Devolución">
    <h3>${status === "correct" ? "¡Bien resuelto!" : status === "manual" ? "Revisá tu argumento" : "Hay algo para mejorar"}</h3>
    ${content}
  </section>`;
}

function rubricHTML(q) {
  const checks = attempt.selfChecks[q.id] ?? q.rubric.map(() => false);
  return `<fieldset class="rubric"><legend>Autoevaluación personal (no suma al puntaje automático)</legend>${q.rubric.map((r, i) => `<label><input type="checkbox" data-rubric="${i}" data-question="${e(q.id)}" ${checks[i] ? "checked" : ""}><span>${math(r)}</span></label>`).join("")}</fieldset>`;
}

function learningRecordHTML(q, state = attempt) {
  const record = state.learning[q.id];
  const first = record?.submissions[0];
  if (!first) return `<p class="field-note learning-note">${state.trackingFromStart ? "Todavía no hay respuestas comprobadas. Editar, navegar o borrar no cuenta como intento." : "Este progreso es anterior al registro: no conocemos sus primeros intentos."}</p>`;
  return `<details class="learning-record"><summary>Tu recorrido: ${record.submissions.length} ${record.submissions.length === 1 ? "respuesta comprobada" : "respuestas comprobadas"}</summary>
    ${!state.trackingFromStart ? '<p class="field-note">Registro parcial: no podemos reconstruir lo ocurrido antes de esta actualización.</p>' : ""}
    <p><strong>Primera respuesta ${state.trackingFromStart ? "" : "registrada desde la actualización"}</strong></p>
    <p class="saved-answer">${e(answerText(q, first.answer))}</p>
    <p>${q.type === "open" ? "Entrega escrita: requiere autoevaluación." : `Resultado de esa respuesta: ${e(labels[first.outcome])}.`} Pistas consultadas antes: ${first.hintsUsed}.</p>
    <p class="field-note">${Math.max(0, record.submissions.length - 1)} reintentos con una respuesta diferente. Pistas vistas en total: ${state.hints[q.id] ?? 0}. Volver a comprobar la misma respuesta no suma intentos.</p>
  </details>`;
}

function reinforcementOfferHTML(q) {
  if (!reinforcementCandidates(bank, attempt, q.id).length) return "";
  const practice = attempt.reinforcements[q.id];
  let status = "Un problema del mismo tipo, con datos distintos. Intentá resolverlo antes de consultar sus pistas.";
  if (practice) {
    const variant = reinforcementQuestion(bank, attempt, q.id);
    status = practice.checked[variant.id] ? `Estado del refuerzo: ${grade(variant, practice.answers[variant.id]) === "correct" ? learningLabels[learningCategory(variant, practice)] : "para seguir practicando"}.` : "Tenés una variante de refuerzo en curso; podés retomarla sin perder tus respuestas.";
  }
  return `<aside class="reinforcement-offer"><h4>Ahora probá lo aprendido con otros datos</h4><p>${e(status)}</p>
    <p class="field-note">Es opcional y no cambia el puntaje ni las respuestas del bloque de seis.</p>
    ${button("reinforce", practice ? "Retomar mi refuerzo" : "Probar un ejercicio de refuerzo", "", `data-question="${e(q.id)}"`)}</aside>`;
}

function learningSummaryHTML(questions) {
  const counts = learningSummary(questions, attempt);
  return `<section class="learning-summary" aria-labelledby="learning-title"><h2 id="learning-title">Cómo llegaste a tus respuestas</h2>
    <p>El puntaje muestra tus respuestas actuales. Este recorrido distingue cómo resolviste las cinco actividades cerradas, sin descontar puntos por pedir ayuda.</p>
    <dl class="learning-grid">${Object.entries(counts).filter(([key, count]) => key !== "unknown" || count > 0).map(([key, count]) => `<div><dt>${e(learningLabels[key])}</dt><dd>${count}</dd></div>`).join("")}</dl>
    <p class="field-note">El primer intento es la primera respuesta completa que comprobaste o entregaste al finalizar. Las ediciones sin comprobar no cuentan. «Sin pistas» se refiere a las ayudas observables en esta app, no a ayuda externa.</p>
    ${!attempt.trackingFromStart ? '<p class="legacy-note">Conservamos tu progreso anterior, pero no inventamos su historia: el registro empezó después de que este intento ya existiera.</p>' : ""}
  </section>`;
}

function exerciseHTML() {
  const questions = questionsFor(bank, attempt);
  const { q, state, reinforcement } = activityContext();
  const count = state.hints[q.id] ?? 0;
  const index = reinforcement ? attempt.questionIds.indexOf(attempt.activeReinforcement) : attempt.index;
  const slot = bank.modules.find(m => m.id === attempt.moduleId).slots[index];
  return `<div class="exercise-top"><p class="eyebrow">Módulo ${e(attempt.moduleId)} · ${reinforcement ? "Refuerzo opcional" : "Tu práctica"}</p>${button(reinforcement ? "back-main" : "home", reinforcement ? "← Volver al bloque" : "← Módulos", "text-button")}
    ${reinforcement ? '<p class="field-note">Otro problema, la misma estrategia. Este ejercicio no ocupa una de las seis posiciones ni suma al puntaje.</p>' : `<div class="progress-layout"><span class="progress-label">Actividad ${attempt.index + 1} de 6</span>
    <ol class="steps" aria-label="Navegar por las actividades">${questions.map((item, i) => `<li>${button("goto", String(i + 1), isAnswered(item, attempt.answers[item.id]) ? "answered" : "", `data-index="${i}" aria-label="Actividad ${i + 1}${isAnswered(item, attempt.answers[item.id]) ? ", respondida" : ", sin responder"}" ${i === attempt.index ? 'aria-current="step"' : ""}`)}</li>`).join("")}</ol></div>
    `}
  </div>
  <div class="workspace"><div>
    <article class="question-card"><div class="question-heading"><p class="eyebrow">${e(slot.title)}</p><h1>${e(q.title)}</h1></div>
      <div class="question-body">${promptHTML(q)}</div>
      <div class="answer-area">${answerHTML(q, state)}
        <p id="answer-error" class="error-inline" role="alert" hidden></p>
        <div class="actions"><div class="actions-group">${button("check", q.type === "open" ? "Ver guía de respuesta" : "Comprobar respuesta")}${button("clear", "Borrar", "text-button")}</div></div>
        <div id="live-feedback">${state.checked[q.id] ? feedbackHTML(q, state, reinforcement) : ""}</div>
        ${learningRecordHTML(q, state)}
      </div>
    </article>
    <nav class="actions" aria-label="Avanzar en la práctica">${reinforcement ? button("back-main", "Volver al bloque principal", "primary") : `${button("previous", "← Anterior", "", attempt.index === 0 ? "disabled" : "")}${button("next", attempt.index === 5 ? "Revisar mis respuestas →" : "Siguiente →", "primary")}`}</nav>
  </div>
  <aside class="sidebar"><section class="side-card"><p class="eyebrow">Una ayuda, no la solución</p><h2>¿Necesitás una pista?</h2><p>Intentá resolverlo primero. Si te trabás, vamos paso a paso.</p>
    ${button("hint", count === q.hints.length ? "Ya viste todas las pistas" : `Ver pista ${count + 1} de ${q.hints.length}`, "", count === q.hints.length ? "disabled" : "")}
    <div aria-live="polite">${count ? `<ol>${q.hints.slice(0, count).map(h => `<li>${math(h)}</li>`).join("")}</ol>` : ""}</div>
  </section><section class="side-card neutral"><h2>Tomate tu tiempo</h2><p>No hay cronómetro. Usá papel y calculadora. Podés cambiar tu respuesta antes de finalizar.</p><p>Las pistas no descuentan puntos. El objetivo es aprender.</p></section></aside></div>`;
}

function answerText(q, answer = attempt.answers[q.id]) {
  if (!isAnswered(q, answer) && q.type !== "select") return "Sin responder";
  if (q.type === "select") return q.fields.map(f => `${f.label}: ${f.options.find(o => o.id === answer?.[f.id])?.label ?? "Sin responder"}`).join(" · ");
  if (q.type === "choice") return q.options.find(o => o.id === answer)?.label ?? "Sin responder";
  return answer;
}

function expectedAnswer(q) {
  if (q.type === "select") return q.fields.map(f => `${f.label}: ${f.options.find(o => o.id === f.answer).label}`).join(" · ");
  return q.options.find(o => o.id === q.answer).label;
}

function reviewHTML() {
  const questions = questionsFor(bank, attempt);
  const missing = questions.filter(q => !isAnswered(q, attempt.answers[q.id])).length;
  return `<header class="review-header"><p class="eyebrow">Módulo ${e(attempt.moduleId)} · Antes de terminar</p><h1>Una última mirada.</h1><p>Todavía podés volver a una actividad y cambiar tu respuesta. Al finalizar verás el desarrollo de los aciertos y preguntas para seguir pensando los errores, sin revelar sus soluciones.</p></header>
    ${missing ? `<aside class="intro-note" role="status"><p><strong>${missing} ${missing === 1 ? "actividad sin completar" : "actividades sin completar"}.</strong> Podés volver a responder o finalizar igualmente; las respuestas vacías quedarán como «Sin responder».</p></aside>` : ""}
    <div class="review-list">${questions.map((q, i) => `<article class="review-item"><div><h3>${i + 1}. ${e(q.title)}</h3><p>${e(q.type === "open" && isAnswered(q, attempt.answers[q.id]) ? "Respuesta escrita guardada" : answerText(q))}</p></div>${button("goto", "Revisar", "", `data-index="${i}"`)}</article>`).join("")}</div>
    <div class="actions">${button("goto", "← Volver a la práctica", "", 'data-index="5"')}${button("finalize", "Finalizar y ver resultados →", "primary")}</div>`;
}

function resultsHTML() {
  const questions = questionsFor(bank, attempt);
  const summary = summarize(questions, attempt.answers);
  return `<header class="review-header"><p class="eyebrow">Módulo ${e(attempt.moduleId)} · Práctica finalizada</p><h1>Cada intento te enseña algo.</h1><p>Revisá qué resolviste bien y qué podés seguir practicando. Este resultado es orientativo: no es una calificación oficial.</p></header>
    <section class="score-panel" aria-label="Resultado automático"><div class="score-number">${summary.correct}<span style="font-size:24px"> / ${summary.automaticTotal}</span></div><div><strong>Respuestas cerradas correctas</strong><p>${summary.incorrect} para repasar · ${questions.filter(q => q.type !== "open" && !isAnswered(q, attempt.answers[q.id])).length} sin responder</p><p>La actividad escrita se autoevalúa por separado. No está incluida en este puntaje.</p></div></section>
    ${learningSummaryHTML(questions)}
    <h2>Tu recorrido, actividad por actividad</h2><p class="field-note">Los aciertos muestran el planteo completo. Los errores te orientan sin revelar la solución y permiten volver a intentarlo.</p>
    ${questions.map((q, i) => `<details class="result-card" data-result-question="${e(q.id)}"><summary>${i + 1}. ${e(q.title)} ${badge(grade(q, attempt.answers[q.id]))}</summary>
      <div class="result-content">${promptHTML(q)}<h3>Tu respuesta</h3><p class="saved-answer">${e(answerText(q))}</p>
      ${isAnswered(q, attempt.answers[q.id]) ? feedbackHTML(q) : `<p>No hay una respuesta para revisar todavía. Probá un planteo antes de consultar una devolución.</p>${button("retry", "Intentar esta actividad", "", `data-index="${i}"`)}`}
      ${learningRecordHTML(q)}
      <p class="field-note">Pistas consultadas: ${attempt.hints[q.id] ?? 0} de ${q.hints.length}.</p></div></details>`).join("")}
    <div class="actions">${button("home", "← Volver a módulos")}${button("progress", "Ver mi progreso →")}${button("new", "Practicar otra combinación →", "primary", `data-module="${e(attempt.moduleId)}"`)}</div>`;
}

function moveTo(index) {
  attempt.activeReinforcement = null;
  attempt.index = index;
  attempt.phase = "exercise";
  save();
  render(true);
}

root.addEventListener("click", event => {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "home") { showScreen("home"); return; }
  if (action === "progress") { showScreen("progress"); return; }
  if (action === "clear-history") {
    if (!confirm("¿Borrar todos los resúmenes del historial de este navegador? No se pueden recuperar. Tu intento actual no se borra y no se volverá a archivar hasta que lo finalices nuevamente.")) return;
    if (attempt) {
      const previous = attempt.historyExcluded;
      attempt.historyExcluded = true;
      if (!persistAttempt()) { attempt.historyExcluded = previous; return; }
    }
    if (!persistArchive(emptyHistory())) return;
    archiveError = "";
    historyStatus = attempt ? "Historial borrado. Tu intento actual sigue disponible; solo se archivará de nuevo si volvés a finalizarlo." : "Historial borrado.";
    if (notice.textContent.includes("historial")) notice.hidden = true;
    showScreen("progress"); return;
  }
  if (action === "new") {
    if (attempt && !confirm("Al iniciar otro intento se reemplaza el progreso actual. Los bloques finalizados se conservan en «Mi progreso»; lo que no hayas finalizado se pierde. ¿Continuar?")) return;
    if (attempt && !attempt.historyExcluded && (attempt.phase === "results" || attempt.completedAt !== null) && !archiveCurrent()) return;
    attempt = createAttempt(bank.modules.find(m => m.id === target.dataset.module));
    save(); showScreen("attempt"); return;
  }
  if (action === "resume") { showScreen("attempt"); return; }
  if (!attempt) return;
  if (action === "reinforce") {
    startReinforcement(bank, attempt, target.dataset.question);
    save(); render(true); return;
  }
  if (action === "back-main") {
    attempt.activeReinforcement = null;
    save(); render(true); return;
  }
  if (action === "retry") {
    if (attempt.activeReinforcement) {
      const { q, state } = activityContext();
      delete state.checked[q.id];
      save(); render(true);
    } else {
      const index = Number(target.dataset.index);
      delete attempt.checked[attempt.questionIds[index]];
      moveTo(index);
    }
    root.querySelector(".answer-area input, .answer-area select, .answer-area textarea")?.focus();
    return;
  }
  if (action === "goto") { moveTo(Number(target.dataset.index)); return; }
  if (action === "previous") { if (attempt.index > 0) moveTo(attempt.index - 1); return; }
  if (action === "next") {
    if (attempt.index < 5) moveTo(attempt.index + 1);
    else { attempt.phase = "review"; save(); render(true); }
    return;
  }
  if (action === "finalize") {
    for (const q of questionsFor(bank, attempt)) if (isAnswered(q, attempt.answers[q.id])) recordSubmission(q, attempt);
    attempt.phase = "results";
    attempt.completedAt ??= new Date().toISOString();
    attempt.historyExcluded = false;
    save(); archiveCurrent(); render(true); return;
  }
  const { q, state } = activityContext();
  if (action === "hint") {
    state.hints[q.id] = Math.min(q.hints.length, (state.hints[q.id] ?? 0) + 1);
    save(); render();
    const hint = root.querySelector(".side-card ol li:last-child");
    hint.tabIndex = -1;
    hint.focus();
  }
  if (action === "clear") {
    delete state.answers[q.id]; delete state.checked[q.id]; delete state.selfChecks[q.id];
    save(); render();
    root.querySelector(".answer-area input, .answer-area select, .answer-area textarea")?.focus();
  }
  if (action === "check") {
    if (!isAnswered(q, state.answers[q.id])) {
      const error = root.querySelector("#answer-error");
      error.textContent = q.type === "select" ? "Completá los dos precios para comprobar la respuesta." : "Escribí o seleccioná una respuesta antes de consultar la devolución.";
      error.hidden = false;
      root.querySelector(".answer-area input, .answer-area select, .answer-area textarea")?.focus();
      return;
    }
    recordSubmission(q, state, true);
    state.checked[q.id] = true; save(); render();
    root.querySelector(".feedback").focus();
  }
});

function recordAnswer(target) {
  const { q, state, reinforcement } = activityContext();
  if (target.matches("select[data-field]")) {
    state.answers[q.id] = { ...state.answers[q.id], [target.dataset.field]: target.value };
  } else if (target.matches('input[name="answer"]:checked, textarea')) {
    state.answers[q.id] = target.value;
  } else return;
  delete state.checked[q.id]; delete state.selfChecks[q.id];
  save();
  root.querySelector("#live-feedback").innerHTML = "";
  root.querySelector("#answer-error").hidden = true;
  if (!reinforcement) {
    const step = root.querySelector(`.steps button[data-index="${attempt.index}"]`);
    const answered = isAnswered(q, state.answers[q.id]);
    step.classList.toggle("answered", answered);
    step.setAttribute("aria-label", `Actividad ${attempt.index + 1}, ${answered ? "respondida" : "sin responder"}`);
  }
}

root.addEventListener("toggle", event => {
  const details = event.target;
  if (!attempt || screen === "home" || !details.isConnected || !details.open) return;
  const id = details.dataset.modelQuestion ?? details.dataset.resultQuestion;
  if (!id) return;
  const q = questionsFor(bank, attempt).find(item => item.id === id);
  if (!isAnswered(q, attempt.answers[q.id])) return;
  if (details.dataset.modelQuestion) markModelViewed(q, attempt);
  else markFeedback(q, attempt);
  save();
}, true);

root.addEventListener("change", event => {
  const target = event.target;
  if (!attempt) return;
  if (target.matches("input[data-rubric]")) {
    const q = questionsFor(bank, attempt).find(item => item.id === target.dataset.question);
    const checks = attempt.selfChecks[q.id] ?? q.rubric.map(() => false);
    checks[Number(target.dataset.rubric)] = target.checked;
    attempt.selfChecks[q.id] = checks;
    save();
  } else if (!target.matches("textarea")) recordAnswer(target);
});

root.addEventListener("input", event => {
  if (attempt && event.target.matches("textarea")) recordAnswer(event.target);
});

async function start() {
  try {
    const response = await fetch(new URL("../data/activities.json", import.meta.url));
    if (!response.ok) throw new Error(`No se pudo cargar el banco (HTTP ${response.status}).`);
    bank = validateBank(await response.json());
    await initializeMath(warn);
    loadArchive();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) attempt = restoreAttempt(bank, JSON.parse(saved));
    } catch (error) {
      warn("No se pudo recuperar el progreso anterior. Podés comenzar un intento nuevo; el guardado previo se reemplazará al hacerlo.", error);
    }
    if (attempt && save() && archive && !attempt.historyExcluded && attempt.phase === "results" &&
        !archive.entries.some(entry => entry.id === attempt.id)) archiveCurrent();
    screen = location.hash === "#progreso" ? "progress" : "home";
    render();
  } catch (error) {
    console.error("No se pudo iniciar la aplicación.", error);
    root.innerHTML = `<section class="fatal" role="alert"><h1>No pudimos cargar las actividades</h1><p>${e(error.message)}</p><p>Si abriste el archivo directamente, usá un servidor local o publicá el proyecto en GitHub Pages. Comprobá también que el banco JSON exista y tenga un formato válido.</p><a class="button primary" href="./index.html">Volver a intentar</a></section>`;
  } finally {
    root.setAttribute("aria-busy", "false");
  }
}

addEventListener("hashchange", () => {
  if (!bank) return;
  screen = location.hash === "#progreso" ? "progress" : "home";
  render(true);
});

start();
