import { NextResponse } from 'next/server';
import { loadDataset, rowsForTypes } from '@/lib/dataset';
import { evaluate, sortResults, CONFIDENCE_LABELS, type SortKey } from '@/lib/eligibility';
import { requirePaidSession } from '@/lib/session';
import { resultsQuerySchema } from '@/lib/validation';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';
import type { MatchResult } from '@/lib/types';

/**
 * Returns one page of results for a paid session.
 *
 * The rank, category and preferences come from the signed session cookie, not
 * from the query string. Query parameters can only narrow what the student
 * already paid for: they cannot change who the search was run as.
 */
export async function GET(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'results'), LIMITS.results);
    if (!gate.ok) return apiError('Too many requests. Please wait a moment.', 'RATE_LIMITED', 429);

    const session = await requirePaidSession();
    const url = new URL(req.url);
    const parsed = resultsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return apiError('Those filters were not valid.', 'BAD_QUERY', 400);
    const q = parsed.data;

    const ds = loadDataset();
    let rows = rowsForTypes(ds, session.preferences.instituteTypes);
    if (session.preferences.programIds !== 'ALL') {
      const wanted = new Set(session.preferences.programIds);
      rows = rows.filter((r) => wanted.has(r.programId));
    }

    const evaluated = evaluate({ rows, institutes: ds.institutes, programs: ds.programs, student: session.student });
    let list: MatchResult[] = q.view === 'NEAR_MISS' ? evaluated.nearMisses : evaluated.eligible;

    // Post-result filters, all narrowing only.
    const csv = (s?: string) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : null);
    const types = csv(q.instituteTypes);
    const progIds = csv(q.programIds)?.map(Number).filter(Number.isInteger);
    const quotas = csv(q.quotas);
    const categories = csv(q.categories);
    const rounds = csv(q.rounds)?.map(Number).filter(Number.isInteger);

    if (types) list = list.filter((m) => types.includes(m.institute.type));
    if (progIds?.length) list = list.filter((m) => progIds.includes(m.program.id));
    if (quotas) list = list.filter((m) => quotas.includes(m.row.quota));
    if (categories) list = list.filter((m) => categories.includes(m.row.category));
    if (rounds?.length) list = list.filter((m) => rounds.includes(m.row.round));
    if (q.minCloseRank) list = list.filter((m) => m.row.closeRank >= q.minCloseRank!);
    if (q.maxCloseRank) list = list.filter((m) => m.row.closeRank <= q.maxCloseRank!);

    if (q.q) {
      const needle = q.q.toLowerCase();
      list = list.filter(
        (m) =>
          m.institute.name.toLowerCase().includes(needle) ||
          m.program.name.toLowerCase().includes(needle) ||
          m.institute.type.toLowerCase() === needle,
      );
    }

    list = sortResults(list, q.sort as SortKey);

    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / q.pageSize));
    const page = Math.min(q.page, pages);
    const slice = list.slice((page - 1) * q.pageSize, page * q.pageSize);

    // Facet counts are computed before pagination so the filter sheet can show
    // how many results each option would leave.
    const facet = <T extends string | number>(pick: (m: MatchResult) => T) => {
      const out: Record<string, number> = {};
      for (const m of list) { const k = String(pick(m)); out[k] = (out[k] ?? 0) + 1; }
      return out;
    };

    return NextResponse.json({
      page, pages, total, pageSize: q.pageSize,
      results: slice.map((m) => ({
        key: `${m.institute.id}-${m.program.id}-${m.row.quota}-${m.row.category}-${m.row.gender}-${m.row.pwd ? 1 : 0}-${m.row.year}-${m.row.round}`,
        instituteId: m.institute.id,
        institute: m.institute.name,
        instituteType: m.institute.type,
        state: m.institute.state,
        programId: m.program.id,
        program: m.program.name,
        degree: m.program.degree,
        durationYears: m.program.durationYears,
        // Suppressed when it came from a different rank list than the closing rank.
        openRank: m.row.mixedRankLists ? null : m.row.openRank,
        closeRank: m.row.closeRank,
        quota: m.row.quota,
        quotaLabel: ds.quotaLabels.get(m.row.quota)?.label ?? m.row.quota,
        category: m.row.category,
        gender: m.row.gender,
        pwd: m.row.pwd,
        year: m.row.year,
        round: m.row.round,
        yourRank: m.rankUsed.value,
        rankLabel: m.rankUsed.label,
        margin: m.margin,
        confidence: m.confidence,
        confidenceLabel: CONFIDENCE_LABELS[m.confidence].label,
      })),
      facets: {
        instituteType: facet((m) => m.institute.type),
        quota: facet((m) => m.row.quota),
        category: facet((m) => m.row.category),
        round: facet((m) => m.row.round),
      },
      counts: { eligible: evaluated.eligible.length, nearMisses: evaluated.nearMisses.length },
      unevaluated: evaluated.unevaluated,
      ranksUsed: evaluated.ranksUsed,
      coverage: { years: ds.meta.years, rounds: ds.meta.rounds, source: ds.meta.source },
    });
  } catch (e) {
    return handleError(e);
  }
}
