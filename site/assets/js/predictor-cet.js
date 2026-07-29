/* MHT CET College Predictor — runs entirely in the browser.
   Data: MHT CET 2025 CAP Rounds I, II & III cut-off lists (Maharashtra State CET Cell).
   The merit number is the Maharashtra State General Merit No. — LOWER is better. */
(function () {
  'use strict';
  var C = window.CH, el = C.el;
  var mount = document.getElementById('cet-app');
  if (!mount) return;

  var DATA = null, RECORDS = null, SHORT = C.store('ch:cet:shortlist');
  var ROUND_ORDER = { I: 0, II: 1, III: 2 };

  C.access({
    tool: 'cet',
    mount: mount,
    name: 'MHT CET College Predictor',
    bullets: [
      '370 colleges, 103 branches and 71,603 closing merit numbers from the official 2025 CAP Rounds I\u2013III cut-off lists',
      'Filter by category, seat level, pool, branch group, region, CAP round and college type',
      'Safe, moderate and reach banding with round-wise closing numbers for every seat',
      'CSV export and a reorderable saved choice list',
      'One-time payment. Access stays on this device and restores anywhere with your payment ID'
    ]
  }, function (d) { DATA = d; RECORDS = expand(d); render(); });

  /* Group the columnar rows into one record per seat, carrying the closing
     merit number of every CAP round that seat appeared in. */
  function expand(d) {
    var Co = d.colleges, B = d.branches, E = d.enums, map = {}, out = [];
    for (var i = 0; i < d.rows.length; i++) {
      var r = d.rows[i];
      var key = r[0] + '-' + r[1] + '-' + r[3] + '-' + r[4] + '-' + r[6];
      var rec = map[key];
      if (!rec) {
        var c = Co[r[0]];
        rec = map[key] = {
          college: c[0], code: c[1], city: c[2], region: c[3], type: c[4],
          branch: B[r[1]], group: E.branchGroup[r[2]],
          category: E.category[r[3]], pool: E.pool[r[4]],
          gender: E.gender[r[5]], seat: E.seatLevel[r[6]],
          rounds: [], best: Infinity
        };
        out.push(rec);
      }
      rec.rounds.push({ round: E.round[r[9]], rank: r[8], pct: r[7] });
      if (r[8] < rec.best) rec.best = r[8];
    }
    out.forEach(function (o) {
      o.rounds.sort(function (a, b) { return ROUND_ORDER[a.round] - ROUND_ORDER[b.round]; });
    });
    return out;
  }

  function uniq(fn) {
    var s = {};
    RECORDS.forEach(function (r) { s[fn(r)] = 1; });
    return Object.keys(s).filter(Boolean).sort();
  }

  /* ------------------------------------------------------------------ UI -- */
  function render() {
    mount.innerHTML = '';

    var form = el('div', { class: 'tool-form' });
    form.appendChild(el('p', { class: 'eyebrow', text: 'Your details' }));

    var grid = el('div', { class: 'form-grid' });
    function field(label, node, hint) {
      var w = el('div');
      var id = 'f-' + Math.random().toString(36).slice(2, 8);
      node.id = id;
      w.appendChild(el('label', { for: id, text: label }));
      w.appendChild(node);
      if (hint) w.appendChild(el('p', { class: 'hint', text: hint }));
      return w;
    }

    var merit = el('input', { type: 'number', min: '1', inputmode: 'numeric',
                              placeholder: 'e.g. 37591' });
    var cat = el('select'); C.opts(cat, DATA.enums.category);
    var seat = el('select'); C.opts(seat, DATA.enums.seatLevel);
    var pool = el('select'); C.opts(pool, DATA.enums.pool);
    var grp = el('select'); C.opts(grp, DATA.enums.branchGroup, 'Any branch group');
    var reg = el('select'); C.opts(reg, uniq(function (r) { return r.region; }), 'Anywhere in Maharashtra');
    var rnd = el('select'); C.opts(rnd, ['I', 'II', 'III'], 'Any CAP round');
    var typ = el('select'); C.opts(typ, uniq(function (r) { return r.type; }), 'Any college type');

    grid.appendChild(field('State General Merit Number', merit,
      'The number on your CAP merit list — lower is better.'));
    grid.appendChild(field('Category', cat));
    grid.appendChild(field('Seat level', seat,
      'Home University, Other Than Home University or State Level.'));
    grid.appendChild(field('Pool', pool));
    grid.appendChild(field('Branch group', grp));
    grid.appendChild(field('Region', reg));
    grid.appendChild(field('CAP round', rnd, 'Compare against Round I when planning Round I.'));
    grid.appendChild(field('College type', typ));
    form.appendChild(grid);

    var go = el('button', { class: 'btn', type: 'button', text: 'Show my colleges' });
    var reset = el('button', { class: 'btn ghost', type: 'button', text: 'Reset' });
    var acts = el('div', { class: 'form-actions' }, [go, reset]);
    form.appendChild(acts);
    mount.appendChild(form);

    var out = el('div', { id: 'cet-out' });
    mount.appendChild(out);

    var meta = el('p', { class: 'hint', style: 'margin-top:1.5rem' });
    meta.textContent = DATA.meta.source + ' · ' + DATA.colleges.length + ' colleges · ' +
      DATA.branches.length + ' branches · ' + C.fmt(DATA.rows.length) +
      ' closing merit numbers across CAP Rounds I–III.';
    mount.appendChild(meta);

    go.addEventListener('click', function () {
      var m = parseInt(merit.value, 10);
      if (!m || m < 1) {
        out.innerHTML = '';
        out.appendChild(el('p', { class: 'empty', text: 'Enter your State General Merit Number to see results.' }));
        merit.focus();
        return;
      }
      predict(out, {
        merit: m, category: cat.value, seat: seat.value, pool: pool.value,
        group: grp.value, region: reg.value, round: rnd.value, type: typ.value
      });
    });
    reset.addEventListener('click', function () {
      merit.value = ''; grp.value = ''; reg.value = ''; rnd.value = ''; typ.value = '';
      cat.selectedIndex = 0; seat.selectedIndex = 0; pool.selectedIndex = 0;
      out.innerHTML = '';
    });
    merit.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go.click(); });

    renderShortlist();
  }

  /* -------------------------------------------------------------- predict -- */
  function predict(out, f) {
    var hits = [];
    for (var i = 0; i < RECORDS.length; i++) {
      var r = RECORDS[i];
      if (r.category !== f.category) continue;
      if (r.seat !== f.seat) continue;
      if (r.pool !== f.pool) continue;
      if (f.group && r.group !== f.group) continue;
      if (f.region && r.region !== f.region) continue;
      if (f.type && r.type !== f.type) continue;

      var rounds = f.round ? r.rounds.filter(function (x) { return x.round === f.round; }) : r.rounds;
      if (!rounds.length) continue;

      // Use the most forgiving closing number among the rounds in scope.
      var closing = Math.max.apply(null, rounds.map(function (x) { return x.rank; }));
      var b = C.band(f.merit, closing);
      if (!b) continue;
      hits.push({ rec: r, band: b, closing: closing, rounds: rounds });
    }

    hits.sort(function (a, b) {
      var d = C.BAND_ORDER[a.band] - C.BAND_ORDER[b.band];
      return d !== 0 ? d : a.closing - b.closing;
    });

    out.innerHTML = '';
    if (!hits.length) {
      out.appendChild(el('p', { class: 'empty',
        text: 'No seat in this combination closed near merit number ' + C.fmt(f.merit) +
              '. Try a different seat level or category — the same branch at the same college ' +
              'often closes at a very different number under Home University.' }));
      return;
    }

    var counts = { safe: 0, moderate: 0, reach: 0 };
    var colleges = {};
    hits.forEach(function (h) { counts[h.band]++; colleges[h.rec.college] = 1; });

    var stats = el('div', { class: 'stats' });
    [['n', Object.keys(colleges).length, 'colleges', ''],
     ['safe', counts.safe, 'safe', 'safe'],
     ['mod', counts.moderate, 'moderate', 'mod'],
     ['reach', counts.reach, 'reach', 'reach']].forEach(function (s) {
      stats.appendChild(el('div', { class: 'stat ' + s[3] }, [
        el('span', { class: 'n mono', text: C.fmt(s[1]) }),
        el('span', { class: 'l', text: s[2] })
      ]));
    });
    out.appendChild(stats);

    out.appendChild(el('p', { class: 'result-count',
      text: hits.length + ' seats match merit number ' + C.fmt(f.merit) +
            ' · ' + f.category + ' · ' + f.seat + ' · ' + f.pool +
            ' · sorted reach first, so you can build a choice list top-down.' }));

    var tw = el('div', { class: 'tw' });
    var t = el('table');
    t.innerHTML = '<thead><tr><th>Band</th><th>College</th><th>Branch</th>' +
      '<th>Closing merit no.</th><th>Rounds</th><th>Region</th><th></th></tr></thead>';
    var tb = el('tbody');

    hits.slice(0, 400).forEach(function (h) {
      var tr = el('tr');
      tr.appendChild(el('td', {}, [el('span', { class: 'band ' + h.band, text: h.band })]));
      tr.appendChild(el('td', { text: h.rec.college }));
      tr.appendChild(el('td', { text: h.rec.branch }));
      tr.appendChild(el('td', { class: 'mono', text: C.fmt(h.closing) }));
      tr.appendChild(el('td', { class: 'mono',
        text: h.rounds.map(function (x) { return x.round + ': ' + C.fmt(x.rank); }).join(' · ') }));
      tr.appendChild(el('td', { text: h.rec.city + ' · ' + h.rec.type }));
      var add = el('button', { class: 'btn ghost sm', type: 'button', text: '+ Shortlist' });
      add.addEventListener('click', function () {
        var list = SHORT.get([]);
        var id = h.rec.code + '|' + h.rec.branch + '|' + h.rec.category + '|' + h.rec.seat;
        if (!list.some(function (x) { return x.id === id; })) {
          list.push({ id: id, college: h.rec.college, branch: h.rec.branch,
                      category: h.rec.category, seat: h.rec.seat, closing: h.closing, band: h.band });
          SHORT.set(list);
          renderShortlist();
        }
        add.textContent = '✓ Added';
        add.disabled = true;
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
              ' matches. Narrow by branch group or region to see the rest.' }));
    }

    var dl = el('button', { class: 'btn ghost sm', type: 'button', text: 'Download all matches as CSV' });
    dl.addEventListener('click', function () {
      var rows = [['Band', 'College', 'Code', 'Branch', 'Category', 'Seat level', 'Pool',
                   'Closing merit no.', 'Round-wise', 'City', 'Region', 'Type']];
      hits.forEach(function (h) {
        rows.push([h.band, h.rec.college, h.rec.code, h.rec.branch, h.rec.category,
                   h.rec.seat, h.rec.pool, h.closing,
                   h.rounds.map(function (x) { return x.round + ':' + x.rank; }).join(' '),
                   h.rec.city, h.rec.region, h.rec.type]);
      });
      C.download('mht-cet-matches-' + f.merit + '.csv', C.csv(rows));
    });
    out.appendChild(el('div', { class: 'form-actions' }, [dl]));
  }

  /* ------------------------------------------------------------ shortlist -- */
  function renderShortlist() {
    var old = document.getElementById('cet-short');
    if (old) old.remove();
    var list = SHORT.get([]);
    if (!list.length) return;

    var box = el('div', { id: 'cet-short', class: 'tool-form', style: 'margin-top:1.5rem' });
    box.appendChild(el('p', { class: 'eyebrow', text: 'Your choice list · ' + list.length + ' seats' }));
    box.appendChild(el('p', { class: 'hint',
      text: 'Saved on this device only. Allotment runs strictly down your list, so put reach ' +
            'options above safe ones — a safe option placed higher will simply take the seat.' }));

    var tw = el('div', { class: 'tw', style: 'margin-top:1rem' });
    var t = el('table');
    t.innerHTML = '<thead><tr><th>#</th><th>College</th><th>Branch</th><th>Closing</th><th>Band</th><th></th></tr></thead>';
    var tb = el('tbody');
    list.forEach(function (item, i) {
      var tr = el('tr');
      tr.appendChild(el('td', { class: 'mono', text: String(i + 1) }));
      tr.appendChild(el('td', { text: item.college }));
      tr.appendChild(el('td', { text: item.branch }));
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
      rm.addEventListener('click', function () {
        list.splice(i, 1); SHORT.set(list); renderShortlist();
      });
      ctrl.appendChild(rm);
      tr.appendChild(ctrl);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    tw.appendChild(t);
    box.appendChild(tw);

    var exp = el('button', { class: 'btn sm', type: 'button', text: 'Export choice list (CSV)' });
    exp.addEventListener('click', function () {
      var rows = [['Preference', 'College', 'Branch', 'Category', 'Seat level', 'Closing merit no.', 'Band']];
      list.forEach(function (x, i) {
        rows.push([i + 1, x.college, x.branch, x.category, x.seat, x.closing, x.band]);
      });
      C.download('mht-cet-choice-list.csv', C.csv(rows));
    });
    var clr = el('button', { class: 'btn ghost sm', type: 'button', text: 'Clear list' });
    clr.addEventListener('click', function () {
      if (confirm('Clear your saved choice list?')) { SHORT.clear(); renderShortlist(); }
    });
    box.appendChild(el('div', { class: 'form-actions' }, [exp, clr]));
    mount.appendChild(box);
  }
})();
