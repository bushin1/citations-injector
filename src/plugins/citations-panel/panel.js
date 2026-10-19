// Floating panel injected via CDP — auto-fill NAP on citation sites.
// Business selection persists across all pages via the local injector server.
// Site-specific recipes override generic matching for known directories.

(function() {
  if (document.getElementById('citations-autofill-panel')) return;

  var DASHBOARD_BASE = '__DASHBOARD_BASE__';
  var EXT_TOKEN = '__EXT_TOKEN__';
  var LOCAL_SERVER = 'http://localhost:3847';

  // ═══ RECIPES — site-specific flows ═══

  var RECIPES = [

    // ─── TRUSTPILOT ───
    {
      id: 'trustpilot',
      label: 'Trustpilot',
      match: function(url) { return /signup\.business\.trustpilot\.com|business\.trustpilot\.com\/signup/.test(url); },
      steps: function(nap) {
        return [
          { action: 'dismiss', find: 'button', text: ['Got it', 'Accept all'], desc: 'cookie banner' },
          { action: 'select', find: 'select', label: ['Business location', 'Country'], value: 'US', delay: [300, 600] },
          { action: 'type', find: 'input[type="text"]', label: ['Business name', 'company name'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input[type="text"]', label: ['Business website', 'website'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── YELP (claim/add) ───
    {
      id: 'yelp',
      label: 'Yelp',
      match: function(url) { return /biz\.yelp\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'dismiss', find: 'button', text: ['Accept only essential cookies', 'Allow all'], desc: 'cookie banner' },
          { action: 'type', find: 'input, [role="combobox"]', label: ['business name', 'your business'], value: nap.name, delay: [200, 400] },
        ];
      },
    },

    // ─── YELP (biz info form after claiming) ───
    {
      id: 'yelp-info',
      label: 'Yelp Info',
      match: function(url) { return /yelp\.com\/biz_info|yelp\.com\/biz\/.*\/edit/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'name'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'street'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Zip', 'postal'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone', 'telephone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website', 'url'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── FACEBOOK (page creation) ───
    {
      id: 'facebook',
      label: 'Facebook',
      match: function(url) { return /facebook\.com\/pages\/creat|facebook\.com\/pages\/edit/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Page name', 'Nom de la page', 'name'], value: nap.name, delay: [300, 500] },
          { action: 'type', find: 'textarea, input', label: ['Category', 'Catégorie'], value: nap.categories || '', delay: [300, 500] },
          { action: 'type', find: 'textarea, input', label: ['Bio', 'Description', 'About'], value: nap.description || '', delay: [200, 400] },
        ];
      },
    },

    // ─── NEXTDOOR ───
    {
      id: 'nextdoor',
      label: 'Nextdoor',
      match: function(url) { return /business\.nextdoor\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'business'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'street', 'location'], value: nap.street + ', ' + nap.city + ', ' + nap.state + ' ' + nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── APPLE BUSINESS CONNECT ───
    {
      id: 'apple',
      label: 'Apple Business',
      match: function(url) { return /businessconnect\.apple\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'search', 'name'], value: nap.name, delay: [300, 500] },
          { action: 'type', find: 'input', label: ['Address', 'street', 'location'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Zip', 'postal', 'ZIP'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website', 'url'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── BING PLACES ───
    {
      id: 'bing',
      label: 'Bing Places',
      match: function(url) { return /bingplaces\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'name'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'street'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Zip', 'postal'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['Country'], value: nap.country || 'United States', delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website', 'url'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── N49 ───
    {
      id: 'n49',
      label: 'n49',
      match: function(url) { return /n49\.com|dashboard\.n49\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['business name', 'business', 'name'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'street'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['Province', 'State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Postal', 'Zip'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input[type="email"], input', label: ['Website', 'Email'], value: nap.website || nap.email || '', delay: [200, 400] },
        ];
      },
    },

    // ─── HOTFROG ───
    {
      id: 'hotfrog',
      label: 'Hotfrog',
      match: function(url) { return /hotfrog\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'Company', 'name'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'street'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City', 'Suburb'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Zip', 'Postcode'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="email"], input', label: ['Email'], value: nap.email || '', delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── MANTA ───
    {
      id: 'manta',
      label: 'Manta',
      match: function(url) { return /manta\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'Company name'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'Street'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Zip'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── SUPERPAGES / YELLOWPAGES ───
    {
      id: 'yellowpages',
      label: 'YellowPages',
      match: function(url) { return /yellowpages\.com|superpages\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'Company'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'Street'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Zip', 'Postal'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── MAPQUEST ───
    {
      id: 'mapquest',
      label: 'MapQuest',
      match: function(url) { return /mapquest\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Business name', 'Place name', 'Name'], value: nap.name, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Address', 'Street'], value: nap.street, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['City'], value: nap.city, delay: [200, 400] },
          { action: 'type', find: 'input, select', label: ['State'], value: nap.state, delay: [200, 400] },
          { action: 'type', find: 'input', label: ['Zip'], value: nap.zip, delay: [200, 400] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
          { action: 'type', find: 'input[type="url"], input', label: ['Website'], value: nap.website || '', delay: [200, 400] },
        ];
      },
    },

    // ─── FOURSQUARE ───
    {
      id: 'foursquare',
      label: 'Foursquare',
      match: function(url) { return /foursquare\.com/.test(url); },
      steps: function(nap) {
        return [
          { action: 'type', find: 'input', label: ['Venue name', 'Place name', 'Name', 'business'], value: nap.name, delay: [300, 500] },
          { action: 'type', find: 'input', label: ['Address', 'Street'], value: nap.street + ', ' + nap.city + ', ' + nap.state + ' ' + nap.zip, delay: [300, 500] },
          { action: 'type', find: 'input[type="tel"], input', label: ['Phone'], value: nap.phone, delay: [200, 400] },
        ];
      },
    },

  ];

  // ═══ RECIPE ENGINE ═══

  function _gaussianRandom(mean, stddev) {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.max(0, mean + stddev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v));
  }

  function _sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function _randomDelay(range) {
    if (!range) return _sleep(_gaussianRandom(300, 80));
    return _sleep(_gaussianRandom(range[0], (range[1] - range[0]) / 3));
  }

  function _getNativeSetter(el) {
    var proto = Object.getPrototypeOf(el);
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) return desc.set;
    desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (desc && desc.set) return desc.set;
    desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (desc && desc.set) return desc.set;
    return null;
  }

  async function _typeHuman(el, value) {
    el.focus();
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    await _sleep(_gaussianRandom(80, 20));
    var nativeSetter = _getNativeSetter(el);
    if (nativeSetter) nativeSetter.call(el, ''); else el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    for (var i = 0; i < value.length; i++) {
      var ch = value[i];
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true }));
      if (nativeSetter) nativeSetter.call(el, value.slice(0, i + 1)); else el.value = value.slice(0, i + 1);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
      await _sleep(_gaussianRandom(55, 18));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function _fillSelect(el, value) {
    var norm = value.toLowerCase().trim();
    var bestOption = null, bestLen = Infinity;
    for (var i = 0; i < el.options.length; i++) {
      var opt = el.options[i], text = opt.textContent.trim().toLowerCase();
      if (text === norm) { bestOption = opt; break; }
      if (opt.value.toLowerCase() === norm) { bestOption = opt; break; }
      if (text.indexOf(norm) !== -1 && text.length < bestLen) { bestOption = opt; bestLen = text.length; }
    }
    if (bestOption) {
      el.focus(); await _sleep(_gaussianRandom(150, 40));
      el.value = bestOption.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await _sleep(_gaussianRandom(80, 20)); el.blur(); return true;
    }
    return false;
  }

  function _highlight(el) {
    el.style.outline = '2px solid #22c55e';
    el.style.outlineOffset = '1px';
  }

  function _normalize(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\-]/g, ' ').trim();
  }

  // Find a field on the page by selector + label keywords
  function _findField(step, usedElements) {
    var candidates = document.querySelectorAll(step.find);
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.closest('#citations-autofill-panel')) continue;
      if (el.offsetParent === null && el.tagName !== 'SELECT') continue;
      if (el.disabled || el.readOnly) continue;
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
      if (usedElements.has(el)) continue;

      // Gather signals from the element
      var signals = [];
      if (el.id) {
        var lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl) signals.push(lbl.textContent.trim());
      }
      if (el.closest('label')) signals.push(el.closest('label').textContent.trim());
      if (el.placeholder) signals.push(el.placeholder);
      if (el.name) signals.push(el.name);
      if (el.id) signals.push(el.id);
      if (el.getAttribute('aria-label')) signals.push(el.getAttribute('aria-label'));
      // Check nearby text
      var prev = el.previousElementSibling;
      if (prev && prev.tagName !== 'INPUT' && prev.tagName !== 'SELECT') {
        signals.push((prev.textContent || '').trim().slice(0, 100));
      }
      var parent = el.parentElement;
      if (parent) {
        var parentPrev = parent.previousElementSibling;
        if (parentPrev && parentPrev.tagName !== 'INPUT') {
          signals.push((parentPrev.textContent || '').trim().slice(0, 100));
        }
      }

      var combined = signals.join(' ');
      var normCombined = _normalize(combined);

      for (var k = 0; k < step.label.length; k++) {
        if (normCombined.indexOf(_normalize(step.label[k])) !== -1) {
          return el;
        }
      }
    }
    return null;
  }

  // Find a button by text content
  function _findButton(step) {
    var buttons = document.querySelectorAll(step.find);
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.closest('#citations-autofill-panel')) continue;
      var txt = _normalize(btn.textContent);
      for (var k = 0; k < step.text.length; k++) {
        if (txt.indexOf(_normalize(step.text[k])) !== -1) return btn;
      }
    }
    return null;
  }

  // Execute a recipe's steps
  async function executeRecipe(recipe, nap, onProgress) {
    var steps = recipe.steps(nap);
    var filled = 0;
    var total = steps.filter(function(s) { return s.action === 'type' || s.action === 'select'; }).length;
    var usedElements = new Set();

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (!step.value && step.action !== 'dismiss' && step.action !== 'click') continue;

      if (step.action === 'dismiss') {
        var dismissBtn = _findButton(step);
        if (dismissBtn) {
          dismissBtn.click();
          await _sleep(500);
        }
        continue;
      }

      if (step.action === 'click') {
        var clickBtn = _findButton(step);
        if (clickBtn) {
          clickBtn.click();
          await _sleep(step.waitAfter || 1000);
        }
        continue;
      }

      if (step.action === 'type') {
        var field = _findField(step, usedElements);
        if (field) {
          if (filled > 0) await _randomDelay(step.delay);
          if (field.tagName === 'SELECT') {
            var ok = await _fillSelect(field, step.value);
            if (ok) { _highlight(field); filled++; usedElements.add(field); }
          } else {
            await _typeHuman(field, step.value);
            _highlight(field); filled++; usedElements.add(field);
          }
          if (onProgress) onProgress(filled, total);
        }
        continue;
      }

      if (step.action === 'select') {
        var sel = _findField(step, usedElements);
        if (sel && sel.tagName === 'SELECT') {
          if (filled > 0) await _randomDelay(step.delay);
          var done = await _fillSelect(sel, step.value);
          if (done) { _highlight(sel); filled++; usedElements.add(sel); }
          if (onProgress) onProgress(filled, total);
        }
        continue;
      }
    }
    return filled;
  }

  // ═══ GENERIC MATCHER (fallback for unknown sites) ═══

  var AUTOCOMPLETE_MAP = {
    'organization': 'name', 'street-address': 'street', 'address-line1': 'street',
    'address-level2': 'city', 'address-level1': 'state', 'postal-code': 'zip',
    'country': 'country', 'country-name': 'country', 'tel': 'phone',
    'email': 'email', 'url': 'website',
  };

  var SYNONYMS = {
    name: ['business name','company','company name','organization','organisation','nom','raison sociale','entreprise','business'],
    street: ['address','street','street address','address line','address1','adresse','rue'],
    city: ['city','town','locality','ville'],
    state: ['state','province','region'],
    zip: ['zip','zip code','zipcode','postal code','postal','postcode','code postal'],
    country: ['country','nation','pays'],
    phone: ['phone','telephone','phone number','tel','mobile','fax','contact number'],
    email: ['email','e-mail','email address','mail'],
    website: ['website','web site','url','site web','homepage','website url'],
    description: ['description','about','bio','summary','details'],
  };

  var TYPE_BONUS = { email: 'email', tel: 'phone', url: 'website' };

  function _scoreSignal(signal, napKey) {
    if (!signal) return 0;
    var norm = _normalize(signal);
    if (!norm) return 0;
    var syns = SYNONYMS[napKey] || [];
    for (var i = 0; i < syns.length; i++) {
      var syn = syns[i];
      if (norm === syn) return 10;
      if (norm.indexOf(syn) !== -1) return 5;
    }
    return 0;
  }

  function _collectFields() {
    var inputs = document.querySelectorAll('input, select, textarea');
    var fields = [];
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.offsetParent === null || el.disabled || el.readOnly) continue;
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' ||
          el.type === 'checkbox' || el.type === 'radio' || el.type === 'file') continue;
      if (el.closest('#citations-autofill-panel')) continue;
      var label = '';
      if (el.id) { var lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (lbl) label = lbl.textContent.trim(); }
      if (!label && el.closest('label')) label = el.closest('label').textContent.trim();
      var nearbyText = '';
      var prev = el.previousElementSibling || (el.parentElement ? el.parentElement.previousElementSibling : null);
      if (prev && prev.tagName !== 'INPUT') nearbyText = (prev.textContent || '').trim().slice(0, 100);
      fields.push({ el: el, id: el.id || el.name || '', name: el.name || '', type: el.type || 'text',
        placeholder: el.placeholder || '', label: label, autocomplete: el.getAttribute('autocomplete') || '',
        ariaLabel: el.getAttribute('aria-label') || '', nearbyText: nearbyText, tagName: el.tagName.toLowerCase() });
    }
    return fields;
  }

  function matchFields(fields, nap) {
    var scores = [];
    for (var fi = 0; fi < fields.length; fi++) {
      var f = fields[fi], fid = f.id || f.name || ('field_' + fi);
      if (f.autocomplete) {
        var mapped = AUTOCOMPLETE_MAP[f.autocomplete.trim().toLowerCase()];
        if (mapped && nap[mapped] != null) { scores.push({ fieldId: fid, napKey: mapped, score: 100, idx: fi }); continue; }
      }
      var signals = [f.label, f.placeholder, f.name, f.id, f.ariaLabel, f.nearbyText];
      var bestKey = null, bestScore = 0;
      var napKeys = Object.keys(SYNONYMS);
      for (var ki = 0; ki < napKeys.length; ki++) {
        var napKey = napKeys[ki]; if (nap[napKey] == null) continue;
        var total = 0;
        for (var si = 0; si < signals.length; si++) total += _scoreSignal(signals[si], napKey);
        if (TYPE_BONUS[f.type] === napKey) total += 15;
        if (total > bestScore) { bestScore = total; bestKey = napKey; }
      }
      if (bestKey && bestScore >= 5) scores.push({ fieldId: fid, napKey: bestKey, score: bestScore, idx: fi });
    }
    scores.sort(function(a, b) { return b.score - a.score; });
    var usedFields = {}, usedNapKeys = {}, filled = [];
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      if (usedFields[s.fieldId] || usedNapKeys[s.napKey]) continue;
      usedFields[s.fieldId] = true; usedNapKeys[s.napKey] = true;
      filled.push({ fieldId: s.fieldId, napKey: s.napKey, value: String(nap[s.napKey]), idx: s.idx });
    }
    return filled;
  }

  async function genericFill(nap, onProgress) {
    var fieldElements = _collectFields();
    var descriptors = fieldElements.map(function(f) {
      return { id: f.id || f.name, name: f.name, type: f.type, placeholder: f.placeholder,
        label: f.label, autocomplete: f.autocomplete, ariaLabel: f.ariaLabel, nearbyText: f.nearbyText };
    });
    var result = matchFields(descriptors, nap);
    var filledCount = 0;
    for (var i = 0; i < result.length; i++) {
      var match = result[i];
      var fEl = fieldElements[match.idx];
      if (!fEl) continue;
      if (filledCount > 0) await _randomDelay([300, 600]);
      if (fEl.tagName === 'select') {
        var ok = await _fillSelect(fEl.el, match.value);
        if (ok) { _highlight(fEl.el); filledCount++; }
      } else {
        await _typeHuman(fEl.el, match.value);
        _highlight(fEl.el); filledCount++;
      }
      if (onProgress) onProgress(filledCount, result.length);
    }
    return filledCount;
  }

  // ═══ DETECT ACTIVE RECIPE ═══

  function detectRecipe() {
    var url = window.location.href;
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].match(url)) return RECIPES[i];
    }
    return null;
  }

  // ═══ STATE ═══

  var currentNap = null;
  var filling = false;
  var activeRecipe = detectRecipe();

  // ═══ PANEL UI ═══

  var recipeLabel = activeRecipe ? activeRecipe.label : 'Generique';
  var recipeColor = activeRecipe ? '#6366f1' : '#64748b';

  var panel = document.createElement('div');
  panel.id = 'citations-autofill-panel';
  panel.innerHTML = [
    '<div id="caf-header" style="cursor:grab;background:#1e293b;padding:8px 12px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">',
    '  <div style="display:flex;align-items:center;gap:8px">',
    '    <span style="font-weight:600;font-size:13px;color:#e2e8f0">Citations</span>',
    '    <span id="caf-recipe-badge" style="font-size:10px;padding:2px 6px;border-radius:10px;font-weight:600;background:' + recipeColor + ';color:white">' + recipeLabel + '</span>',
    '  </div>',
    '  <span id="caf-toggle" style="cursor:pointer;color:#94a3b8;font-size:18px;line-height:1">_</span>',
    '</div>',
    '<div id="caf-body" style="padding:10px 12px">',
    '  <div id="caf-search-section">',
    '    <input id="caf-search" type="text" placeholder="Chercher un business..." style="width:100%;padding:6px 8px;border:1px solid #334155;border-radius:4px;background:#0f172a;color:#e2e8f0;font-size:12px;outline:none;box-sizing:border-box">',
    '    <div id="caf-results" style="margin-top:6px;max-height:150px;overflow-y:auto"></div>',
    '  </div>',
    '  <div id="caf-fill-section" style="display:none">',
    '    <div id="caf-selected-name" style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:2px"></div>',
    '    <div id="caf-selected-city" style="font-size:11px;color:#64748b;margin-bottom:10px"></div>',
    '    <button id="caf-fill-btn" style="width:100%;padding:10px;background:#22c55e;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.5px">REMPLIR</button>',
    '    <div style="text-align:center;margin-top:4px;font-size:10px;color:#64748b">ou <kbd style="background:#334155;padding:1px 5px;border-radius:3px;font-size:10px;color:#e2e8f0">Ctrl+Shift+F</kbd></div>',
    '    <div id="caf-status" style="font-size:12px;margin-top:8px;color:#94a3b8;text-align:center;font-weight:500"></div>',
    '    <button id="caf-change-btn" style="width:100%;padding:4px;background:transparent;color:#94a3b8;border:1px solid #334155;border-radius:4px;font-size:11px;cursor:pointer;margin-top:6px">Changer de business</button>',
    '  </div>',
    '</div>',
  ].join('\n');

  panel.style.cssText = 'position:fixed;top:80px;right:16px;width:260px;background:#1e293b;border:1px solid #334155;border-radius:8px;z-index:2147483647;font-family:-apple-system,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,.5);color:#e2e8f0';
  document.body.appendChild(panel);

  // Drag
  var header = document.getElementById('caf-header');
  var isDragging = false, dragX = 0, dragY = 0;
  header.addEventListener('mousedown', function(e) {
    isDragging = true; dragX = e.clientX - panel.offsetLeft; dragY = e.clientY - panel.offsetTop;
    header.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    panel.style.left = (e.clientX - dragX) + 'px'; panel.style.top = (e.clientY - dragY) + 'px'; panel.style.right = 'auto';
  });
  document.addEventListener('mouseup', function() { isDragging = false; header.style.cursor = 'grab'; });

  // Toggle minimize
  var body = document.getElementById('caf-body');
  var toggleBtn = document.getElementById('caf-toggle');
  toggleBtn.addEventListener('click', function() {
    var hidden = body.style.display === 'none';
    body.style.display = hidden ? 'block' : 'none';
    toggleBtn.textContent = hidden ? '_' : '+';
  });

  // Refs
  var searchInput = document.getElementById('caf-search');
  var resultsDiv = document.getElementById('caf-results');
  var searchSection = document.getElementById('caf-search-section');
  var fillSection = document.getElementById('caf-fill-section');
  var fillBtn = document.getElementById('caf-fill-btn');
  var statusDiv = document.getElementById('caf-status');

  // ═══ LOAD SAVED SELECTION ═══

  async function loadSavedSelection() {
    try {
      var res = await fetch(LOCAL_SERVER + '/api/selection');
      if (!res.ok) return;
      var data = await res.json();
      if (data && data.nap) {
        currentNap = data.nap;
        document.getElementById('caf-selected-name').textContent = data.name || '';
        document.getElementById('caf-selected-city').textContent = data.city || '';
        searchSection.style.display = 'none';
        fillSection.style.display = 'block';
        updateStatus();
      }
    } catch {}
  }

  loadSavedSelection();

  // ═══ STATUS ═══

  function updateStatus() {
    if (activeRecipe) {
      statusDiv.style.color = '#6366f1';
      statusDiv.textContent = 'Recette ' + activeRecipe.label + ' active';
    } else {
      var fields = _collectFields();
      if (fields.length > 0) {
        statusDiv.style.color = '#22c55e';
        statusDiv.textContent = fields.length + ' champs detectes (generique)';
      } else {
        statusDiv.style.color = '#64748b';
        statusDiv.textContent = 'Pas de formulaire sur cette page';
      }
    }
  }

  // ═══ SEARCH ═══

  var debounceTimer = null;
  searchInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 300);
  });
  searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { clearTimeout(debounceTimer); doSearch(); } });

  function esc(s) { var d = document.createElement('span'); d.textContent = s; return d.innerHTML; }

  async function doSearch() {
    var q = searchInput.value.trim();
    if (q.length < 2) { resultsDiv.innerHTML = ''; return; }
    resultsDiv.innerHTML = '<div style="color:#64748b;font-size:11px;padding:4px">Recherche...</div>';
    try {
      var res = await fetch(DASHBOARD_BASE + '/api/ext/citations/nap-search?q=' + encodeURIComponent(q), {
        headers: { 'x-ext-token': EXT_TOKEN }
      });
      if (!res.ok) throw new Error(res.status);
      var data = await res.json();
      if (!data.length) { resultsDiv.innerHTML = '<div style="color:#64748b;font-size:11px;padding:4px">Aucun resultat</div>'; return; }
      resultsDiv.innerHTML = '';
      data.forEach(function(r) {
        var div = document.createElement('div');
        div.style.cssText = 'padding:6px 4px;border-bottom:1px solid #1e293b;cursor:pointer;font-size:12px';
        div.innerHTML = '<div style="color:#e2e8f0;font-weight:500">' + esc(r.name) + '</div><div style="color:#64748b;font-size:10px">' + esc(r.city || '') + '</div>';
        div.addEventListener('mouseenter', function() { div.style.background = '#334155'; });
        div.addEventListener('mouseleave', function() { div.style.background = 'transparent'; });
        div.addEventListener('click', function() { selectSite(r); });
        resultsDiv.appendChild(div);
      });
    } catch (err) {
      resultsDiv.innerHTML = '<div style="color:#f87171;font-size:11px;padding:4px">' + esc(err.message) + '</div>';
    }
  }

  async function selectSite(r) {
    resultsDiv.innerHTML = '<div style="color:#64748b;font-size:11px;padding:4px">Chargement NAP...</div>';
    try {
      var res = await fetch(DASHBOARD_BASE + '/api/ext/citations/nap/' + r.gmbId, {
        headers: { 'x-ext-token': EXT_TOKEN }
      });
      if (!res.ok) throw new Error(res.status);
      currentNap = await res.json();
      await fetch(LOCAL_SERVER + '/api/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: r.name, city: r.city || '', gmbId: r.gmbId, nap: currentNap }),
      });
      document.getElementById('caf-selected-name').textContent = r.name;
      document.getElementById('caf-selected-city').textContent = r.city || '';
      searchSection.style.display = 'none';
      fillSection.style.display = 'block';
      updateStatus();
    } catch (err) {
      resultsDiv.innerHTML = '<div style="color:#f87171;font-size:11px;padding:4px">' + esc(err.message) + '</div>';
    }
  }

  // ═══ FILL ═══

  async function doFill() {
    if (!currentNap || filling) return;
    filling = true;
    fillBtn.disabled = true;
    fillBtn.style.background = '#6366f1';

    var filledCount = 0;

    function onProgress(done, total) {
      fillBtn.textContent = done + '/' + total + '...';
    }

    if (activeRecipe) {
      fillBtn.textContent = activeRecipe.label + '...';
      filledCount = await executeRecipe(activeRecipe, currentNap, onProgress);
    } else {
      fillBtn.textContent = 'Analyse...';
      filledCount = await genericFill(currentNap, onProgress);
    }

    filling = false;
    fillBtn.disabled = false;
    fillBtn.textContent = 'REMPLIR';
    fillBtn.style.background = '#22c55e';
    statusDiv.style.color = '#22c55e';
    statusDiv.textContent = filledCount + ' champs remplis' + (activeRecipe ? ' (' + activeRecipe.label + ')' : '');
  }

  fillBtn.addEventListener('click', doFill);

  // ═══ KEYBOARD SHORTCUT ═══

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      e.stopPropagation();
      doFill();
    }
  }, true);

  // Change selection
  document.getElementById('caf-change-btn').addEventListener('click', function() {
    currentNap = null;
    searchInput.value = ''; resultsDiv.innerHTML = '';
    searchSection.style.display = 'block'; fillSection.style.display = 'none';
    statusDiv.textContent = '';
    fetch(LOCAL_SERVER + '/api/selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(null),
    }).catch(function() {});
  });
})();
