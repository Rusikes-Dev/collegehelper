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
    description: 'What JEE College Finder stores about you, why, how long for, and how to have it deleted.',
    heading: 'Privacy policy',
    intro: 'The short version: to buy a list we need an email address and a mobile number, because that pair is how you get your list back on another device. We do not sell it, we do not advertise to you, and you can ask us to delete it.',
    blocks: [
      { h: 'What we collect, and why', list: [
        'Email address and mobile number \u2014 collected before payment. This pair is your key: it is how we recognise you when you come back on a new phone or after clearing your browser, and how we reach you about a payment that went wrong.',
        'Your name \u2014 optional. Only used to greet you.',
        'Your rank, category and search preferences \u2014 used to work out which programmes match, and kept with your purchase so we can answer questions about it later.',
        'Payment status, amount and the Razorpay reference \u2014 needed to confirm what you paid for, and to handle refunds.',
        'Page views \u2014 which pages were opened, where the visit came from, roughly what kind of device it was, and the country. Tied to a random id in a cookie, not to your name.',
      ] },
      { h: 'What we never collect', list: [
        'Card numbers, UPI IDs and bank details. These are entered on Razorpay\u2019s systems and never reach our servers.',
        'Passwords. There is no account to sign in to.',
        'Your IP address. It is used in transit to apply rate limits and is not written to our records.',
        'Anything from other sites. We set no advertising or cross-site tracking cookies, and we run no third-party analytics scripts.',
      ] },
      { h: 'Where it is stored', p: 'In our own database, hosted on Supabase. It is reachable only by our servers using a private key; it is not exposed to browsers. Analytics are first-party, meaning the data stays with us rather than being handed to an advertising network.' },
      { h: 'How long we keep it', p: 'Your access record and the payment it relates to are kept while your access is valid and for as long afterwards as we are required to retain transaction records for tax and accounting purposes. Page-view records are kept for up to 24 months. Anything you ask us to delete is deleted sooner, subject to those records we are legally required to keep.' },
      { h: 'Who else sees it', p: 'Razorpay, to take the payment, under their own privacy policy. Supabase and Vercel, as the services that store and run the site, under their agreements with us. Nobody else. We do not sell, rent or share your details with advertisers, coaching institutes, colleges or data brokers, and we will not start.' },
      { h: 'Cookies we set', list: [
        'A session cookie holding your search and access state. Signed so it cannot be edited, HttpOnly so scripts cannot read it, and required for the product to work.',
        'A visitor cookie holding a random id, and one recording which site or campaign first sent you here. These are used only for our own visitor counts.',
      ] },
      { h: 'Your rights', p: 'You can ask us for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Write to us from the email address you used, or contact us with your mobile number, and we will act on it. Deleting your record ends any access you have paid for, so tell us if you would rather wait until it lapses.' },
      { h: 'Children', p: 'Most users of this tool are of college-entry age. If you are under 18, please have a parent or guardian make the purchase and provide the contact details.' },
      { h: 'Changes', p: 'If we start collecting something not listed here, this page will be updated before we do. The version published here on the day you use the site is the one that applies.' },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms & conditions',
    description: 'The terms that apply to using JEE College Finder.',
    heading: 'Terms & conditions',
    intro: 'By using JEE College Finder you agree to these terms. Please read them before paying.',
    blocks: [
      { h: 'What the service provides', p: `The ${PRICE} fee provides access to a personalised comparison of your rank against previous-year JoSAA opening and closing ranks, together with filtering, a choice list builder and a PDF export. Access is attached to the email address and mobile number you give at checkout, lasts for the period stated at the time of purchase, and covers as many searches as you wish to run in that period.` },
      { h: 'What it does not provide', p: 'It does not provide admission, a seat, an offer, an official prediction or counselling representation. It is an information tool built on historical data. Admission decisions rest entirely with JoSAA and the participating institutes.' },
      { h: 'Accuracy of data', p: 'Cutoff figures are imported from JoSAA seat allotment results and are reproduced as published. We make reasonable efforts to import them accurately, but we do not warrant that every figure is free of error, and we are not responsible for changes or corrections made at source after import.' },
      { h: 'Acceptable use', p: 'You may use the tool for your own counselling research. You may not scrape it, resell its output, share your access with others, attempt to bypass payment, or interfere with its operation. Access may be withdrawn without refund where these terms are broken.' },
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
        'Your payment was taken but access was never granted, and restoring with your email and mobile number does not work.',
      ] },
      { h: 'When we will not refund', list: [
        'You saw the results but were not satisfied with how many options were found. The number of matches is shown free of charge before you pay.',
        'Actual counselling cutoffs turned out to differ from the previous-year figures shown. This is expected and is stated throughout the site.',
        'You changed your mind after viewing the results.',
      ] },
      { h: 'Before requesting one', p: 'If you paid but cannot see your results, try the Restore access page first and enter the same email address and mobile number you used at checkout. This resolves most cases immediately, including payments that completed after the browser closed.' },
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
      { h: 'Paid but cannot see your list?', p: 'Try the Restore access page first. Enter the same email address and mobile number you used at checkout and your list will come back on any device. This fixes most cases straight away, including payments that completed after your browser closed.' },
      { h: 'Before you write in', p: 'For a payment or refund question, please include the date and approximate time of payment and the Razorpay payment reference from your receipt, along with the email address and mobile number you used. That is usually all we need to resolve it in one reply. Never send us your card number, UPI PIN, CVV or any password \u2014 we will never ask for them.' },
      { h: 'Data requests', p: 'To ask for a copy of what we hold about you, to have it corrected, or to have it deleted, write to us from the email address you used at checkout. See the privacy policy for what we store and how long we keep it.' },
      { h: 'Reporting a data error', p: 'If a cutoff figure here does not match the official JoSAA seat allotment result, tell us the institute, programme, quota, seat type and round, and we will check it against the source and correct the import.' },
      { h: 'Contact details', p: 'Add your support email address, business name and registered address here before going live. Razorpay requires reachable contact details on the site as a condition of accepting payments.' },
    ],
  },
];

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);
