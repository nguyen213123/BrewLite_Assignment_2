import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPostLoginRedirect } from './auth.ts';

describe('getPostLoginRedirect', () => {
  it('redirects ADMIN to /admin', () => {
    assert.equal(getPostLoginRedirect('ADMIN'), '/admin');
  });

  it('redirects STAFF to /staff', () => {
    assert.equal(getPostLoginRedirect('STAFF'), '/staff');
  });

  it('redirects CUSTOMER or undefined role to /', () => {
    assert.equal(getPostLoginRedirect('CUSTOMER'), '/');
    assert.equal(getPostLoginRedirect(undefined), '/');
  });
});
