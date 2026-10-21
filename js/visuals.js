export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const number = value => new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 }).format(value);

export function boxSVG(faces) {
  const [left, right] = faces.map(escapeHTML);
  return `<svg viewBox="0 0 180 155" role="img" aria-label="Caja armada: caras ${left} y ${right} juntas">
    <g stroke="#687c63" stroke-width="1.4" stroke-linejoin="round">
      <path d="M18 85 90 12 90 102Z" fill="#e8ecdc"/><path d="m90 12 72 73-72 17Z" fill="#d3ddc4"/>
      <path d="m18 85 72 17v43l-72-25Z" fill="#fafaf1"/><path d="m90 102 72-17v35l-72 25Z" fill="#e3e9d8"/>
    </g><g font-family="Segoe UI, sans-serif" font-size="22" fill="#35513b" text-anchor="middle"><text x="66" y="77">${left}</text><text x="114" y="77">${right}</text></g>
  </svg>`;
}

function netSVG(v) {
  const symbols = v.symbols.map(escapeHTML);
  const dimensions = v.dimensions ? `<g font-size="12" fill="#40553f" text-anchor="middle">
    <text x="215" y="370">Base: ${number(v.base)} cm</text>
    <text x="215" y="388">Pared: ${number(v.wall)} cm · Altura de triángulo: ${number(v.height)} cm</text>
  </g>` : "";
  return `<svg viewBox="0 0 430 ${v.dimensions ? 405 : 365}" role="img" aria-label="Desarrollo de caja: arriba ${symbols[0]}, derecha ${symbols[1]}, abajo ${symbols[2]}, izquierda ${symbols[3]}.">
    <path d="M160 127V96L215 18 270 96V127H301L397 182 301 237H270V268L215 346 160 268V237H129L33 182 129 127Z" fill="#e7ebd9" stroke="#73816a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M160 127H270V237H160Z" fill="#f8f9ee"/>
    <path d="M160 96H270M160 127H270M160 237H270M160 268H270M129 127V237M160 127V237M270 127V237M301 127V237" fill="none" stroke="#849277" stroke-dasharray="5 4" stroke-width="1.2"/>
    <g font-family="Segoe UI, sans-serif" font-size="23" fill="#35513b" text-anchor="middle"><text x="215" y="78">${symbols[0]}</text><text x="337" y="190">${symbols[1]}</text><text x="215" y="300">${symbols[2]}</text><text x="94" y="190">${symbols[3]}</text></g>
    ${dimensions}
  </svg>`;
}

function chartSVG(v) {
  const colors = ["#216347", "#ba6638"];
  const maximum = Math.max(...v.series.flatMap(s => [s.intercept, s.intercept + s.slope * 5]));
  const minimum = Math.min(0, ...v.series.flatMap(s => [s.intercept, s.intercept + s.slope * 5]));
  const step = Math.max(1, Math.ceil((maximum - minimum) / 5 / 10) * 10);
  const ymax = minimum + step * 5;
  const x = n => 62 + n * 86;
  const y = n => 235 - (n - minimum) / (ymax - minimum) * 200;
  const grid = Array.from({ length: 6 }, (_, i) => {
    const value = minimum + i * step;
    return `<path d="M62 ${y(value)}H492" stroke="#d8dfd1"/><text x="50" y="${y(value) + 4}" text-anchor="end">${number(value)}</text>
      <path d="M${x(i)} 35V235" stroke="#e1e6da"/><text x="${x(i)}" y="258" text-anchor="middle">${i}</text>`;
  }).join("");
  const series = v.series.map((s, i) => {
    const equation = `y = ${number(s.slope)}x ${s.intercept < 0 ? "−" : "+"} ${number(Math.abs(s.intercept))}`;
    return `<path d="M${x(0)} ${y(s.intercept)} L${x(5)} ${y(s.intercept + s.slope * 5)}" fill="none" stroke="${colors[i]}" stroke-width="2.5"/>
      ${Array.from({ length: 6 }, (_, n) => `<circle cx="${x(n)}" cy="${y(s.intercept + s.slope * n)}" r="4" fill="${colors[i]}"/>`).join("")}
      <circle cx="68" cy="${300 + i * 24}" r="4" fill="${colors[i]}"/>
      <text x="80" y="${304 + i * 24}" fill="${colors[i]}">${escapeHTML(s.label)}: ${equation}</text>`;
  }).join("");
  return `<svg viewBox="0 0 550 345" role="img" aria-label="${escapeHTML(v.unit)} según años desde ${v.baseYear}">
    <g font-family="Segoe UI, sans-serif" font-size="12" fill="#51624d">${grid}
      <path d="M62 35V235H492" fill="none" stroke="#819077"/>
      <text x="62" y="18">${escapeHTML(v.unit)}</text>
      <text x="492" y="282" text-anchor="end">x: años desde ${v.baseYear}</text>${series}
    </g></svg>`;
}

export function visualHTML(visual) {
  if (!visual) return "";
  const svg = visual.kind === "net" ? netSVG(visual) : chartSVG(visual);
  const caption = visual.kind === "net" ? "Ilustración esquemática propia. Las medidas no están a escala." :
    visual.series.map(s => `${s.label}: y = ${number(s.slope)}x ${s.intercept < 0 ? "−" : "+"} ${number(Math.abs(s.intercept))}`).join(" · ");
  return `<figure class="visual">${svg}<figcaption>${escapeHTML(caption)}</figcaption></figure>`;
}
