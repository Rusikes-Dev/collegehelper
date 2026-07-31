/* NEET College Predictor — runs entirely in the browser.
   Data: MCC NEET UG All India Quota counselling allotment lists, Rounds 1-3.
   Ranks in those lists are NEET All India Rank (overall), including for
   reserved-category seats, so the prediction is driven by AIR. Your category
   decides WHICH seats you may compete for. */
(function () {
  'use strict';
  var C = window.CH, el = C.el;
  var mount = document.getElementById('neet-app');
  if (!mount) return;

  var DATA = null, SHORT = C.store('ch:neet:shortlist');

  var USER_CATEGORIES = ['General', 'EWS', 'OBC', 'SC', 'ST'];
  var BASE = {
    General: ['Open'],
    EWS: ['Open', 'EWS'],
    OBC: ['Open', 'OBC'],
    SC: ['Open', 'SC'],
    ST: ['Open', 'ST']
  };
  function eligible(cat, pwd) {
    var base = BASE[cat] || ['Open'];
    if (!pwd) return base;
    return base.concat(base.map(function (c) { return c + ' PwD'; }));
  }

  C.access({
    tool: 'neet',
    mount: mount,
    name: 'NEET College Predictor',
    bullets: [
      '671 colleges and 8,349 closing ranks from MCC All India Quota counselling, Rounds 1\u20133',
      'Category-aware seat eligibility, including PwD sub-categories',
      'Filter by course, quota, state and counselling round',
      'Safe, moderate and reach banding, CSV export and a saved choice list',
      'One-time payment. Access stays on this device and restores anywhere with your payment ID'
    ]
  }, function (d) { DATA = d; render(); });

  function render() {
    mount.innerHTML = '';

    var form = el('div', { class: 'tool-form' });
    form.appendChild(el('p', { class: 'eyebrow', text: 'Your details' }));
    var grid = el('div', { class: 'form-grid' });

    function field(label, node, hint) {
      var w = el('div');
      var id = 'n-' + Math.random().toString(36).slice(2, 8);
      node.id = id;
      w.appendChild(el('label', { for: id, text: label }));
      w.appendChild(node);
      if (hint) w.appendChild(el('p', { class: 'hint', text: hint }));
      return w;
    }

    var air = el('input', { type: 'number', min: '1', inputmode: 'numeric', placeholder: 'e.g. 12500' });
    var cat = el('select'); C.opts(cat, USER_CATEGORIES);
    var course = el('select'); C.opts(course, DATA.enums.course, 'Any course');
    var quota = el('select'); C.opts(quota, DATA.enums.quota.slice().sort(), 'Any quota');
    var st = el('select'); C.opts(st, DATA.states, 'Anywhere in India');
    var rnd = el('select'); C.opts(rnd, ['1', '2', '3'], 'Any round');

    var pwdWrap = el('div');
    var pwd = el('input', { type: 'checkbox' });
    var pl = el('label', { style: 'display:flex;align-items:center;gap:.5rem;font-weight:500;font-size:.9rem;color:var(--text);margin-top:1.55rem' });
    pl.appendChild(pwd);
    pl.appendChild(document.createTextNode('I am a PwD candidate'));
    pwdWrap.appendChild(pl);

    grid.appendChild(field('NEET All India Rank', air, 'Your overall AIR from the scorecard.'));
    grid.appendChild(field('Category', cat, 'Decides which seat categories you can compete for.'));
    grid.appendChild(field('Course', course));
    grid.appendChild(field('Quota', quota, 'All India, deemed, ESIC, AMU internal and others.'));
    grid.appendChild(field('State', st));
    grid.appendChild(field('Counselling round', rnd, 'Compare against Round 1 when planning Round 1.'));
    grid.appendChild(pwdWrap);
    form.appendChild(grid);

    var go = el('button', { class: 'btn', type: 'button', text: 'Show my colleges' });
    var reset = el('button', { class: 'btn ghost', type: 'button', text: 'Reset' });
    form.appendChild(el('div', { class: 'form-actions' }, [go, reset]));
    mount.appendChild(form);

    var out = el('div', { id: 'neet-out' });
    mount.appendChild(out);

    mount.appendChild(el('p', { class: 'hint', style: 'margin-top:1.5rem',
      text: DATA.meta.source + ' · ' + DATA.colleges.length + ' colleges · ' +
            C.fmt(DATA.rows.length) + ' closing ranks · ' + DATA.states.length + ' states. ' +
            DATA.meta.note }));

    go.addEventListener('click', function () {
      var a = parseInt(air.value, 10);
      if (!a || a < 1) {
        out.innerHTML = '';
        out.appendChild(C.emptyState({
          title: 'Enter your All India Rank',
          body: 'Add your NEET All India Rank above to see the MBBS, BDS and BSc Nursing seats ' +
                'that closed at or near it.'
        }));
        C.toast('Enter your NEET All India Rank first.', 'warn');
        air.focus();
        return;
      }
      predict(out, {
        air: a, cat: cat.value, pwd: pwd.checked, course: course.value,
        quota: quota.value, state: st.value, round: rnd.value
      });
    });
    reset.addEventListener('click', function () {
      air.value = ''; course.value = ''; quota.value = ''; st.value = ''; rnd.value = '';
      cat.selectedIndex = 0; pwd.checked = false; out.innerHTML = '';
    });
    air.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go.click(); });

    renderShortlist();
  }

  function predict(out, f) {
    var allowed = {};
    eligible(f.cat, f.pwd).forEach(function (c) { allowed[c] = 1; });

    var E = DATA.enums, Co = DATA.colleges, hits = [];
    for (var i = 0; i < DATA.rows.length; i++) {
      var r = DATA.rows[i];
      var category = E.category[r[3]];
      if (!allowed[category]) continue;
      var course = E.course[r[1]];
      if (f.course && course !== f.course) continue;
      var quota = E.quota[r[2]];
      if (f.quota && quota !== f.quota) continue;
      if (f.round && String(r[4]) !== f.round) continue;
      var c = Co[r[0]];
      if (f.state && c[1] !== f.state) continue;

      var b = C.band(f.air, r[6]);
      if (!b) continue;
      hits.push({
        college: c[0], state: c[1], course: course, quota: quota, category: category,
        round: r[4], opening: r[5], closing: r[6], seats: r[7], band: b
      });
    }

    hits.sort(function (a, b) {
      var d = C.BAND_ORDER[a.band] - C.BAND_ORDER[b.band];
      return d !== 0 ? d : a.closing - b.closing;
    });

    out.innerHTML = '';
    if (!hits.length) {
      out.appendChild(C.emptyState({
        icon: 'search',
        title: 'No AIQ seat closed near AIR ' + C.fmt(f.air),
        body: 'Nothing matched that combination. Widen the course or quota filter — and remember ' +
              'this tool covers All India Quota only. Your state quota merit list is separate ' +
              'and is often more forgiving.'
      }));
      return;
    }

    var counts = { safe: 0, moderate: 0, reach: 0 }, colleges = {};
    hits.forEach(function (h) { counts[h.band]++; colleges[h.college] = 1; });

    var stats = el('div', { class: 'stats' });
    [[Object.keys(colleges).length, 'colleges', ''],
     [counts.safe, 'safe', 'safe'],
     [counts.moderate, 'moderate', 'mod'],
     [counts.reach, 'reach', 'reach']].forEach(function (s) {
      stats.appendChild(el('div', { class: 'stat ' + s[2] }, [
        el('span', { class: 'n mono', text: C.fmt(s[0]) }),
        el('span', { class: 'l', text: s[1] })
      ]));
    });
    out.appendChild(stats);

    out.appendChild(el('p', { class: 'result-count',
      text: hits.length + ' seats match AIR ' + C.fmt(f.air) + ' · ' + f.cat +
            (f.pwd ? ' (PwD)' : '') + ' · sorted reach first, so you can build a choice list top-down.' }));

    var tw = el('div', { class: 'tw' });
    var t = el('table');
    t.innerHTML = '<thead><tr><th>Band</th><th>College</th><th>Course</th><th>Category</th>' +
      '<th>Closing AIR</th><th>Round</th><th>Quota</th><th></th></tr></thead>';
    var tb = el('tbody');

    hits.slice(0, 400).forEach(function (h) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [el('span', { class: 'band ' + h.band, text: h.band })]));
      tr.appendChild(el('td', {}, [
        el('span', { text: h.college }),
        el('br'),
        el('small', { style: 'color:var(--text-2)', text: h.state })
      ]));
      tr.appendChild(el('td', { text: h.course }));
      tr.appendChild(el('td', { text: h.category }));
      tr.appendChild(el('td', { class: 'mono', text: C.fmt(h.closing) }));
      tr.appendChild(el('td', { class: 'mono', text: 'R' + h.round }));
      tr.appendChild(el('td', { text: h.quota }));
      var add = el('button', { class: 'btn ghost sm', type: 'button', text: '+ Shortlist' });
      add.addEventListener('click', function () {
        var list = SHORT.get([]);
        var id = h.college + '|' + h.course + '|' + h.category + '|' + h.quota;
        if (!list.some(function (x) { return x.id === id; })) {
          list.push({ id: id, college: h.college, state: h.state, course: h.course,
                      category: h.category, quota: h.quota, closing: h.closing, band: h.band });
          SHORT.set(list); renderShortlist();
        }
        add.textContent = '✓ Added'; add.disabled = true;
        C.toast(h.course + ' at ' + h.college + ' added to your choice list.', 'ok');
      });
      tr.appendChild(el('td', {}, [add]));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    tw.appendChild(t);
    out.appendChild(tw);

    if (hits.length > 400) {
      out.appendChild(el('p', { class: 'tnote',
        text: 'Showing the first 400 of ' + C.fmt(hits.length) +
              ' matches. Narrow by course, quota or state to see the rest.' }));
    }

    var dl = el('button', { class: 'btn ghost sm', type: 'button', text: 'Download all matches as CSV' });
    dl.addEventListener('click', function () {
      var rows = [['Band', 'College', 'State', 'Course', 'Quota', 'Category', 'Round',
                   'Opening AIR', 'Closing AIR', 'Seats']];
      hits.forEach(function (h) {
        rows.push([h.band, h.college, h.state, h.course, h.quota, h.category,
                   h.round, h.opening, h.closing, h.seats]);
      });
      C.download('neet-matches-' + f.air + '.csv', C.csv(rows));
      C.toast('Downloaded ' + C.fmt(hits.length) + ' matches as CSV.', 'ok');
    });
    out.appendChild(el('div', { class: 'form-actions' }, [dl]));
  }

  function renderShortlist() {
    var old = document.getElementById('neet-short');
    if (old) old.remove();
    var list = SHORT.get([]);
    if (!list.length) return;

    var box = el('div', { id: 'neet-short', class: 'tool-form', style: 'margin-top:1.5rem' });
    box.appendChild(el('p', { class: 'eyebrow', text: 'Your choice list · ' + list.length + ' seats' }));
    box.appendChild(el('p', { class: 'hint',
      text: 'Saved on this device only. MCC allotment runs strictly down your locked preference ' +
            'order, so put reach options above safe ones.' }));

    var tw = el('div', { class: 'tw', style: 'margin-top:1rem' });
    var t = el('table');
    t.innerHTML = '<thead><tr><th>#</th><th>College</th><th>Course</th><th>Closing</th><th>Band</th><th></th></tr></thead>';
    var tb = el('tbody');
    list.forEach(function (item, i) {
      var tr = el('tr');
      tr.appendChild(el('td', { class: 'mono', text: String(i + 1) }));
      tr.appendChild(el('td', {}, [
        el('span', { text: item.college }), el('br'),
        el('small', { style: 'color:var(--text-2)', text: item.state + ' · ' + item.quota })
      ]));
      tr.appendChild(el('td', { text: item.course }));
      tr.appendChild(el('td', { class: 'mono', text: C.fmt(item.closing) }));
      tr.appendChild(el('td', {}, [el('span', { class: 'band ' + item.band, text: item.band })]));
      var ctrl = el('td');
      [['↑', -1], ['↓', 1]].forEach(function (m) {
        var b = el('button', { class: 'btn ghost sm', type: 'button', text: m[0],
                               style: 'margin-right:.25rem;padding:.3rem .5rem' });
        b.addEventListener('click', function () {
          var j = i + m[1];
          if (j < 0 || j >= list.length) return;
          var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
          SHORT.set(list); renderShortlist();
        });
        ctrl.appendChild(b);
      });
      var rm = el('button', { class: 'btn ghost sm', type: 'button', text: '×',
                              style: 'padding:.3rem .55rem' });
      rm.addEventListener('click', function () { list.splice(i, 1); SHORT.set(list); renderShortlist(); });
      ctrl.appendChild(rm);
      tr.appendChild(ctrl);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    tw.appendChild(t);
    box.appendChild(tw);

    var exp = el('button', { class: 'btn sm', type: 'button', text: 'Export choice list (CSV)' });
    exp.addEventListener('click', function () {
      var rows = [['Preference', 'College', 'State', 'Course', 'Quota', 'Category', 'Closing AIR', 'Band']];
      list.forEach(function (x, i) {
        rows.push([i + 1, x.college, x.state, x.course, x.quota, x.category, x.closing, x.band]);
      });
      C.download('neet-choice-list.csv', C.csv(rows));
      C.toast('Choice list exported.', 'ok');
    });
    var clr = el('button', { class: 'btn ghost sm', type: 'button', text: 'Clear list' });
    clr.addEventListener('click', function () {
      C.confirm({
        title: 'Clear your choice list?',
        body: 'This removes all ' + list.length + ' saved seats from this device. It cannot be undone.',
        confirm: 'Clear list'
      }, function () {
        SHORT.clear(); renderShortlist();
        C.toast('Choice list cleared.', 'ok');
      });
    });
    box.appendChild(el('div', { class: 'form-actions' }, [exp, clr]));
    mount.appendChild(box);
  }
})();
