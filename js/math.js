import { escapeHTML } from "./visuals.js";

let katex;
let reportError = (message, error) => console.error(message, error);

export async function initializeMath(onError = reportError) {
  reportError = onError;
  try {
    katex = (await import("../vendor/katex/katex.mjs")).default;
    return true;
  } catch (error) {
    reportError("No se pudo cargar el formato matemático. Podés seguir practicando: las fórmulas se muestran como texto LaTeX.", error);
    return false;
  }
}

export function reasoningHTML(text) {
  const pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  let html = "";
  let previous = 0;
  for (const match of text.matchAll(pattern)) {
    html += escapeHTML(text.slice(previous, match.index));
    const formula = match[1] ?? match[2];
    const displayMode = match[2] !== undefined;
    if (!katex) {
      html += `<code class="math-unavailable">${escapeHTML(match[0])}</code>`;
    } else {
      try {
        const rendered = katex.renderToString(formula, {
          displayMode, output: "htmlAndMathml", trust: false, strict: "error",
          throwOnError: true, maxExpand: 1000, maxSize: 20
        });
        html += `<span class="${displayMode ? "math-block" : "math-inline"}">${rendered}</span>`;
      } catch (error) {
        if (!(error instanceof katex.ParseError)) throw error;
        reportError("Hay una fórmula inválida en el banco. Se muestra su texto para poder corregirla.", error);
        html += `<span class="math-error" role="alert">Fórmula inválida: ${escapeHTML(formula)}</span>`;
      }
    }
    previous = match.index + match[0].length;
  }
  return html + escapeHTML(text.slice(previous));
}
