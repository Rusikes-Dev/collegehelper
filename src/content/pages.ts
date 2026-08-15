/**
 * Static content pages.
 *
 * Held in one place so the informational and legal pages stay consistent and
 * can be edited without touching routing. Every page here is a real page a
 * student or a payment provider would expect to find; none exists purely to
 * carry keywords.
 */

export interface Block { h?: string; p?: string; list?: string[] }
export interface Page { slug: string; title: string; description: string; heading: string; intro: string; blocks: Block[] }

const PRICE = '\u20b949';

export const PAGES: Page[] = [
  {
    slug: 'how-it-works',
    title: 'How it works',
    description: 'How JEE College Finder matches your rank against previous-year JoSAA closing ranks, and what the result does and does not tell you.',
    heading: 'How it works',
    intro: 'The tool answers one question: given your rank and preferences, which programmes had closing ranks that would have covered you last year?',
    blocks: [
      { h: 'Step 1 \u2014 Enter your rank', p: 'Your JEE Main All India Rank is required. Add your JEE Advanced All India Rank if you sat that exam and want IIT and IISc programmes included. If you only sat JEE Main, leave it blank; the tool works fine without it and tells you what was left out.' },
      { h: 'Step 2 \u2014 Set your preferences', p: 'Choose your category, whether you are applying under the PwD provision, your gender, the institute types you care about, and any number of academic programmes. Institute types and programmes are read from the cutoff data actually loaded, so you only ever see options that exist.' },
      { h: `Step 3 \u2014 Pay ${PRICE}`, p: `Before you pay, the tool shows how many matches it found and how they break down by institute type. If nothing matched, you are told so and not asked to pay. The ${PRICE} payment is handled by Razorpay and confirmed on our server before results are shown.` },
      { h: 'Step 4 \u2014 Work through your list', p: 'Search, filter and sort the results, look at the near-miss options, add programmes to your choice list, put them in your preferred order and download the list as a PDF.' },
      { h: 'Which rank is compared', p: 'JoSAA publishes each closing rank against a specific rank list, and comparing across lists gives nonsense. IIT and IISc seats are matched on your JEE Advanced rank. NIT, IIIT and GFTI seats are matched on your JEE Main rank. OPEN seats use your Common Rank List rank. Reserved-category seats use your category rank. PwD seats use the PwD rank list. When we lack the rank a seat needs, that seat is left out and reported, never guessed at.' },
      { h: 'What the safety indicator means', p: 'Each result carries a label based only on the gap between your rank and last year\u2019s closing rank for that seat. Comfortable means you were well inside it; borderline means you only just made it; just missed means you fell slightly outside. These describe last year\u2019s numbers. They are not probabilities and they do not predict this year\u2019s admission.' },
      { h: 'What this is not', p: 'It is not a prediction engine, an admission guarantee or official counselling advice. Cutoffs shift every year with candidate numbers, seat matrix changes and how other students fill their choices. Use the list to build a shortlist, then confirm everything against the official JoSAA portal.' },
    ],
  },
  {
    slug: 'jee-main-college-predictor',
    title: 'JEE Main college predictor',
    description: 'Check which NIT, IIIT and GFTI programmes had JoSAA closing ranks within reach of your JEE Main All India Rank.',
    heading: 'JEE Main college list by rank',
    intro: 'If you sat JEE Main, your All India Rank governs admission to the NITs, IIITs and the government-funded technical institutions that take part in JoSAA counselling.',
    blocks: [
      { h: 'What your JEE Main rank covers', p: 'JoSAA seats at NITs, IIITs and GFTIs are allotted on JEE Main ranks. Enter your All India Rank and the tool compares it against the closing rank each of those programmes reached in the counselling round we hold data for.' },
      { h: 'Home state matters at the NITs', p: 'NIT seats are split into Home State and Other State quotas, and the home-state closing rank is often far more generous. Results show the quota for every row so you can tell which pool a cutoff belongs to.' },
      { h: 'If you are in a reserved category', p: 'Reserved-category closing ranks are published as category ranks, not All India Ranks. Enter your category rank alongside your AIR to see those seats. Without it you still get every OPEN seat you qualify for.' },
      { h: 'What about the IITs?', p: 'IITs admit only through JEE Advanced. A JEE Main rank cannot be compared against an IIT cutoff. If you have a JEE Advanced rank, add it and those programmes appear too.' },
    ],
  },
  {
    slug: 'jee-advanced-college-predictor',
    title: 'JEE Advanced college predictor',
    description: 'See which IIT programmes had JoSAA closing ranks within reach of your JEE Advanced All India Rank.',
    heading: 'IIT programmes by JEE Advanced rank',
    intro: 'IIT and IISc seats are allotted on JEE Advanced ranks. Enter your JEE Advanced All India Rank to see which programmes were within reach last year.',
    blocks: [
      { h: 'Why a separate rank', p: 'The IITs admit through JEE Advanced, so JoSAA publishes their cutoffs as JEE Advanced ranks. These are much smaller numbers than JEE Main ranks because far fewer candidates qualify. Comparing the two would be meaningless, so the tool keeps them strictly separate.' },
      { h: 'IISc is on the Advanced list too', p: 'The Indian Institute of Science admits its Bachelor of Science (Research) programme through JEE Advanced, even though JoSAA groups it with the government-funded institutions rather than the IITs. The tool handles that correctly.' },
      { h: 'Enter both ranks together', p: 'Adding your JEE Main rank as well gives you NIT, IIIT and GFTI options in the same list, which is what you need when you are ranking choices across institute types.' },
    ],
  },
  {
    slug: 'josaa-cutoff',
    title: 'JoSAA cutoffs explained',
    description: 'What JoSAA opening and closing ranks mean, how quota, seat type, gender pool and round affect them, and how to read them correctly.',
    heading: 'Understanding JoSAA cutoffs',
    intro: 'A JoSAA cutoff is not a single number. Each one belongs to a specific institute, programme, quota, seat type, gender pool and round.',
    blocks: [
      { h: 'Opening and closing rank', p: 'The opening rank is the best rank allotted that seat in that round; the closing rank is the last rank allotted. If your rank is equal to or better than the closing rank, you would have been within reach that year.' },
      { h: 'Quota', p: 'AI means all India, used by the IITs and most GFTIs. HS and OS are the home-state and other-state pools used by the NITs and some GFTIs. The same programme can have very different closing ranks in each pool.' },
      { h: 'Seat type', p: 'OPEN, GEN-EWS, OBC-NCL, SC and ST each have their own closing ranks, and each PwD variant has its own again. Reserved seat types are published as category ranks, not All India Ranks.' },
      { h: 'Gender pool', p: 'Gender-neutral seats are open to everyone. Female-only seats, including supernumerary ones, are reserved for female candidates and usually close at a less competitive rank.' },
      { h: 'Round', p: 'JoSAA runs several rounds and cutoffs loosen as candidates withdraw or upgrade. A round-1 closing rank is tighter than a final-round closing rank, so always check which round a figure came from. Every result and every PDF here names the year and round it used.' },
    ],
  },
  {
    slug: 'jee-college-list',
    title: 'JEE college list',
    description: 'Build a personalised list of JEE colleges and programmes from previous-year JoSAA closing ranks, and export it as a PDF.',
    heading: 'Build your JEE college list',
    intro: 'A college list is only useful when it is yours: filtered to your rank, your category and the branches you would actually accept.',
    blocks: [
      { h: 'Start from your rank, not a league table', p: 'A generic ranking of the top twenty engineering colleges tells you nothing about what you can get. This tool starts from your rank and shows only what last year\u2019s closing ranks put within reach.' },
      { h: 'Order matters in counselling', p: 'JoSAA allots seats strictly by your choice order, so the sequence you submit is as important as the choices themselves. The choice list builder lets you reorder freely before you export it.' },
      { h: 'Keep the near misses in view', p: 'Programmes that closed just above your rank last year are worth knowing about, because cutoffs move. They are listed separately rather than hidden.' },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy policy',
    description: 'What JEE College Finder stores, what it does not, and how your search data is handled.',
    heading: 'Privacy policy',
    intro: 'The short version: we do not ask for your name, email or phone number, and we do not build a profile of you.',
    blocks: [
      { h: 'What we store', p: 'Your rank, category and search preferences are held in a signed cookie on your own device so your results survive a page reload. That cookie expires after seven days. We do not copy it into a database or link it to your identity.' },
      { h: 'Payments', p: 'Payments are processed by Razorpay. Card, UPI and banking details are entered on Razorpay\u2019s systems and never reach ours. We receive only a payment identifier and a status, which we use to confirm the payment and unlock your results. Razorpay\u2019s own privacy policy governs the data it collects.' },
      { h: 'Analytics', p: 'If analytics are enabled on this deployment, they count events such as page views, searches run and PDFs downloaded, without personal identifiers or rank values attached. They are used to understand whether the product works, not to track individuals.' },
      { h: 'Cookies', p: 'One functional cookie holds your session. It is signed so it cannot be edited, marked HttpOnly so scripts cannot read it, and required for the product to work. No advertising or cross-site tracking cookies are set.' },
      { h: 'Your choices', p: 'Clearing your browser data ends your session and removes everything held on your device. Because we do not store personal data on our servers, there is no account to delete. For any question about data, contact us.' },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms & conditions',
    description: 'The terms that apply to using JEE College Finder.',
    heading: 'Terms & conditions',
    intro: 'By using JEE College Finder you agree to these terms. Please read them before paying.',
    blocks: [
      { h: 'What the service provides', p: `The ${PRICE} fee provides access to a personalised comparison of your rank against previous-year JoSAA opening and closing ranks, together with filtering, a choice list builder and a PDF export, for the session in which it was paid.` },
      { h: 'What it does not provide', p: 'It does not provide admission, a seat, an offer, an official prediction or counselling representation. It is an information tool built on historical data. Admission decisions rest entirely with JoSAA and the participating institutes.' },
      { h: 'Accuracy of data', p: 'Cutoff figures are imported from JoSAA seat allotment results and are reproduced as published. We make reasonable efforts to import them accurately, but we do not warrant that every figure is free of error, and we are not responsible for changes or corrections made at source after import.' },
      { h: 'Acceptable use', p: 'You may use the tool for your own counselling research. You may not scrape it, resell its output, attempt to bypass payment, or interfere with its operation. Access may be withdrawn where these terms are broken.' },
      { h: 'Limitation of liability', p: `To the extent permitted by law, our liability arising from your use of the service is limited to the ${PRICE} you paid. We are not liable for decisions taken on the basis of the information shown.` },
      { h: 'Changes', p: 'These terms may be updated as the product changes. The version in force is the one published here on the date you use the service.' },
    ],
  },
  {
    slug: 'refunds',
    title: 'Refund policy',
    description: 'When a JEE College Finder payment is refunded and how to request one.',
    heading: 'Refund policy',
    intro: `The ${PRICE} fee unlocks your results immediately, so it is generally non-refundable once your list has been generated.`,
    blocks: [
      { h: 'When we will refund', list: [
        'The payment succeeded but no results were shown because of a fault on our side.',
        'You were charged more than once for the same search.',
        'The service was unavailable and you were unable to access the results you paid for.',
      ] },
      { h: 'When we will not refund', list: [
        'You saw the results but were not satisfied with how many options were found. The number of matches is shown free of charge before you pay.',
        'Actual counselling cutoffs turned out to differ from the previous-year figures shown. This is expected and is stated throughout the site.',
        'You changed your mind after viewing the results.',
      ] },
      { h: 'How to request one', p: 'Contact us with the date and approximate time of the payment and the Razorpay payment reference from your receipt. Approved refunds are returned to the original payment method, normally within five to seven working days depending on your bank.' },
    ],
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    description: 'The limits of the information provided by JEE College Finder.',
    heading: 'Disclaimer',
    intro: 'Cutoffs are based on previous-year data and are intended for guidance only. Actual admission cutoffs may vary each year.',
    blocks: [
      { h: 'Historical data only', p: 'Every figure shown is a previous-year opening or closing rank from JoSAA seat allotment results for a specific year and round, which is named on each result and in every PDF. Nothing here forecasts the current year.' },
      { h: 'No guarantee of admission', p: 'Meeting a previous-year closing rank does not entitle you to a seat. Cutoffs move each year with the number of candidates, changes to the seat matrix, reservation policy, and how other students fill their choice lists.' },
      { h: 'Not official', p: 'JEE College Finder is an independent tool and is not affiliated with, endorsed by or connected to JoSAA, the National Testing Agency, the IITs, the NITs, the IIITs or any participating institute. Official information is available only from the JoSAA portal.' },
      { h: 'Verify before deciding', p: 'Always confirm eligibility, seat availability and cutoffs on the official JoSAA portal before submitting your choices. Where a figure here differs from the official source, the official source is correct.' },
    ],
  },
  {
    slug: 'contact',
    title: 'Contact us',
    description: 'How to reach JEE College Finder about payments, refunds, data corrections or anything else.',
    heading: 'Contact us',
    intro: 'For payment issues, refund requests, data corrections or any other question, get in touch and we will respond as quickly as we can.',
    blocks: [
      { h: 'Before you write in', p: 'For a payment or refund question, please include the date and approximate time of payment and the Razorpay payment reference from your receipt. That is usually all we need to resolve it in one reply. Never send us your card number, UPI PIN, CVV or any password \u2014 we will never ask for them.' },
      { h: 'Reporting a data error', p: 'If a cutoff figure here does not match the official JoSAA seat allotment result, tell us the institute, programme, quota, seat type and round, and we will check it against the source and correct the import.' },
      { h: 'Contact details', p: 'Add your support email address, business name and registered address here before going live. Razorpay requires reachable contact details on the site as a condition of accepting payments.' },
    ],
  },
];

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);
