import PDFDocument from 'pdfkit';
import { loadDataset } from '@/lib/dataset';
import { requirePaidSession } from '@/lib/session';
import { choiceListSchema } from '@/lib/validation';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Renders the student's choice list as a PDF.
 *
 * The client sends only the identity of each choice. Every displayed value —
 * institute name, programme, closing rank — is looked up server-side from the
 * dataset, so nothing in the document can be fabricated by editing the request.
 * Payment ids, session ids and internal row ids never appear in the output.
 */

const INK = '#111827';
const MUTED = '#6B7280';
const RULE = '#E5E7EB';
const ACCENT = '#1D4ED8';

export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'pdf'), LIMITS.pdf);
    if (!gate.ok) return apiError('Too many downloads. Please wait a minute.', 'RATE_LIMITED', 429);

    const session = await requirePaidSession();
    const parsed = choiceListSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Your choice list could not be read.', 'BAD_PAYLOAD', 400);
    }

    const ds = loadDataset();
    const rowIndex = new Map(
      ds.rows.map((r) => [
        `${r.instituteId}|${r.programId}|${r.quota}|${r.category}|${r.gender}|${r.pwd ? 1 : 0}|${r.year}|${r.round}`,
        r,
      ]),
    );

    const choices = parsed.data.choices.map((c) => {
      const key = `${c.instituteId}|${c.programId}|${c.quota}|${c.category}|${c.gender}|${c.pwd ? 1 : 0}|${c.year}|${c.round}`;
      const row = rowIndex.get(key);
      const institute = ds.institutes.get(c.instituteId);
      const program = ds.programs.get(c.programId);
      return { row, institute, program, spec: c };
    }).filter((c) => c.row && c.institute && c.program);

    if (!choices.length) {
      return apiError('None of those choices matched the cutoff data. Please rebuild your list.', 'NO_VALID_CHOICES', 400);
    }

    const s = session.student;
    const nf = new Intl.NumberFormat('en-IN');
    const doc = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true, info: { Title: 'JEE College Finder \u2014 Choice List' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))));

    const W = doc.page.width - 88;

    /* ---- header ---- */
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(17).text('JEE College Finder');
    doc.fillColor(MUTED).font('Helvetica').fontSize(9)
      .text(`Choice list generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`);
    doc.moveDown(0.8);

    /* ---- student summary ---- */
    const facts: [string, string][] = [
      ['JEE Main All India Rank', nf.format(s.ranks.mainCrl)],
      ...(s.ranks.advancedCrl ? [['JEE Advanced All India Rank', nf.format(s.ranks.advancedCrl)] as [string, string]] : []),
      ...(s.ranks.mainCategory ? [[`JEE Main ${s.category} rank`, nf.format(s.ranks.mainCategory)] as [string, string]] : []),
      ['Category', s.category],
      ...(s.isPwd ? [['PwD', 'Yes'] as [string, string]] : []),
      ['Institute types', session.preferences.instituteTypes === 'ALL' ? 'All' : session.preferences.instituteTypes.join(', ')],
      ['Programmes selected', session.preferences.programIds === 'ALL'
        ? 'All programmes'
        : `${session.preferences.programIds.length} selected`],
      ['Cutoff data', `JoSAA ${ds.meta.years.join(', ')} \u2014 round ${ds.meta.rounds.join(', ')}`],
    ];

    const boxTop = doc.y;
    doc.roundedRect(44, boxTop, W, facts.length * 14 + 16, 4).fillAndStroke('#F9FAFB', RULE);
    let fy = boxTop + 8;
    for (const [k, v] of facts) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(k, 54, fy, { width: 190 });
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text(v, 248, fy, { width: W - 214 });
      fy += 14;
    }
    doc.y = boxTop + facts.length * 14 + 26;

    /* ---- table ---- */
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('Your choice list');
    doc.moveDown(0.4);

    const COLS = [
      { key: 'p', label: '#', w: 24 },
      { key: 'inst', label: 'Institute', w: 168 },
      { key: 'prog', label: 'Programme', w: 150 },
      { key: 'type', label: 'Type', w: 38 },
      { key: 'seat', label: 'Seat', w: 76 },
      { key: 'cr', label: 'Closing rank', w: 51 },
    ];

    const drawHead = () => {
      const y = doc.y;
      doc.rect(44, y, W, 18).fill('#F3F4F6');
      let x = 48;
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8);
      for (const c of COLS) {
        doc.text(c.label.toUpperCase(), x, y + 5, { width: c.w - 6, align: c.key === 'cr' ? 'right' : 'left' });
        x += c.w;
      }
      doc.y = y + 18;
    };
    drawHead();

    choices.forEach((c, i) => {
      const cells = [
        String(i + 1),
        c.institute!.name,
        `${c.program!.name}${c.program!.degree ? `\n${c.program!.degree}` : ''}`,
        c.institute!.type,
        `${c.row!.category}${c.row!.pwd ? ' (PwD)' : ''} \u00b7 ${c.row!.quota}\n${c.row!.gender === 'FEMALE' ? 'Female-only' : 'Gender-neutral'}`,
        nf.format(c.row!.closeRank),
      ];

      doc.font('Helvetica').fontSize(8.5);
      const h = Math.max(...COLS.map((col, j) => doc.heightOfString(cells[j], { width: col.w - 8 }))) + 10;

      if (doc.y + h > doc.page.height - 70) { doc.addPage(); drawHead(); }

      const y = doc.y;
      if (i % 2 === 1) doc.rect(44, y, W, h).fill('#FBFCFD');

      let x = 48;
      COLS.forEach((col, j) => {
        const bold = col.key === 'inst' || col.key === 'cr';
        doc.fillColor(col.key === 'seat' ? MUTED : INK)
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(col.key === 'seat' ? 7.5 : 8.5)
          .text(cells[j], x, y + 5, { width: col.w - 8, align: col.key === 'cr' ? 'right' : 'left' });
        x += col.w;
      });

      doc.moveTo(44, y + h).lineTo(44 + W, y + h).strokeColor(RULE).lineWidth(0.5).stroke();
      doc.y = y + h;
    });

    /* ---- footer on every page ---- */
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(range.start + p);
      const fy2 = doc.page.height - 54;
      doc.moveTo(44, fy2 - 8).lineTo(44 + W, fy2 - 8).strokeColor(RULE).lineWidth(0.5).stroke();
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(
        'Generated using previous-year cutoff data. This document is for counselling guidance only. '
        + 'Closing ranks change every year and do not guarantee admission. Always confirm against the official JoSAA portal.',
        44, fy2, { width: W - 60 },
      );
      doc.text(`${p + 1}/${range.count}`, 44, fy2, { width: W, align: 'right' });
    }

    doc.end();
    const pdf = await done;

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="jee-choice-list-${new Date().toISOString().slice(0, 10)}.pdf"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
