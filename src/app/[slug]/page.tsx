import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PAGES, pageBySlug } from '@/content/pages';

export function generateStaticParams() {
  return PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = pageBySlug((await params).slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, type: 'article' },
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = pageBySlug((await params).slug);
  if (!page) notFound();

  return (
    <article className="wrap" style={{ paddingBlock: '36px 0', maxWidth: 720 }}>
      <h1>{page.heading}</h1>
      <p style={{ marginTop: 14, fontSize: '1.08rem', color: 'var(--ink-2)' }}>{page.intro}</p>

      <div style={{ marginTop: 34, display: 'grid', gap: 26 }}>
        {page.blocks.map((b, i) => (
          <section key={i}>
            {b.h && <h2 style={{ fontSize: '1.18rem' }}>{b.h}</h2>}
            {b.p && <p style={{ marginTop: 8, color: 'var(--ink-2)' }}>{b.p}</p>}
            {b.list && (
              <ul style={{ marginTop: 10, paddingLeft: 20, display: 'grid', gap: 7, color: 'var(--ink-2)' }}>
                {b.list.map((li) => <li key={li}>{li}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="card" style={{ marginTop: 40, padding: 22, background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>See your own list</h2>
        <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5 }}>Enter your rank and preferences to see which programmes were within reach.</p>
        <Link href="/find" className="btn btn-primary" style={{ marginTop: 16 }}>Find my colleges</Link>
      </div>
    </article>
  );
}
