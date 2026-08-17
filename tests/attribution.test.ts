import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attributionFrom, parseUserAgent, isBot } from '../src/lib/attribution.ts';

const url = (u) => new URL(u);
const SELF = 'jcf.example.com';

test('utm_source alone still resolves a medium', () => {
  const a = attributionFrom(url('https://jcf.example.com/find?utm_source=instagram'), null, SELF);
  assert.equal(a.source, 'instagram');
  assert.equal(a.medium, 'social');
});

test('google referrer is organic search', () => {
  const a = attributionFrom(url('https://jcf.example.com/'), 'https://www.google.com/', SELF);
  assert.equal(a.source, 'google');
  assert.equal(a.medium, 'organic');
});

test('whatsapp share is social', () => {
  const a = attributionFrom(url('https://jcf.example.com/'), 'https://wa.me/', SELF);
  assert.equal(a.source, 'whatsapp');
  assert.equal(a.medium, 'social');
});

test('self-referral is not a source', () => {
  const a = attributionFrom(url('https://jcf.example.com/results'), 'https://jcf.example.com/find', SELF);
  assert.equal(a.source, 'direct');
  assert.equal(a.referrerHost, null);
});

test('www on our own host is still us', () => {
  const a = attributionFrom(url('https://jcf.example.com/x'), 'https://www.jcf.example.com/find', 'www.jcf.example.com');
  assert.equal(a.source, 'direct');
});

test('explicit utm_medium always wins', () => {
  const a = attributionFrom(url('https://jcf.example.com/?utm_source=google&utm_medium=cpc'), 'https://www.google.com/', SELF);
  assert.equal(a.medium, 'cpc');
});

test('unknown referrer is a referral keyed on the host', () => {
  const a = attributionFrom(url('https://jcf.example.com/'), 'https://somecoachingblog.in/post', SELF);
  assert.equal(a.source, 'somecoachingblog.in');
  assert.equal(a.medium, 'referral');
});

test('gclid with no referrer is paid google', () => {
  const a = attributionFrom(url('https://jcf.example.com/?gclid=abc'), null, SELF);
  assert.equal(a.source, 'google');
  assert.equal(a.medium, 'cpc');
});

test('typed URL is direct', () => {
  const a = attributionFrom(url('https://jcf.example.com/'), null, SELF);
  assert.equal(a.source, 'direct');
  assert.equal(a.medium, 'none');
});

test('android phone is detected as mobile', () => {
  const d = parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36');
  assert.equal(d.device, 'mobile');
  assert.equal(d.os, 'Android');
});

test('android tablet is not counted as a phone', () => {
  const d = parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120 Safari/537.36');
  assert.equal(d.device, 'tablet');
});

test('crawlers are excluded from traffic', () => {
  assert.ok(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'));
  assert.ok(!isBot('Mozilla/5.0 (iPhone) Safari/604.1'));
});
