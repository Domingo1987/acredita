import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { initializeMath, reasoningHTML } from "../js/math.js";
import { errorGuidance } from "../js/core.js";

const bank = JSON.parse(readFileSync(new URL("../data/activities.json", import.meta.url), "utf8"));
const questions = bank.modules[0].slots.flatMap(slot => slot.questions);
const failures = [];

test("sin el motor, una fórmula sigue disponible como texto escapado", () => {
  const result = reasoningHTML("Precio: $200. \\[x<10\\]");
  assert.match(result, /Precio: \$200/);
  assert.match(result, /class="math-unavailable"/);
  assert.match(result, /x&lt;10/);
});

test("KaTeX carga desde el proyecto y genera HTML y MathML accesible", async () => {
  assert.equal(await initializeMath((message, error) => failures.push({ message, error })), true);
  const result = reasoningHTML("Planteo: \\[m=\\frac{810}{0{,}675}\\]");
  assert.match(result, /class="math-block"/);
  assert.match(result, /class="katex-html" aria-hidden="true"/);
  assert.match(result, /<math/);
  assert.match(result, /<mfrac>/);
  assert.equal(failures.length, 0);
});

test("el texto plano, los pesos y las respuestas de usuario no se interpretan como HTML", () => {
  assert.equal(reasoningHTML('<img src=x onerror="alert(1)"> $60 & $20'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; $60 &amp; $20");
  const result = reasoningHTML('Antes <b> \\(x^2\\) después & fin');
  assert.match(result, /Antes &lt;b&gt;/);
  assert.match(result, /class="math-inline"/);
  assert.match(result, /después &amp; fin/);
});

test("las fórmulas inválidas tienen un aviso explícito y no interrumpen el resto del texto", () => {
  const start = failures.length;
  const result = reasoningHTML("Antes \\[\\frac{1}\\] después");
  assert.match(result, /role="alert"/);
  assert.match(result, /Fórmula inválida/);
  assert.match(result, /después$/);
  assert.equal(failures.length, start + 1);
  assert.match(failures.at(-1).message, /inválida/);
});

test("el contenido matemático no habilita enlaces ni extensiones HTML no confiables", () => {
  const result = reasoningHTML('\\(\\href{javascript:alert(1)}{abrir}\\)');
  assert.doesNotMatch(result, /<a\b|href=|<script\b|onclick=/i);
});

test("todas las fórmulas del banco son válidas y sus delimitadores están completos", () => {
  const start = failures.length;
  let formulas = 0;
  function visit(value) {
    if (typeof value === "string") {
      const matches = [...value.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)];
      const remainder = value.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g, "");
      assert.doesNotMatch(remainder, /\\[\[\]()]/, `Delimitador incompleto: ${value}`);
      if (matches.length) {
        const result = reasoningHTML(value);
        assert.doesNotMatch(result, /math-error|math-unavailable/);
        formulas += matches.length;
      }
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  }
  visit(bank);
  assert.ok(formulas >= 140, `Solo se encontraron ${formulas} fórmulas.`);
  assert.equal(failures.length, start);
});

test("las 45 parejas incorrectas generan fórmulas válidas, sin cambiar sus respuestas", () => {
  const start = failures.length;
  for (const q of questions.filter(item => item.type === "select")) {
    for (const a of q.fields[0].options) {
      for (const b of q.fields[1].options) {
        if (a.id === q.fields[0].answer && b.id === q.fields[1].answer) continue;
        const answer = { [q.fields[0].id]: a.id, [q.fields[1].id]: b.id };
        const previous = structuredClone(answer);
        const result = reasoningHTML(errorGuidance(q, answer).calculation);
        assert.equal((result.match(/class="math-block"/g) ?? []).length, 2);
        assert.doesNotMatch(result, /math-error/);
        assert.deepEqual(answer, previous);
      }
    }
  }
  assert.equal(failures.length, start);
});

test("CSS, fuentes, biblioteca y licencia se publican localmente", () => {
  const root = new URL("../vendor/katex/", import.meta.url);
  const css = readFileSync(new URL("katex.min.css", root), "utf8");
  assert.ok(existsSync(new URL("katex.mjs", root)));
  assert.match(readFileSync(new URL("LICENSE", root), "utf8"), /MIT License/);
  const fonts = [...css.matchAll(/url\((fonts\/[^)]+)\)/g)];
  assert.ok(fonts.length > 10);
  for (const font of fonts) assert.ok(existsSync(new URL(font[1], root)), `Fuente faltante: ${font[1]}`);
  assert.doesNotMatch(css, /https?:\/\//);
});
