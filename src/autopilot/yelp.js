// Yelp listing creation flow — connects to a GoLogin browser via puppeteer
// and drives the full claim/add flow with human-like behavior.

const h = require('./human');
const log = require('../log');

// Status constants
const STATUS = {
  IDLE: 'idle',
  BROWSING: 'browsing',       // Natural navigation phase
  SEARCHING: 'searching',     // Searching for business on Yelp
  FILLING: 'filling',         // Filling the add/claim form
  SUBMITTING: 'submitting',   // Submitting the form
  WAITING_SMS: 'waiting_sms', // Paused — SMS code needed
  WAITING_CAPTCHA: 'waiting_captcha', // Paused — captcha/PerimeterX
  WAITING_VIDEO: 'waiting_video',     // Paused — video ID required
  DONE: 'done',
  ERROR: 'error',
};

class YelpFlow {
  constructor(page, nap, options = {}) {
    this.page = page;
    this.nap = nap;
    this.status = STATUS.IDLE;
    this.statusMessage = '';
    this.resultUrl = null;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.browseTime = options.browseTime || 30000; // 30s default
  }

  _setStatus(status, msg = '') {
    this.status = status;
    this.statusMessage = msg;
    log.info(`[yelp] ${status}: ${msg}`);
    this.onStatusChange(status, msg);
  }

  // ── Phase 1: Natural browsing (anti-detection warmup) ─────────
  async warmup() {
    this._setStatus(STATUS.BROWSING, 'Navigation naturelle sur Yelp...');

    // Go to Yelp homepage first
    await this.page.goto('https://www.yelp.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await h.sleep(h.gaussian(2000, 500));

    // Dismiss cookie banner if present
    await this._dismissCookies();

    // Browse naturally for the configured duration
    await h.browseNaturally(this.page, this.browseTime);
  }

  // ── Phase 2: Navigate to claim/add page ───────────────────────
  async navigateToAdd() {
    this._setStatus(STATUS.SEARCHING, 'Navigation vers la page d\'ajout...');

    await this.page.goto('https://biz.yelp.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await h.humanDelay(2000, 4000);

    // Dismiss cookies again if on biz subdomain
    await this._dismissCookies();

    // Check if we need to log in
    const needsLogin = await this.page.evaluate(() => {
      const url = window.location.href;
      return url.includes('/login') || url.includes('/signup') ||
        !!document.querySelector('a[href*="login"], a[href*="signup"]');
    });

    if (needsLogin) {
      this._setStatus(STATUS.ERROR, 'Connexion Yelp requise — le profil GoLogin doit etre deja connecte');
      return false;
    }

    return true;
  }

  // ── Phase 3: Search for the business ──────────────────────────
  async searchBusiness() {
    this._setStatus(STATUS.SEARCHING, `Recherche de "${this.nap.name}"...`);

    // Look for the search input
    const searchSelector = 'input[placeholder*="business"], input[name*="business"], input[type="text"]';
    const hasSearch = await h.waitFor(this.page, searchSelector, 5000);

    if (hasSearch) {
      await h.thinkPause();
      await h.focusAndType(this.page, searchSelector, this.nap.name);
      await h.humanDelay(500, 1000);

      // Press Enter or click search button
      await this.page.keyboard.press('Enter');
      await h.humanDelay(3000, 5000);

      // Check if business was found in results
      const found = await this.page.evaluate((name) => {
        const norm = name.toLowerCase().trim();
        const results = document.querySelectorAll('a, [role="link"], .search-result, .result');
        for (const r of results) {
          if (r.textContent.toLowerCase().includes(norm)) return true;
        }
        return false;
      }, this.nap.name);

      if (found) {
        log.info('[yelp] Business found in search — will try to claim');
        // Try to click "Claim this business" or similar
        const claimed = await h.humanClickByText(this.page, 'Claim', 'a,button,[role="button"]');
        if (claimed) {
          await h.humanDelay(3000, 5000);
          return 'claim';
        }
      }
    }

    // Business not found or no search — click "Add" button
    log.info('[yelp] Business not found — will add new');

    const addClicked = await h.humanClickByText(this.page, 'Add', 'a,button,[role="button"]') ||
      await h.humanClickByText(this.page, "Can't find", 'a,button,span,div') ||
      await h.humanClickByText(this.page, 'add your business', 'a,button,span');

    if (addClicked) {
      await h.humanDelay(3000, 5000);
      return 'add';
    }

    // Fallback: navigate directly
    await this.page.goto('https://biz.yelp.com/claim', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await h.humanDelay(2000, 4000);
    return 'add';
  }

  // ── Phase 4: Fill the form ────────────────────────────────────
  async fillForm() {
    this._setStatus(STATUS.FILLING, 'Remplissage du formulaire...');

    // Check for PerimeterX / captcha
    if (await this._checkBlocked()) return false;

    const fields = [
      { labels: ['Business name', 'business name', 'name'], value: this.nap.name },
      { labels: ['Address', 'street', 'address'], value: this.nap.street },
      { labels: ['City', 'city'], value: this.nap.city },
      { labels: ['State', 'state'], value: this.nap.state, isSelect: true },
      { labels: ['Zip', 'postal', 'zip code'], value: this.nap.zip },
      { labels: ['Phone', 'telephone', 'phone number'], value: this.nap.phone },
      { labels: ['Website', 'url', 'web site'], value: this.nap.website || '' },
    ];

    let filledCount = 0;

    for (const field of fields) {
      if (!field.value) continue;

      // Think before each field
      await h.thinkPause();

      // Check for blocks between fields
      if (await this._checkBlocked()) return false;

      // Find the field by label matching
      const filled = await this.page.evaluate((labels, value, isSelect) => {
        function normalize(s) {
          return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
        }

        const inputs = document.querySelectorAll(isSelect ? 'select' : 'input, textarea');
        for (const el of inputs) {
          if (el.offsetParent === null && el.tagName !== 'SELECT') continue;
          if (el.disabled || el.readOnly) continue;
          if (['hidden', 'submit', 'button', 'checkbox', 'radio'].includes(el.type)) continue;

          const signals = [];
          if (el.id) {
            const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lbl) signals.push(lbl.textContent.trim());
          }
          if (el.closest('label')) signals.push(el.closest('label').textContent.trim());
          if (el.placeholder) signals.push(el.placeholder);
          if (el.name) signals.push(el.name);
          if (el.getAttribute('aria-label')) signals.push(el.getAttribute('aria-label'));

          const combined = normalize(signals.join(' '));
          for (const label of labels) {
            if (combined.includes(normalize(label))) {
              // Return the element's unique selector
              el.dataset._apTarget = '1';
              return true;
            }
          }
        }
        return false;
      }, field.labels, field.value, field.isSelect || false);

      if (filled) {
        const targetSelector = '[data-_ap-target="1"]';
        if (field.isSelect) {
          // Select dropdown
          await h.humanClick(this.page, targetSelector);
          await h.humanDelay(300, 600);
          await this.page.select(targetSelector, field.value);
          await h.humanDelay(200, 400);
        } else {
          await h.focusAndType(this.page, targetSelector, field.value);
        }

        // Clean up marker
        await this.page.evaluate(() => {
          const el = document.querySelector('[data-_ap-target="1"]');
          if (el) delete el.dataset._apTarget;
        });

        filledCount++;
        this._setStatus(STATUS.FILLING, `${filledCount}/${fields.length} champs remplis`);
      }
    }

    // Handle category if needed
    await this._fillCategory();

    return filledCount > 0;
  }

  // ── Phase 5: Submit ───────────────────────────────────────────
  async submit() {
    this._setStatus(STATUS.SUBMITTING, 'Soumission du formulaire...');

    await h.thinkPause();

    // Look for submit button
    const submitted = await h.humanClickByText(this.page, 'Submit', 'button,input[type="submit"]') ||
      await h.humanClickByText(this.page, 'Add', 'button,input[type="submit"]') ||
      await h.humanClickByText(this.page, 'Claim', 'button,input[type="submit"]') ||
      await h.humanClickByText(this.page, 'Continue', 'button,input[type="submit"]') ||
      await h.humanClickByText(this.page, 'Verify', 'button,input[type="submit"]');

    if (!submitted) {
      // Try generic submit button
      const genericSubmit = await this.page.$('button[type="submit"], input[type="submit"], form button:last-of-type');
      if (genericSubmit) {
        const box = await genericSubmit.boundingBox();
        if (box) {
          await h.mouseMoveBezier(this.page, h.randInt(100, 400), h.randInt(100, 400), box.x + box.width / 2, box.y + box.height / 2);
          await h.sleep(h.gaussian(150, 50));
          await genericSubmit.click();
        }
      }
    }

    await h.humanDelay(3000, 6000);
    return true;
  }

  // ── Phase 6: Handle verification ──────────────────────────────
  async handleVerification() {
    // Wait a bit for the page to settle
    await h.humanDelay(2000, 4000);

    // Check what type of verification Yelp wants
    const verifyType = await this.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();

      if (text.includes('verification code') || text.includes('verify your phone') ||
          text.includes('text message') || text.includes('sms') ||
          text.includes('enter the code') || text.includes('call you')) {
        return 'sms';
      }
      if (text.includes('video') || text.includes('record') || text.includes('identity')) {
        return 'video';
      }
      if (text.includes('press and hold') || text.includes('captcha') ||
          text.includes('verify you are human') || text.includes('robot')) {
        return 'captcha';
      }
      if (text.includes('successfully') || text.includes('claimed') || text.includes('added') ||
          text.includes('your business page')) {
        return 'success';
      }

      return 'unknown';
    });

    switch (verifyType) {
      case 'sms':
        this._setStatus(STATUS.WAITING_SMS, 'Code SMS requis — en attente...');
        // Choose SMS if given the option
        await h.humanClickByText(this.page, 'Text', 'button,a,label,[role="radio"]') ||
          await h.humanClickByText(this.page, 'SMS', 'button,a,label,[role="radio"]');
        return STATUS.WAITING_SMS;

      case 'video':
        this._setStatus(STATUS.WAITING_VIDEO, 'Yelp demande une video d\'identite');
        return STATUS.WAITING_VIDEO;

      case 'captcha':
        this._setStatus(STATUS.WAITING_CAPTCHA, 'Captcha / PerimeterX detecte');
        return STATUS.WAITING_CAPTCHA;

      case 'success':
        await this._captureResultUrl();
        this._setStatus(STATUS.DONE, 'Fiche creee avec succes !');
        return STATUS.DONE;

      default:
        // Maybe the form needs more steps — check for another form page
        const hasMoreForm = await this.page.evaluate(() => {
          return document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])').length > 0;
        });
        if (hasMoreForm) {
          this._setStatus(STATUS.FILLING, 'Formulaire supplementaire detecte...');
          return 'more_form';
        }
        this._setStatus(STATUS.ERROR, 'Etat inconnu apres soumission');
        return STATUS.ERROR;
    }
  }

  // ── Enter SMS code (called externally when code is received) ─
  async enterSmsCode(code) {
    this._setStatus(STATUS.SUBMITTING, `Saisie du code ${code}...`);

    // Find the code input
    const codeInput = 'input[type="text"], input[type="tel"], input[type="number"], input[name*="code"], input[placeholder*="code"]';
    const hasInput = await h.waitFor(this.page, codeInput, 5000);
    if (!hasInput) {
      this._setStatus(STATUS.ERROR, 'Champ de code introuvable');
      return false;
    }

    await h.thinkPause();
    await h.focusAndType(this.page, codeInput, code);
    await h.humanDelay(500, 1000);

    // Submit the code
    await h.humanClickByText(this.page, 'Verify', 'button') ||
      await h.humanClickByText(this.page, 'Submit', 'button') ||
      await h.humanClickByText(this.page, 'Confirm', 'button');

    await h.humanDelay(3000, 5000);

    // Check result
    const result = await this.handleVerification();
    return result === STATUS.DONE;
  }

  // ── Run the full flow ─────────────────────────────────────────
  async run() {
    try {
      // Phase 1: Warmup
      await this.warmup();

      // Phase 2: Navigate
      const navOk = await this.navigateToAdd();
      if (!navOk) return this.status;

      // Phase 3: Search
      await this.searchBusiness();

      // Phase 4: Fill
      const filled = await this.fillForm();
      if (!filled && this.status !== STATUS.WAITING_CAPTCHA) {
        this._setStatus(STATUS.ERROR, 'Aucun champ rempli');
        return this.status;
      }

      // Phase 5: Submit
      await this.submit();

      // Phase 6: Verification
      let result = await this.handleVerification();

      // Handle multi-step forms
      let attempts = 0;
      while (result === 'more_form' && attempts < 3) {
        await this.fillForm();
        await this.submit();
        result = await this.handleVerification();
        attempts++;
      }

      return this.status;
    } catch (err) {
      this._setStatus(STATUS.ERROR, err.message);
      return STATUS.ERROR;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  async _dismissCookies() {
    try {
      await h.humanClickByText(this.page, 'Accept only essential', 'button') ||
        await h.humanClickByText(this.page, 'Allow all', 'button') ||
        await h.humanClickByText(this.page, 'Accept', 'button');
      await h.sleep(500);
    } catch {}
  }

  async _checkBlocked() {
    const blocked = await this.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('press and hold') || text.includes('verify you are human') ||
        text.includes('access denied') || text.includes('blocked') ||
        !!document.querySelector('#px-captcha, .px-captcha, iframe[src*="perimeterx"]');
    });

    if (blocked) {
      this._setStatus(STATUS.WAITING_CAPTCHA, 'PerimeterX / captcha detecte');
      return true;
    }
    return false;
  }

  async _fillCategory() {
    // Try to fill the Yelp category
    const categories = this.nap.categories || '';
    if (!categories) return;

    try {
      const catInput = await this.page.$('input[placeholder*="categor"], input[name*="categor"], input[aria-label*="categor"]');
      if (catInput) {
        await h.thinkPause();
        const box = await catInput.boundingBox();
        if (box) {
          await h.mouseMoveBezier(this.page, h.randInt(100, 400), h.randInt(100, 400), box.x + box.width / 2, box.y + box.height / 2);
          await catInput.click();
          await h.sleep(h.gaussian(300, 80));
          await h.typeHuman(this.page, categories.split(',')[0].trim());
          await h.humanDelay(1500, 3000);

          // Click first suggestion
          const suggestion = await this.page.$('[role="option"], .suggestion, .autocomplete-item, li[data-value]');
          if (suggestion) {
            await suggestion.click();
            await h.humanDelay(500, 1000);
          }
        }
      }
    } catch {}
  }

  async _captureResultUrl() {
    try {
      this.resultUrl = await this.page.evaluate(() => {
        // Look for the biz URL on the success page
        const links = document.querySelectorAll('a[href*="yelp.com/biz/"]');
        if (links.length > 0) return links[0].href;
        // Maybe the current URL is already the biz page
        if (window.location.href.includes('yelp.com/biz/')) return window.location.href;
        return null;
      });
    } catch {}
  }
}

module.exports = { YelpFlow, STATUS };
