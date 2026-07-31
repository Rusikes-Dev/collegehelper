/* College Helper — core site behaviour.
   No dependencies. Everything degrades gracefully without JS. */
(function () {
  'use strict';

  /* --------------------------------------------------------------- theme --
     The <head> runs a tiny inline script that applies the stored theme before
     first paint. This part only handles the toggle and keeps the address-bar
     colour in sync. Choice order: explicit user setting → OS preference. */
  var THEME_KEY = 'ch:theme';
  var root = document.documentElement;

  function systemDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function activeTheme() {
    return root.getAttribute('data-theme') || (systemDark() ? 'dark' : 'light');
  }
  function paintMeta() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', activeTheme() === 'dark' ? '#0E1117' : '#FFFFFF');
  }
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode */ }
    paintMeta();
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      b.setAttribute('aria-pressed', String(t === 'dark'));
    });
  }
  paintMeta();
  document.querySelectorAll('.theme-btn').forEach(function (btn) {
    btn.setAttribute('aria-pressed', String(activeTheme() === 'dark'));
    btn.setAttribute('aria-label', activeTheme() === 'dark'
      ? 'Switch to light theme' : 'Switch to dark theme');
    btn.addEventListener('click', function () {
      setTheme(activeTheme() === 'dark' ? 'light' : 'dark');
    });
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSys = function () { if (!root.getAttribute('data-theme')) paintMeta(); };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
    else if (mq.addListener) mq.addListener(onSys);
  }

  /* --------------------------------------------------------------- toasts --
     Replaces alert() for success/error feedback. Polite live region so a
     screen reader announces it without stealing focus. */
  var toastWrap = null;
  var TOAST_ICON = {
    ok: '<path d="M20 6 9 17l-5-5"/>',
    err: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'
  };
  function toast(message, kind, ms) {
    kind = kind || 'info';
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toasts';
      toastWrap.setAttribute('role', 'status');
      toastWrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastWrap);
    }
    var t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (TOAST_ICON[kind] || TOAST_ICON.info) + '</svg><span></span>' +
      '<button class="toast-x" type="button" aria-label="Dismiss">&times;</button>';
    t.querySelector('span').textContent = message;   // textContent, never innerHTML
    toastWrap.appendChild(t);

    var gone = false;
    function close() {
      if (gone) return;
      gone = true;
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 200);
    }
    t.querySelector('.toast-x').addEventListener('click', close);
    setTimeout(close, ms || (kind === 'err' ? 9000 : 5000));
    return close;
  }
  window.CHToast = toast;

  /* ---------------------------------------------------------- mobile nav -- */
  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    var setNav = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      mnav.classList.toggle('open', open);
    };
    burger.addEventListener('click', function () {
      setNav(burger.getAttribute('aria-expanded') !== 'true');
    });
    // Escape closes and returns focus to the trigger.
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        burger.focus();
      }
    });
    // A tap anywhere outside the panel closes it.
    document.addEventListener('click', function (ev) {
      if (burger.getAttribute('aria-expanded') !== 'true') return;
      if (!mnav.contains(ev.target) && !burger.contains(ev.target)) setNav(false);
    });
    // Never leave the panel open when it becomes the desktop layout.
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 880px)');
      var onWide = function (e) { if (e.matches) setNav(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
    }
  }

  /* ------------------------------------------------- sticky header shadow -- */
  var head = document.querySelector('.site-head');
  if (head) {
    var onHeadScroll = function () { head.classList.toggle('stuck', window.scrollY > 4); };
    window.addEventListener('scroll', onHeadScroll, { passive: true });
    onHeadScroll();
  }

  /* ----------------------------------------------------------- countdowns -- */
  function dayDiff(iso) {
    var t = new Date(iso + 'T00:00:00');
    var n = new Date();
    n.setHours(0, 0, 0, 0);
    return Math.round((t - n) / 86400000);
  }
  function phrase(d) {
    if (d < 0) return null;
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    return 'in ' + d + ' days';
  }
  document.querySelectorAll('[data-countdown]').forEach(function (el) {
    var p = phrase(dayDiff(el.getAttribute('data-countdown')));
    if (p) { el.textContent = p; el.classList.remove('past'); }
  });
  document.querySelectorAll('[data-countdown-num]').forEach(function (el) {
    var d = dayDiff(el.getAttribute('data-countdown-num'));
    if (d >= 0) el.textContent = d;
  });

  /* ------------------------------------------------- scroll reveal ------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveals.forEach(function (r) { r.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      reveals.forEach(function (r) { io.observe(r); });
    }
  }

  /* ---------------------------------------------------- back to top ----- */
  var totop = document.getElementById('totop');
  if (totop) {
    var onScroll = function () {
      totop.classList.toggle('show', window.scrollY > 700);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    totop.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------- exam search + filter -- */
  var q = document.getElementById('q');
  var results = document.getElementById('results');
  if (q && results) {
    var cards = Array.prototype.slice.call(results.querySelectorAll('.card'));
    var count = document.getElementById('count');
    var empty = document.getElementById('empty');
    var chipBar = document.getElementById('activefilters');
    var sortSel = document.getElementById('sort');
    var labels = {};                       // filter value -> human label, for chips
    var state = { text: '', cat: '', level: '', state: '', sort: 'relevance' };

    document.querySelectorAll('.filter').forEach(function (b) {
      var v = b.getAttribute('data-value');
      if (v) labels[b.getAttribute('data-filter') + ':' + v] = b.textContent.trim();
    });

    function setPressed(group, value) {
      document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === value));
      });
    }

    /* Sorting reorders the DOM once per change; 14 nodes, so this is cheaper
       than maintaining a parallel model and re-rendering. */
    function sortCards() {
      var mode = state.sort;
      var sorted = cards.slice();
      if (mode === 'soonest') {
        sorted.sort(function (a, b) {
          var da = a.getAttribute('data-next') || '9999-12-31';
          var db = b.getAttribute('data-next') || '9999-12-31';
          if (da === db) return a.getAttribute('data-sort').localeCompare(b.getAttribute('data-sort'));
          return da < db ? -1 : 1;
        });
      } else if (mode === 'name') {
        sorted.sort(function (a, b) {
          return a.getAttribute('data-sort').localeCompare(b.getAttribute('data-sort'));
        });
      } else if (mode === 'status') {
        sorted.sort(function (a, b) {
          var d = (+a.getAttribute('data-rank')) - (+b.getAttribute('data-rank'));
          return d !== 0 ? d : a.getAttribute('data-sort').localeCompare(b.getAttribute('data-sort'));
        });
      } else {
        sorted.sort(function (a, b) {
          return (+a.getAttribute('data-order')) - (+b.getAttribute('data-order'));
        });
      }
      var frag = document.createDocumentFragment();
      sorted.forEach(function (c) { frag.appendChild(c); });
      results.appendChild(frag);
    }

    function renderChips() {
      if (!chipBar) return;
      chipBar.innerHTML = '';
      var active = [];
      if (state.text) active.push(['text', state.text, 'Search: "' + state.text + '"']);
      if (state.cat) active.push(['cat', state.cat, labels['cat:' + state.cat] || state.cat]);
      if (state.level) active.push(['level', state.level, labels['level:' + state.level] || state.level]);
      if (state.state) active.push(['state', state.state, labels['state:' + state.state] || state.state]);
      active.forEach(function (a) {
        var chip = document.createElement('span');
        chip.className = 'fchip';
        var txt = document.createElement('span');
        txt.textContent = a[2];                      // textContent — user input is never parsed as HTML
        var x = document.createElement('button');
        x.type = 'button';
        x.innerHTML = '&times;';
        x.setAttribute('aria-label', 'Remove filter ' + a[2]);
        x.addEventListener('click', function () {
          state[a[0]] = '';
          if (a[0] === 'text') q.value = '';
          setPressed('cat', state.cat); setPressed('level', state.level); setPressed('state', state.state);
          apply();
        });
        chip.appendChild(txt); chip.appendChild(x);
        chipBar.appendChild(chip);
      });
    }

    /* Keep the URL in step so a filtered view can be bookmarked or shared. */
    function syncUrl() {
      if (!window.history || !history.replaceState) return;
      var p = new URLSearchParams();
      if (state.text) p.set('q', state.text);
      if (state.cat) p.set('c', state.cat);
      if (state.level) p.set('level', state.level);
      if (state.state) p.set('state', state.state);
      if (state.sort && state.sort !== 'relevance') p.set('sort', state.sort);
      var qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    }

    function apply() {
      var shown = 0;
      var t = state.text.trim().toLowerCase();
      cards.forEach(function (c) {
        var ok = true;
        if (t && c.getAttribute('data-name').indexOf(t) === -1) ok = false;
        if (ok && state.cat && c.getAttribute('data-cat') !== state.cat) ok = false;
        if (ok && state.level && c.getAttribute('data-level') !== state.level) ok = false;
        if (ok && state.state && c.getAttribute('data-state') !== state.state) ok = false;
        c.hidden = !ok;
        if (ok) shown++;
      });
      sortCards();
      if (count) {
        count.textContent = shown === cards.length
          ? 'Showing all ' + cards.length + ' exams'
          : 'Showing ' + shown + ' of ' + cards.length + ' exams';
      }
      if (empty) empty.hidden = shown !== 0;
      renderChips();
      syncUrl();
    }

    // Debounced so long lists are not re-filtered on every keystroke.
    var typing;
    q.addEventListener('input', function () {
      clearTimeout(typing);
      typing = setTimeout(function () { state.text = q.value; apply(); }, 120);
    });
    // Escape clears the field, which is what people expect from a search box.
    q.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && q.value) {
        q.value = ''; state.text = ''; apply();
      }
    });

    document.querySelectorAll('.filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var g = btn.getAttribute('data-filter');
        var v = btn.getAttribute('data-value');
        if (g === 'state' && v) { state.state = state.state === v ? '' : v; state.level = ''; }
        else if (g === 'level') { state.level = v; state.state = ''; }
        else { state[g] = state[g] === v ? '' : v; }
        setPressed('cat', state.cat);
        setPressed('level', state.level);
        setPressed('state', state.state);
        apply();
      });
    });

    if (sortSel) sortSel.addEventListener('change', function () {
      state.sort = sortSel.value; apply();
    });

    function clearAll() {
      state = { text: '', cat: '', level: '', state: '', sort: state.sort };
      q.value = '';
      setPressed('cat', ''); setPressed('level', ''); setPressed('state', '');
      apply();
      q.focus();
    }
    document.querySelectorAll('#clear, #clear-all').forEach(function (b) {
      b.addEventListener('click', clearAll);
    });

    // Mobile filter drawer.
    var fToggle = document.querySelector('.filter-toggle');
    var fWrap = document.getElementById('filters-wrap');
    if (fToggle && fWrap) {
      fToggle.addEventListener('click', function () {
        var open = fToggle.getAttribute('aria-expanded') === 'true';
        fToggle.setAttribute('aria-expanded', String(!open));
        fWrap.hidden = open;
      });
    }

    // deep link: /exams/?c=banking&q=neet&sort=soonest
    var params = new URLSearchParams(location.search);
    if (params.get('c')) { state.cat = params.get('c'); setPressed('cat', state.cat); }
    if (params.get('level')) { state.level = params.get('level'); setPressed('level', state.level); }
    if (params.get('state')) { state.state = params.get('state'); setPressed('state', state.state); }
    if (params.get('q')) { state.text = params.get('q'); q.value = state.text; }
    if (params.get('sort') && sortSel) { state.sort = params.get('sort'); sortSel.value = state.sort; }
    apply();
  }

  /* -------------------------------------------------------- calendar filter */
  var calq = document.getElementById('calq');
  var cal = document.getElementById('calendar');
  if (calq && cal) {
    var items = Array.prototype.slice.call(cal.querySelectorAll('.cal-item'));
    var months = Array.prototype.slice.call(cal.querySelectorAll('.cal-month'));
    var calEmpty = document.getElementById('cal-empty');
    var calCount = document.getElementById('cal-count');
    // Cache the lowercased text once; textContent in a filter loop is the slow part.
    var hay = items.map(function (it) { return it.textContent.toLowerCase(); });

    function calApply() {
      var t = calq.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (it, i) {
        var ok = !t || hay[i].indexOf(t) !== -1;
        it.hidden = !ok;
        if (ok) shown++;
      });
      months.forEach(function (m) {
        m.hidden = !m.querySelector('.cal-item:not([hidden])');
      });
      if (calCount) {
        calCount.textContent = t
          ? 'Showing ' + shown + ' of ' + items.length + ' dates'
          : 'Showing all ' + items.length + ' dates';
      }
      if (calEmpty) calEmpty.hidden = shown !== 0;
    }
    var calTyping;
    calq.addEventListener('input', function () {
      clearTimeout(calTyping);
      calTyping = setTimeout(calApply, 120);
    });
    calq.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && calq.value) { calq.value = ''; calApply(); }
    });
    var calClear = document.getElementById('cal-clear');
    if (calClear) calClear.addEventListener('click', function () {
      calq.value = ''; calApply(); calq.focus();
    });
    calApply();
  }

  /* --------------------------------------------------------- count-up ----
     Purely decorative. The final value is already in the HTML, so anything
     that skips this (no JS, reduced motion, no observer) still reads right. */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window &&
      !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        cio.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10);
        if (!isFinite(target) || target <= 0) return;
        var dur = 620, t0 = 0;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          // ease-out cubic: fast start, gentle landing
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ------------------------------------------------- sticky finder shadow -- */
  var finder = document.querySelector('.finder.sticky');
  if (finder && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;height:1px;width:1px;';
    finder.parentNode.insertBefore(sentinel, finder);
    new IntersectionObserver(function (en) {
      finder.classList.toggle('stuck', !en[0].isIntersecting);
    }, { rootMargin: '-' + (parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--head-h'), 10) || 52) + 'px 0px 0px 0px' }).observe(sentinel);
  }

  /* ------------------------------------------------------ predictor loader */
  var tool = document.querySelector('[data-tool]');
  if (tool) {
    var name = tool.getAttribute('data-tool');
    // Reuse this file's own ?v= hash so the predictor script is cache-busted too.
    var self = document.querySelector('script[src*="/assets/js/site.js"]');
    var v = self && self.src.indexOf('?v=') !== -1 ? self.src.split('?v=')[1] : '';
    var s = document.createElement('script');
    s.src = '/assets/js/predictor-' + name + '.js' + (v ? '?v=' + v : '');
    s.defer = true;
    s.onerror = function () {
      tool.innerHTML = '<p class="empty">The predictor failed to load. ' +
        'Check your connection and reload the page.</p>';
    };
    document.head.appendChild(s);
  }
})();

/* ==========================================================================
   Shared helpers used by both predictors.
   ========================================================================== */
window.CH = (function () {
  'use strict';

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function opts(select, list, placeholder) {
    select.innerHTML = '';
    if (placeholder) select.appendChild(el('option', { value: '', text: placeholder }));
    list.forEach(function (v) {
      select.appendChild(el('option', { value: v, text: v }));
    });
  }

  /* Band logic shared by both tools.
     Safe:     your number is at or better than last year's closing number
     Moderate: within 10% beyond it
     Reach:    within 15% beyond it                                        */
  function band(mine, closing) {
    if (mine <= closing) return 'safe';
    if (mine <= closing * 1.10) return 'moderate';
    if (mine <= closing * 1.15) return 'reach';
    return null;
  }
  var BAND_ORDER = { reach: 0, moderate: 1, safe: 2 };

  function fmt(n) { return Number(n).toLocaleString('en-IN'); }

  function csv(rows) {
    return rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? '' : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  function store(key) {
    return {
      get: function (d) {
        try { return JSON.parse(localStorage.getItem(key)) || d; }
        catch (e) { return d; }
      },
      set: function (v) {
        try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { }
      },
      clear: function () { try { localStorage.removeItem(key); } catch (e) { } }
    };
  }

  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    empty: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 15h8"/>'
  };

  /* Reusable empty / error state. Same shape everywhere, so a "no results"
     and a "load failed" read as the same family of message. */
  function emptyState(o) {
    var box = el('div', { class: 'empty-state' });
    box.appendChild(el('div', { class: 'ico', html:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[o.icon] || ICONS.empty) + '</svg>' }));
    box.appendChild(el('h3', { text: o.title || 'Nothing to show' }));
    if (o.body) box.appendChild(el('p', { text: o.body }));
    if (o.actions && o.actions.length) {
      box.appendChild(el('div', { class: 'btns' }, o.actions));
    }
    return box;
  }

  /* Shimmer placeholder shaped roughly like the thing that is loading, so the
     layout does not jump when the real content arrives. */
  function skeleton(kind) {
    var wrap = el('div', { 'aria-busy': 'true', 'aria-live': 'polite' });
    wrap.appendChild(el('span', { class: 'sr', text: 'Loading…' }));
    wrap.appendChild(el('div', { class: 'progress', html: '<span></span>' }));
    if (kind === 'results') {
      var stats = el('div', { class: 'stats' });
      for (var s = 0; s < 4; s++) stats.appendChild(el('div', { class: 'sk sk-stat' }));
      wrap.appendChild(stats);
      for (var r = 0; r < 6; r++) wrap.appendChild(el('div', { class: 'sk sk-row' }));
      return wrap;
    }
    var card = el('div', { class: 'sk-card' });
    card.appendChild(el('div', { class: 'sk sk-title' }));
    var grid = el('div', { class: 'form-grid' });
    for (var i = 0; i < 6; i++) {
      var f = el('div');
      f.appendChild(el('div', { class: 'sk sk-line w40' }));
      f.appendChild(el('div', { class: 'sk', style: 'height:40px' }));
      grid.appendChild(f);
    }
    card.appendChild(grid);
    wrap.appendChild(card);
    return wrap;
  }

  function toast(msg, kind, ms) {
    if (window.CHToast) return window.CHToast(msg, kind, ms);
    return function () {};
  }

  /* Accessible confirm dialog — replaces window.confirm(), which cannot be
     styled and reads poorly on mobile. Falls back to confirm() if <dialog>
     is unavailable, so the destructive action is never silently skipped. */
  function confirmDialog(o, onYes) {
    if (typeof window.HTMLDialogElement === 'undefined') {
      if (window.confirm(o.body || o.title)) onYes();
      return;
    }
    var d = el('dialog', { class: 'ch-dialog' });
    d.appendChild(el('h3', { text: o.title || 'Are you sure?' }));
    if (o.body) d.appendChild(el('p', { text: o.body }));
    var no = el('button', { class: 'btn ghost', type: 'button', text: o.cancel || 'Cancel' });
    var yes = el('button', { class: 'btn danger', type: 'button', text: o.confirm || 'Confirm' });
    d.appendChild(el('div', { class: 'form-actions' }, [yes, no]));
    document.body.appendChild(d);
    function close() { d.close(); d.remove(); }
    no.addEventListener('click', close);
    yes.addEventListener('click', function () { close(); onYes(); });
    d.addEventListener('cancel', function () { d.remove(); });
    d.showModal();
    no.focus();
  }

  function fail(mount, msg) {
    mount.innerHTML = '';
    var retry = el('button', { class: 'btn', type: 'button', text: 'Try again' });
    retry.addEventListener('click', function () { location.reload(); });
    mount.appendChild(emptyState({
      icon: 'warn',
      title: 'That did not load',
      body: msg,
      actions: [retry]
    }));
  }

  return { el: el, opts: opts, band: band, BAND_ORDER: BAND_ORDER, fmt: fmt,
           csv: csv, download: download, store: store, fail: fail,
           emptyState: emptyState, skeleton: skeleton, toast: toast,
           confirm: confirmDialog };
})();

/* ==========================================================================
   Paid access layer for the predictors.
   Flow: check a saved token → fetch the dataset from /api/data/<tool> →
   on 401 show the unlock card → Razorpay checkout → server-side signature
   verification mints a lifetime token → dataset loads. A payment ID can
   restore access on any device.
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CH, el = C.el;
  var RZP_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

  function tokenKey(tool) { return 'ch:access:' + tool; }

  function loadRzp(ok, err) {
    if (window.Razorpay) return ok();
    var s = document.createElement('script');
    s.src = RZP_SRC;
    s.onload = ok;
    s.onerror = err;
    document.head.appendChild(s);
  }

  function api(path, body) {
    return fetch(path, body ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    } : undefined).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) {
          var e = new Error(d.error || ('Request failed (' + r.status + ')'));
          e.status = r.status;
          throw e;
        }
        return d;
      });
    });
  }

  C.access = function (opts, onData) {
    var mount = opts.mount;

    function loadData(token) {
      mount.innerHTML = '';
      mount.appendChild(C.skeleton('form'));
      fetch('/api/data/' + opts.tool, { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function (r) {
          if (r.status === 401 || r.status === 403) { var e = new Error('auth'); e.auth = true; throw e; }
          if (!r.ok) {
            return r.json().catch(function () { return {}; }).then(function (d) {
              throw new Error(d.error || ('HTTP ' + r.status));
            });
          }
          return r.json();
        })
        .then(onData)
        .catch(function (e) {
          if (e && e.auth) {
            try { localStorage.removeItem(tokenKey(opts.tool)); } catch (x) {}
            unlockCard('Your saved access could not be verified. Unlock again, or restore with your payment ID.');
          } else {
            C.fail(mount, e.message || 'Could not load the dataset. Check your connection and reload.');
          }
        });
    }

    function saveToken(token) {
      try { localStorage.setItem(tokenKey(opts.tool), token); } catch (x) {}
    }

    function unlockCard(notice) {
      mount.innerHTML = '';
      var card = el('div', { class: 'tool-form', style: 'max-width:620px' });
      card.appendChild(el('p', { class: 'eyebrow', text: 'One-time unlock' }));
      card.appendChild(el('h3', { style: 'margin:.2rem 0 .6rem;font-size:1.25rem', text: opts.name }));
      if (notice) card.appendChild(el('p', { class: 'hint', style: 'color:var(--alert);margin-bottom:.7rem', text: notice }));

      var ul = el('ul', { style: 'margin:0 0 1.1rem;padding-left:1.15rem' });
      (opts.bullets || []).forEach(function (b) {
        ul.appendChild(el('li', { style: 'margin-bottom:.4rem;font-size:.92rem;line-height:1.5', text: b }));
      });
      card.appendChild(ul);

      var btn = el('button', { class: 'btn', type: 'button', text: 'Unlock' });
      btn.disabled = true;
      var restoreBtn = el('button', { class: 'btn ghost sm', type: 'button', text: 'Already paid? Restore access' });
      card.appendChild(el('div', { class: 'form-actions' }, [btn, restoreBtn]));

      var msg = el('p', { class: 'hint', style: 'margin-top:.8rem' });
      card.appendChild(msg);
      card.appendChild(el('p', { class: 'hint', style: 'margin-top:.6rem',
        text: 'Payment is processed by Razorpay — card and UPI details never touch this site. ' +
              'Access is saved in this browser; keep the payment ID from your Razorpay receipt ' +
              'to restore it on any other device.' }));

      /* restore row, hidden until asked for */
      var rWrap = el('div', { style: 'display:none;margin-top:.8rem' });
      var rInput = el('input', { type: 'text', placeholder: 'pay_XXXXXXXXXXXXXX' });
      var rGo = el('button', { class: 'btn sm', type: 'button', text: 'Restore' });
      rWrap.appendChild(el('label', { text: 'Razorpay payment ID (from your receipt email)' }));
      rWrap.appendChild(el('div', { style: 'display:flex;gap:.5rem' }, [rInput, rGo]));
      card.appendChild(rWrap);

      mount.appendChild(card);

      api('/api/config').then(function (cfg) {
        var price = (cfg.prices && cfg.prices[opts.tool]) || 0;
        if (!cfg.configured) {
          btn.textContent = 'Unlock';
          msg.textContent = 'Payments are not switched on yet — the site owner still has to add ' +
            'the Razorpay keys and KV storage in Cloudflare. If you are previewing locally, this ' +
            'only works on the deployed site.';
          return;
        }
        btn.textContent = 'Unlock for ₹' + price;
        btn.disabled = false;
      }).catch(function () {
        msg.textContent = 'The payments service is not reachable. If you are previewing the site ' +
          'locally, payments only work once it is deployed on Cloudflare Pages.';
      });

      btn.addEventListener('click', function () {
        btn.disabled = true;
        msg.textContent = 'Preparing the payment…';
        api('/api/create-order', { tool: opts.tool }).then(function (o) {
          loadRzp(function () {
            var rz = new window.Razorpay({
              key: o.keyId,
              amount: o.amount,
              currency: o.currency,
              order_id: o.orderId,
              name: 'College Helper',
              description: opts.name,
              theme: { color: '#1F4FD8' },
              modal: { ondismiss: function () { btn.disabled = false; msg.textContent = ''; } },
              handler: function (resp) {
                msg.textContent = 'Verifying the payment…';
                api('/api/verify-payment', {
                  tool: opts.tool,
                  orderId: resp.razorpay_order_id,
                  paymentId: resp.razorpay_payment_id,
                  signature: resp.razorpay_signature
                }).then(function (v) {
                  saveToken(v.token);
                  if (window.CHToast) {
                    window.CHToast('Payment successful — unlocking your results now.', 'ok', 7000);
                    window.CHToast('Save your payment ID ' + v.paymentId +
                      ' — it restores access on any other device.', 'info', 14000);
                  }
                  loadData(v.token);
                }).catch(function (e) {
                  btn.disabled = false;
                  msg.textContent = 'Verification failed: ' + e.message +
                    ' If money was deducted, use "Restore access" with the payment ID from your receipt, ' +
                    'or write to us with that ID.';
                });
              }
            });
            rz.open();
          }, function () {
            btn.disabled = false;
            msg.textContent = 'Could not load the Razorpay checkout. Check your connection and try again.';
          });
        }).catch(function (e) {
          btn.disabled = false;
          msg.textContent = e.message;
        });
      });

      restoreBtn.addEventListener('click', function () {
        rWrap.style.display = rWrap.style.display === 'none' ? 'block' : 'none';
        if (rWrap.style.display === 'block') rInput.focus();
      });
      function doRestore() {
        rGo.disabled = true;
        msg.textContent = 'Checking that payment ID…';
        api('/api/restore-access', { paymentId: rInput.value }).then(function (v) {
          if (v.tool !== opts.tool) {
            rGo.disabled = false;
            msg.textContent = 'That payment unlocked the other predictor. Open that tool and restore there.';
            return;
          }
          saveToken(v.token);
          loadData(v.token);
        }).catch(function (e) {
          rGo.disabled = false;
          msg.textContent = e.message;
        });
      }
      rGo.addEventListener('click', doRestore);
      rInput.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') doRestore(); });
    }

    var saved = null;
    try { saved = localStorage.getItem(tokenKey(opts.tool)); } catch (x) {}
    if (saved) loadData(saved); else unlockCard();
  };
})();
