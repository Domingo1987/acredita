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
        const validGuidance = value => value && typeof value.reason === "string" && value.reason.trim() &&
          typeof value.question === "string" && value.question.trim() &&
          (value.calculation === undefined || (typeof value.calculation === "string" && value.calculation.trim()));
        if (q.type === "choice" && (!q.errorFeedback || Object.keys(q.errorFeedback).length !== q.options.length - 1 ||
            q.options.some(o => o.id !== q.answer && !validGuidance(q.errorFeedback[o.id])) ||
            Object.hasOwn(q.errorFeedback, q.answer))) fail(`falta orientación para cada error en ${q.id}.`);
        if (q.type === "select" && (!validGuidance(q.errorFeedback) ||
            q.fields.some(f => f.options.some(o => !o.id.trim() || !Number.isFinite(Number(o.id)))) ||
            !Array.isArray(q.verification) || q.verification.length !== 2 ||
            q.verification.some(v => !Array.isArray(v.quantities) || v.quantities.length !== q.fields.length ||
              v.quantities.some(n => !Number.isFinite(n) || n <= 0) || !Number.isFinite(v.total) || v.total <= 0))) fail(`comprobación de precios inválida en ${q.id}.`);
        if (q.type === "open" && (!q.modelAnswer || !Array.isArray(q.rubric) || !q.rubric.length || q.rubric.some(r => typeof r !== "string"))) fail(`rúbrica incompleta en ${q.id}.`);
        if (q.type === "open" && (!Array.isArray(q.reflectionQuestions) || !q.reflectionQuestions.length ||
            q.reflectionQuestions.some(r => typeof r !== "string" || !r.trim()))) fail(`faltan preguntas de reflexión en ${q.id}.`);
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

function createResponseState() {
  return { answers: {}, hints: {}, checked: {}, selfChecks: {}, learning: {}, trackingFromStart: true };
}

export function createAttempt(module, random = Math.random) {
  if (module.status !== "ready") throw new Error("Este módulo todavía no está disponible.");
  return {
    moduleId: module.id,
    questionIds: module.slots.map(slot => slot.questions[Math.floor(random() * slot.questions.length)].id),
    ...createResponseState(), reinforcements: {}, activeReinforcement: null, index: 0, phase: "exercise"
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

export function errorGuidance(question, answer) {
  if (grade(question, answer) !== "incorrect") throw new Error("La orientación de error requiere una respuesta incorrecta completa.");
  if (question.type === "choice") return question.errorFeedback[answer];
  const format = value => new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 }).format(value);
  const latex = value => new Intl.NumberFormat("es-UY", { useGrouping: false, maximumFractionDigits: 2 }).format(value).replace(",", "{,}");
  const prices = question.fields.map(f => Number(answer[f.id]));
  const checks = question.verification.map((v, i) => {
    const total = v.quantities.reduce((sum, quantity, index) => sum + quantity * prices[index], 0);
    const expression = v.quantities.map((quantity, index) => `${latex(quantity)} \\times ${latex(prices[index])}`).join(" + ");
    return `Compra ${i + 1}: \\[${expression} = ${latex(total)}\\] El enunciado indica $${format(v.total)}: ${Math.abs(total - v.total) < 0.005 ? "coincide" : "no coincide"}.`;
  });
  return { ...question.errorFeedback, calculation: checks.join("\n") };
}

export function summarize(questions, answers) {
  const counts = { correct: 0, incorrect: 0, unanswered: 0, manual: 0, automaticTotal: 0 };
  for (const q of questions) {
    counts[grade(q, answers[q.id])] += 1;
    if (q.type !== "open") counts.automaticTotal += 1;
  }
  return counts;
}

function learningRecord(question, state) {
  return state.learning[question.id] ??= { submissions: [], feedbackSeen: false, solutionSeen: false };
}

export function markFeedback(question, state) {
  const outcome = grade(question, state.answers[question.id]);
  if (outcome === "unanswered") throw new Error("No hay una respuesta completa cuya devolución se pueda consultar.");
  const record = learningRecord(question, state);
  record.feedbackSeen = true;
  if (outcome === "correct") record.solutionSeen = true;
}

export function markModelViewed(question, state) {
  if (question.type !== "open" || !isAnswered(question, state.answers[question.id])) throw new Error("La comparación requiere una respuesta escrita completa.");
  const record = learningRecord(question, state);
  record.feedbackSeen = true;
  record.solutionSeen = true;
}

export function recordSubmission(question, state, showFeedback = false) {
  const answer = state.answers[question.id];
  if (!isAnswered(question, answer)) throw new Error("No se puede registrar una respuesta incompleta.");
  const snapshot = question.type === "select" ? Object.fromEntries(question.fields.map(f => [f.id, answer[f.id]])) :
    question.type === "open" ? answer.trim() : answer;
  const record = learningRecord(question, state);
  const last = record.submissions.at(-1);
  if (!last || JSON.stringify(last.answer) !== JSON.stringify(snapshot)) {
    record.submissions.push({
      answer: snapshot, outcome: grade(question, snapshot), hintsUsed: state.hints[question.id] ?? 0,
      afterFeedback: record.feedbackSeen, afterSolution: record.solutionSeen
    });
  }
  if (showFeedback) markFeedback(question, state);
  return record;
}

export function learningCategory(question, state) {
  if (question.type === "open") return "manual";
  if (grade(question, state.answers[question.id]) !== "correct") return "toPractice";
  const first = state.learning[question.id]?.submissions[0];
  if (!state.trackingFromStart || !first) return "unknown";
  if (first.outcome !== "correct" || first.afterFeedback || first.afterSolution) return "afterReview";
  return first.hintsUsed > 0 ? "withHints" : "independent";
}

export function learningSummary(questions, state) {
  const counts = { independent: 0, withHints: 0, afterReview: 0, toPractice: 0, unknown: 0 };
  for (const q of questions.filter(item => item.type !== "open")) counts[learningCategory(q, state)] += 1;
  return counts;
}

export function reinforcementCandidates(bank, attempt, questionId) {
  const index = attempt.questionIds.indexOf(questionId);
  if (index < 0) throw new Error("La actividad de origen no pertenece a este intento.");
  const question = questionsFor(bank, attempt)[index];
  if (question.type === "open" || grade(question, attempt.answers[questionId]) !== "correct" ||
      !attempt.learning[questionId]?.submissions.some(s => s.outcome === "incorrect")) return [];
  return bank.modules.find(m => m.id === attempt.moduleId).slots[index].questions.filter(q => q.id !== questionId);
}

export function startReinforcement(bank, attempt, questionId, random = Math.random) {
  const candidates = reinforcementCandidates(bank, attempt, questionId);
  if (!candidates.length) throw new Error("No hay un refuerzo disponible: primero corregí un error en esta actividad.");
  attempt.reinforcements[questionId] ??= {
    questionId: candidates[Math.floor(random() * candidates.length)].id, ...createResponseState()
  };
  attempt.activeReinforcement = questionId;
  return attempt.reinforcements[questionId];
}

export function reinforcementQuestion(bank, attempt, parentId = attempt.activeReinforcement) {
  const index = attempt.questionIds.indexOf(parentId);
  const practice = attempt.reinforcements[parentId];
  if (index < 0 || !practice) throw new Error("El refuerzo no tiene una actividad de origen válida.");
  const slot = bank.modules.find(m => m.id === attempt.moduleId).slots[index];
  const question = slot.questions.find(q => q.id === practice.questionId && q.id !== parentId && q.type !== "open");
  if (!question) throw new Error("El refuerzo guardado no coincide con el banco actual.");
  return question;
}

export function restoreAttempt(bank, value) {
  if (!value || !["exercise", "review", "results"].includes(value.phase) ||
      !Number.isInteger(value.index) || value.index < 0 || value.index > 5) throw new Error("El progreso guardado no tiene un formato válido.");
  const module = bank.modules.find(m => m.id === value.moduleId && m.status === "ready");
  if (!module || !Array.isArray(value.questionIds) || value.questionIds.length !== 6 ||
      value.questionIds.some((id, i) => !module.slots[i].questions.some(q => q.id === id))) throw new Error("El progreso guardado ya no coincide con el banco actual.");
  validateResponseState(questionsFor(bank, value), value, true);
  if (value.reinforcements === undefined && value.activeReinforcement === undefined) {
    value.reinforcements = {};
    value.activeReinforcement = null;
  }
  if (!value.reinforcements || typeof value.reinforcements !== "object" || Array.isArray(value.reinforcements) ||
      (value.activeReinforcement !== null && (typeof value.activeReinforcement !== "string" ||
        !Object.hasOwn(value.reinforcements, value.activeReinforcement)))) throw new Error("Los refuerzos guardados no son válidos.");
  for (const [parentId, practice] of Object.entries(value.reinforcements)) {
    if (!practice || typeof practice !== "object") throw new Error("El refuerzo guardado está incompleto.");
    const question = reinforcementQuestion(bank, value, parentId);
    validateResponseState([question], practice);
  }
  return value;
}

function validateResponseState(questions, value, migrateLegacy = false) {
  for (const key of ["answers", "hints", "checked", "selfChecks"]) {
    if (!value[key] || typeof value[key] !== "object" || Array.isArray(value[key]) ||
        Object.keys(value[key]).some(id => !questions.some(q => q.id === id))) throw new Error("El progreso guardado está incompleto o contiene otra actividad.");
  }
  if (migrateLegacy && value.learning === undefined && value.trackingFromStart === undefined) {
    value.learning = {};
    value.trackingFromStart = false;
  }
  if (!value.learning || typeof value.learning !== "object" || Array.isArray(value.learning) ||
      typeof value.trackingFromStart !== "boolean" ||
      Object.keys(value.learning).some(id => !questions.some(q => q.id === id))) throw new Error("El registro de aprendizaje no es válido.");
  for (const q of questions) {
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
    const record = value.learning[q.id];
    if (record !== undefined && (!record || !Array.isArray(record.submissions) || typeof record.feedbackSeen !== "boolean" ||
        typeof record.solutionSeen !== "boolean" || record.submissions.some(s => !s || !isAnswered(q, s.answer) ||
          (q.type === "open" && s.answer.length > 6000) ||
          s.outcome !== grade(q, s.answer) || !Number.isInteger(s.hintsUsed) || s.hintsUsed < 0 || s.hintsUsed > (value.hints[q.id] ?? 0) ||
          typeof s.afterFeedback !== "boolean" || typeof s.afterSolution !== "boolean"))) throw new Error("Las respuestas del registro de aprendizaje no son válidas.");
  }
}
