// Self-check for figma-check.mjs against local fixture pages. Run: npm test
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cli = join(dirname(fileURLToPath(import.meta.url)), 'figma-check.mjs');
const dir = mkdtempSync(join(tmpdir(), 'figma-check-'));
const run = (...argv) => JSON.parse(execFileSync(process.execPath, [cli, ...argv], { encoding: 'utf8' }));
const fixture = (name, body) => {
  writeFileSync(join(dir, name), `<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}</style>${body}`);
  return pathToFileURL(join(dir, name)).href;
};

try {
  const box = (left) => `<div class="box" style="margin-left:${left}px;width:200px;height:100px;background:#06c;font:700 20px/30px monospace">Hi</div>`;
  const original = fixture('a.html', box(40));
  const shifted = fixture('b.html', box(60));

  // compare: a page matches its own screenshot, and a 20px shift is found where it happened.
  const shot = run('compare', '--url', original, '--width', '800', '--out', dir);
  assert.equal(shot.rendered.width, 800);
  const same = run('compare', '--url', original, '--width', '800', '--ref', shot.rendered.file, '--out', dir);
  assert.equal(same.mismatchedPixels, 0);
  assert.equal(same.sizeMatches, true);
  const moved = run('compare', '--url', shifted, '--width', '800', '--ref', shot.rendered.file, '--out', join(dir, 'moved'));
  assert.ok(moved.mismatchedPixels > 0, 'a shifted box must produce a difference');
  assert.equal(moved.regions[0].x, 40);
  assert.equal(moved.regions[0].height, 100);

  // compare at 2x: the screenshot doubles in pixels and still reports CSS pixels.
  const retina = run('compare', '--url', original, '--width', '800', '--scale', '2', '--out', join(dir, '2x'));
  assert.equal(retina.rendered.width, 800);

  // measure: geometry and computed styles come back exact, and a missing font is reported as missing.
  const missing = fixture('c.html', `<p class="t" style="font-family:'No Such Font 123',serif">Text</p>`);
  const measured = run('measure', '--url', original, '--width', '800', '--selectors', '.box');
  const el = measured.elements['.box'][0];
  assert.deepEqual(el.rect, { x: 40, y: 0, width: 200, height: 100 });
  assert.equal(el.styles['font-size'], '20px');
  assert.equal(el.styles['line-height'], '30px');
  assert.equal(el.styles['font-weight'], '700');
  assert.equal(measured.fonts[0].available, true);
  const fallback = run('measure', '--url', missing, '--width', '800', '--selectors', '.t');
  assert.deepEqual(fallback.fonts, [{ family: 'No Such Font 123', available: false }]);

  // sweep: a 500px-wide element overflows below 500px and nowhere else; clipped text and overlap are found.
  const wide = fixture('d.html', `<main><div class="wide" style="width:500px;height:20px"></div></main>`);
  const swept = run('sweep', '--url', wide, '--from', '320', '--to', '800', '--step', '80', '--also', '499,500');
  const overflowing = swept.problems.map((p) => p.width);
  assert.deepEqual(swept.tested[0], 800); // widest first
  assert.deepEqual(overflowing, [499, 480, 400, 320]);
  assert.equal(swept.problems.at(-1).overflowPx, 180);
  assert.equal(swept.problems.at(-1).offenders[0].element, 'main > div.wide');

  const messy = fixture(
    'e.html',
    `<p class="clip" style="width:100px;overflow:hidden;white-space:nowrap">A long line of text that cannot fit in its box</p>
     <div class="one" style="height:50px"></div><div class="two" style="height:50px;margin-top:-30px"></div>`,
  );
  const found = run('sweep', '--url', messy, '--from', '600', '--to', '600').problems[0];
  assert.equal(found.clipped[0].element, 'p.clip');
  assert.deepEqual([found.overlaps[0].a, found.overlaps[0].b], ['div.one', 'div.two']);

  const clean = run('sweep', '--url', original, '--from', '320', '--to', '800', '--step', '240');
  assert.equal(clean.clean, true);

  console.log('figma-check self-test passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
