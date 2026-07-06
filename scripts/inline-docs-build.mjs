import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = resolve(rootDir, "docs");
const indexPath = resolve(docsDir, "index.html");

let html = await readFile(indexPath, "utf8");

html = await inlineAsset(
  html,
  /<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+\.css)">/,
  async (assetName) => {
    const css = await readFile(resolve(docsDir, "assets", assetName), "utf8");
    return `<style>\n${escapeInlineStyle(css)}\n</style>`;
  }
);

html = await inlineAsset(
  html,
  /<script type="module" crossorigin src="\.\/assets\/([^"]+\.js)"><\/script>/,
  async (assetName) => {
    const js = await readFile(resolve(docsDir, "assets", assetName), "utf8");
    return `<script type="module">\n${escapeInlineScript(js)}\n</script>`;
  }
);

await writeFile(indexPath, html, "utf8");
await rm(resolve(docsDir, "assets"), { recursive: true, force: true });

async function inlineAsset(source, pattern, replacer) {
  const match = source.match(pattern);
  if (!match) return source;

  const replacement = await replacer(match[1]);
  return source.replace(pattern, () => replacement);
}

function escapeInlineScript(value) {
  return value.replaceAll("</script", "<\\\\/script").replaceAll("<!--", "<\\!--");
}

function escapeInlineStyle(value) {
  return value.replaceAll("</style", "<\\\\/style");
}
