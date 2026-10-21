import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createAttempt, questionsFor, grade, summarize, restoreAttempt, recordSubmission, markFeedback,
  markModelViewed, learningCategory, learningSummary, reinforcementCandidates, startReinforcement,
  reinforcementQuestion
} from "../js/core.js";

const bank = JSON.parse(readFileSync(new URL("../data/activities.json", import.meta.url), "utf8"));
const fresh = () => createAttempt(bank.modules[0], () => 0);
const correct = q => q.type === "select" ? Object.fromEntries(q.fields.map(f => [f.id, f.answer])) :
  q.type === "open" ? "Mi justificación." : q.answer;
const wrong = q => q.type === "select" ? Object.fromEntries(q.fields.map(f => [f.id, f.options.find(o => o.id !== f.answer).id])) :
  q.options.find(o => o.id !== q.answer).id;

function correctedAttempt(index = 1) {
  const attempt = fresh();
  const q = questionsFor(bank, attempt)[index];
  attempt.answers[q.id] = wrong(q);
  recordSubmission(q, attempt, true);
  attempt.answers[q.id] = correct(q);
  recordSubmission(q, attempt, true);
  return { attempt, q };
}

test("editar o navegar no genera intentos y una respuesta vacía no se registra", () => {
  const attempt = fresh();
  const q = questionsFor(bank, attempt)[1];
  attempt.answers[q.id] = wrong(q);
  attempt.index = 3;
  assert.deepEqual(attempt.learning, {});
  delete attempt.answers[q.id];
  assert.throws(() => recordSubmission(q, attempt), /incompleta/);
  assert.deepEqual(attempt.learning, {});
});

test("la primera respuesta se conserva al corregir, borrar y volver a comprobar", () => {
  const { attempt, q } = correctedAttempt();
  const first = structuredClone(attempt.learning[q.id].submissions[0]);
  assert.equal(first.outcome, "incorrect");
  assert.equal(first.afterFeedback, false);
  assert.equal(attempt.learning[q.id].submissions[1].afterFeedback, true);
  assert.equal(learningCategory(q, attempt), "afterReview");
  delete attempt.answers[q.id];
  assert.equal(learningCategory(q, attempt), "toPractice");
  attempt.answers[q.id] = correct(q);
  recordSubmission(q, attempt, true);
  assert.equal(attempt.learning[q.id].submissions.length, 2);
  assert.deepEqual(attempt.learning[q.id].submissions[0], first);
});

test("recomprobar o finalizar la misma respuesta no infla el contador", () => {
  const { attempt, q } = correctedAttempt();
  for (let i = 0; i < 4; i++) recordSubmission(q, attempt, true);
  recordSubmission(q, attempt);
  assert.equal(attempt.learning[q.id].submissions.length, 2);
});

test("los campos de precios se normalizan y sus instantáneas no cambian al editar", () => {
  const attempt = fresh();
  const q = questionsFor(bank, attempt)[0];
  attempt.answers[q.id] = correct(q);
  recordSubmission(q, attempt);
  const first = structuredClone(attempt.learning[q.id].submissions[0]);
  attempt.answers[q.id] = Object.fromEntries(Object.entries(correct(q)).reverse());
  recordSubmission(q, attempt);
  assert.equal(attempt.learning[q.id].submissions.length, 1);
  attempt.answers[q.id][q.fields[0].id] = q.fields[0].options.find(o => o.id !== q.fields[0].answer).id;
  assert.deepEqual(attempt.learning[q.id].submissions[0], first);
});

test("se distingue acertar al principio con o sin pistas y pedir pistas no resta puntos", () => {
  for (const hintsUsed of [0, 1, 2]) {
    const attempt = fresh();
    const q = questionsFor(bank, attempt)[1];
    attempt.hints[q.id] = hintsUsed;
    attempt.answers[q.id] = correct(q);
    recordSubmission(q, attempt, true);
    assert.equal(learningCategory(q, attempt), hintsUsed ? "withHints" : "independent");
    assert.equal(summarize(questionsFor(bank, attempt), attempt.answers).correct, 1);
    attempt.hints[q.id] = 2;
    recordSubmission(q, attempt);
    assert.equal(attempt.learning[q.id].submissions[0].hintsUsed, hintsUsed);
  }
});

test("la entrega final registra las respuestas que no se comprobaron antes", () => {
  const attempt = fresh();
  for (const q of questionsFor(bank, attempt)) {
    attempt.answers[q.id] = correct(q);
    recordSubmission(q, attempt);
  }
  assert.deepEqual(learningSummary(questionsFor(bank, attempt), attempt), {
    independent: 5, withHints: 0, afterReview: 0, toPractice: 0, unknown: 0
  });
  assert.equal(learningCategory(questionsFor(bank, attempt)[5], attempt), "manual");
});

test("el resumen mixto reparte exactamente las cinco respuestas cerradas", () => {
  const attempt = fresh();
  const qs = questionsFor(bank, attempt);
  attempt.answers[qs[0].id] = correct(qs[0]);
  recordSubmission(qs[0], attempt, true);
  attempt.hints[qs[1].id] = 1;
  attempt.answers[qs[1].id] = correct(qs[1]);
  recordSubmission(qs[1], attempt, true);
  attempt.answers[qs[2].id] = wrong(qs[2]);
  recordSubmission(qs[2], attempt, true);
  attempt.answers[qs[2].id] = correct(qs[2]);
  recordSubmission(qs[2], attempt, true);
  attempt.answers[qs[3].id] = wrong(qs[3]);
  recordSubmission(qs[3], attempt, true);
  attempt.answers[qs[5].id] = correct(qs[5]);
  recordSubmission(qs[5], attempt, true);
  assert.deepEqual(learningSummary(qs, attempt), {
    independent: 1, withHints: 1, afterReview: 1, toPractice: 2, unknown: 0
  });
});

test("una exposición anterior a la primera entrega no se atribuye a un acierto sin ayuda", () => {
  const attempt = fresh();
  const q = questionsFor(bank, attempt)[1];
  attempt.answers[q.id] = correct(q);
  markFeedback(q, attempt);
  recordSubmission(q, attempt);
  assert.equal(attempt.learning[q.id].submissions[0].afterSolution, true);
  assert.equal(learningCategory(q, attempt), "afterReview");
});

test("ver una devolución o un modelo marca exposición sin inventar nuevas entregas", () => {
  const attempt = fresh();
  const [q, open] = [questionsFor(bank, attempt)[1], questionsFor(bank, attempt)[5]];
  attempt.answers[q.id] = correct(q);
  recordSubmission(q, attempt);
  assert.equal(attempt.learning[q.id].solutionSeen, false);
  markFeedback(q, attempt);
  assert.equal(attempt.learning[q.id].solutionSeen, true);
  assert.equal(attempt.learning[q.id].submissions.length, 1);
  attempt.answers[open.id] = correct(open);
  recordSubmission(open, attempt, true);
  assert.equal(attempt.learning[open.id].solutionSeen, false);
  markModelViewed(open, attempt);
  assert.equal(attempt.learning[open.id].solutionSeen, true);
  assert.equal(attempt.learning[open.id].submissions.length, 1);
});

test("se conserva el historial y se informa el nuevo resultado actual", () => {
  const attempt = fresh();
  const q = questionsFor(bank, attempt)[1];
  attempt.answers[q.id] = correct(q);
  recordSubmission(q, attempt, true);
  attempt.answers[q.id] = wrong(q);
  recordSubmission(q, attempt, true);
  assert.equal(attempt.learning[q.id].submissions[0].outcome, "correct");
  assert.equal(learningCategory(q, attempt), "toPractice");
  assert.equal(attempt.learning[q.id].submissions[1].afterSolution, true);
});

test("un progreso antiguo migra sin perder respuestas ni atribuir primeros intentos", () => {
  const attempt = fresh();
  const q = questionsFor(bank, attempt)[1];
  attempt.answers[q.id] = correct(q);
  attempt.checked[q.id] = true;
  attempt.phase = "results";
  for (const key of ["learning", "trackingFromStart", "reinforcements", "activeReinforcement"]) delete attempt[key];
  const restored = restoreAttempt(bank, structuredClone(attempt));
  assert.deepEqual(restored.answers, attempt.answers);
  assert.equal(restored.phase, "results");
  assert.equal(restored.trackingFromStart, false);
  assert.deepEqual(restored.learning, {});
  assert.equal(learningCategory(q, restored), "unknown");
  recordSubmission(q, restored);
  assert.equal(learningCategory(q, restored), "unknown");
});

test("solo se ofrece refuerzo después de corregir un error de una actividad cerrada", () => {
  const attempt = fresh();
  const q = questionsFor(bank, attempt)[1];
  assert.deepEqual(reinforcementCandidates(bank, attempt, q.id), []);
  assert.throws(() => startReinforcement(bank, attempt, q.id), /primero corregí/);
  attempt.answers[q.id] = correct(q);
  recordSubmission(q, attempt, true);
  assert.deepEqual(reinforcementCandidates(bank, attempt, q.id), []);
  const corrected = correctedAttempt();
  assert.equal(reinforcementCandidates(bank, corrected.attempt, corrected.q.id).length, 2);
  const open = questionsFor(bank, attempt)[5];
  attempt.answers[open.id] = correct(open);
  recordSubmission(open, attempt, true);
  assert.deepEqual(reinforcementCandidates(bank, attempt, open.id), []);
});

test("cada refuerzo es una variante distinta de la misma posición, nunca una séptima actividad", () => {
  for (let i = 0; i < 5; i++) {
    const { attempt, q } = correctedAttempt(i);
    startReinforcement(bank, attempt, q.id, () => .9);
    const variant = reinforcementQuestion(bank, attempt);
    assert.notEqual(variant.id, q.id);
    assert.equal(variant.type, q.type);
    assert.ok(bank.modules[0].slots[i].questions.includes(variant));
    assert.equal(attempt.questionIds.length, 6);
  }
});

test("una posición con una única variante no ofrece un refuerzo inexistente", () => {
  const { attempt, q } = correctedAttempt();
  const smallerBank = structuredClone(bank);
  smallerBank.modules[0].slots[1].questions = [q];
  assert.deepEqual(reinforcementCandidates(smallerBank, attempt, q.id), []);
  assert.throws(() => startReinforcement(smallerBank, attempt, q.id), /No hay un refuerzo/);
  assert.deepEqual(attempt.reinforcements, {});
});

test("el estado y puntaje del bloque son independientes de las respuestas y pistas del refuerzo", () => {
  const { attempt, q } = correctedAttempt();
  const before = structuredClone({ answers: attempt.answers, hints: attempt.hints, learning: attempt.learning });
  const score = summarize(questionsFor(bank, attempt), attempt.answers);
  const practice = startReinforcement(bank, attempt, q.id, () => 0);
  const variant = reinforcementQuestion(bank, attempt);
  practice.answers[variant.id] = wrong(variant);
  practice.hints[variant.id] = 1;
  recordSubmission(variant, practice, true);
  practice.answers[variant.id] = correct(variant);
  recordSubmission(variant, practice, true);
  assert.equal(learningCategory(variant, practice), "afterReview");
  assert.deepEqual({ answers: attempt.answers, hints: attempt.hints, learning: attempt.learning }, before);
  assert.deepEqual(summarize(questionsFor(bank, attempt), attempt.answers), score);
});

test("retomar un refuerzo o recargar conserva exactamente la variante, respuestas e historial", () => {
  const { attempt, q } = correctedAttempt();
  const practice = startReinforcement(bank, attempt, q.id, () => 0);
  const variant = reinforcementQuestion(bank, attempt);
  practice.answers[variant.id] = correct(variant);
  recordSubmission(variant, practice, true);
  practice.checked[variant.id] = true;
  attempt.phase = "results";
  attempt.activeReinforcement = null;
  assert.equal(startReinforcement(bank, attempt, q.id, () => .99), practice);
  const restored = restoreAttempt(bank, JSON.parse(JSON.stringify(attempt)));
  assert.deepEqual(restored, attempt);
  assert.equal(reinforcementQuestion(bank, restored).id, variant.id);
});

test("el registro de un acierto inicial del refuerzo no se contamina con las ayudas del original", () => {
  const { attempt, q } = correctedAttempt();
  const practice = startReinforcement(bank, attempt, q.id);
  const variant = reinforcementQuestion(bank, attempt);
  practice.answers[variant.id] = correct(variant);
  recordSubmission(variant, practice, true);
  assert.equal(learningCategory(variant, practice), "independent");
  assert.equal(learningCategory(q, attempt), "afterReview");
});

test("se rechazan historiales y refuerzos corruptos sin descartar silenciosamente información", () => {
  for (const mutate of [
    a => { a.learning = []; },
    a => { a.trackingFromStart = "sí"; },
    a => { a.learning[a.questionIds[1]].submissions[0].outcome = "correct"; },
    a => { a.learning[a.questionIds[1]].submissions[0].hintsUsed = 99; },
    a => { a.learning[a.questionIds[1]].submissions[0].afterFeedback = "no"; },
    a => { a.activeReinforcement = "inexistente"; },
    a => { a.activeReinforcement = {}; },
    a => { a.reinforcements[a.questionIds[1]].questionId = a.questionIds[1]; },
    a => { a.reinforcements[a.questionIds[1]].answers[a.questionIds[0]] = {}; }
  ]) {
    const { attempt, q } = correctedAttempt();
    startReinforcement(bank, attempt, q.id);
    mutate(attempt);
    assert.throws(() => restoreAttempt(bank, attempt));
  }
});
