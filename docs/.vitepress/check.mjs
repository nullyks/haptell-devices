import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const output = new URL("./dist/", import.meta.url);
const firmware = new URL("../../firmware/", import.meta.url);
const site = new URL("https://nullyks.github.io/haptell-devices/");
const files = await readdir(output, { recursive: true, withFileTypes: true });
const pages = new Map();
const assets = new Set();

for (const file of files) {
  if (!file.isFile()) continue;
  const url = pathToFileURL(join(file.parentPath, file.name));
  const path = url.href.slice(output.href.length);
  assets.add(path);
  if (path.endsWith(".html")) pages.set(path, await readFile(url, "utf8"));
}

for (const [page, html] of pages) {
  assert.match(html, /<html\b[^>]*\blang="en"/, page);
  for (const [, attribute] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = new URL(attribute, new URL(page, site));
    if (url.origin !== site.origin) continue;
    assert.ok(url.pathname.startsWith(site.pathname), `${page} links outside the site base: ${attribute}`);
    const path = url.pathname.slice(site.pathname.length);
    const candidates = path.endsWith("/") || !path ? [`${path}index.html`] : [path, `${path}.html`];
    const target = candidates.find((candidate) => assets.has(candidate));
    assert.ok(target, `${page} links to a missing target: ${attribute}`);
    if (url.hash.length > 1 && pages.has(target)) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(pages.get(target).includes(`id="${id}"`), `${page} links to a missing anchor: ${attribute}`);
    }
  }
}

const deviceGuides = [...pages.values()].filter((html) => html.includes('class="wiring-diagram"'));
assert.equal(deviceGuides.length, 8, "Each hardware variant needs an illustrated device guide.");
for (const guide of deviceGuides) {
  for (const section of ["identify-your-device", "wire-the-circuit", "upload-the-firmware", "run-the-first-test"]) {
    assert.ok(guide.includes(`id="${section}"`), `Missing device guide section: ${section}`);
  }
}

const compatibility = pages.get("firmware-variants.html");
const sketches = (await readdir(firmware, { withFileTypes: true })).filter((entry) => entry.isDirectory());
for (const { name } of sketches) {
  const path = `${name}/${name}.ino`;
  if (!(await stat(new URL(path, firmware), { throwIfNoEntry: false }))?.isFile()) continue;
  assert.ok(compatibility.includes(`/firmware/${path}"`), `Missing firmware compatibility entry: ${path}`);
}

console.log(`Checked internal links and anchors on ${pages.size} English pages and all ${deviceGuides.length} device diagrams.`);
