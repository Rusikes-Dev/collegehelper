import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact CollegeHelper',
  description: 'Get in touch with the CollegeHelper team.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="font-display text-display-lg font-semibold text-ink">Contact</h1>
      <p className="mt-3 leading-relaxed text-ink-muted">
        Found a cutoff that looks wrong, or cannot get back into results you paid for?
        Email us and include the college and round, or the email and phone you paid
        with, and we will sort it out.
      </p>
      <p className="mt-6">
        {/* TODO: replace with your real support address before launch. */}
        <a
          href="mailto:support@collegehelper.xyz"
          className="text-lg font-medium text-brand hover:underline"
        >
          support@collegehelper.xyz
        </a>
      </p>
    </div>
  );
}
