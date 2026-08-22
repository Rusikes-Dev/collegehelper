import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PAGES, pageBySlug } from '@/content/pages';
import { SITE } from '@/lib/site';

export function generateStaticParams() {
  return PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = pageBySlug((await params).slug);
  // A missing page falls through to notFound() below, which renders the 404
  // and its own metadata. Returning a title here would label the 404 wrongly.
  if (!page) return { title: 'Page not found', robots: { index: false, follow: true } };

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      type: 'article',
      url: `/${page.slug}`,
    },
    twitter: { card: 'summary', title: page.title, description: page.description },
  };
}

/**
 * Renders the support email as a real mailto link wherever it appears in copy.
 *
 * The legal pages tell students to write in, and an address they have to
 * select and copy on a phone is an address most of them will not use. Matching
 * on the configured address rather than a general email regex keeps this
 * predictable: it can only ever linkify our own address.
 */
function linkify(text: string) {
  if (!text.includes(SITE.email)) return text;
  return text.split(SITE.email).flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={i} href={`mailto:${SITE.email}`} style={{ wordBreak: 'break-word' }}>{SITE.email}</a>,
          part,
        ],
  );
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = pageBySlug((await params).slug);
  if (!page) notFound();

  const isLegal = ['privacy', 'terms', 'refunds', 'disclaimer'].includes(page.slug);

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: page.title, item: `${SITE.url}/${page.slug}` },
    ],
  };

  return (
    <article className="wrap" style={{ paddingBlock: '36px 0', maxWidth: 720 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <nav aria-label="Breadcrumb" style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 14 }}>
        <Link href="/">Home</Link> <span aria-hidden>/</span> {page.title}
      </nav>

      <h1>{page.heading}</h1>
      <p style={{ marginTop: 14, fontSize: '1.08rem', color: 'var(--ink-2)' }}>{page.intro}</p>

      {isLegal && (
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
          Last updated {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}. Questions about
          this page go to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      )}

      <div style={{ marginTop: 34, display: 'grid', gap: 26 }}>
        {page.blocks.map((b, i) => (
          <section key={i}>
            {b.h && <h2 style={{ fontSize: '1.18rem' }}>{b.h}</h2>}
            {b.p && <p style={{ marginTop: 8, color: 'var(--ink-2)' }}>{linkify(b.p)}</p>}
            {b.list && (
              <ul style={{ marginTop: 10, paddingLeft: 20, display: 'grid', gap: 7, color: 'var(--ink-2)' }}>
                {b.list.map((li) => <li key={li}>{linkify(li)}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* The contact page gets a mail button rather than a search CTA: someone
          reading it has a problem to report, not a list to build. */}
      {page.slug === 'contact' ? (
        <div className="card" style={{ marginTop: 40, padding: 22, background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Email us</h2>
          <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5 }}>
            We reply {SITE.responseTime}. If it is about a payment, include the date, the amount and the Razorpay
            reference from your receipt.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            <a href={`mailto:${SITE.email}`} className="btn btn-primary">{SITE.email}</a>
            <Link href="/restore" className="btn btn-secondary">Restore my access</Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 40, padding: 22, background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}>
          <h2 style={{ fontSize: '1.1rem' }}>See your own list</h2>
          <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5 }}>
            Enter your rank and preferences to see which programmes were within reach.
          </p>
          <Link href="/find" className="btn btn-primary" style={{ marginTop: 16 }}>Find my colleges</Link>
        </div>
      )}
    </article>
  );
}
