import { STORAGE_KEY, validateBank, createAttempt, questionsFor, isAnswered, grade, summarize, restoreAttempt } from "./core.js";
import { escapeHTML as e, visualHTML, boxSVG } from "./visuals.js";

const root = document.querySelector("#app");
const notice = document.querySelector("#notice");
const labels = { correct: "Correcta", incorrect: "Para repasar", unanswered: "Sin responder", manual: "Autoevaluación" };
let bank;
let attempt = null;
let screen = "home";

function warn(message, error) {
  console.error(message, error);
  notice.textContent = message;
  notice.hidden = false;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  } catch (error) {
    warn("No se pudo guardar el progreso en este navegador. Podés seguir practicando, pero al cerrar o recargar se perderán los cambios no guardados.", error);
  }
}

function button(action, text, style = "", extra = "") {
  return `<button type="button" data-action="${action}" class="${style}" ${extra}>${text}</button>`;
}

function badge(status) {
  return `<span class="badge ${status}">${labels[status]}</span>`;
}

function render(focus = false) {
  root.innerHTML = screen === "home" ? homeHTML() :
    attempt.phase === "exercise" ? exerciseHTML() :
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
  <section aria-labelledby="modules-title"><div class="section-heading"><h2 id="modules-title">Elegí tu módulo de práctica</h2><span>6 actividades por intento · Nuevas combinaciones</span></div>
    <div class="modules">${bank.modules.map(module => {
      const ready = module.status === "ready";
      const count = module.slots.reduce((n, s) => n + s.questions.length, 0);
      const resumable = attempt?.moduleId === module.id;
      return `<article class="module-card ${ready ? "available" : ""}">
        <div class="module-top"><span class="module-letter">${e(module.id)}</span><span class="badge">${ready ? "Disponible" : "Próximamente"}</span></div>
        <h3>${e(module.title)}</h3><p>${e(module.description)}</p>
        <div class="module-meta">${ready ? `${count} ejercicios en el banco · 6 por intento` : "Banco de actividades pendiente"}</div>
        ${ready ? button(resumable ? "resume" : "new", resumable ? (attempt.phase === "results" ? "Ver mis resultados →" : "Continuar mi práctica →") : "Comenzar módulo " + e(module.id) + " →", "primary", `data-module="${e(module.id)}"`) : '<button type="button" disabled>Aún no disponible</button>'}
        ${resumable ? button("new", "Iniciar otro intento", "text-button", `data-module="${e(module.id)}"`) : ""}
      </article>`;
    }).join("")}</div>
  </section>
  <aside class="intro-note"><span aria-hidden="true">✎</span><p><strong>Antes de empezar, tené a mano lápiz, papel y calculadora.</strong><br>Elegimos al azar un ejercicio de cada tipo. Podés volver atrás, pedir pistas y revisar tus respuestas antes de terminar. El progreso se guarda solo en este navegador.</p></aside>
  <p class="field-note">Material original de práctica inspirado en la dinámica de los ejemplos de Acredita EMS. No reproduce una prueba oficial ni predice su resultado.</p>`;
}

function promptHTML(q) {
  return q.prompt.map(p => `<p>${e(p)}</p>`).join("") + visualHTML(q.visual);
}

function answerHTML(q) {
  const value = attempt.answers[q.id];
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

function feedbackHTML(q) {
  const status = grade(q, attempt.answers[q.id]);
  return `<section class="feedback ${status === "correct" ? "correct" : ""}" tabindex="-1" aria-label="Devolución">
    <h3>${status === "correct" ? "¡Bien resuelto!" : status === "manual" ? "Compará y autoevaluá tu explicación" : "Hay algo para revisar"}</h3>
    ${status === "incorrect" ? `<p>Respuesta esperada: <strong>${e(expectedAnswer(q))}</strong></p>` : ""}
    <p>${e(q.explanation)}</p>
    ${q.type === "open" ? `<p><strong>Una respuesta posible</strong></p><p>${e(q.modelAnswer)}</p>${rubricHTML(q)}` : ""}
  </section>`;
}

function rubricHTML(q) {
  const checks = attempt.selfChecks[q.id] ?? q.rubric.map(() => false);
  return `<fieldset class="rubric"><legend>Autoevaluación personal (no suma al puntaje automático)</legend>${q.rubric.map((r, i) => `<label><input type="checkbox" data-rubric="${i}" data-question="${e(q.id)}" ${checks[i] ? "checked" : ""}>${e(r)}</label>`).join("")}</fieldset>`;
}

function exerciseHTML() {
  const questions = questionsFor(bank, attempt);
  const q = questions[attempt.index];
  const count = attempt.hints[q.id] ?? 0;
  const slot = bank.modules.find(m => m.id === attempt.moduleId).slots[attempt.index];
  return `<div class="exercise-top"><p class="eyebrow">Módulo ${e(attempt.moduleId)} · Tu práctica</p>${button("home", "← Módulos", "text-button")}
    <div class="progress-layout"><span class="progress-label">Actividad ${attempt.index + 1} de 6</span>
    <ol class="steps" aria-label="Navegar por las actividades">${questions.map((item, i) => `<li>${button("goto", String(i + 1), isAnswered(item, attempt.answers[item.id]) ? "answered" : "", `data-index="${i}" aria-label="Actividad ${i + 1}${isAnswered(item, attempt.answers[item.id]) ? ", respondida" : ", sin responder"}" ${i === attempt.index ? 'aria-current="step"' : ""}`)}</li>`).join("")}</ol></div>
  </div>
  <div class="workspace"><div>
    <article class="question-card"><div class="question-heading"><p class="eyebrow">${e(slot.title)}</p><h1>${e(q.title)}</h1></div>
      <div class="question-body">${promptHTML(q)}</div>
      <div class="answer-area">${answerHTML(q)}
        <p id="answer-error" class="error-inline" role="alert" hidden></p>
        <div class="actions"><div class="actions-group">${button("check", q.type === "open" ? "Ver guía de respuesta" : "Comprobar respuesta")}${button("clear", "Borrar", "text-button")}</div></div>
        <div id="live-feedback">${attempt.checked[q.id] ? feedbackHTML(q) : ""}</div>
      </div>
    </article>
    <nav class="actions" aria-label="Avanzar en la práctica">${button("previous", "← Anterior", "", attempt.index === 0 ? "disabled" : "")}${button("next", attempt.index === 5 ? "Revisar mis respuestas →" : "Siguiente →", "primary")}</nav>
  </div>
  <aside class="sidebar"><section class="side-card"><p class="eyebrow">Una ayuda, no la solución</p><h2>¿Necesitás una pista?</h2><p>Intentá resolverlo primero. Si te trabás, vamos paso a paso.</p>
    ${button("hint", count === q.hints.length ? "Ya viste todas las pistas" : `Ver pista ${count + 1} de ${q.hints.length}`, "", count === q.hints.length ? "disabled" : "")}
    <div aria-live="polite">${count ? `<ol>${q.hints.slice(0, count).map(h => `<li>${e(h)}</li>`).join("")}</ol>` : ""}</div>
  </section><section class="side-card neutral"><h2>Tomate tu tiempo</h2><p>No hay cronómetro. Usá papel y calculadora. Podés cambiar tu respuesta antes de finalizar.</p><p>Las pistas no descuentan puntos. El objetivo es aprender.</p></section></aside></div>`;
}

function answerText(q) {
  const answer = attempt.answers[q.id];
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
  return `<header class="review-header"><p class="eyebrow">Módulo ${e(attempt.moduleId)} · Antes de terminar</p><h1>Una última mirada.</h1><p>Todavía podés volver a una actividad y cambiar tu respuesta. Al finalizar vas a ver las soluciones y la devolución completa.</p></header>
    ${missing ? `<aside class="intro-note" role="status"><p><strong>${missing} ${missing === 1 ? "actividad sin completar" : "actividades sin completar"}.</strong> Podés volver a responder o finalizar igualmente; las respuestas vacías quedarán como «Sin responder».</p></aside>` : ""}
    <div class="review-list">${questions.map((q, i) => `<article class="review-item"><div><h3>${i + 1}. ${e(q.title)}</h3><p>${e(q.type === "open" && isAnswered(q, attempt.answers[q.id]) ? "Respuesta escrita guardada" : answerText(q))}</p></div>${button("goto", "Revisar", "", `data-index="${i}"`)}</article>`).join("")}</div>
    <div class="actions">${button("goto", "← Volver a la práctica", "", 'data-index="5"')}${button("finalize", "Finalizar y ver resultados →", "primary")}</div>`;
}

function resultsHTML() {
  const questions = questionsFor(bank, attempt);
  const summary = summarize(questions, attempt.answers);
  return `<header class="review-header"><p class="eyebrow">Módulo ${e(attempt.moduleId)} · Práctica finalizada</p><h1>Cada intento te enseña algo.</h1><p>Revisá qué resolviste bien y qué podés seguir practicando. Este resultado es orientativo: no es una calificación oficial.</p></header>
    <section class="score-panel" aria-label="Resultado automático"><div class="score-number">${summary.correct}<span style="font-size:24px"> / ${summary.automaticTotal}</span></div><div><strong>Respuestas cerradas correctas</strong><p>${summary.incorrect} para repasar · ${questions.filter(q => q.type !== "open" && !isAnswered(q, attempt.answers[q.id])).length} sin responder</p><p>La actividad escrita se autoevalúa por separado. No está incluida en este puntaje.</p></div></section>
    <h2>Tu recorrido, actividad por actividad</h2><p class="field-note">Abrí cada actividad para ver tu respuesta, la solución y la explicación.</p>
    ${questions.map((q, i) => `<details class="result-card"><summary>${i + 1}. ${e(q.title)} ${badge(grade(q, attempt.answers[q.id]))}</summary>
      <div class="result-content">${promptHTML(q)}<h3>Tu respuesta</h3><p class="saved-answer">${e(answerText(q))}</p>
      ${q.type !== "open" ? `<h3>Respuesta esperada</h3><p>${e(expectedAnswer(q))}</p>` : ""}
      <p>${e(q.explanation)}</p>${q.type === "open" ? `<h3>Una respuesta posible</h3><p>${e(q.modelAnswer)}</p>${rubricHTML(q)}` : ""}
      <p class="field-note">Pistas consultadas: ${attempt.hints[q.id] ?? 0} de ${q.hints.length}.</p></div></details>`).join("")}
    <div class="actions">${button("home", "← Volver a módulos")}${button("new", "Practicar otra combinación →", "primary", `data-module="${e(attempt.moduleId)}"`)}</div>`;
}

function moveTo(index) {
  attempt.index = index;
  attempt.phase = "exercise";
  save();
  render(true);
}

root.addEventListener("click", event => {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "home") { screen = "home"; render(true); return; }
  if (action === "new") {
    if (attempt && !confirm("Al iniciar otro intento se reemplazará el progreso y el resultado anterior guardados en este navegador. ¿Continuar?")) return;
    attempt = createAttempt(bank.modules.find(m => m.id === target.dataset.module));
    screen = "attempt"; save(); render(true); return;
  }
  if (action === "resume") { screen = "attempt"; render(true); return; }
  if (!attempt) return;
  if (action === "goto") { moveTo(Number(target.dataset.index)); return; }
  if (action === "previous") { if (attempt.index > 0) moveTo(attempt.index - 1); return; }
  if (action === "next") {
    if (attempt.index < 5) moveTo(attempt.index + 1);
    else { attempt.phase = "review"; save(); render(true); }
    return;
  }
  if (action === "finalize") { attempt.phase = "results"; save(); render(true); return; }
  const q = questionsFor(bank, attempt)[attempt.index];
  if (action === "hint") {
    attempt.hints[q.id] = Math.min(q.hints.length, (attempt.hints[q.id] ?? 0) + 1);
    save(); render();
    const hint = root.querySelector(".side-card ol li:last-child");
    hint.tabIndex = -1;
    hint.focus();
  }
  if (action === "clear") {
    delete attempt.answers[q.id]; delete attempt.checked[q.id]; delete attempt.selfChecks[q.id];
    save(); render();
    root.querySelector(".answer-area input, .answer-area select, .answer-area textarea")?.focus();
  }
  if (action === "check") {
    if (!isAnswered(q, attempt.answers[q.id])) {
      const error = root.querySelector("#answer-error");
      error.textContent = q.type === "select" ? "Completá los dos precios para comprobar la respuesta." : "Escribí o seleccioná una respuesta antes de consultar la devolución.";
      error.hidden = false;
      root.querySelector(".answer-area input, .answer-area select, .answer-area textarea")?.focus();
      return;
    }
    attempt.checked[q.id] = true; save(); render();
    root.querySelector(".feedback").focus();
  }
});

function recordAnswer(target) {
  const q = questionsFor(bank, attempt)[attempt.index];
  if (target.matches("select[data-field]")) {
    attempt.answers[q.id] = { ...attempt.answers[q.id], [target.dataset.field]: target.value };
  } else if (target.matches('input[name="answer"]:checked, textarea')) {
    attempt.answers[q.id] = target.value;
  } else return;
  delete attempt.checked[q.id]; delete attempt.selfChecks[q.id];
  save();
  root.querySelector("#live-feedback").innerHTML = "";
  root.querySelector("#answer-error").hidden = true;
  const step = root.querySelector(`.steps button[data-index="${attempt.index}"]`);
  const answered = isAnswered(q, attempt.answers[q.id]);
  step.classList.toggle("answered", answered);
  step.setAttribute("aria-label", `Actividad ${attempt.index + 1}, ${answered ? "respondida" : "sin responder"}`);
}

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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) attempt = restoreAttempt(bank, JSON.parse(saved));
    } catch (error) {
      warn("No se pudo recuperar el progreso anterior. Podés comenzar un intento nuevo; el guardado previo se reemplazará al hacerlo.", error);
    }
    render();
  } catch (error) {
    console.error("No se pudo iniciar la aplicación.", error);
    root.innerHTML = `<section class="fatal" role="alert"><h1>No pudimos cargar las actividades</h1><p>${e(error.message)}</p><p>Si abriste el archivo directamente, usá un servidor local o publicá el proyecto en GitHub Pages. Comprobá también que el banco JSON exista y tenga un formato válido.</p><a class="button primary" href="./index.html">Volver a intentar</a></section>`;
  } finally {
    root.setAttribute("aria-busy", "false");
  }
}

start();
