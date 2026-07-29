# -*- coding: utf-8 -*-
"""Decision guides and career/salary content.

Block model used by the builder:
  {"h": str}                       section heading
  {"p": str}                       paragraph
  {"ul": [str, ...]}               bullet list
  {"table": {"head": [...], "rows": [[...], ...]}}
  {"note": str}                    callout box
  {"verdict": [[label, text], ...]} "pick this if" decision block
"""

GUIDES = [

{
 "slug": "ssc-cgl-vs-bank-po",
 "title": "SSC CGL or Bank PO: which one should you actually pick?",
 "category": "Choosing an exam",
 "readTime": "8 min",
 "updated": "2026-07-29",
 "excerpt": "Both are graduate-level, both are winnable in a year of honest work, and they pull your life in opposite directions. Here is the comparison that matters.",
 "related": ["ssc-cgl", "ibps-po", "ibps-clerk", "sbi-po"],
 "keywords": ["ssc cgl vs bank po", "ssc cgl or ibps po", "which government job is better", "ssc vs banking"],
 "blocks": [
  {"p": "This is the most common fork for a graduate who wants a government job and does not want to spend four years on UPSC. Both SSC CGL and IBPS PO ask for a bachelor's degree in any subject, both are decided by a computer-based exam, and both are realistically clearable in twelve to eighteen months of serious preparation. The difference is not difficulty. It is what your life looks like five years later."},

  {"h": "The syllabus overlap is larger than people think"},
  {"p": "Quantitative aptitude, reasoning and English are common to both. If you have prepared for one, you have covered roughly sixty per cent of the other. The genuinely different parts are the ones that decide your outcome."},
  {"table": {
    "head": ["Area", "SSC CGL", "IBPS PO"],
    "rows": [
      ["Maths", "Arithmetic plus algebra, geometry, mensuration and trigonometry", "Arithmetic and heavy data interpretation. No geometry or trigonometry"],
      ["Reasoning", "Verbal and non-verbal, mostly single questions", "Puzzles and seating arrangements, mostly long sets"],
      ["English", "Grammar and vocabulary heavy", "Comprehension and usage heavy, lighter on rules"],
      ["The fourth subject", "General Awareness — static GK, history, polity, science", "Banking and economy awareness plus current affairs"],
      ["Speed demanded", "High, and now with 15-minute sectional locks", "Very high. Puzzle sets punish slow readers"],
    ]}},

  {"h": "Pay, and how it moves"},
  {"p": "Bank PO starts higher. SSC CGL's best posts catch up and then depend heavily on which post you get."},
  {"table": {
    "head": ["", "SSC CGL", "IBPS PO"],
    "rows": [
      ["Entry basic pay", "₹25,500 (Level 4) to ₹47,600 (Level 8, AAO)", "Around ₹48,480 under the current bipartite settlement"],
      ["Approximate gross at entry", "₹45,000 – ₹80,000 depending on post and city", "Around ₹85,000 including allowances"],
      ["First promotion", "Departmental, often 4–8 years, varies enormously by department", "Scale I to Scale II typically in 3–5 years, faster with JAIIB and CAIIB"],
      ["Ceiling", "Group B gazetted posts can reach Under Secretary and above over a career", "Scale VII and above; General Manager and Executive Director are realistic for strong performers"],
    ]}},
  {"note": "Figures are indicative and change with pay commissions and bipartite settlements. Always check the current notification for exact pay scales."},

  {"h": "The part nobody tells you: what the day looks like"},
  {"ul": [
    "A bank PO spends the first years at a branch. That means customer-facing work, cash and clearing, loan files, targets on deposits and insurance cross-selling, and Saturdays that are working days two weeks a month. Rural and semi-urban postings are near-certain early on.",
    "An SSC CGL officer's day depends entirely on the post. An Assistant Section Officer in a Delhi ministry pushes files and has predictable hours. An Income Tax Inspector does field verification and survey work. A CBI Sub-Inspector investigates. An Auditor sits with ledgers.",
    "Transfer risk is the sharpest difference. Bank officers move within a bank's network, often across states. Many SSC CGL posts are effectively static, especially ministry postings in Delhi.",
  ]},

  {"h": "Competition, honestly compared"},
  {"p": "SSC CGL 2026 has 12,256 vacancies. IBPS PO 2026 has 7,365. But SSC CGL draws several times the applicants, and its cutoffs sit high because the paper is speed-based rather than difficulty-based. IBPS PO's prelims is easier to clear and its mains is where most candidates fall away. Neither is a soft option."},
  {"p": "One real structural advantage of banking: there are more shots per year. IBPS PO, IBPS Clerk, IBPS RRB PO, IBPS RRB Clerk, SBI PO, SBI Clerk and RBI Assistant all run on similar syllabus in a single cycle. SSC CGL is once a year, with SSC CHSL and SSC CPO as the nearest siblings."},

  {"h": "So which one"},
  {"verdict": [
    ["Pick SSC CGL if", "you want a posting you can settle into, you are willing to wait for a single annual attempt, you are comfortable with static GK, and a Delhi ministry desk or an Income Tax field role appeals to you more than a branch counter."],
    ["Pick Bank PO if", "you want to start earning more sooner, you can handle sales targets and customer-facing pressure, you want multiple attempts within one year of preparation, and you would rather be promoted on merit and internal exams than wait for a departmental vacancy."],
    ["Prepare for both if", "you are in your first year of preparation. The overlap is large enough that this costs you perhaps twenty per cent extra effort and roughly doubles your chances of converting something."],
  ]},

  {"h": "A practical sequencing that works"},
  {"ul": [
    "Months 1–6: build the shared base — arithmetic, reasoning fundamentals, English grammar and comprehension. Do not specialise yet.",
    "Months 7–9: add data interpretation for banking and add geometry, mensuration and trigonometry for SSC. Start static GK and banking awareness in parallel, fifteen minutes a day each.",
    "Months 10 onwards: mock tests only, alternating between the two patterns. The formats are different enough that you must practise both timing structures separately.",
    "Apply for everything you are eligible for. There is no cost to an extra attempt beyond the fee.",
  ]},
 ],
},

{
 "slug": "careers-and-salary-after-every-exam",
 "title": "What you actually earn, and where you actually get posted",
 "category": "Careers",
 "readTime": "12 min",
 "updated": "2026-07-29",
 "excerpt": "Exam by exam: the job you get, the pay you start on, where you are posted, and how the career moves after that.",
 "related": ["upsc-cse", "ssc-cgl", "ibps-po", "gate", "cat", "clat", "neet-ug"],
 "keywords": ["government job salary", "ias salary", "ssc cgl salary", "bank po salary", "career after neet", "career after jee", "job after clearing exam"],
 "blocks": [
  {"p": "Coaching advertisements quote gross figures and ignore postings. Job portals quote basic pay and ignore allowances. What follows is the fuller picture for each major exam — the role you actually take up, what lands in your account, where you are likely to be sent, and what the next fifteen years look like."},
  {"note": "All pay figures follow the 7th Central Pay Commission matrix for government posts and the current bipartite settlement for banks, and are indicative. Basic pay is fixed; gross pay varies substantially with city classification, dearness allowance revisions and house rent allowance."},

  {"h": "UPSC Civil Services"},
  {"table": {
    "head": ["Service", "Entry post", "Basic pay", "Where you go first"],
    "rows": [
      ["IAS", "Assistant Collector, then SDM", "₹56,100, Level 10", "A sub-division in your allotted cadre state, after training at LBSNAA"],
      ["IPS", "Assistant Superintendent of Police", "₹56,100, Level 10", "A district in your cadre state, after training at SVPNPA Hyderabad"],
      ["IFS", "Third Secretary", "₹56,100, Level 10", "Ministry of External Affairs, then a mission abroad"],
      ["IRS (IT)", "Assistant Commissioner of Income Tax", "₹56,100, Level 10", "A metro or major commercial centre"],
      ["IRS (C&IT)", "Assistant Commissioner", "₹56,100, Level 10", "Customs house, port or GST commissionerate"],
    ]}},
  {"ul": [
    "Gross monthly pay at entry, including dearness allowance and house rent allowance, is roughly ₹1,00,000 to ₹1,15,000 depending on posting city.",
    "The real value is non-cash: government accommodation, an official vehicle for field postings, medical cover, and a pension under the current scheme.",
    "IAS officers reach Deputy Secretary at the centre in about nine years and Joint Secretary at around seventeen. The Cabinet Secretary's basic pay is ₹2,50,000.",
    "IFS officers earn a foreign allowance while posted abroad which can multiply take-home pay several times over, though it is intended to cover the cost of living at the mission.",
  ]},

  {"h": "SSC CGL"},
  {"table": {
    "head": ["Post", "Pay level", "Pay scale", "Nature of work"],
    "rows": [
      ["Assistant Audit Officer / Assistant Accounts Officer", "Level 8, Group B gazetted", "₹47,600 – ₹1,51,100", "Audit of government departments and PSUs under CAG"],
      ["Assistant Section Officer (CSS)", "Level 7, Group B", "₹44,900 – ₹1,42,400", "Ministry file work in Delhi"],
      ["Income Tax Inspector", "Level 7, Group C", "₹44,900 – ₹1,42,400", "Assessment, survey and investigation under CBDT"],
      ["Inspector, Central Excise / GST", "Level 7, Group B", "₹44,900 – ₹1,42,400", "Enforcement and assessment under CBIC"],
      ["Sub-Inspector, CBI", "Level 7, Group B", "₹44,900 – ₹1,42,400", "Criminal investigation, transferable"],
      ["Auditor / Accountant", "Level 5", "₹29,200 – ₹92,300", "Accounts and audit in departments"],
      ["Tax Assistant / Upper Division Clerk", "Level 4", "₹25,500 – ₹81,100", "Clerical and assistance work"],
    ]}},
  {"ul": [
    "Gross at entry for a Level 7 post in a metro is roughly ₹65,000 to ₹80,000. For Level 4 it is closer to ₹40,000 to ₹48,000.",
    "Posting location is where SSC CGL differs sharply from other exams. Central Secretariat Service posts are Delhi. Income Tax and GST postings follow the zone you are allotted. CBI is transferable across India.",
    "Promotion pace is department-dependent and often slow. Departmental examinations are the fastest way up in Income Tax and Customs.",
  ]},

  {"h": "Banking — IBPS PO, SBI PO and IBPS Clerk"},
  {"table": {
    "head": ["Role", "Basic pay", "Approximate gross", "Trajectory"],
    "rows": [
      ["Probationary Officer, JMGS-I", "Around ₹48,480", "Around ₹85,000", "Scale I to II in 3–5 years, then II to III"],
      ["SBI Probationary Officer", "Comparable scale, plus SBI-specific allowances", "Typically the highest among public sector banks", "Wider internal mobility given SBI's size"],
      ["Customer Service Associate (Clerk)", "Around ₹24,050", "Around ₹40,000", "Promotion to Scale I via internal exam or JAIIB and CAIIB"],
    ]}},
  {"ul": [
    "Officers are posted anywhere in the bank's network. Early rural and semi-urban postings are the norm, not the exception.",
    "Clerks apply and compete state by state, so your posting stays within your chosen state.",
    "JAIIB and CAIIB carry pay increments in addition to accelerating promotion. Most officers clear them within the first three years.",
    "Exit routes into NBFCs, fintech credit teams and financial services are common after five to seven years of branch and credit experience.",
  ]},

  {"h": "JEE — engineering degrees"},
  {"table": {
    "head": ["Route", "Typical placement outcome"],
    "rows": [
      ["IIT, computer science and allied", "Median ₹25 LPA and above at the older IITs; the top tail is far higher"],
      ["IIT, core branches", "₹12–20 LPA, split between core engineering firms and analytics or software roles"],
      ["Top NITs and IIITs, CSE", "₹15–25 LPA"],
      ["Other NITs and good state colleges", "₹6–12 LPA"],
      ["Tier-3 private engineering colleges", "₹3–5 LPA, with placement rates well below 100%"],
    ]}},
  {"p": "The spread inside engineering is wider than the spread between most other career paths. The college and the branch together matter more than the degree itself, which is precisely why the counselling stage deserves as much attention as the exam."},

  {"h": "NEET — medicine"},
  {"ul": [
    "MBBS takes five and a half years including a compulsory rotating internship, during which you receive a stipend that varies by state, typically ₹15,000 to ₹30,000 a month.",
    "A government MBBS seat costs a few thousand rupees a year in fees. A private or deemed university seat can run to ₹1 crore or more across the course. This gap is the entire reason NEET ranks are fought over so hard.",
    "After MBBS, a junior resident post pays roughly ₹60,000 to ₹90,000 a month in government hospitals. Most graduates then prepare for NEET PG.",
    "Post-MD or MS, a senior resident earns roughly ₹85,000 to ₹1,20,000 in government service. Private and corporate hospital pay varies enormously by specialty and city.",
    "Many states enforce a bond requiring one to two years of rural service after MBBS, with a substantial penalty for breaking it. Read your state's bond terms before counselling, not after.",
  ]},

  {"h": "GATE — postgraduate study and PSUs"},
  {"ul": [
    "MTech at an IIT or IISc carries an MHRD assistantship of ₹12,400 a month for GATE-qualified candidates, so the degree is close to cost-neutral.",
    "PSU recruitment through GATE — IOCL, NTPC, BHEL, GAIL, ONGC, PowerGrid — starts at roughly ₹12–18 LPA CTC, with government-grade job security, quarters and medical cover.",
    "PSU cutoffs are far above the GATE qualifying mark. Being in the top one or two per cent of your paper is the realistic bar.",
    "A GATE score is valid for three years, so one good attempt covers three recruitment cycles.",
  ]},

  {"h": "CAT — management"},
  {"table": {
    "head": ["Institute tier", "Average package", "Typical roles"],
    "rows": [
      ["IIM Ahmedabad, Bangalore, Calcutta", "₹32–35 LPA", "Consulting, investment banking, product management"],
      ["IIM Lucknow, Kozhikode, Indore, FMS, XLRI", "₹25–32 LPA", "Consulting, general management, marketing, finance"],
      ["Newer IIMs and strong private schools", "₹12–20 LPA", "Sales, operations, analytics, BFSI"],
      ["Other B-schools", "₹5–10 LPA", "Varies widely; verify audited placement reports"],
    ]}},
  {"note": "Advertised averages hide a wide distribution and often include international offers converted at favourable rates. Ask for the median and the bottom quartile, not the average."},

  {"h": "CLAT — law"},
  {"ul": [
    "Tier-one corporate law firms recruit from the top National Law Universities with day-zero offers around ₹16–20 LPA. The hours are correspondingly brutal.",
    "Litigation starts far lower — a junior in a senior advocate's chamber may earn ₹15,000 to ₹40,000 a month for the first years — but it is the route to independent practice and eventually the bench.",
    "Judicial services after an LLB lead to appointment as a Civil Judge, with pay under the Second National Judicial Pay Commission that is competitive with Group A central services.",
    "In-house counsel roles at companies and banks offer better hours than firm practice at somewhat lower pay.",
  ]},

  {"h": "How to use these numbers"},
  {"p": "Compare gross with gross and basic with basic — mixing them is the single most common mistake in exam forums. Then adjust for three things the numbers do not show: how transferable the post is, how predictable the hours are, and how fast the next promotion comes. A job that pays fifteen per cent less but keeps you in one city with fixed hours is not obviously the worse choice, and for many people it is plainly the better one."},
 ],
},

{
 "slug": "neet-all-india-quota-vs-state-quota",
 "title": "NEET counselling: All India Quota or state quota?",
 "category": "Counselling",
 "readTime": "7 min",
 "updated": "2026-07-29",
 "excerpt": "Two separate registrations, two separate seat pools, two different strategies. Getting this wrong costs people seats every single year.",
 "related": ["neet-ug"],
 "keywords": ["neet aiq vs state quota", "mcc counselling", "neet state counselling", "15 percent all india quota", "neet counselling process"],
 "blocks": [
  {"p": "Qualifying NEET puts you in the pool. It does not put you in a college. Getting to a college means navigating two parallel counselling systems that run on different portals, different schedules and different rules — and you are expected to participate in both."},

  {"h": "What each pool actually contains"},
  {"table": {
    "head": ["", "All India Quota (MCC)", "State Quota"],
    "rows": [
      ["Who runs it", "Medical Counselling Committee, at mcc.nic.in", "Each state's own counselling authority"],
      ["Seats covered", "15% of government medical and dental college seats, plus 100% of AIIMS, JIPMER, BHU, AMU, ESIC and deemed university seats", "The remaining 85% of government college seats in that state, plus state private colleges"],
      ["Who can apply", "Any NEET-qualified Indian candidate, regardless of home state", "Almost always requires domicile in that state"],
      ["Rounds", "Round 1, Round 2, Mop-Up, Stray Vacancy", "Usually three to four rounds, varying by state"],
      ["Registration", "Separate MCC registration is compulsory", "Separate state registration is compulsory"],
    ]}},
  {"note": "Your NEET application does not carry over to either. Both counselling registrations are new, separate processes with their own fees and their own deadlines."},

  {"h": "The strategic difference"},
  {"ul": [
    "AIQ is a national merit list. You compete with every qualified candidate in India, so the ranks required are higher, but you can be allotted a seat in any state.",
    "State quota is a state merit list. In states with fewer high scorers, the same rank goes considerably further than it would nationally. In states with many, the reverse is true.",
    "A rank that is mid-table nationally may be near the top of a smaller state's list. Candidates from states with lower average scores often do better in their own state quota than in AIQ, and vice versa.",
    "Deemed universities sit inside MCC counselling but charge private fees. A deemed seat is not a government seat, whatever the portal it comes through.",
  ]},

  {"h": "Free exit, exit with forfeiture, and why it matters"},
  {"p": "MCC rules on what happens when you decline an allotted seat change by round, and misreading them is the most expensive mistake in the whole process."},
  {"ul": [
    "In Round 1, if you are allotted a seat and do not report, the consequences depend on whether you had opted for the free-exit provision. Read the current information bulletin — this rule has changed between years.",
    "After Round 2, declining an allotted seat typically forfeits your security deposit and can bar you from later rounds.",
    "If you accept and report to a Round 1 seat, you may still be upgraded in Round 2 if you opted for upgradation. If you do not opt in, your seat is frozen.",
    "The mop-up round is open to candidates who did not get a seat, and to those whose seats fell vacant. Stray vacancy is the last round and is generally not open to fresh registration.",
  ]},

  {"h": "How to actually plan it"},
  {"ul": [
    "Register for both AIQ and your state counselling. There is no reason not to; the fees are modest and skipping one halves your options.",
    "Build your choice list on last year's closing ranks for your category and quota, not on college reputation alone. The predictor on this site uses the MCC allotment data for exactly this.",
    "Put reach colleges above safe ones. Allotment runs strictly down your list, so a safe option placed above a reach option will simply take the seat.",
    "Keep every original document ready in two or three self-attested sets from the day the result is out. Reporting windows are short and are not extended for missing paperwork.",
    "Watch both portals daily during the counselling window. Schedules shift, and notices go up with very little warning.",
  ]},

  {"h": "Documents you will need at verification"},
  {"ul": [
    "NEET UG admit card and scorecard or rank letter",
    "Class 10 and Class 12 marksheets and passing certificates",
    "Birth certificate, or the Class 10 certificate as proof of date of birth",
    "A valid government photo identity document",
    "Category certificate in the prescribed central or state format, where applicable",
    "PwD certificate from a designated centre, where applicable",
    "Domicile certificate for state quota",
    "Passport-size photographs, and the provisional allotment letter",
  ]},
 ],
},

{
 "slug": "jee-main-vs-mht-cet-maharashtra",
 "title": "JEE Main or MHT CET: what Maharashtra students should do",
 "category": "Choosing an exam",
 "readTime": "6 min",
 "updated": "2026-07-29",
 "excerpt": "You do not have to choose. But you do have to understand how the two feed into the same CAP process, and where each one actually helps.",
 "related": ["jee-main", "mht-cet", "jee-advanced"],
 "keywords": ["jee main vs mht cet", "mht cet or jee", "maharashtra engineering admission", "cap round jee main", "mht cet percentile"],
 "blocks": [
  {"p": "Every year Maharashtra students ask whether to prepare for JEE Main or MHT CET. Framed that way the question has no good answer, because the two exams feed different seat pools that both sit inside the same Centralised Admission Process. The useful question is how to divide your effort."},

  {"h": "How the two exams differ where it counts"},
  {"table": {
    "head": ["", "JEE Main", "MHT CET"],
    "rows": [
      ["Syllabus base", "NCERT, national", "Maharashtra State Board, roughly 20% Class 11 and 80% Class 12"],
      ["Negative marking", "Yes, −1 on MCQs", "None"],
      ["Difficulty", "Higher; questions chain multiple concepts", "Lower per question, but the time pressure is severe"],
      ["Time per question", "Roughly 2.4 minutes", "Roughly 0.9 minutes"],
      ["What it wins you", "NITs, IIITs, GFTIs nationally, plus the All India seat pool inside Maharashtra CAP", "The state quota seat pool in Maharashtra CAP"],
      ["Attempts per year", "Two sessions, best score counts", "Two sessions, best percentile counts"],
    ]}},
  {"note": "The single biggest practical difference is speed. MHT CET gives you under a minute per question with no negative marking, which rewards fast recall and aggressive attempting. JEE Main gives you more than twice the time per question but punishes guessing."},

  {"h": "The point most students miss"},
  {"p": "Maharashtra CAP allots seats from more than one pool. State-quota seats go on the MHT CET merit number. A share of seats is filled from All India candidates on JEE Main merit. If you have both a strong percentile and a decent JEE Main score, you are eligible in more places than a candidate with only one of them — and you can compare which pool gets you the better college before locking your choice list."},

  {"h": "How to split your effort"},
  {"verdict": [
    ["If you are targeting IITs or top NITs", "JEE Main and Advanced come first. MHT CET then needs perhaps three to four weeks of dedicated work, mostly on Maharashtra Board Class 11 topics that JEE does not stress and on raw speed. Your JEE preparation already covers the concepts."],
    ["If you are targeting COEP, VJTI or a top Pune or Mumbai college", "MHT CET is the primary exam. Write JEE Main anyway — it costs one weekend and opens the All India pool as a second route into the same colleges."],
    ["If you are unsure in Class 11", "Prepare from NCERT and the state board together. The overlap is around eighty per cent, and you keep both doors open until you see your Class 12 mock scores."],
  ]},

  {"h": "Things that catch Maharashtra students out"},
  {"ul": [
    "MHT CET has no negative marking, so leaving questions blank is pure loss. Practise attempting all 150 questions, guessing where necessary.",
    "In PCM, Mathematics carries two marks per question and is therefore half the paper. A weak maths section cannot be compensated by strong physics and chemistry.",
    "Class 11 topics carry about twenty per cent weight. Students who revise only Class 12 lose those marks entirely.",
    "The CAP choice list matters as much as the percentile. Allotment runs strictly down your preferences, so ordering errors cost seats that your merit number would otherwise have won.",
    "Home University, Other Than Home University and State Level are three different seat types with different cutoffs at the same college. Check all three before deciding a college is out of reach.",
  ]},

  {"h": "Next step"},
  {"p": "Once your percentile is out, run it through the MHT CET College Predictor on this site. It works off the full 2025 CAP Round I to III closing merit numbers across all seat types, which is a far better guide to what you can realistically get than any percentile-to-college chart."},
 ],
},

{
 "slug": "which-exam-after-12th",
 "title": "Which competitive exam should you write after Class 12?",
 "category": "Choosing an exam",
 "readTime": "9 min",
 "updated": "2026-07-29",
 "excerpt": "A decision map for students finishing school — by stream, by timeline, and by what you are actually willing to spend the next few years doing.",
 "related": ["jee-main", "neet-ug", "cuet-ug", "clat", "mht-cet"],
 "keywords": ["which exam after 12th", "entrance exams after 12th", "career options after 12th", "exams after 12th science commerce arts"],
 "blocks": [
  {"p": "The exam you write after Class 12 sets a direction for the next four to six years, and most students choose it by inheriting whatever their school or their neighbours assumed. Here is the actual map, by stream."},

  {"h": "If you are in Science with Maths (PCM)"},
  {"table": {
    "head": ["Exam", "Leads to", "When", "Worth writing if"],
    "rows": [
      ["JEE Main", "NITs, IIITs, GFTIs and state college seats", "January and April", "You want engineering and are willing to compete nationally"],
      ["JEE Advanced", "The 23 IITs", "May", "You clear the JEE Main percentile cutoff"],
      ["State CET — MHT CET, KCET, WBJEE, etc.", "State engineering and pharmacy colleges", "April–May", "Always. It is a second, easier route to good state colleges"],
      ["CUET UG", "BSc, BTech and integrated programmes at central universities", "May–June", "You want a science degree rather than engineering, or want a backup"],
      ["NDA", "Army, Navy and Air Force officer training", "April and September", "You want a defence career; PCM is required for Air Force and Navy"],
      ["CLAT", "Five-year integrated law at NLUs", "December", "Law appeals to you — no science background is needed"],
    ]}},

  {"h": "If you are in Science with Biology (PCB)"},
  {"ul": [
    "NEET UG is the only route to MBBS, BDS, AYUSH, veterinary and most nursing seats. There is no alternative national medical entrance.",
    "If medicine is not certain, CUET UG opens BSc programmes at central universities including strong life sciences departments.",
    "State CETs cover pharmacy and agriculture programmes on a PCB basis, which are meaningful alternatives that get dismissed too quickly.",
    "If you took PCB with Maths, you retain the engineering options above as well.",
  ]},

  {"h": "If you are in Commerce"},
  {"table": {
    "head": ["Exam", "Leads to", "When"],
    "rows": [
      ["CUET UG", "BCom, BCom Hons, BBA and Economics at central universities", "May–June"],
      ["CA Foundation", "The Chartered Accountancy route", "Multiple attempts a year"],
      ["CS Executive Entrance", "Company Secretary route", "Multiple attempts a year"],
      ["IPMAT and equivalent", "Five-year integrated management at IIM Indore, IIM Rohtak and others", "May–June"],
      ["CLAT", "Five-year integrated law", "December"],
      ["NDA", "Defence services", "April and September"],
    ]}},

  {"h": "If you are in Arts or Humanities"},
  {"ul": [
    "CUET UG is the main gateway — BA and BA Hons programmes at Delhi University, BHU, JNU, Jamia and 250-plus other universities.",
    "CLAT is fully open to humanities students and arguably suits them: the paper rewards reading speed and argument analysis, not subject knowledge.",
    "NDA is open to any stream for Army wing entry.",
    "A humanities degree at a good central university is the standard base for UPSC preparation later, since the GS syllabus overlaps heavily with history, polity, geography and sociology.",
  ]},

  {"h": "The exams you can start preparing for now but write later"},
  {"ul": [
    "UPSC Civil Services needs a bachelor's degree, so the earliest you can sit Prelims is the year you graduate. But the newspaper habit and NCERT base are best built in Class 11 and 12.",
    "CAT and other MBA entrances need a degree. Most candidates write them in their final year or after some work experience.",
    "SSC CGL, IBPS PO and IBPS Clerk all need a degree. SSC CHSL, however, only needs Class 12 and is available to you immediately.",
    "GATE requires you to be in the third year of a degree or beyond.",
  ]},

  {"h": "Three questions worth answering honestly"},
  {"verdict": [
    ["How many years am I willing to spend before earning?", "Medicine is five and a half years plus specialisation. Engineering is four. A CUET degree is three. SSC CHSL can have you employed within a year of Class 12. There is no wrong answer here, but pretending the timeline does not matter is a mistake."],
    ["Do I want depth in one subject or breadth across many?", "JEE and NEET reward deep, narrow mastery. UPSC, CLAT and CAT reward breadth, reading and reasoning. People often pick the wrong side of this and struggle for years."],
    ["What can my family realistically fund?", "A private engineering seat, a deemed medical seat and a two-year MBA all carry very different price tags. Government seats through competitive exams are the cheapest education in the country by a wide margin, which is exactly why the competition is what it is."],
  ]},
 ],
},

{
 "slug": "upsc-vs-state-psc",
 "title": "UPSC or State PSC: the trade-off nobody spells out",
 "category": "Choosing an exam",
 "readTime": "6 min",
 "updated": "2026-07-29",
 "excerpt": "Same syllabus base, wildly different odds, and a genuinely different life at the end. How to think about running both.",
 "related": ["upsc-cse"],
 "keywords": ["upsc vs state psc", "mpsc vs upsc", "state pcs exam", "which is better upsc or pcs"],
 "blocks": [
  {"p": "Most serious civil services aspirants end up preparing for both. The syllabuses overlap enough that this is efficient, but the two exams reward different things and lead to very different careers, and treating the state exam as a mere consolation prize is a mistake worth examining."},

  {"h": "Odds, plainly"},
  {"table": {
    "head": ["", "UPSC CSE", "A typical State PSC"],
    "rows": [
      ["Applicants", "Around 10 lakh", "Typically 2–5 lakh"],
      ["Posts", "Around 900–1,000", "Varies widely; often several hundred to a few thousand"],
      ["Rough success rate", "Around 0.1%", "Usually several times better"],
      ["Cycle length", "12–14 months", "Often longer, and less predictable"],
    ]}},
  {"note": "State PSC schedules are considerably less reliable than UPSC's. Delays, litigation and postponements are common, and a cycle can stretch across two or three years. Factor this into your planning rather than assuming a fixed annual calendar."},

  {"h": "What the syllabus difference actually is"},
  {"ul": [
    "The GS core — polity, economy, geography, environment, science — is largely shared. Preparation transfers directly.",
    "State PSCs add substantial state-specific content: the state's history, geography, culture, administrative structure, current schemes and local current affairs. This is genuinely additional work, not a subset.",
    "Many state exams retain an optional subject at Mains where UPSC's weight on the optional has stayed constant. Some have moved to a purely GS format. Check the current pattern for your state rather than assuming.",
    "Language papers matter more in several states, and are sometimes not merely qualifying.",
  ]},

  {"h": "The career difference"},
  {"ul": [
    "A UPSC-selected IAS or IPS officer is a member of an All India Service, allotted to a state cadre but eligible for central deputation and for the senior-most administrative positions in the country.",
    "A State PSC officer enters the state civil service — Deputy Collector, Deputy SP or equivalent. Career progression is within the state, and promotion into the IAS through the state civil service quota is possible but slow and limited.",
    "Postings stay within one state, which for many people is the point rather than the drawback. Family proximity, language familiarity and a known administrative culture are real benefits.",
    "Entry pay for a state civil service officer is lower than Level 10, though the gap narrows with promotion, and state allowances vary.",
  ]},

  {"h": "How to run both without wrecking either"},
  {"verdict": [
    ["Primary UPSC, secondary state", "Build the GS base for UPSC standards, which is higher. Add state-specific content in the two to three months before the state prelims. This works if the state exam calendar is reasonably predictable."],
    ["Primary state, secondary UPSC", "Reasonable if your state's post count is high relative to applicants and you would genuinely be content in the state service. Write UPSC anyway — the attempts are limited and there is no reason to waste them."],
    ["Both, seriously, from the start", "Only if you can commit to the state-specific material as a permanent part of your daily schedule rather than a last-minute addition. Half-prepared state content is what causes people to miss state prelims by two marks."],
  ]},

  {"h": "One honest observation"},
  {"p": "The candidates who do worst are the ones who prepare for UPSC for four years, exhaust their attempts, and only then look at state exams — by which point they have neither the state-specific base nor, in some cases, the age eligibility. If a state service is an outcome you would accept, prepare for it as a real target from year one, not as a fallback you turn to when the attempts run out."},
 ],
},

{
 "slug": "how-to-read-a-cutoff-list",
 "title": "How to read a cutoff list without fooling yourself",
 "category": "Counselling",
 "readTime": "7 min",
 "updated": "2026-07-29",
 "excerpt": "Closing ranks, opening ranks, seat types, rounds and quotas. The five ways students misread cutoff data and lose seats they could have had.",
 "related": ["mht-cet", "neet-ug", "jee-main"],
 "keywords": ["how to read cutoff list", "closing rank meaning", "opening rank", "cap round cutoff", "college predictor how to use"],
 "blocks": [
  {"p": "A cutoff list is a record of what happened last year, not a promise about this year. Used properly it is the single most useful document in counselling. Used carelessly it produces confident, wrong choice lists. Here are the five mistakes that cost seats."},

  {"h": "1. Confusing the closing rank with the requirement"},
  {"p": "The closing rank is the rank of the last candidate who was allotted that seat in that round, under that category and seat type. It is an outcome, not a threshold. It moves every year with the number of applicants, the seat matrix, the difficulty of the paper and where the strong candidates chose to go."},
  {"ul": [
    "Treat last year's closing rank as the centre of a band, not a line. A reasonable working band is roughly ten per cent either side.",
    "If your rank is inside that band, list the college. If it is well outside on the wrong side, listing it costs you nothing but it will not convert.",
    "Look at three years of closing ranks where you can. A single year can be distorted by a one-off event.",
  ]},

  {"h": "2. Reading the wrong round"},
  {"p": "Cutoffs almost always loosen across rounds as candidates upgrade, withdraw or fail to report. A Round 3 closing rank is usually higher — that is, more forgiving — than a Round 1 closing rank for the same seat."},
  {"ul": [
    "For your Round 1 choice list, compare against last year's Round 1 data.",
    "Do not comfort yourself with a Round 3 number when planning Round 1. That seat was not available at that rank in the first round.",
    "Equally, do not despair at a tight Round 1 number if you are planning for later rounds.",
  ]},

  {"h": "3. Ignoring seat type and quota"},
  {"p": "The same college and the same branch will show several very different closing ranks in the same list, because they are different seats."},
  {"table": {
    "head": ["System", "Seat dimensions that change the cutoff"],
    "rows": [
      ["MHT CET CAP", "Home University, Other Than Home University, State Level. Then category — OPEN, OBC, SC, ST, SEBC, VJ, NT, EWS, TFWS. Then General or Ladies pool."],
      ["NEET MCC", "All India Quota, deemed university, ESIC, AMU/BHU internal, and several others. Then category, and PwD status."],
      ["JoSAA", "Home State and Other State for state-funded institutes, plus category, gender-neutral versus female-only pool."],
    ]}},
  {"note": "Students routinely conclude a college is out of reach after checking only the OPEN State Level number, when their own Home University seat in the same branch closed at a far more accessible merit number."},

  {"h": "4. Comparing percentile against rank"},
  {"p": "Percentile and merit number are not the same and do not convert cleanly between years. MHT CET publishes closing merit numbers; the percentile shown alongside is reference information only. NEET publishes All India Ranks. JEE Main publishes percentile from which a rank is derived. Compare like with like — your rank against a rank, your percentile against a percentile from the same year."},

  {"h": "5. Building the choice list in the wrong order"},
  {"p": "Allotment engines run down your preference list in order and stop at the first seat you are eligible for. This has one consequence that people learn too late."},
  {"ul": [
    "Put your genuine first preference first, even if you think it is out of reach. If it is out of reach you lose nothing; if the cutoff moved in your favour you gain a seat you would otherwise have missed.",
    "Never place a safe option above a preferred one. The safe option will take the seat and the preferred one will never be considered.",
    "List far more options than you think you need. There is no penalty for a long list, and short lists are the most common cause of going unallotted in Round 1.",
    "Include the same college at several seat types and categories where the system allows it.",
  ]},

  {"h": "Use the data, not the folklore"},
  {"p": "Forum advice about which college 'usually goes at' which rank is compressed, second-hand and often several years stale. The predictors on this site run your actual number against the official cutoff data — the MHT CET CAP Rounds I to III closing merit numbers, and the MCC NEET UG allotment lists — and show you every seat that falls inside a realistic band, split into safe, moderate and reach. Start there, then build the choice list by hand."},
 ],
},

]
