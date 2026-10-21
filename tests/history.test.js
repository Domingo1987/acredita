import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createAttempt, questionsFor, recordSubmission, restoreAttempt, startReinforcement, reinforcementQuestion
} from "../js/core.js";
import {
  HISTORY_KEY, emptyHistory, snapshotAttempt, upsertHistory, updateArchivedExtras, entryCounts, topicsSummary, validateHistory
} from "../js/history.js";
import { progressHTML } from "../js/history-view.js";

const bank = JSON.parse(readFileSync(new URL("../data/activities.json", import.meta.url), "utf8"));
const firstDate = "2026-10-21T10:00:00.000Z";
const finishedDate = "2026-10-21T11:00:00.000Z";
const updatedDate = "2026-10-21T12:00:00.000Z";
const correct = q => q.type === "select" ? Object.fromEntries(q.fields.map(f => [f.id, f.answer])) :
  q.type === "open" ? "Mi justificación privada que no debe archivarse." : q.answer;
const wrong = q => q.options.find(o => o.id !== q.answer).id;

function completed(variant = 0, id = "block-1") {
  const attempt = createAttempt(bank.modules[0], () => (variant + .5) / 3);
  Object.assign(attempt, { id, startedAt: firstDate, completedAt: finishedDate });
  const qs = questionsFor(bank, attempt);
  for (const [index, q] of qs.entries()) {
    if (index === 4) continue;
    if (index === 1) {
      attempt.answers[q.id] = wrong(q);
      recordSubmission(q, attempt, true);
    }
    if (index === 2) attempt.hints[q.id] = 1;
    attempt.answers[q.id] = index === 3 ? wrong(q) : correct(q);
    recordSubmission(q, attempt, true);
  }
  attempt.phase = "results";
  return attempt;
}

test("cada intento nuevo tiene identidad y fecha de inicio propias", () => {
  const a = createAttempt(bank.modules[0]);
  const b = createAttempt(bank.modules[0]);
  assert.notEqual(a.id, b.id);
  assert.equal(new Date(a.startedAt).toISOString(), a.startedAt);
  assert.equal(a.completedAt, null);
  assert.equal(a.historyExcluded, false);
});

test("un intento anterior recibe identidad, pero no fechas inventadas", () => {
  const old = completed();
  for (const key of ["id", "startedAt", "completedAt", "historyExcluded"]) delete old[key];
  const restored = restoreAttempt(bank, old);
  assert.ok(restored.id);
  assert.equal(restored.startedAt, null);
  assert.equal(restored.completedAt, null);
  const entry = snapshotAttempt(bank, restored, updatedDate);
  assert.equal(entry.completedAt, null);
  assert.equal(entry.updatedAt, updatedDate);
  assert.match(progressHTML(upsertHistory(emptyHistory(), entry)), /fecha de entrega desconocida/);
});

test("se rechaza identidad incompleta o fechas inválidas sin perder silenciosamente datos", () => {
  for (const mutate of [
    a => { a.id = ""; }, a => { a.startedAt = "ayer"; }, a => { a.completedAt = 123; },
    a => { a.historyExcluded = "sí"; }, a => { delete a.startedAt; }
  ]) {
    const attempt = completed();
    mutate(attempt);
    assert.throws(() => restoreAttempt(bank, attempt));
  }
});

test("solo se archivan bloques finalizados", () => {
  const attempt = completed();
  attempt.phase = "review";
  assert.throws(() => snapshotAttempt(bank, attempt), /finalizados/);
  assert.deepEqual(emptyHistory(), { version: 1, entries: [] });
  assert.equal(HISTORY_KEY, "matematica-historial-v1");
});

test("el resumen conserva resultados y ayudas sin guardar respuestas escritas ni soluciones", () => {
  const attempt = completed();
  const entry = snapshotAttempt(bank, attempt, updatedDate);
  assert.equal(entry.activities.length, 6);
  assert.equal(entry.completedAt, finishedDate);
  assert.equal(entry.activities[1].first.outcome, "incorrect");
  assert.equal(entry.activities[1].submissions, 2);
  assert.equal(entry.activities[2].first.hintsUsed, 1);
  const counts = entryCounts(entry);
  assert.deepEqual([counts.correct, counts.automaticTotal], [3, 5]);
  assert.deepEqual([counts.independent, counts.withHints, counts.afterReview, counts.toPractice], [1, 1, 1, 2]);
  assert.equal(counts.hints, 1);
  assert.equal(counts.submissions, 6);
  assert.ok(!JSON.stringify(entry).includes(correct(questionsFor(bank, attempt)[5])));
  for (const q of questionsFor(bank, attempt)) assert.ok(!JSON.stringify(entry).includes(q.explanation));
});

test("el archivo es una instantánea independiente de futuras ediciones del intento", () => {
  const attempt = completed();
  const entry = snapshotAttempt(bank, attempt, updatedDate);
  const before = structuredClone(entry);
  attempt.answers[attempt.questionIds[1]] = wrong(questionsFor(bank, attempt)[1]);
  attempt.learning[attempt.questionIds[1]].submissions[0].hintsUsed = 2;
  attempt.hints[attempt.questionIds[2]] = 2;
  assert.deepEqual(entry, before);
});

test("finalizar de nuevo actualiza el mismo bloque sin duplicarlo", () => {
  const attempt = completed();
  let history = upsertHistory(emptyHistory(), snapshotAttempt(bank, attempt, updatedDate));
  const q = questionsFor(bank, attempt)[3];
  attempt.answers[q.id] = correct(q);
  recordSubmission(q, attempt, true);
  history = upsertHistory(history, snapshotAttempt(bank, attempt, "2026-10-21T13:00:00.000Z"));
  assert.equal(history.entries.length, 1);
  assert.equal(entryCounts(history.entries[0]).correct, 4);
  assert.equal(history.entries[0].activities[3].first.outcome, "incorrect");
  assert.equal(history.entries[0].completedAt, finishedDate);
});

test("bloques con la misma combinación pero distinta identidad se conservan por separado", () => {
  let history = emptyHistory();
  for (const id of ["uno", "dos", "tres"]) history = upsertHistory(history, snapshotAttempt(bank, completed(0, id), updatedDate));
  assert.equal(history.entries.length, 3);
  assert.equal(topicsSummary(history)[0].blocks, 3);
  assert.equal(topicsSummary(history)[0].distinctQuestions, 1);
});

test("se agrupan variantes del mismo tema sin mezclar otras posiciones ni la escritura", () => {
  let history = emptyHistory();
  for (let variant = 0; variant < 3; variant++) history = upsertHistory(history, snapshotAttempt(bank, completed(variant, `b-${variant}`), updatedDate));
  const topics = topicsSummary(history);
  assert.equal(topics.length, 5);
  for (const topic of topics) {
    assert.equal(topic.blocks, 3);
    assert.equal(topic.distinctQuestions, 3);
    assert.equal(Object.values(topic.categories).reduce((sum, n) => sum + n, 0), 3);
  }
  assert.equal(topics[0].categories.independent, 3);
  assert.equal(topics[1].categories.afterReview, 3);
  assert.equal(topics[2].hints, 3);
});

test("los refuerzos en curso y comprobados se distinguen y no cambian el puntaje principal", () => {
  const attempt = completed();
  const parent = questionsFor(bank, attempt)[1];
  const practice = startReinforcement(bank, attempt, parent.id, () => 0);
  const q = reinforcementQuestion(bank, attempt);
  const pending = snapshotAttempt(bank, attempt, updatedDate);
  assert.equal(pending.activities[1].reinforcement.outcome, "inProgress");
  assert.equal(entryCounts(pending).reinforcementChecked, 0);
  practice.answers[q.id] = correct(q);
  recordSubmission(q, practice, true);
  practice.checked[q.id] = true;
  const done = snapshotAttempt(bank, attempt, updatedDate);
  const counts = entryCounts(done);
  assert.equal(counts.correct, 3);
  assert.equal(counts.automaticTotal, 5);
  assert.equal(counts.reinforcements, 1);
  assert.equal(counts.reinforcementChecked, 1);
  assert.equal(counts.reinforcementCorrect, 1);
});

test("actualizar un refuerzo conserva la última entrega principal, aunque haya ediciones sin finalizar", () => {
  const attempt = completed();
  const history = upsertHistory(emptyHistory(), snapshotAttempt(bank, attempt, updatedDate));
  const parent = questionsFor(bank, attempt)[1];
  const practice = startReinforcement(bank, attempt, parent.id, () => 0);
  const q = reinforcementQuestion(bank, attempt);
  practice.answers[q.id] = correct(q);
  recordSubmission(q, practice, true);
  practice.checked[q.id] = true;
  attempt.phase = "exercise";
  attempt.answers[parent.id] = wrong(parent);
  recordSubmission(parent, attempt, true);
  const next = updateArchivedExtras(bank, history, attempt, "2026-10-21T14:00:00.000Z");
  assert.equal(entryCounts(next.entries[0]).correct, 3);
  assert.equal(next.entries[0].activities[1].submissions, 2);
  assert.equal(next.entries[0].activities[1].reinforcement.outcome, "correct");
  assert.equal(history.entries[0].activities[1].reinforcement, null);
  assert.equal(topicsSummary(next)[1].reinforcementIndependent, 1);
});

test("la autoevaluación escrita se actualiza sin convertirse en calificación automática", () => {
  const attempt = completed();
  const history = upsertHistory(emptyHistory(), snapshotAttempt(bank, attempt, updatedDate));
  const q = questionsFor(bank, attempt)[5];
  attempt.selfChecks[q.id] = [true, false, true];
  const next = updateArchivedExtras(bank, history, attempt, updatedDate);
  assert.deepEqual(next.entries[0].activities[5].rubric, { checked: 2, total: 3 });
  assert.equal(next.entries[0].activities[5].outcome, "manual");
  assert.equal(entryCounts(next.entries[0]).automaticTotal, 5);
});

test("el borrado explícito no se deshace automáticamente por cambios del intento actual", () => {
  const attempt = completed();
  const history = emptyHistory();
  attempt.historyExcluded = true;
  assert.equal(updateArchivedExtras(bank, history, attempt), history);
  const restored = restoreAttempt(bank, structuredClone(attempt));
  assert.equal(restored.historyExcluded, true);
});

test("no se escribe el historial si los extras no cambiaron o si el bloque no estaba archivado", () => {
  const attempt = completed();
  const empty = emptyHistory();
  assert.equal(updateArchivedExtras(bank, empty, attempt), empty);
  const history = upsertHistory(empty, snapshotAttempt(bank, attempt, updatedDate));
  assert.equal(updateArchivedExtras(bank, history, attempt), history);
});

test("los resúmenes históricos no dependen de que siga existiendo el banco original", () => {
  const history = upsertHistory(emptyHistory(), snapshotAttempt(bank, completed(), updatedDate));
  const serialized = JSON.stringify(history);
  const restored = validateHistory(JSON.parse(serialized));
  assert.equal(entryCounts(restored.entries[0]).correct, 3);
  assert.equal(topicsSummary(restored).length, 5);
  assert.match(progressHTML(restored), /Mis bloques finalizados/);
});

test("historiales corruptos o inconsistentes se rechazan, no se convierten en uno vacío", () => {
  for (const mutate of [
    h => { h.version = 99; }, h => { h.entries = {}; }, h => { h.entries.push(structuredClone(h.entries[0])); },
    h => { h.entries[0].completedAt = "desconocido"; }, h => { h.entries[0].activities.pop(); },
    h => { h.entries[0].activities[0].category = "dominado"; },
    h => { h.entries[0].activities[0].first.outcome = "incorrect"; },
    h => { h.entries[0].activities[0].submissions = -1; },
    h => { h.entries[0].activities[2].first.hintsUsed = 99; },
    h => { h.entries[0].activities[5].rubric.checked = 99; }
  ]) {
    const history = upsertHistory(emptyHistory(), snapshotAttempt(bank, completed(), updatedDate));
    mutate(history);
    assert.throws(() => validateHistory(history), /No se reemplazará/);
  }
});

test("la vista escapa contenido, muestra un vacío real y distingue errores de lectura", () => {
  assert.match(progressHTML(emptyHistory()), /Tu cuaderno está por empezar/);
  assert.match(progressHTML(null, { error: "JSON inválido <script>" }), /No pudimos leer el historial/);
  assert.doesNotMatch(progressHTML(null, { error: "JSON inválido" }), /Tu cuaderno está por empezar/);
  const entry = snapshotAttempt(bank, completed(), updatedDate);
  entry.moduleTitle = '<img src=x onerror="alert(1)">';
  const html = progressHTML(upsertHistory(emptyHistory(), entry));
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /no una certificación de dominio/);
});
