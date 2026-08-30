import { z } from 'zod';

/** Indian mobile numbers: 10 digits starting 6-9, with optional +91 / 0. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .refine((v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v), {
    message: 'Enter a 10-digit Indian mobile number.',
  })
  .transform((v) => v.replace(/^(?:\+?91|0)/, ''));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.');

export const percentileSchema = z
  .number({ invalid_type_error: 'Enter your percentile.' })
  .min(0, 'Percentile cannot be below 0.')
  .max(100, 'Percentile cannot be above 100.');

export const meritRankSchema = z
  .number({ invalid_type_error: 'Enter your merit rank.' })
  .int('Merit rank must be a whole number.')
  .min(1, 'Merit rank starts at 1.')
  .max(1_000_000, 'That merit rank looks too large \u2014 please check it.');

export const predictorInputSchema = z
  .object({
    rankType: z.enum(['PERCENTILE', 'MERIT_RANK']),
    value: z.number(),
    categoryGroup: z.string().min(1).max(20).nullable().optional(),
    gender: z.enum(['ANY', 'FEMALE']).default('ANY'),
    universityScope: z.array(z.enum(['HOME', 'OTHER', 'STATE'])).optional(),
    specials: z.array(z.string().max(30)).optional(),
    branchIds: z.array(z.string().uuid()).max(30).optional(),
    cities: z.array(z.string().max(60)).max(30).optional(),
    capRounds: z.array(z.string().max(40)).max(6).optional(),
  })
  .superRefine((val, ctx) => {
    const schema =
      val.rankType === 'PERCENTILE' ? percentileSchema : meritRankSchema;
    const result = schema.safeParse(val.value);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: result.error.issues[0].message,
      });
    }
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: emailSchema,
  phone: phoneSchema,
});

export type PredictorInput = z.infer<typeof predictorInputSchema>;
