// Human-like browser behavior for anti-detection.
// Uses gaussian delays, Bezier mouse curves, variable typing speed.

function gaussian(mean, stddev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.max(0, mean + stddev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Gaussian delay — more realistic than uniform random
async function humanDelay(minMs, maxMs) {
  const mean = (minMs + maxMs) / 2;
  const stddev = (maxMs - minMs) / 4;
  await sleep(gaussian(mean, stddev));
}

// Short "thinking" pause between actions (1-4s with occasional 5-8s)
async function thinkPause() {
  if (Math.random() < 0.15) {
    // Occasional longer pause — like reading something
    await humanDelay(5000, 8000);
  } else {
    await humanDelay(1200, 3500);
  }
}

// Type text character by character with realistic timing
async function typeHuman(page, text) {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Base delay per keystroke
    let delay = gaussian(75, 25);
    // Slower after spaces and punctuation
    if (ch === ' ' || ch === '.' || ch === ',') delay += gaussian(60, 20);
    // Occasional micro-pause (like thinking mid-word)
    if (Math.random() < 0.08) delay += gaussian(300, 100);
    await page.keyboard.type(ch, { delay: 0 });
    await sleep(delay);
  }
}

// Move mouse along a Bezier curve — not a straight line
async function mouseMoveBezier(page, fromX, fromY, toX, toY) {
  const steps = randInt(15, 30);
  // Random control points for the curve
  const cp1x = fromX + (toX - fromX) * 0.3 + randInt(-60, 60);
  const cp1y = fromY + (toY - fromY) * 0.3 + randInt(-40, 40);
  const cp2x = fromX + (toX - fromX) * 0.7 + randInt(-60, 60);
  const cp2y = fromY + (toY - fromY) * 0.7 + randInt(-40, 40);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * fromX + 3 * u * u * t * cp1x + 3 * u * t * t * cp2x + t * t * t * toX;
    const y = u * u * u * fromY + 3 * u * u * t * cp1y + 3 * u * t * t * cp2y + t * t * t * toY;
    await page.mouse.move(x, y);
    // Slower at start and end, faster in the middle (ease-in-out)
    const speedFactor = Math.sin(Math.PI * t);
    await sleep(gaussian(4 + 8 * (1 - speedFactor), 2));
  }
}

// Click an element with natural mouse movement
async function humanClick(page, selector, options = {}) {
  const el = await page.$(selector);
  if (!el) return false;

  const box = await el.boundingBox();
  if (!box) return false;

  // Click somewhere near the center, not dead center
  const targetX = box.x + box.width * (0.35 + Math.random() * 0.3);
  const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

  // Get current mouse position (approximate)
  const viewport = await page.evaluate(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  const fromX = randInt(50, viewport.w - 50);
  const fromY = randInt(50, viewport.h - 50);

  await mouseMoveBezier(page, fromX, fromY, targetX, targetY);
  await sleep(gaussian(80, 30));
  await page.mouse.click(targetX, targetY);

  if (options.waitAfter) await humanDelay(options.waitAfter, options.waitAfter * 1.5);
  return true;
}

// Click an element found by XPath or text
async function humanClickByText(page, text, tag = 'button,a,[role="button"]') {
  const el = await page.evaluateHandle((text, tag) => {
    const els = document.querySelectorAll(tag);
    const norm = text.toLowerCase().trim();
    for (const e of els) {
      if (e.textContent.trim().toLowerCase().includes(norm)) return e;
    }
    return null;
  }, text, tag);

  if (!el || !(await el.asElement())) return false;

  const box = await el.asElement().boundingBox();
  if (!box) return false;

  const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
  const targetY = box.y + box.height * (0.25 + Math.random() * 0.5);

  const viewport = await page.evaluate(() => ({
    w: window.innerWidth, h: window.innerHeight,
  }));
  await mouseMoveBezier(page, randInt(100, viewport.w - 100), randInt(100, viewport.h - 100), targetX, targetY);
  await sleep(gaussian(100, 40));
  await page.mouse.click(targetX, targetY);
  return true;
}

// Scroll naturally (random amount, random speed)
async function humanScroll(page, direction = 'down', amount = null) {
  const scrollAmount = amount || randInt(200, 600);
  const sign = direction === 'up' ? -1 : 1;
  const steps = randInt(4, 10);
  const perStep = (scrollAmount * sign) / steps;

  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollBy(0, y), perStep + randInt(-20, 20));
    await sleep(gaussian(50, 15));
  }
}

// Simulate natural browsing: scroll, mouse moves, occasional pause
async function browseNaturally(page, durationMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const action = Math.random();
    if (action < 0.4) {
      // Scroll
      await humanScroll(page, Math.random() < 0.7 ? 'down' : 'up');
      await humanDelay(800, 2000);
    } else if (action < 0.7) {
      // Random mouse movement
      const vp = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
      await mouseMoveBezier(
        page,
        randInt(50, vp.w - 50), randInt(50, vp.h - 50),
        randInt(50, vp.w - 50), randInt(50, vp.h - 50),
      );
      await humanDelay(500, 1500);
    } else {
      // Pause — like reading
      await humanDelay(2000, 5000);
    }
  }
}

// Focus an input field with a click, then type
async function focusAndType(page, selector, text) {
  const clicked = await humanClick(page, selector);
  if (!clicked) return false;
  await sleep(gaussian(200, 60));
  // Triple-click to select existing content, then overwrite
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await sleep(gaussian(80, 20));
  await page.keyboard.press('Backspace');
  await sleep(gaussian(120, 40));
  await typeHuman(page, text);
  return true;
}

// Wait for selector with timeout
async function waitFor(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch {
    return false;
  }
}

// Wait for navigation with timeout
async function waitForNav(page, timeout = 15000) {
  try {
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  gaussian, randInt, sleep, humanDelay, thinkPause,
  typeHuman, mouseMoveBezier, humanClick, humanClickByText,
  humanScroll, browseNaturally, focusAndType, waitFor, waitForNav,
};
