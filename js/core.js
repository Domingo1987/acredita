export const STORAGE_KEY = "matematica-practica-v1";
export const SLOT_TYPES = ["select", "choice", "choice", "choice", "choice", "open"];

export function validateBank(bank) {
  const fail = (message) => { throw new Error(`Banco de actividades: ${message}`); };
  if (bank?.version !== 1 || !Array.isArray(bank.modules)) fail("versión o módulos inválidos.");
  const moduleIds = new Set();
  const questionIds = new Set();
  for (const module of bank.modules) {
    if (!module.id || moduleIds.has(module.id) || !module.title) fail("módulo inválido o repetido.");
    moduleIds.add(module.id);
    if (!["ready", "pending"].includes(module.status)) fail(`estado inválido en ${module.id}.`);
    if (!Array.isArray(module.slots)) fail(`faltan posiciones en ${module.id}.`);
    if (module.status === "pending") {
      if (module.slots.length) fail(`el módulo pendiente ${module.id} debe tener posiciones vacías.`);
      continue;
    }
    if (module.slots.length !== 6) fail(`${module.id} debe tener seis posiciones.`);
    module.slots.forEach((slot, index) => {
      if (!slot.title || !Array.isArray(slot.questions) || !slot.questions.length) fail(`posición ${index + 1} vacía.`);
      for (const q of slot.questions) {
        if (!q.id || questionIds.has(q.id)) fail("identificador de actividad vacío o repetido.");
        questionIds.add(q.id);
        if (q.type !== SLOT_TYPES[index]) fail(`tipo incorrecto en ${q.id}.`);
        if (!q.title || !Array.isArray(q.prompt) || !q.prompt.length || q.prompt.some(p => typeof p !== "string") ||
            !Array.isArray(q.hints) || !q.hints.length || q.hints.some(h => typeof h !== "string") || !q.explanation) fail(`contenido incompleto en ${q.id}.`);
        const validOptions = (options, answer) => Array.isArray(options) && options.length >= 2 &&
          options.every(o => typeof o.id === "string" && typeof o.label === "string") &&
          new Set(options.map(o => o.id)).size === options.length && options.some(o => o.id === answer);
        if (q.type === "choice" && (!validOptions(q.options, q.answer) || q.options.length !== 4)) fail(`opciones inválidas en ${q.id}.`);
        if (q.type === "select" && (!Array.isArray(q.fields) || q.fields.length !== 2 ||
            new Set(q.fields.map(f => f.id)).size !== q.fields.length ||
            q.fields.some(f => !f.id || !f.label || !validOptions(f.options, f.answer)))) fail(`campos inválidos en ${q.id}.`);
        if (q.type === "open" && (!q.modelAnswer || !Array.isArray(q.rubric) || !q.rubric.length || q.rubric.some(r => typeof r !== "string"))) fail(`rúbrica incompleta en ${q.id}.`);
        if (q.visual) {
          const v = q.visual;
          if (!["net", "chart"].includes(v.kind)) fail(`ilustración desconocida en ${q.id}.`);
          if (v.kind === "net" && (![v.base, v.wall, v.height].every(n => Number.isFinite(n) && n > 0) ||
              !Array.isArray(v.symbols) || v.symbols.length !== 4 || v.symbols.some(s => typeof s !== "string"))) fail(`desarrollo inválido en ${q.id}.`);
          if (v.kind === "chart" && (!Number.isInteger(v.baseYear) || !v.unit || !Array.isArray(v.series) || v.series.length !== 2 ||
              v.series.some(s => !s.label || !Number.isFinite(s.slope) || !Number.isFinite(s.intercept)))) fail(`gráfica inválida en ${q.id}.`);
        }
        if (q.options?.some(o => o.faces && (!Array.isArray(o.faces) || o.faces.length !== 2 || o.faces.some(s => typeof s !== "string")))) fail(`caras inválidas en ${q.id}.`);
      }
    });
  }
  if (!bank.modules.some(m => m.status === "ready")) fail("no hay módulos disponibles.");
  return bank;
}

export function createAttempt(module, random = Math.random) {
  if (module.status !== "ready") throw new Error("Este módulo todavía no está disponible.");
  return {
    moduleId: module.id,
    questionIds: module.slots.map(slot => slot.questions[Math.floor(random() * slot.questions.length)].id),
    answers: {}, hints: {}, checked: {}, selfChecks: {}, index: 0, phase: "exercise"
  };
}

export function questionsFor(bank, attempt) {
  const module = bank.modules.find(m => m.id === attempt.moduleId);
  return attempt.questionIds.map((id, i) => module.slots[i].questions.find(q => q.id === id));
}

export function isAnswered(question, answer) {
  if (question.type === "select") return question.fields.every(f => f.options.some(o => o.id === answer?.[f.id]));
  if (question.type === "choice") return question.options.some(o => o.id === answer);
  return typeof answer === "string" && answer.trim().length > 0;
}

export function grade(question, answer) {
  if (!isAnswered(question, answer)) return "unanswered";
  if (question.type === "open") return "manual";
  if (question.type === "select") return question.fields.every(f => answer[f.id] === f.answer) ? "correct" : "incorrect";
  return answer === question.answer ? "correct" : "incorrect";
}

export function summarize(questions, answers) {
  const counts = { correct: 0, incorrect: 0, unanswered: 0, manual: 0, automaticTotal: 0 };
  for (const q of questions) {
    counts[grade(q, answers[q.id])] += 1;
    if (q.type !== "open") counts.automaticTotal += 1;
  }
  return counts;
}

export function restoreAttempt(bank, value) {
  if (!value || !["exercise", "review", "results"].includes(value.phase) ||
      !Number.isInteger(value.index) || value.index < 0 || value.index > 5) throw new Error("El progreso guardado no tiene un formato válido.");
  const module = bank.modules.find(m => m.id === value.moduleId && m.status === "ready");
  if (!module || !Array.isArray(value.questionIds) || value.questionIds.length !== 6 ||
      value.questionIds.some((id, i) => !module.slots[i].questions.some(q => q.id === id))) throw new Error("El progreso guardado ya no coincide con el banco actual.");
  for (const key of ["answers", "hints", "checked", "selfChecks"]) {
    if (!value[key] || typeof value[key] !== "object" || Array.isArray(value[key])) throw new Error("El progreso guardado está incompleto.");
  }
  for (const q of questionsFor(bank, value)) {
    const answer = value.answers[q.id];
    if (answer !== undefined) {
      if (q.type === "open" && (typeof answer !== "string" || answer.length > 6000)) throw new Error("Respuesta escrita guardada inválida.");
      if (q.type === "choice" && answer !== "" && !q.options.some(o => o.id === answer)) throw new Error("Opción guardada inválida.");
      if (q.type === "select" && (!answer || typeof answer !== "object" || Array.isArray(answer) ||
          Object.keys(answer).some(key => !q.fields.some(f => f.id === key)) ||
          q.fields.some(f => answer[f.id] !== undefined && answer[f.id] !== "" && !f.options.some(o => o.id === answer[f.id])))) throw new Error("Selección guardada inválida.");
    }
    if (value.hints[q.id] !== undefined && (!Number.isInteger(value.hints[q.id]) || value.hints[q.id] < 0 || value.hints[q.id] > q.hints.length)) throw new Error("Pistas guardadas inválidas.");
    if (value.checked[q.id] !== undefined && typeof value.checked[q.id] !== "boolean") throw new Error("Revisión guardada inválida.");
    if (value.selfChecks[q.id] !== undefined && (q.type !== "open" || !Array.isArray(value.selfChecks[q.id]) ||
        value.selfChecks[q.id].length !== q.rubric.length || value.selfChecks[q.id].some(v => typeof v !== "boolean"))) throw new Error("Autoevaluación guardada inválida.");
  }
  return value;
}
