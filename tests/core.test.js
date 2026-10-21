import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateBank, createAttempt, questionsFor, grade, errorGuidance, isAnswered, summarize, restoreAttempt } from "../js/core.js";
import { escapeHTML, visualHTML, boxSVG } from "../js/visuals.js";

const bank = JSON.parse(readFileSync(new URL("../data/activities.json", import.meta.url), "utf8"));
const moduleA = bank.modules[0];
const clone = value => structuredClone(value);
const selectedAnswer = q => q.options.find(o => o.id === q.answer).label;

test("el banco contiene A con seis posiciones de tres variantes y B/C pendientes", () => {
  assert.equal(validateBank(bank), bank);
  assert.deepEqual(moduleA.slots.map(s => s.questions.length), [3, 3, 3, 3, 3, 3]);
  assert.deepEqual(bank.modules.slice(1).map(m => m.status), ["pending", "pending"]);
  assert.throws(() => createAttempt(bank.modules[1]), /disponible/);
});

test("cada variante es alcanzable y se conserva el orden de los seis tipos", () => {
  for (let variant = 0; variant < 3; variant++) {
    const attempt = createAttempt(moduleA, () => (variant + 0.5) / 3);
    const questions = questionsFor(bank, attempt);
    assert.equal(new Set(attempt.questionIds).size, 6);
    assert.deepEqual(questions.map(q => q.type), ["select", "choice", "choice", "choice", "choice", "open"]);
    assert.deepEqual(questions.map(q => q.id), moduleA.slots.map(s => s.questions[variant].id));
  }
});

test("se elige de manera independiente una variante por posición", () => {
  const samples = [0, .4, .9, .9, 0, .4];
  let index = 0;
  const attempt = createAttempt(moduleA, () => samples[index++]);
  assert.deepEqual(attempt.questionIds, moduleA.slots.map((s, i) => s.questions[[0, 1, 2, 2, 0, 1][i]].id));
});

test("la corrección distingue vacía, parcial, correcta e incorrecta", () => {
  const q = moduleA.slots[0].questions[0];
  assert.equal(grade(q), "unanswered");
  assert.equal(grade(q, { pan: "60" }), "unanswered");
  assert.equal(grade(q, { pan: "60", galleta: "20" }), "correct");
  assert.equal(grade(q, { pan: "40", galleta: "20" }), "incorrect");
  assert.equal(isAnswered(q, { pan: "60", galleta: "inventada" }), false);
});

test("las opciones cerradas se corrigen y las abiertas nunca reciben nota automática", () => {
  for (const slot of moduleA.slots.slice(1, 5)) {
    for (const q of slot.questions) {
      assert.equal(grade(q, q.answer), "correct");
      assert.equal(grade(q, q.options.find(o => o.id !== q.answer).id), "incorrect");
      assert.equal(grade(q, "inventada"), "unanswered");
    }
  }
  const open = moduleA.slots[5].questions[0];
  assert.equal(grade(open, "  "), "unanswered");
  assert.equal(grade(open, "Una respuesta que requiere lectura humana."), "manual");
});

test("el resumen puntúa sobre cinco, no sobre seis", () => {
  const attempt = createAttempt(moduleA, () => 0);
  const questions = questionsFor(bank, attempt);
  const answers = Object.fromEntries(questions.map(q => [q.id, q.type === "select" ?
    Object.fromEntries(q.fields.map(f => [f.id, f.answer])) : q.type === "open" ? "Justificación." : q.answer]));
  assert.deepEqual(summarize(questions, answers), { correct: 5, incorrect: 0, unanswered: 0, manual: 1, automaticTotal: 5 });
  assert.deepEqual(summarize(questions, {}), { correct: 0, incorrect: 0, unanswered: 6, manual: 0, automaticTotal: 5 });
});

test("cada distractor tiene orientación y pregunta sin la respuesta correcta ni explicación completa", () => {
  let errors = 0;
  for (const q of moduleA.slots.slice(1, 5).flatMap(slot => slot.questions)) {
    for (const option of q.options.filter(o => o.id !== q.answer)) {
      const guidance = errorGuidance(q, option.id);
      assert.equal(guidance, q.errorFeedback[option.id]);
      assert.ok(guidance.reason.length > 20);
      assert.match(guidance.question, /¿.+\?/);
      const text = JSON.stringify(guidance);
      assert.ok(!text.includes(q.explanation));
      assert.ok(!text.includes(selectedAnswer(q)), `${q.id}: se filtró la respuesta correcta`);
      errors++;
    }
    assert.throws(() => errorGuidance(q, q.answer), /incorrecta/);
    assert.throws(() => errorGuidance(q, ""), /incorrecta/);
  }
  assert.equal(errors, 36);
});

test("se comprueban las 45 parejas incorrectas de precios usando solo las elecciones", () => {
  let errors = 0;
  for (const q of moduleA.slots[0].questions) {
    const [a, b] = q.fields;
    for (const oa of a.options) {
      for (const ob of b.options) {
        const answers = { [a.id]: oa.id, [b.id]: ob.id };
        if (grade(q, answers) === "correct") continue;
        const guidance = errorGuidance(q, answers);
        assert.equal(guidance.reason, q.errorFeedback.reason);
        assert.equal(guidance.question, q.errorFeedback.question);
        const lines = guidance.calculation.split("\n");
        assert.equal(lines.length, 2);
        q.verification.forEach((v, i) => {
          const total = v.quantities[0] * Number(oa.id) + v.quantities[1] * Number(ob.id);
          const format = n => new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 }).format(n);
          assert.ok(lines[i].includes(`${v.quantities[0]} \\times ${oa.id} + ${v.quantities[1]} \\times ${ob.id} = ${total}`));
          assert.ok(lines[i].includes(`El enunciado indica $${format(v.total)}`));
          assert.ok(lines[i].endsWith(total === v.total ? ": coincide." : ": no coincide."));
        });
        assert.ok(lines.some(line => line.endsWith(": no coincide.")));
        assert.ok(!guidance.calculation.includes(q.explanation));
        errors++;
      }
    }
  }
  assert.equal(errors, 45);
});

test("el banco exige devoluciones completas y preguntas de reflexión", () => {
  for (const mutate of [
    b => { delete b.modules[0].slots[1].questions[0].errorFeedback.a; },
    b => { b.modules[0].slots[1].questions[0].errorFeedback.c = { reason: "No debe estar.", question: "¿Por qué?" }; },
    b => { b.modules[0].slots[1].questions[0].errorFeedback.a.question = ""; },
    b => { b.modules[0].slots[1].questions[0].errorFeedback.a.calculation = 123; },
    b => { b.modules[0].slots[0].questions[0].verification[0].quantities.pop(); },
    b => { b.modules[0].slots[0].questions[0].fields[0].options[0].id = "precio-no-numérico"; },
    b => { b.modules[0].slots[5].questions[0].reflectionQuestions = []; }
  ]) {
    const copy = clone(bank);
    mutate(copy);
    assert.throws(() => validateBank(copy));
  }
});

test("las comprobaciones del banco se cumplen con los precios correctos", () => {
  for (const q of moduleA.slots[0].questions) {
    const prices = q.fields.map(f => Number(f.answer));
    for (const check of q.verification) {
      assert.equal(check.quantities.reduce((sum, quantity, i) => sum + quantity * prices[i], 0), check.total);
    }
  }
});

test("la orientación no altera la respuesta, su corrección ni el progreso", () => {
  const attempt = createAttempt(moduleA, () => 0);
  const q = questionsFor(bank, attempt)[1];
  attempt.answers[q.id] = q.options.find(o => o.id !== q.answer).id;
  attempt.checked[q.id] = true;
  const before = clone(attempt);
  errorGuidance(q, attempt.answers[q.id]);
  assert.deepEqual(attempt, before);
  assert.equal(grade(q, attempt.answers[q.id]), "incorrect");
  assert.deepEqual(restoreAttempt(bank, attempt), before);
});

test("se restaura exactamente la combinación, respuestas, pistas y autoevaluación", () => {
  const attempt = createAttempt(moduleA, () => .8);
  const q = questionsFor(bank, attempt)[5];
  attempt.index = 5;
  attempt.phase = "results";
  attempt.answers[q.id] = "Las rectas son paralelas.";
  attempt.hints[q.id] = 2;
  attempt.checked[q.id] = true;
  attempt.selfChecks[q.id] = [true, true, false];
  const saved = JSON.parse(JSON.stringify(attempt));
  assert.deepEqual(restoreAttempt(bank, saved), attempt);
});

test("se aceptan respuestas parciales y borradas en el progreso", () => {
  const attempt = createAttempt(moduleA);
  const q = questionsFor(bank, attempt)[0];
  attempt.answers[q.id] = { [q.fields[0].id]: q.fields[0].answer, [q.fields[1].id]: "" };
  assert.deepEqual(restoreAttempt(bank, attempt), attempt);
});

test("se rechaza progreso corrupto, incompatible o fuera de rango", () => {
  for (const mutate of [
    a => { a.index = 6; }, a => { a.index = -1; }, a => { a.phase = "inexistente"; },
    a => { a.questionIds[0] = "eliminada"; }, a => { a.questionIds.reverse(); },
    a => { a.moduleId = "B"; }, a => { a.answers = []; },
    a => { a.hints[a.questionIds[0]] = 99; },
    a => { a.answers[a.questionIds[1]] = "inventada"; },
    a => { a.answers[a.questionIds[5]] = 123; },
    a => { a.selfChecks[a.questionIds[5]] = [true]; },
    a => { a.checked[a.questionIds[0]] = "sí"; }
  ]) {
    const attempt = createAttempt(moduleA, () => 0);
    mutate(attempt);
    assert.throws(() => restoreAttempt(bank, attempt));
  }
  assert.throws(() => restoreAttempt(bank, null));
});

test("se detectan errores frecuentes al editar JSON", () => {
  for (const mutate of [
    b => { b.version = 99; }, b => { b.modules[0].slots.pop(); },
    b => { b.modules[0].slots[1].questions[0].answer = "ausente"; },
    b => { b.modules[0].slots[1].questions[0].options[0].id = "b"; },
    b => { b.modules[0].slots[0].questions[1].id = "a-precios-1"; },
    b => { b.modules[0].slots[5].questions[0].rubric = []; },
    b => { b.modules[0].slots[0].questions[0].type = "open"; },
    b => { b.modules[1].slots = [{}]; },
    b => { b.modules[0].slots[4].questions[0].visual.series[0].slope = null; }
  ]) {
    const copy = clone(bank); mutate(copy);
    assert.throws(() => validateBank(copy));
  }
});

test("los precios correctos verifican las dos compras de cada variante", () => {
  const coefficients = [
    [[4, 6, 360], [2, 4, 200]],
    [[3, 2, 290], [2, 4, 220]],
    [[2, 3, 940], [4, 2, 1160]]
  ];
  moduleA.slots[0].questions.forEach((q, i) => {
    const [a, b] = q.fields.map(f => Number(f.answer));
    for (const [ca, cb, total] of coefficients[i]) assert.equal(ca * a + cb * b, total);
  });
});

test("los porcentajes sucesivos conservan la masa final indicada", () => {
  const recipes = [[480, .8, .8], [810, .9, .75], [540, .75, .9]];
  moduleA.slots[1].questions.forEach((q, i) => {
    const initial = Number.parseFloat(selectedAnswer(q));
    assert.ok(Math.abs(initial * recipes[i][1] * recipes[i][2] - recipes[i][0]) < 1e-8);
  });
});

test("hay exactamente una vista espacial válida en cada variante", () => {
  for (const q of moduleA.slots[2].questions) {
    const symbols = q.visual.symbols;
    const valid = q.options.filter(o => {
      const [a, b] = o.faces.map(s => symbols.indexOf(s));
      return a >= 0 && b >= 0 && [1, 3].includes(Math.abs(a - b));
    });
    assert.deepEqual(valid.map(o => o.id), [q.answer]);
  }
});

test("el área y porcentaje coinciden y el desarrollo cabe en la lámina", () => {
  const sheets = [80, 60, 80];
  moduleA.slots[3].questions.forEach((q, i) => {
    const { base: b, wall: w, height: h } = q.visual;
    const area = b * b + 4 * b * w + 2 * b * h;
    assert.equal(Math.round(area / sheets[i] ** 2 * 100), Number.parseFloat(selectedAnswer(q)));
    assert.ok(b + 2 * w + 2 * h <= sheets[i]);
  });
});

test("el año correcto es el primero que SUPERA, no iguala, la meta", () => {
  const targets = [400, 300, 350];
  moduleA.slots[4].questions.forEach((q, i) => {
    const year = Number(selectedAnswer(q));
    const x = year - q.visual.baseYear;
    const s = q.visual.series[0];
    assert.ok(s.slope * x + s.intercept > targets[i]);
    assert.ok(s.slope * (x - 1) + s.intercept <= targets[i]);
  });
});

test("las tres rúbricas representan tendencias distintas y coherentes", () => {
  const visuals = moduleA.slots[5].questions.map(q => q.visual);
  const [[l, r], [n, y], [a, b]] = visuals.map(v => v.series);
  assert.ok(l.intercept > r.intercept && l.slope > r.slope);
  const crossing = (n.intercept - y.intercept) / (y.slope - n.slope);
  assert.equal(crossing, 10);
  assert.equal(visuals[1].baseYear + crossing + 1, 2036);
  assert.equal(a.slope, b.slope);
  assert.equal(a.intercept - b.intercept, 70);
});

test("las ilustraciones son locales, accesibles y escapan texto del banco", () => {
  assert.equal(escapeHTML('<script>"&\''), "&lt;script&gt;&quot;&amp;&#39;");
  assert.match(boxSVG(["<img>", "X"]), /&lt;img&gt;/);
  for (const q of moduleA.slots.flatMap(s => s.questions)) {
    const html = visualHTML(q.visual);
    if (q.visual) {
      assert.match(html, /role="img"/);
      assert.match(html, /<figcaption>/);
      assert.doesNotMatch(html, /https?:/);
    }
  }
});
