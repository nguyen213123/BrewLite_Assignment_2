import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseAdminQuantity } from './admin-input.ts';

it('rejects cleared admin price and stock inputs while allowing an explicit zero', () => {
  for (const input of ['', ' ', '\t', 'NaN', 'Infinity', '-1', '1.5', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseAdminQuantity(input), null, String(input));
  }
  assert.equal(parseAdminQuantity('0'), 0);
  assert.equal(parseAdminQuantity(0), 0);
  assert.equal(parseAdminQuantity('25000'), 25000);
});

it('rejects database integer overflow and reserves room for size price offsets', () => {
  assert.equal(parseAdminQuantity('3000000000'), null);
  assert.equal(parseAdminQuantity('2147483647'), 2147483647);
  assert.equal(parseAdminQuantity('2147483647', 2147473647), null);
});
