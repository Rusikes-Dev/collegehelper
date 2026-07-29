# -*- coding: utf-8 -*-

SITE = {
  "name": "College Helper",
  "domain": "collegehelper.xyz",
  "url": "https://collegehelper.xyz",
  "tagline": "Every Indian competitive exam, tracked in one place",
  "description": "Exam dates, syllabus, eligibility, cutoffs and college predictors for JEE, NEET, UPSC, SSC, banking, CAT, CLAT, GATE, CUET and MHT CET. Updated as notifications drop.",
  "email": "hello@collegehelper.xyz",
  "twitter": "@collegehelper",
  "locale": "en_IN",
  "built": "2026-07-29",
  # Set this to your repo once you push, so the admin panel can save changes.
  "repo": "",           # e.g. "yourusername/collegehelper"
  "branch": "main",
}

NAV = [
  ("Exams", "/exams/"),
  ("Calendar", "/calendar.html"),
  ("Guides", "/guides/"),
  ("Tools", "/tools/"),
]

CATEGORIES = {
  "engineering":    {"label": "Engineering",     "blurb": "JEE, GATE and state engineering entrance tests"},
  "medical":        {"label": "Medical",         "blurb": "NEET UG and medical admission counselling"},
  "civil-services": {"label": "Civil Services",  "blurb": "UPSC and state public service commissions"},
  "ssc":            {"label": "SSC",             "blurb": "Staff Selection Commission recruitment"},
  "banking":        {"label": "Banking",         "blurb": "IBPS, SBI and RBI recruitment"},
  "management":     {"label": "Management",      "blurb": "MBA entrance tests"},
  "law":            {"label": "Law",             "blurb": "CLAT and law school admissions"},
  "university":     {"label": "University",      "blurb": "Central and state university admission tests"},
}

STATUS_META = {
  "live":          ("live",  "Live now"),
  "counselling":   ("live",  "Counselling"),
  "open":          ("open",  "Applications open"),
  "open-soon":     ("open",  "Opening soon"),
  "in-progress":   ("next",  "In progress"),
  "upcoming":      ("next",  "Upcoming"),
  "watch":         ("",      "Watch"),
  "cycle-closed":  ("",      "Cycle closed"),
}

# Calendar entries that don't have a full exam page of their own.
EXTRA_EVENTS = [
  ("2026-08-14", "GATE 2027 registration opens", "engineering", "GATE", "open", "/exams/gate.html"),
  ("2026-09-13", "MHT CET 2026 institute-level admissions close", "engineering", "MHT CET", "upcoming", "/exams/mht-cet.html"),
  ("2026-09-15", "CAT 2026 registration closes", "management", "CAT", "upcoming", "/exams/cat.html"),
  ("2026-10-04", "IBPS PO 2026 Mains", "banking", "IBPS PO", "upcoming", "/exams/ibps-po.html"),
  ("2026-10-10", "IBPS Clerk 2026 Prelims", "banking", "IBPS Clerk", "upcoming", "/exams/ibps-clerk.html"),
  ("2026-10-31", "CLAT 2027 registration closes", "law", "CLAT", "upcoming", "/exams/clat.html"),
  ("2026-11-21", "IBPS RRB PO 2026 Prelims", "banking", "IBPS RRB", "upcoming", "/exams/ibps-po.html"),
  ("2026-11-29", "CAT 2026 exam day", "management", "CAT", "upcoming", "/exams/cat.html"),
  ("2026-12-06", "CLAT 2027 exam day, 2:00–4:00 pm", "law", "CLAT", "upcoming", "/exams/clat.html"),
  ("2026-12-06", "IBPS RRB Clerk 2026 Prelims begin", "banking", "IBPS RRB", "upcoming", "/exams/ibps-clerk.html"),
  ("2026-12-27", "IBPS Clerk 2026 Mains", "banking", "IBPS Clerk", "upcoming", "/exams/ibps-clerk.html"),
  ("2027-01-13", "UPSC CSE 2027 notification", "civil-services", "UPSC CSE", "upcoming", "/exams/upsc-cse.html"),
  ("2027-02-06", "GATE 2027 exam begins", "engineering", "GATE", "upcoming", "/exams/gate.html"),
  ("2027-05-23", "UPSC CSE 2027 Prelims", "civil-services", "UPSC CSE", "upcoming", "/exams/upsc-cse.html"),
]

# Homepage: which exams appear on the status board, in this order.
BOARD_ORDER = [
  "mht-cet", "neet-ug", "upsc-cse", "cat", "clat",
  "ibps-po", "ssc-cgl", "gate", "cuet-ug", "ibps-clerk",
]

TOOLS = [
  {
    "slug": "mht-cet-college-predictor",
    "name": "MHT CET College Predictor",
    "short": "MHT CET Predictor",
    "exam": "mht-cet",
    "price": 49,
    "blurb": "Enter your Maharashtra State General Merit Number and see every college and branch that closed at or near it, across CAP Rounds I, II and III.",
    "dataNote": "MHT CET 2025 CAP Rounds I, II & III cut-off lists, Maharashtra State CET Cell",
    "keywords": ["mht cet college predictor", "mht cet cutoff 2025", "cap round college predictor", "mht cet merit number", "maharashtra engineering college predictor"],
  },
  {
    "slug": "neet-college-predictor",
    "name": "NEET College Predictor",
    "short": "NEET Predictor",
    "exam": "neet-ug",
    "price": 49,
    "blurb": "Enter your NEET All India Rank and category to see the MBBS, BDS and BSc Nursing seats that closed at or near it in MCC counselling.",
    "dataNote": "MCC NEET UG All India Quota counselling allotment lists, Rounds 1–3",
    "keywords": ["neet college predictor", "neet rank vs college", "mcc counselling cutoff", "mbbs college predictor", "neet closing rank"],
  },
]
