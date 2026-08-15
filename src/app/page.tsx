import Link from 'next/link';
import type { Metadata } from 'next';
import { loadDataset } from '@/lib/dataset';
import { PRICE_LABEL } from '@/lib/razorpay';

export const metadata: Metadata = {
  title: 'Find JEE colleges you can get at your rank',
  description: 'Enter your JEE Main or JEE Advanced rank and see which programmes had closing ranks within your reach in last year\u2019s JoSAA counselling. \u20b949 one-time.',
  alternates: { canonical: '/' },
};

/** Coverage read from the imported dataset, so the page never overstates what we hold. */
function coverage() {
  try {
    const ds = loadDataset();
    const types = new Set([...ds.institutes.values()].map((i) => i.type));
    return {
      ok: true as const,
      institutes: ds.instituteList.length,
      programs: ds.programList.length,
      rows: ds.meta.rowCount,
      years: ds.meta.years,
      rounds: ds.meta.rounds,
      types: [...types],
    };
  } catch {
    return { ok: false as const };
  }
}

const STEPS = [
  { n: 1, title: 'Enter your rank', body: 'Your JEE Main All India Rank, plus your JEE Advanced rank if you have one.' },
  { n: 2, title: 'Set your preferences', body: 'Category, institute types and as many branches as you want to consider.' },
  { n: 3, title: `Pay ${PRICE_LABEL}`, body: 'One payment through Razorpay. No account, no subscription, no renewal.' },
  { n: 4, title: 'Get your list', body: 'Every matching programme, sorted and filterable, ready to export as a PDF.' },
];

const INCLUDED = [
  ['Every matching programme', 'Filtered to your rank, category and branch choices \u2014 not a generic list.'],
  ['Both exams handled correctly', 'IIT seats are matched on your JEE Advanced rank, NIT, IIIT and GFTI seats on your JEE Main rank.'],
  ['Category cutoffs, not just OPEN', 'Reserved-category seats are compared against category closing ranks, the way JoSAA publishes them.'],
  ['The numbers behind every row', 'Opening rank, closing rank, quota, round and year for each result.'],
  ['A choice list you can order', 'Add, reorder and remove programmes to build your counselling preference order.'],
  ['A printable PDF', 'Your ordered list as a clean document you can keep or take to counselling.'],
];

const FAQS = [
  ['Is admission guaranteed if a college appears in my list?', 'No. Every result is a comparison against last year\u2019s closing rank for that exact seat. Cutoffs move each year with the number of candidates, seat matrix changes and how other students fill their choices. Treat the list as a shortlist to research, not a prediction.'],
  ['Which year\u2019s cutoff data is used?', 'The tool uses the JoSAA opening and closing ranks that have been imported into it. The exact year and round are shown on the results page and on every PDF, so you always know what you are looking at.'],
  ['Can I enter both my JEE Main and JEE Advanced ranks?', 'Yes, and you should if you have both. Your JEE Advanced rank unlocks IIT and IISc seats; your JEE Main rank covers NITs, IIITs and GFTIs. Entering only your Main rank still works \u2014 the IIT seats are simply left out, and we say so.'],
  ['Why do IITs use the JEE Advanced rank?', 'IITs and IISc admit through JEE Advanced, so JoSAA publishes their cutoffs as JEE Advanced ranks. Comparing a JEE Main rank against them would be meaningless, so we never do it.'],
  ['I am in a reserved category. Do I need my category rank?', 'For reserved-category seats, yes. JoSAA publishes those closing ranks as category ranks, which are much smaller numbers than an All India Rank. If you only give your AIR we show you OPEN seats you qualify for and tell you exactly how many reserved seats are waiting on your category rank, rather than comparing the wrong two numbers.'],
  ['Can I select more than one branch?', 'Yes. Pick as many programmes as you like, or leave it on all programmes and filter the results afterwards.'],
  ['Can I download my choice list?', 'Yes. Build your list in the order you want, then export it as a PDF with the institute, programme, seat type and closing rank for each entry.'],
  ['Can I get a refund?', `The ${PRICE_LABEL} fee unlocks your results immediately, so it is generally non-refundable once the list has been generated. If the tool failed to produce results after a successful payment, contact us and we will refund it. Full terms are in the refund policy.`],
  ['Do I need to create an account?', 'No. Your search is held in a secure session on your device for a week. There is no signup, no password and no email required.'],
];

export default function Home() {
  const c = coverage();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ---------------- hero ---------------- */}
      <section style={{ paddingBlock: 'clamp(40px, 8vw, 76px)', background: 'linear-gradient(180deg, var(--brand-tint) 0%, var(--paper) 100%)' }}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <p className="badge" style={{ background: 'var(--paper)', color: 'var(--brand-dark)', border: '1px solid var(--rule)' }}>
            Based on JoSAA opening &amp; closing ranks
          </p>
          <h1 style={{ marginTop: 16, maxWidth: '16ch' }}>
            Find JEE colleges you can get at your rank
          </h1>
          <p style={{ marginTop: 16, fontSize: 'clamp(1.02rem, 2.6vw, 1.2rem)', color: 'var(--ink-2)', maxWidth: '58ch' }}>
            Enter your JEE Main or JEE Advanced rank and see every IIT, NIT, IIIT and GFTI programme whose closing rank was within your
            reach in last year&rsquo;s counselling &mdash; matched to your category, not just the OPEN list.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <Link href="/find" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 26px' }}>Find my colleges</Link>
            <Link href="/how-it-works" className="btn btn-secondary" style={{ fontSize: 16, padding: '14px 24px' }}>How it works</Link>
          </div>

          <p style={{ marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
            {PRICE_LABEL} one time &middot; No account needed &middot; Works on any phone
          </p>

          {c.ok && (
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))', gap: 12, marginTop: 36 }}>
              {[
                [c.rows.toLocaleString('en-IN'), 'cutoff records'],
                [String(c.institutes), 'institutes'],
                [String(c.programs), 'programmes'],
                [`${c.years.join(', ')}`, `round ${c.rounds.join(', ')}`],
              ].map(([big, small]) => (
                <div key={small} className="card" style={{ padding: '14px 16px' }}>
                  <dt className="num" style={{ fontSize: 21, fontWeight: 600 }}>{big}</dt>
                  <dd style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{small}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* ---------------- steps ---------------- */}
      <section className="wrap" style={{ paddingBlock: 'clamp(40px, 7vw, 64px)' }}>
        <h2>Four steps, about two minutes</h2>
        <ol style={{ listStyle: 'none', margin: '28px 0 0', padding: 0, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(228px, 1fr))' }}>
          {STEPS.map((s) => (
            <li key={s.n} className="card" style={{ padding: 20 }}>
              <span className="num" aria-hidden style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: 'var(--brand-tint)', color: 'var(--brand-dark)', fontWeight: 600, fontSize: 14 }}>{s.n}</span>
              <h3 style={{ marginTop: 14, fontSize: 17 }}>{s.title}</h3>
              <p style={{ marginTop: 6, fontSize: 14.5, color: 'var(--ink-2)' }}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- what's included ---------------- */}
      <section style={{ background: 'var(--surface)', borderBlock: '1px solid var(--rule)', paddingBlock: 'clamp(40px, 7vw, 64px)' }}>
        <div className="wrap">
          <h2>What {PRICE_LABEL} gets you</h2>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(268px, 1fr))', marginTop: 28 }}>
            {INCLUDED.map(([title, body]) => (
              <div key={title} style={{ display: 'flex', gap: 12 }}>
                <span aria-hidden style={{ flexShrink: 0, marginTop: 3, width: 20, height: 20, borderRadius: 999, background: 'var(--safe-tint)', color: 'var(--safe)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>&#10003;</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15.5 }}>{title}</p>
                  <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 3 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- how eligibility is calculated ---------------- */}
      <section className="wrap" style={{ paddingBlock: 'clamp(40px, 7vw, 64px)', maxWidth: 800 }}>
        <h2>How eligibility is calculated</h2>
        <p style={{ marginTop: 14, color: 'var(--ink-2)' }}>
          For every seat, we compare your rank against the closing rank that seat reached in the counselling round we hold data for.
          If your rank is equal to or better than that closing rank, the seat appears in your list.
        </p>
        <div className="panel" style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Example</p>
          <p className="num" style={{ marginTop: 10, fontSize: 15 }}>Your JEE Main AIR &nbsp;82,011</p>
          <p className="num" style={{ fontSize: 15 }}>Closing rank &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;95,200</p>
          <p className="num" style={{ fontSize: 15, color: 'var(--safe)', fontWeight: 600 }}>Buffer &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;13,189</p>
        </div>
        <p style={{ marginTop: 20, color: 'var(--ink-2)' }}>
          Which rank we compare depends on the seat. IIT and IISc seats are matched on your JEE Advanced rank. NIT, IIIT and GFTI seats
          are matched on your JEE Main rank. Reserved-category seats are matched on your category rank, because that is how JoSAA
          publishes them. When we don&rsquo;t have the rank a seat needs, we leave it out and tell you which rank would unlock it, rather
          than comparing two numbers that don&rsquo;t belong together.
        </p>
      </section>

      {/* ---------------- disclaimer ---------------- */}
      <section className="wrap" style={{ paddingBottom: 'clamp(40px, 7vw, 64px)' }}>
        <div className="panel" style={{ borderLeft: '3px solid var(--border-line)', background: 'var(--border-tint)' }}>
          <h3 style={{ fontSize: 16 }}>Important disclaimer</h3>
          <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }}>
            Cutoffs are based on previous-year data and are intended for guidance only. Actual admission cutoffs may vary each year.
            Nothing here is a prediction, an admission offer, or a guarantee of a seat. Always confirm against the official JoSAA portal
            before making a counselling decision.
          </p>
        </div>
      </section>

      {/* ---------------- faq ---------------- */}
      <section className="wrap" style={{ paddingBottom: 'clamp(40px, 7vw, 64px)', maxWidth: 800 }}>
        <h2>Frequently asked questions</h2>
        <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
          {FAQS.map(([q, a]) => (
            <details key={q} className="card" style={{ padding: '14px 18px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15.5, minHeight: 28, display: 'flex', alignItems: 'center' }}>{q}</summary>
              <p style={{ marginTop: 10, fontSize: 14.5, color: 'var(--ink-2)' }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------- closing cta ---------------- */}
      <section className="wrap" style={{ paddingBottom: 64 }}>
        <div className="card" style={{ padding: 'clamp(24px, 5vw, 40px)', textAlign: 'center', background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}>
          <h2>Ready to see your list?</h2>
          <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>Takes about two minutes. No account required.</p>
          <Link href="/find" className="btn btn-primary" style={{ marginTop: 20, fontSize: 16, padding: '14px 28px' }}>Find my colleges</Link>
        </div>
      </section>
    </>
  );
}
