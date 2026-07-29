/* College Helper — core site behaviour.
   No dependencies. Everything degrades gracefully without JS. */
(function () {
  'use strict';

  /* ---------------------------------------------------------- mobile nav -- */
  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mnav.classList.toggle('open', !open);
    });
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

  /* No entrance animation: the list is reference information, not a reveal. */

  /* ------------------------------------------------- exam search + filter -- */
  var q = document.getElementById('q');
  var results = document.getElementById('results');
  if (q && results) {
    var cards = Array.prototype.slice.call(results.querySelectorAll('.card'));
    var count = document.getElementById('count');
    var empty = document.getElementById('empty');
    var state = { text: '', cat: '', level: '', state: '' };

    function setPressed(group, value) {
      document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === value));
      });
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
      if (count) count.textContent = shown + ' of ' + cards.length + ' exams';
      if (empty) empty.hidden = shown !== 0;
    }

    q.addEventListener('input', function () { state.text = q.value; apply(); });

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

    var clear = document.getElementById('clear');
    if (clear) clear.addEventListener('click', function () {
      state = { text: '', cat: '', level: '', state: '' };
      q.value = '';
      setPressed('cat', ''); setPressed('level', ''); setPressed('state', '');
      apply();
    });

    // deep link: /exams/?c=banking or ?q=neet
    var params = new URLSearchParams(location.search);
    if (params.get('c')) { state.cat = params.get('c'); setPressed('cat', state.cat); }
    if (params.get('q')) { state.text = params.get('q'); q.value = state.text; }
    apply();
  }

  /* -------------------------------------------------------- calendar filter */
  var calq = document.getElementById('calq');
  var cal = document.getElementById('calendar');
  if (calq && cal) {
    var items = Array.prototype.slice.call(cal.querySelectorAll('.cal-item'));
    var months = Array.prototype.slice.call(cal.querySelectorAll('.cal-month'));
    calq.addEventListener('input', function () {
      var t = calq.value.trim().toLowerCase();
      items.forEach(function (it) {
        it.hidden = !!t && it.textContent.toLowerCase().indexOf(t) === -1;
      });
      months.forEach(function (m) {
        m.hidden = !m.querySelector('.cal-item:not([hidden])');
      });
    });
  }

  /* ------------------------------------------------------ predictor loader */
  var tool = document.querySelector('[data-tool]');
  if (tool) {
    var name = tool.getAttribute('data-tool');
    var s = document.createElement('script');
    s.src = '/assets/js/predictor-' + name + '.js';
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

  function fail(mount, msg) {
    mount.innerHTML = '';
    mount.appendChild(el('p', { class: 'empty', text: msg }));
  }

  return { el: el, opts: opts, band: band, BAND_ORDER: BAND_ORDER, fmt: fmt,
           csv: csv, download: download, store: store, fail: fail };
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
      mount.appendChild(el('div', { class: 'loading' }, [
        el('div', { class: 'spin' }),
        document.createTextNode('Loading the dataset…')
      ]));
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
                  alert('Payment successful.\n\nYour payment ID is ' + v.paymentId +
                        ' — it is also in your Razorpay receipt email. Keep it: it restores ' +
                        'your access on any other device.');
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
