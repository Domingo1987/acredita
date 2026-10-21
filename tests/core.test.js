import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateBank, createAttempt, questionsFor, grade, errorGuidance, isAnswered, summarize, restoreAttempt } from "../js/core.js";
import { escapeHTML, visualHTML, boxSVG } from "../js/visuals.js";

const bank = JSON.parse(readFileSync(new URL("../data/activities.json", import.meta.url), "utf8"));
const moduleA = bank.modules[0];
const clone = value => structuredClone(value);
const selectedAnswer = q => q.options.find(o => o.id === q.answer).label;

test("el banco contiene A con sesenta ejercicios y B/C pendientes", () => {
  assert.equal(validateBank(bank), bank);
  assert.deepEqual(moduleA.slots.map(s => s.questions.length), [10, 10, 10, 10, 10, 10]);
  assert.equal(new Set(moduleA.slots.flatMap(s => s.questions.map(q => q.title))).size, 60);
  assert.deepEqual(bank.modules.slice(1).map(m => m.status), ["pending", "pending"]);
  assert.throws(() => createAttempt(bank.modules[1]), /disponible/);
});

test("los dieciocho ejercicios previos conservan sus identificadores y respuestas guardadas", () => {
  const prefixes = ["a-precios", "a-porcentaje", "a-espacio", "a-area", "a-modelo", "a-argumento"];
  const prices = [{ pan: "60", galleta: "20" }, { cuaderno: "90", lapiz: "10" }, { adulto: "200", infantil: "180" }];
  const choices = [["c", "c", "b", "b"], ["b", "b", "c", "c"], ["c", "a", "b", "b"]];
  for (let variant = 0; variant < 3; variant++) {
    const ids = prefixes.map(prefix => `${prefix}-${variant + 1}`);
    assert.deepEqual(moduleA.slots.map(s => s.questions[variant].id), ids);
    const answers = { [ids[0]]: prices[variant], [ids[5]]: "Mi argumento anterior." };
    choices[variant].forEach((answer, i) => { answers[ids[i + 1]] = answer; });
    const restored = restoreAttempt(bank, {
      moduleId: "A", questionIds: ids, answers: clone(answers), hints: {}, checked: {},
      selfChecks: {}, index: 5, phase: "results"
    });
    assert.deepEqual(restored.answers, answers);
    assert.deepEqual(questionsFor(bank, restored).map(q => grade(q, restored.answers[q.id])),
      ["correct", "correct", "correct", "correct", "correct", "manual"]);
  }
});

test("cada variante es alcanzable y se conserva el orden de los seis tipos", () => {
  for (let variant = 0; variant < 10; variant++) {
    const attempt = createAttempt(moduleA, () => (variant + 0.5) / 10);
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
  assert.deepEqual(attempt.questionIds, moduleA.slots.map((s, i) => s.questions[[0, 4, 9, 9, 0, 4][i]].id));
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
  assert.equal(errors, 120);
});

test("se comprueban las 150 parejas incorrectas de precios usando solo las elecciones", () => {
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
  assert.equal(errors, 150);
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
    [[2, 3, 940], [4, 2, 1160]],
    [[2, 3, 340], [4, 2, 440]],
    [[4, 1, 260], [2, 2, 310]],
    [[2, 3, 330], [3, 2, 370]],
    [[2, 4, 420], [3, 2, 510]],
    [[2, 2, 800], [3, 1, 900]],
    [[2, 4, 400], [3, 2, 420]],
    [[2, 1, 4800], [1, 2, 4200]]
  ];
  moduleA.slots[0].questions.forEach((q, i) => {
    const [a, b] = q.fields.map(f => Number(f.answer));
    assert.deepEqual(q.verification.map(v => [...v.quantities, v.total]), coefficients[i]);
    for (const [ca, cb, total] of coefficients[i]) assert.equal(ca * a + cb * b, total);
    const [[ca, cb], [da, db]] = coefficients[i];
    assert.notEqual(ca * db - cb * da, 0, `${q.id}: el sistema debe tener solución única`);
  });
});

test("los porcentajes sucesivos conservan la masa final indicada", () => {
  const recipes = [
    [480, .8, .8], [810, .9, .75], [540, .75, .9], [680, .85, .8], [1260, .7, .9],
    [1530, .85, .9], [380, .95, .8], [1440, .9, .8], [900, .75, .8], [1200, .8, .75]
  ];
  moduleA.slots[1].questions.forEach((q, i) => {
    const prompt = q.prompt.join(" ");
    assert.match(prompt, new RegExp(`\\b${recipes[i][0]}\\b`));
    for (const factor of recipes[i].slice(1)) assert.match(prompt, new RegExp(`${Math.round((1 - factor) * 100)}\\s*%`));
    const initial = Number.parseFloat(selectedAnswer(q));
    assert.ok(Math.abs(initial * recipes[i][1] * recipes[i][2] - recipes[i][0]) < 1e-8);
    const matching = q.options.filter(o => Math.abs(Number.parseFloat(o.label) * recipes[i][1] * recipes[i][2] - recipes[i][0]) < 1e-8);
    assert.deepEqual(matching.map(o => o.id), [q.answer]);
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
  const sheets = [80, 60, 80, 50, 60, 70, 70, 80, 70, 80];
  const dimensions = [
    [24, 6, 12], [20, 5, 10], [30, 7, 14], [16, 4, 12], [18, 3, 12],
    [22, 5, 15], [25, 5, 15], [28, 4, 17], [24, 4, 15], [26, 6, 16]
  ];
  moduleA.slots[3].questions.forEach((q, i) => {
    const { base: b, wall: w, height: h } = q.visual;
    assert.deepEqual([b, w, h], dimensions[i]);
    for (const measure of [b, w, h, sheets[i]]) assert.match(q.prompt.join(" "), new RegExp(`\\b${measure}\\b`));
    const area = b * b + 4 * b * w + 2 * b * h;
    assert.equal(Math.round(area / sheets[i] ** 2 * 100), Number.parseFloat(selectedAnswer(q)));
    assert.ok(b + 2 * w + 2 * h <= sheets[i]);
    if (i >= 3) assert.ok(h > b / 2, `${q.id}: el nuevo techo debe admitir una altura positiva`);
  });
});

test("el año correcto es el primero que SUPERA, no iguala, la meta", () => {
  const targets = [400, 300, 350, 300, 200, 500, 200, 600, 100, 900];
  const expectedYears = [2037, 2041, 2034, 2033, 2035, 2041, 2037, 2034, 2033, 2039];
  moduleA.slots[4].questions.forEach((q, i) => {
    const year = Number(selectedAnswer(q));
    assert.match(q.prompt.join(" "), new RegExp(`\\b${targets[i]}\\b`));
    assert.equal(year, expectedYears[i], q.id);
    const x = year - q.visual.baseYear;
    const s = q.visual.series[0];
    assert.ok(s.slope * x + s.intercept > targets[i]);
    assert.ok(s.slope * (x - 1) + s.intercept <= targets[i]);
  });
});

test("las diez rúbricas cubren cruces, paralelas, comienzos iguales y descensos con dominio limitado", () => {
  const cases = [
    { lines: [[12, 250], [5, 100]], ahead: 0 },
    { lines: [[10, 200], [20, 100]], crossing: 10, after: 1 },
    { lines: [[9, 160], [9, 90]], gap: 70 },
    { lines: [[8, 120], [8, 80]], gap: 40 },
    { lines: [[12, 120], [24, 60]], crossing: 5, after: 1 },
    { lines: [[18, 80], [8, 180]], crossing: 10, after: 0 },
    { lines: [[11, 60], [5, 60]], crossing: 0, after: 0 },
    { lines: [[5, 90], [9, 150]], ahead: 1 },
    { lines: [[-4, 200], [-10, 260]], crossing: 10, after: 0, maximum: 26 },
    { lines: [[-6, 180], [-6, 120]], gap: 60, maximum: 20 }
  ];
  moduleA.slots[5].questions.forEach((q, i) => {
    const expected = cases[i], [a, b] = q.visual.series;
    assert.deepEqual(q.visual.series.map(s => [s.slope, s.intercept]), expected.lines);
    const value = (s, x) => s.slope * x + s.intercept;
    if (expected.crossing !== undefined) {
      const x = (b.intercept - a.intercept) / (a.slope - b.slope);
      assert.equal(x, expected.crossing);
      assert.equal(value(a, x), value(b, x));
      const next = Math.floor(x) + 1;
      assert.ok(value(q.visual.series[expected.after], next) > value(q.visual.series[1 - expected.after], next));
      if (x > 0) {
        assert.ok(q.modelAnswer.includes(String(q.visual.baseYear + x)));
        assert.ok(q.modelAnswer.includes(String(q.visual.baseYear + next)));
      }
    } else if (expected.gap !== undefined) {
      assert.equal(a.slope, b.slope);
      for (const x of [0, 1, expected.maximum ?? 20]) assert.equal(value(a, x) - value(b, x), expected.gap);
    } else {
      const lead = q.visual.series[expected.ahead], other = q.visual.series[1 - expected.ahead];
      assert.ok(lead.intercept > other.intercept && lead.slope > other.slope);
    }
    if (expected.maximum !== undefined) {
      assert.ok(q.prompt.join("").replace(/\s/g, "").includes(`0≤x≤${expected.maximum}`));
      assert.equal(Math.min(value(a, expected.maximum), value(b, expected.maximum)), 0);
      assert.ok(Math.min(value(a, expected.maximum + 1), value(b, expected.maximum + 1)) < 0);
    }
  });
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
