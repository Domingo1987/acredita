import { copyFile, cp, mkdir } from "node:fs/promises";

const source = new URL("../node_modules/katex/", import.meta.url);
const destination = new URL("../vendor/katex/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ["katex.mjs", "katex.min.css"]) {
  await copyFile(new URL(`dist/${name}`, source), new URL(name, destination));
}
await cp(new URL("dist/fonts/", source), new URL("fonts/", destination), { recursive: true });
await copyFile(new URL("LICENSE", source), new URL("LICENSE", destination));
console.log("KaTeX, sus fuentes y su licencia están disponibles en vendor\\katex.");
