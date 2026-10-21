import { SLOT_TYPES, grade, questionsFor, learningCategory, reinforcementQuestion, isISODate } from "./core.js";

export const HISTORY_KEY = "matematica-historial-v1";
export const LEARNING_LABELS = {
  independent: "Primer intento sin pistas", withHints: "Primer intento con pistas",
  afterReview: "Resuelta después de revisar", toPractice: "Para seguir practicando", unknown: "Sin registro inicial"
};
export const LEARNING_CATEGORIES = Object.keys(LEARNING_LABELS);
export const emptyHistory = () => ({ version: 1, entries: [] });

function responseSummary(q, state) {
  const first = state.learning[q.id]?.submissions[0];
  return {
    outcome: grade(q, state.answers[q.id]), category: learningCategory(q, state),
    submissions: state.learning[q.id]?.submissions.length ?? 0, hints: state.hints[q.id] ?? 0,
    first: first ? { outcome: first.outcome, hintsUsed: first.hintsUsed, afterFeedback: first.afterFeedback, afterSolution: first.afterSolution } : null,
    partial: !state.trackingFromStart
  };
}

function reinforcementSummary(bank, attempt, parentId) {
  const practice = attempt.reinforcements[parentId];
  if (!practice) return null;
  const q = reinforcementQuestion(bank, attempt, parentId);
  const summary = responseSummary(q, practice);
  if (!practice.checked[q.id]) {
    summary.outcome = "inProgress";
    summary.category = null;
  }
  return { questionId: q.id, title: q.title, ...summary };
}

function rubricSummary(q, attempt) {
  return q.type === "open" ? { checked: (attempt.selfChecks[q.id] ?? []).filter(Boolean).length, total: q.rubric.length } : null;
}

export function snapshotAttempt(bank, attempt, now = new Date().toISOString()) {
  if (attempt.phase !== "results") throw new Error("Solo se archivan bloques finalizados.");
  const module = bank.modules.find(m => m.id === attempt.moduleId);
  const entry = {
    id: attempt.id, moduleId: module.id, moduleTitle: module.title,
    startedAt: attempt.startedAt, completedAt: attempt.completedAt, updatedAt: now,
    activities: questionsFor(bank, attempt).map((q, index) => ({
      topicId: `${module.id}:${index + 1}`, topicTitle: module.slots[index].title,
      questionId: q.id, title: q.title, type: q.type, ...responseSummary(q, attempt),
      rubric: rubricSummary(q, attempt), reinforcement: reinforcementSummary(bank, attempt, q.id)
    }))
  };
  validateHistory({ version: 1, entries: [entry] });
  return entry;
}

export function upsertHistory(history, entry) {
  const index = history.entries.findIndex(item => item.id === entry.id);
  const entries = history.entries.slice();
  if (index < 0) entries.push(entry);
  else entries[index] = entry;
  return validateHistory({ version: 1, entries });
}

export function updateArchivedExtras(bank, history, attempt, now = new Date().toISOString()) {
  if (attempt.historyExcluded) return history;
  const entry = history.entries.find(item => item.id === attempt.id);
  if (!entry) return history;
  const questions = questionsFor(bank, attempt);
  const activities = entry.activities.map((activity, index) => {
    if (activity.questionId !== questions[index].id) throw new Error("El bloque archivado no coincide con la identidad del intento actual.");
    return { ...activity, reinforcement: reinforcementSummary(bank, attempt, activity.questionId), rubric: rubricSummary(questions[index], attempt) };
  });
  if (JSON.stringify(activities) === JSON.stringify(entry.activities)) return history;
  return upsertHistory(history, { ...entry, activities, updatedAt: now });
}

export function entryCounts(entry) {
  const counts = Object.fromEntries(LEARNING_CATEGORIES.map(key => [key, 0]));
  Object.assign(counts, { correct: 0, automaticTotal: 0, hints: 0, submissions: 0, reinforcements: 0, reinforcementChecked: 0, reinforcementCorrect: 0 });
  for (const activity of entry.activities) {
    counts.hints += activity.hints;
    counts.submissions += activity.submissions;
    if (activity.type !== "open") {
      counts.automaticTotal++;
      if (activity.outcome === "correct") counts.correct++;
      counts[activity.category]++;
    }
    if (activity.reinforcement) {
      counts.reinforcements++;
      if (activity.reinforcement.outcome !== "inProgress") counts.reinforcementChecked++;
      if (activity.reinforcement.outcome === "correct") counts.reinforcementCorrect++;
    }
  }
  return counts;
}

export function topicsSummary(history) {
  const topics = new Map();
  for (const entry of history.entries) {
    for (const activity of entry.activities.filter(item => item.type !== "open")) {
      if (!topics.has(activity.topicId)) topics.set(activity.topicId, {
        id: activity.topicId, title: activity.topicTitle, moduleId: entry.moduleId, blocks: 0,
        questions: new Set(), correct: 0, hints: 0, submissions: 0,
        categories: Object.fromEntries(LEARNING_CATEGORIES.map(key => [key, 0])),
        reinforcements: 0, reinforcementCorrect: 0, reinforcementIndependent: 0
      });
      const topic = topics.get(activity.topicId);
      topic.blocks++;
      topic.questions.add(activity.questionId);
      if (activity.outcome === "correct") topic.correct++;
      topic.hints += activity.hints;
      topic.submissions += activity.submissions;
      topic.categories[activity.category]++;
      if (activity.reinforcement) {
        topic.reinforcements++;
        if (activity.reinforcement.outcome === "correct") topic.reinforcementCorrect++;
        if (activity.reinforcement.category === "independent") topic.reinforcementIndependent++;
      }
    }
  }
  return [...topics.values()].map(({ questions, ...topic }) => ({ ...topic, distinctQuestions: questions.size }));
}

export function validateHistory(value) {
  const fail = () => { throw new Error("El historial guardado tiene un formato inválido. No se reemplazará automáticamente."); };
  const text = item => typeof item === "string" && item.trim().length > 0;
  const integer = item => Number.isInteger(item) && item >= 0;
  function validResponse(activity, open, reinforcement = false) {
    if (!activity || !integer(activity.hints) || !integer(activity.submissions) || typeof activity.partial !== "boolean") return false;
    const outcomes = reinforcement ? ["correct", "incorrect", "inProgress"] : open ? ["manual", "unanswered"] : ["correct", "incorrect", "unanswered"];
    if (!outcomes.includes(activity.outcome)) return false;
    const category = reinforcement && activity.outcome === "inProgress" ? null : open ? "manual" :
      activity.outcome === "correct" ? activity.category : "toPractice";
    if (activity.category !== category || (!open && category !== null && !LEARNING_CATEGORIES.includes(category))) return false;
    if (activity.first !== null && (!activity.first || !["correct", "incorrect", "manual"].includes(activity.first.outcome) ||
        (open ? activity.first.outcome !== "manual" : activity.first.outcome === "manual") ||
        !integer(activity.first.hintsUsed) || activity.first.hintsUsed > activity.hints ||
        typeof activity.first.afterFeedback !== "boolean" || typeof activity.first.afterSolution !== "boolean")) return false;
    if ((activity.submissions === 0) !== (activity.first === null)) return false;
    if (["independent", "withHints", "afterReview"].includes(activity.category) && (activity.partial || !activity.first)) return false;
    if (activity.category === "independent" && (activity.first.outcome !== "correct" || activity.first.hintsUsed !== 0 ||
        activity.first.afterFeedback || activity.first.afterSolution)) return false;
    if (activity.category === "withHints" && (activity.first.outcome !== "correct" || activity.first.hintsUsed === 0 ||
        activity.first.afterFeedback || activity.first.afterSolution)) return false;
    return true;
  }
  if (value?.version !== 1 || !Array.isArray(value.entries)) fail();
  const ids = new Set();
  for (const entry of value.entries) {
    if (!entry || !text(entry.id) || ids.has(entry.id) || !text(entry.moduleId) || !text(entry.moduleTitle) ||
        !isISODate(entry.updatedAt) || (entry.startedAt !== null && !isISODate(entry.startedAt)) ||
        (entry.completedAt !== null && !isISODate(entry.completedAt)) ||
        !Array.isArray(entry.activities) || entry.activities.length !== 6) fail();
    ids.add(entry.id);
    entry.activities.forEach((activity, index) => {
      const open = SLOT_TYPES[index] === "open";
      if (!activity || activity.topicId !== `${entry.moduleId}:${index + 1}` || !text(activity.topicTitle) ||
          !text(activity.questionId) || !text(activity.title) || activity.type !== SLOT_TYPES[index] ||
          !validResponse(activity, open)) fail();
      if (open ? !activity.rubric || !integer(activity.rubric.checked) || !integer(activity.rubric.total) ||
          activity.rubric.total === 0 || activity.rubric.checked > activity.rubric.total : activity.rubric !== null) fail();
      if (activity.reinforcement !== null && (open || !text(activity.reinforcement.questionId) ||
          activity.reinforcement.questionId === activity.questionId || !text(activity.reinforcement.title) ||
          !validResponse(activity.reinforcement, false, true))) fail();
    });
  }
  return value;
}
