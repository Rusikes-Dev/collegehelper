import { z } from 'zod';

/**
 * Server-side validation. Every API route parses its input through these
 * schemas; nothing trusts a client-side check.
 */

// Roughly 1.5 million candidates sit JEE Main; the ceiling is deliberately
// generous so a valid rank is never rejected, while nonsense is.
const MAIN_RANK_MAX = 2_000_000;
const ADVANCED_RANK_MAX = 300_000;

const rank = (max: number, field: string) =>
  z.coerce
    .number({ message: `Enter your ${field} as a number.` })
    .int(`${field} must be a whole number, without decimals.`)
    .min(1, `${field} must be 1 or higher.`)
    .max(max, `${field} looks too large. Please check it.`);

const optionalRank = (max: number, field: string) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    rank(max, field).optional(),
  );

export const categorySchema = z.enum(['OPEN', 'EWS', 'OBC-NCL', 'SC', 'ST']);
export const instituteTypeSchema = z.enum(['IIT', 'NIT', 'IIIT', 'GFTI']);

export const searchSchema = z
  .object({
    mainCrl: rank(MAIN_RANK_MAX, 'JEE Main All India Rank'),
    mainCategory: optionalRank(MAIN_RANK_MAX, 'JEE Main category rank'),
    mainPwd: optionalRank(MAIN_RANK_MAX, 'JEE Main PwD rank'),
    advancedCrl: optionalRank(ADVANCED_RANK_MAX, 'JEE Advanced All India Rank'),
    advancedCategory: optionalRank(ADVANCED_RANK_MAX, 'JEE Advanced category rank'),
    advancedPwd: optionalRank(ADVANCED_RANK_MAX, 'JEE Advanced PwD rank'),
    category: categorySchema,
    isPwd: z.boolean().default(false),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).default('MALE'),
    homeState: z.string().trim().max(60).nullable().default(null),
    instituteTypes: z.union([z.literal('ALL'), z.array(instituteTypeSchema).min(1)]).default('ALL'),
    programIds: z.union([z.literal('ALL'), z.array(z.number().int().nonnegative()).min(1)]).default('ALL'),
  })
  .superRefine((v, ctx) => {
    // A category rank can never be worse than the All India Rank it derives from.
    if (v.mainCategory && v.mainCategory > v.mainCrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['mainCategory'],
        message: 'Your category rank cannot be larger than your All India Rank.',
      });
    }
    if (v.advancedCategory && v.advancedCrl && v.advancedCategory > v.advancedCrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['advancedCategory'],
        message: 'Your JEE Advanced category rank cannot be larger than your JEE Advanced All India Rank.',
      });
    }
    if (v.category === 'OPEN' && v.mainCategory) {
      ctx.addIssue({
        code: 'custom',
        path: ['mainCategory'],
        message: 'OPEN candidates are ranked on the Common Rank List only, so no category rank is needed.',
      });
    }
    if (v.isPwd && !v.mainPwd && !v.advancedPwd) {
      ctx.addIssue({
        code: 'custom',
        path: ['mainPwd'],
        message: 'Add at least one PwD rank list rank, or turn off the PwD option.',
      });
    }
  });

export type SearchInput = z.infer<typeof searchSchema>;

export const resultsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
  sort: z.string().default('BEST_FIRST'),
  q: z.string().trim().max(80).default(''),
  view: z.enum(['ELIGIBLE', 'NEAR_MISS']).default('ELIGIBLE'),
  instituteTypes: z.string().optional(),
  programIds: z.string().optional(),
  quotas: z.string().optional(),
  categories: z.string().optional(),
  rounds: z.string().optional(),
  minCloseRank: z.coerce.number().int().min(1).optional(),
  maxCloseRank: z.coerce.number().int().min(1).optional(),
});

export const choiceListSchema = z.object({
  choices: z
    .array(
      z.object({
        instituteId: z.number().int().nonnegative(),
        programId: z.number().int().nonnegative(),
        quota: z.string().max(8),
        category: categorySchema,
        gender: z.enum(['NEUTRAL', 'FEMALE']),
        pwd: z.boolean().default(false),
        year: z.number().int(),
        round: z.number().int(),
      }),
    )
    .min(1, 'Add at least one choice before downloading.')
    .max(300, 'A choice list can hold at most 300 entries.'),
});

/** Flattens a Zod error into { field: message } for the form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
