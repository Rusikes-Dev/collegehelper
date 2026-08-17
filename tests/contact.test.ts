import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisePhone, normaliseEmail, parseContact, formatPhone, maskEmail } from '../src/lib/contact.ts';

/**
 * These are the highest-stakes tests in the project.
 *
 * If normalisation is not deterministic, a student who typed "+91 98765 43210"
 * at checkout and "9876543210" on the restore page is treated as two different
 * people, and the one who paid cannot get back in. Every accepted form must
 * collapse to exactly the same stored value.
 */

test('every way of writing the same number collapses to one value', () => {
  const forms = [
    '9876543210', '+919876543210', '+91 98765 43210', '91-9876543210',
    '09876543210', '098765 43210', ' 98765-43210 ', '(+91) 98765 43210',
    '+91.98765.43210', '0919876543210',
  ];
  for (const f of forms) {
    assert.equal(normalisePhone(f), '9876543210', `failed on: ${f}`);
  }
});

test('numbers that cannot be Indian mobiles are rejected', () => {
  for (const bad of ['1234567890', '5876543210', '98765', '98765432101234', '', 'abcdefghij', '0000000000']) {
    assert.equal(normalisePhone(bad), null, `should reject: ${bad}`);
  }
});

test('landline-style numbers starting below 6 are rejected', () => {
  assert.equal(normalisePhone('2226543210'), null);
  assert.equal(normalisePhone('4426543210'), null);
});

test('all four valid mobile prefixes are accepted', () => {
  for (const p of ['6', '7', '8', '9']) {
    assert.equal(normalisePhone(`${p}123456789`), `${p}123456789`);
  }
});

test('email case and whitespace do not create a second account', () => {
  assert.equal(normaliseEmail('  Aarav.Sharma@GMAIL.com '), 'aarav.sharma@gmail.com');
});

test('gmail dots and plus tags are left intact', () => {
  // Collapsing these would silently merge accounts a student thinks are separate.
  assert.equal(normaliseEmail('a.b+jee@gmail.com'), 'a.b+jee@gmail.com');
});

test('malformed emails are caught before they reach the database', () => {
  for (const bad of ['', 'nope', 'a@b', 'a@@b.com', 'a b@c.com', '@gmail.com']) {
    const r = parseContact({ email: bad, phone: '9876543210' });
    assert.equal(r.ok, false, `should reject: ${bad}`);
    assert.ok(r.fields?.email);
  }
});

test('a valid pair parses to the stored form', () => {
  const r = parseContact({ name: '  Aarav  ', email: 'A@Example.COM', phone: '+91 98765 43210' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: 'Aarav', email: 'a@example.com', phone: '9876543210' });
});

test('a missing name is allowed, a missing phone is not', () => {
  assert.equal(parseContact({ email: 'a@b.com', phone: '9876543210' }).ok, true);
  const r = parseContact({ email: 'a@b.com', phone: '' });
  assert.equal(r.ok, false);
  assert.ok(r.fields?.phone);
});

test('both errors are reported together, not one at a time', () => {
  const r = parseContact({ email: 'nope', phone: 'nope' });
  assert.ok(r.fields?.email && r.fields?.phone);
});

test('display and masking helpers do not leak the whole value', () => {
  assert.equal(formatPhone('9876543210'), '+91 98765 43210');
  assert.equal(maskEmail('aarav@gmail.com'), 'aa***@gmail.com');
  assert.ok(!maskEmail('aarav@gmail.com').includes('aarav'));
});
