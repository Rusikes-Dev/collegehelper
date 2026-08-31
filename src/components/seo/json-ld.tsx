import { CONTACT, DATA, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from '@/lib/site';

/**
 * Structured data.
 *
 * Only three types are emitted, and each one describes something a visitor can
 * actually see on the page it is attached to: the site itself, the trail of
 * links above a college name, and the questions answered on /faq. There are no
 * ratings, no review counts and no aggregate scores, because the site collects
 * none of those and marking them up would be a lie told to a crawler.
 *
 * Nothing here claims an affiliation. The publisher is CollegeHelper, not the
 * CET Cell; the CET Cell appears only as the source of the documents.
 */

type Json = Record<string, unknown>;

function JsonLd({ data }: { data: Json }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built from constants in this repository, never from user
      // input, so there is no injection surface here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Site-level identity. Rendered once, in the root layout. */
export function SiteJsonLd() {
  const organisation: Json = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organisation`,
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    url: SITE_URL,
    description:
      `${SITE_SHORT_NAME} is an independent tool that compares an MHT-CET ` +
      `percentile or merit rank against the official Maharashtra CAP closing ` +
      `cutoffs published by the State CET Cell. It is not affiliated with ` +
      `MHT-CET, the CET Cell, JoSAA, NTA or any college.`,
    areaServed: { '@type': 'State', name: 'Maharashtra' },
    ...(CONTACT.email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: CONTACT.email,
            availableLanguage: ['en', 'mr', 'hi'],
          },
        }
      : {}),
  };

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          organisation,
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            inLanguage: 'en-IN',
            publisher: { '@id': `${SITE_URL}/#organisation` },
          },
          {
            '@type': 'Dataset',
            '@id': `${SITE_URL}/methodology#dataset`,
            name: `MHT-CET CAP ${DATA.academicYear} closing cutoffs`,
            description:
              `Closing rank and closing percentile for ${DATA.cutoffRows.toLocaleString(
                'en-IN',
              )} seat-type rows across ${DATA.institutes} institutes, extracted ` +
              `from the official CAP Round I, II and III cutoff documents.`,
            url: `${SITE_URL}/methodology`,
            temporalCoverage: DATA.academicYear,
            isAccessibleForFree: true,
            creator: { '@type': 'GovernmentOrganization', name: DATA.publisher },
            includedInDataCatalog: { '@id': `${SITE_URL}/#website` },
          },
        ],
      }}
    />
  );
}

/**
 * Breadcrumbs. Passed the same items the visible trail renders, so the markup
 * and the page can never disagree.
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: `${SITE_URL}${item.path}`,
        })),
      }}
    />
  );
}

/** Only for pages that render every one of these questions and answers. */
export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }}
    />
  );
}
