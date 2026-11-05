// Playwright responsive test cases (through figma-check.mjs) on local fixtures. Run: npm run test:responsive
// Copy a case and point `--url` at a real screen to use it as a project test.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cli = join(dirname(fileURLToPath(import.meta.url)), 'figma-check.mjs');
const dir = mkdtempSync(join(tmpdir(), 'responsive-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const run = (...argv) => JSON.parse(execFileSync(process.execPath, [cli, ...argv], { encoding: 'utf8' }));
const page = (name, css, body) => {
  writeFileSync(join(dir, name), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;box-sizing:border-box}body{font:16px/24px sans-serif}${css}</style>${body}`);
  return pathToFileURL(join(dir, name)).href;
};
const FULL = ['--from', '320', '--to', '1920', '--step', '320', '--also', '375,1440'];

// A container that centres at 1200px, with a card grid that stacks below 768px: the pattern the plugin generates.
const good = page(
  'good.html',
  `.container{width:100%;max-width:1200px;margin-inline:auto;padding-inline:16px}
   .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
   .card{height:80px;background:#06c}
   .btn{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}
   @media (max-width:767px){.grid{grid-template-columns:1fr}}`,
  `<main class="container"><div class="grid"><div class="card"></div><div class="card"></div><div class="card"></div></div><a class="btn" href="#">Go</a></main>`,
);

describe('responsive sweep 1920px down to 320px', () => {
  it('a well-built screen is clean at every width and tests the widest first', () => {
    const r = run('sweep', '--url', good, ...FULL);
    assert.equal(r.tested[0], 1920);
    assert.equal(r.tested.at(-1), 320);
    assert.ok(r.tested.includes(375) && r.tested.includes(1440));
    assert.equal(r.clean, true, JSON.stringify(r.problems));
  });

  it('flags a fixed-width element as horizontal overflow only where it does not fit', () => {
    const url = page('fixed.html', '', `<main><div class="fixed" style="width:600px;height:20px"></div></main>`);
    const r = run('sweep', '--url', url, '--from', '320', '--to', '1920', '--step', '320', '--also', '375,599,600');
    assert.deepEqual(r.problems.map((p) => p.width).sort((a, b) => b - a), [599, 375, 320]);
    assert.equal(r.problems.at(-1).overflowPx, 280);
  });

  it('flags text clipped by a fixed-width box', () => {
    const url = page('clip.html', '', `<p class="clip" style="width:120px;overflow:hidden;white-space:nowrap">A long heading that cannot fit</p>`);
    const r = run('sweep', '--url', url, '--from', '375', '--to', '375');
    assert.equal(r.problems[0].clipped[0].element, 'p.clip');
  });

  it('flags overlapping sections', () => {
    const url = page('overlap.html', '', `<div class="a" style="height:60px"></div><div class="b" style="height:60px;margin-top:-30px"></div>`);
    const r = run('sweep', '--url', url, '--from', '375', '--to', '375');
    assert.deepEqual([r.problems[0].overlaps[0].a, r.problems[0].overlaps[0].b], ['div.a', 'div.b']);
  });

  it('saves a screenshot for every tested width, passing ones included (qa/<screen>/<section>/w<width>.png)', () => {
    const out = join(dir, 'qa');
    const r = run('sweep', '--url', good, ...FULL, '--out', out, '--all', '--selector', '.container');
    assert.equal(r.screenshots.length, r.tested.length);
    assert.ok(r.screenshots.every((p) => existsSync(p)));
  });
});

describe('mobile layout measurements', () => {
  it('stacks the card grid to one column at 375px and three columns at 1440px', () => {
    const wide = run('measure', '--url', good, '--width', '1440', '--selectors', '.card').elements['.card'];
    const narrow = run('measure', '--url', good, '--width', '375', '--selectors', '.card').elements['.card'];
    assert.equal(new Set(wide.map((c) => c.rect.y)).size, 1, 'one row at 1440px');
    assert.equal(new Set(narrow.map((c) => c.rect.y)).size, 3, 'three rows at 375px');
  });

  it('keeps the container inside the viewport with its gutter at 375px', () => {
    const [c] = run('measure', '--url', good, '--width', '375', '--selectors', '.container').elements['.container'];
    assert.equal(c.rect.x, 0);
    assert.equal(c.rect.width, 375);
  });

  it('keeps interactive controls at least 44x44px on mobile', () => {
    const [b] = run('measure', '--url', good, '--width', '375', '--selectors', '.btn').elements['.btn'];
    assert.ok(b.rect.width >= 44 && b.rect.height >= 44, `${b.rect.width}x${b.rect.height}`);
  });

  it('centres the content at its frame width above the widest frame', () => {
    const [c] = run('measure', '--url', good, '--width', '1920', '--selectors', '.container').elements['.container'];
    assert.equal(c.rect.width, 1200);
    assert.equal(c.rect.x, 360);
  });
});
