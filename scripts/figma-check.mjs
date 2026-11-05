#!/usr/bin/env node
// Instruments for checking a rendered page against its Figma frame.
// Every command prints one JSON object on stdout; errors go to stderr with exit code 1.
import { parseArgs } from 'node:util';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: node figma-check.mjs <command> --url <url> [options]

compare   Screenshot the page and, with --ref, pixel-diff it against a Figma export.
          --width <px>       viewport width; use the Figma frame's width (required)
          --ref <png>        Figma export of the frame; omit to only take the screenshot
          --scale <n>        scale the reference was exported at (default 1)
          --selector <css>   compare one element instead of the full page
          --out <dir>        where rendered.png and diff.png go (default .)
          --threshold <0-1>  per-pixel color tolerance (default 0.1)

measure   Report geometry, computed styles and font availability.
          --width <px>       viewport width (required)
          --selectors <a,b>  comma-separated CSS selectors (required)

sweep     Look for overflow, clipped content and overlap across viewport widths.
          --from <px> --to <px> --step <px>   defaults 320, 1920, 40; runs widest first
          --also <a,b>       extra widths, such as each breakpoint and one pixel either side
          --out <dir>        save a screenshot at each width that has a problem`;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const dep = async (name) => {
  try {
    return await import(name);
  } catch {
    fail(`Missing dependency "${name}". Run: npm install --prefix "${scriptsDir}"`);
  }
};

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: 'string' },
    width: { type: 'string' },
    ref: { type: 'string' },
    scale: { type: 'string', default: '1' },
    selector: { type: 'string' },
    selectors: { type: 'string' },
    out: { type: 'string', default: '.' },
    threshold: { type: 'string', default: '0.1' },
    from: { type: 'string', default: '320' },
    to: { type: 'string', default: '1920' },
    step: { type: 'string', default: '40' },
    also: { type: 'string', default: '' },
  },
});
const command = positionals[0];

const number = (name) => {
  const value = Number(args[name]);
  if (!Number.isFinite(value) || value <= 0) fail(`--${name} must be a positive number.\n\n${USAGE}`);
  return value;
};

async function launch() {
  const { chromium } = await dep('playwright-core');
  const errors = [];
  // Installed Chrome or Edge first, so nothing has to be downloaded.
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel });
    } catch (error) {
      errors.push(String(error.message).split('\n')[0]);
    }
  }
  fail(`No browser could be started. Install Google Chrome, or run: npx playwright install chromium\n${errors.join('\n')}`);
}

async function openPage(browser, width, scale = 1) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: scale, // fixed, so Windows display scaling cannot change the result
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const response = await page.goto(args.url, { waitUntil: 'networkidle' }).catch((error) => {
    fail(`Could not load ${args.url}: ${String(error.message).split('\n')[0]}. Is the app running?`);
  });
  if (response && response.status() >= 400) fail(`${args.url} returned HTTP ${response.status()}.`);
  await settle(page);
  return page;
}

// Lazy images and late fonts would otherwise show up as false differences.
const settle = (page) =>
  page.evaluate(async () => {
    for (const img of document.images) img.loading = 'eager';
    await Promise.all(
      [...document.images].map((img) => img.complete || new Promise((done) => (img.onload = img.onerror = done))),
    );
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });

async function compare() {
  const width = number('width');
  const scale = number('scale');
  const { PNG } = await dep('pngjs');
  const browser = await launch();
  const page = await openPage(browser, width, scale);

  const options = { animations: 'disabled', caret: 'hide' };
  let buffer;
  if (args.selector) {
    const element = page.locator(args.selector).first();
    if (!(await element.count())) fail(`No element matches ${args.selector}.`);
    buffer = await element.screenshot(options);
  } else {
    buffer = await page.screenshot({ ...options, fullPage: true });
  }
  await browser.close();

  mkdirSync(args.out, { recursive: true });
  const renderedPath = join(args.out, 'rendered.png');
  writeFileSync(renderedPath, buffer);
  const rendered = PNG.sync.read(buffer);
  const css = (px) => Math.round((px / scale) * 100) / 100;
  const result = {
    width,
    scale,
    rendered: { width: css(rendered.width), height: css(rendered.height), file: renderedPath },
  };
  if (!args.ref) return result;

  const { default: pixelmatch } = await dep('pixelmatch');
  let ref;
  try {
    ref = PNG.sync.read(readFileSync(args.ref));
  } catch (error) {
    fail(`Could not read the reference image ${args.ref}: ${error.message}`);
  }
  // Compare the area both images share; a size difference is reported, since it is itself a deviation.
  const w = Math.min(ref.width, rendered.width);
  const h = Math.min(ref.height, rendered.height);
  const crop = (png) => {
    if (png.width === w && png.height === h) return png.data;
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(png, out, 0, 0, w, h, 0, 0);
    return out.data;
  };
  const diff = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(crop(ref), crop(rendered), diff.data, w, h, { threshold: Number(args.threshold) });
  const diffPath = join(args.out, 'diff.png');
  writeFileSync(diffPath, PNG.sync.write(diff));

  return {
    ...result,
    reference: { width: css(ref.width), height: css(ref.height) },
    sizeMatches: ref.width === rendered.width && ref.height === rendered.height,
    mismatchedPixels: mismatched,
    mismatchPercent: Math.round((mismatched / (w * h)) * 10000) / 100,
    regions: regions(diff, w, h).map((r) => ({
      x: css(r.x0),
      y: css(r.y0),
      width: css(r.x1 - r.x0 + 1),
      height: css(r.y1 - r.y0 + 1),
      pixels: r.pixels,
    })),
    diff: diffPath,
  };
}

// Group differing pixels into horizontal bands so the caller knows where on the page to look.
function regions(diff, w, h) {
  const bands = [];
  let band = null;
  for (let y = 0; y < h; y++) {
    let x0 = -1;
    let x1 = -1;
    let pixels = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // pixelmatch paints real differences pure red; anti-aliasing is yellow and is ignored.
      if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) {
        if (x0 < 0) x0 = x;
        x1 = x;
        pixels++;
      }
    }
    if (!pixels) continue;
    if (band && y - band.y1 <= 8) {
      band.y1 = y;
      band.x0 = Math.min(band.x0, x0);
      band.x1 = Math.max(band.x1, x1);
      band.pixels += pixels;
    } else {
      band = { x0, x1, y0: y, y1: y, pixels };
      bands.push(band);
    }
  }
  return bands.sort((a, b) => b.pixels - a.pixels).slice(0, 12);
}

async function measure() {
  const width = number('width');
  const selectors = (args.selectors ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!selectors.length) fail(`--selectors is required.\n\n${USAGE}`);
  const browser = await launch();
  const page = await openPage(browser, width);

  const result = await page.evaluate((selectors) => {
    const PROPS = [
      'display', 'position', 'box-sizing',
      'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'text-transform', 'text-align', 'text-decoration-line', 'color',
      'background-color', 'background-image',
      'border-width', 'border-style', 'border-color', 'border-radius', 'outline', 'box-shadow',
      'opacity', 'padding', 'margin', 'gap',
      'flex-direction', 'justify-content', 'align-items', 'flex-grow', 'flex-shrink', 'flex-basis',
      'object-fit', 'filter', 'backdrop-filter',
    ];
    const round = (n) => Math.round(n * 100) / 100;
    const families = new Set();
    const elements = {};
    for (const selector of selectors) {
      elements[selector] = [...document.querySelectorAll(selector)].slice(0, 20).map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        families.add(style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''));
        return {
          text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
          rect: {
            x: round(rect.left + scrollX),
            y: round(rect.top + scrollY),
            width: round(rect.width),
            height: round(rect.height),
          },
          styles: Object.fromEntries(PROPS.map((prop) => [prop, style.getPropertyValue(prop)])),
        };
      });
    }
    // A family is available when text set in it measures differently from the generic fallbacks.
    // document.fonts.check() cannot tell, because it returns true for families nobody declared.
    const context = document.createElement('canvas').getContext('2d');
    const textWidth = (font) => {
      context.font = `32px ${font}`;
      return context.measureText('mmmmmmmmmlli 0123456789 WQgj').width;
    };
    const generics = ['monospace', 'serif', 'sans-serif', 'system-ui'];
    const fonts = [...families].map((family) => ({
      family,
      available: generics.includes(family) || ['monospace', 'serif'].some((g) => textWidth(`"${family}", ${g}`) !== textWidth(g)),
    }));
    const faces = [...document.fonts].map((face) => ({ family: face.family, weight: face.weight, style: face.style, status: face.status }));
    return { fonts, faces, elements };
  }, selectors);

  await browser.close();
  return { width, ...result };
}

async function sweep() {
  const from = number('from');
  const to = number('to');
  const step = number('step');
  const widths = new Set(args.also.split(',').map(Number).filter((n) => n > 0));
  for (let w = from; w <= to; w += step) widths.add(w);
  widths.add(to);
  const tested = [...widths].sort((a, b) => b - a); // widest first: desktop down to mobile

  const browser = await launch();
  const page = await openPage(browser, tested[0]);
  const problems = [];
  for (const width of tested) {
    await page.setViewportSize({ width, height: 900 });
    await settle(page);
    const found = await page.evaluate(inspectLayout);
    if (!found.overflowPx && !found.clipped.length && !found.overlaps.length) continue;
    if (args.out !== '.') {
      mkdirSync(args.out, { recursive: true });
      found.screenshot = join(args.out, `w${width}.png`);
      await page.screenshot({ path: found.screenshot, fullPage: true, animations: 'disabled', caret: 'hide' });
    }
    problems.push({ width, ...found });
  }
  await browser.close();
  return { tested, clean: problems.length === 0, problems };
}

// Runs in the page.
function inspectLayout() {
  const LIMIT = 10;
  const viewport = document.documentElement.clientWidth;
  const name = (el) => {
    const parts = [];
    for (let node = el; node && node !== document.body && parts.length < 3; node = node.parentElement) {
      const classes = [...node.classList].map((c) => `.${c}`).join('');
      parts.unshift(node.id ? `#${node.id}` : node.tagName.toLowerCase() + classes);
    }
    return parts.join(' > ');
  };
  const rectOf = (el) => el.getBoundingClientRect();
  const all = [...document.body.querySelectorAll('*')].filter((el) => {
    const style = getComputedStyle(el);
    const rect = rectOf(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });

  // Content inside a scroller or a clipping box does not widen the page.
  const contained = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== 'visible') return true;
    }
    return false;
  };
  const overflowPx = Math.max(0, document.documentElement.scrollWidth - viewport);
  let offenders = [];
  if (overflowPx) {
    const past = all.filter((el) => (rectOf(el).right > viewport + 0.5 || rectOf(el).left < -0.5) && !contained(el));
    // The innermost elements are the cause; their ancestors only stretch around them.
    offenders = past.filter((el) => !past.some((other) => other !== el && el.contains(other)));
  }

  const clipped = all.filter((el) => {
    const style = getComputedStyle(el);
    const clips = [style.overflowX, style.overflowY].some((v) => v === 'hidden' || v === 'clip') || style.textOverflow === 'ellipsis';
    return clips && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  });

  const overlaps = [];
  for (const parent of [document.body, ...all]) {
    const kids = [...parent.children].filter((el) => all.includes(el) && ['static', 'relative'].includes(getComputedStyle(el).position));
    for (let i = 0; i < kids.length && overlaps.length < LIMIT; i++) {
      for (let j = i + 1; j < kids.length && overlaps.length < LIMIT; j++) {
        const a = rectOf(kids[i]);
        const b = rectOf(kids[j]);
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) overlaps.push({ a: name(kids[i]), b: name(kids[j]), by: `${Math.round(w)}x${Math.round(h)}px` });
      }
    }
  }

  return {
    overflowPx,
    offenders: offenders.slice(0, LIMIT).map((el) => ({ element: name(el), right: Math.round(rectOf(el).right), width: Math.round(rectOf(el).width) })),
    clipped: clipped.slice(0, LIMIT).map((el) => ({
      element: name(el),
      content: `${el.scrollWidth}x${el.scrollHeight}`,
      box: `${el.clientWidth}x${el.clientHeight}`,
      ellipsis: getComputedStyle(el).textOverflow === 'ellipsis',
    })),
    overlaps,
  };
}

const commands = { compare, measure, sweep };
if (!commands[command] || !args.url) fail(USAGE);
console.log(JSON.stringify(await commands[command](), null, 2));
