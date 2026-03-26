import { describe, expect, it } from 'vitest';
import { hashPin, isHashedPin, verifyPin } from '@/lib/security/pin';

describe('pin security helpers', () => {
  it('hashes pins using a non-plaintext format', async () => {
    const hashed = await hashPin('123456');

    expect(isHashedPin(hashed)).toBe(true);
    expect(hashed).not.toContain('123456');
  });

  it('verifies hashed and legacy pins', async () => {
    const hashed = await hashPin('123456');

    await expect(verifyPin(hashed, '123456')).resolves.toBe(true);
    await expect(verifyPin(hashed, '000000')).resolves.toBe(false);
    await expect(verifyPin('123456', '123456')).resolves.toBe(true);
    await expect(verifyPin('123456', '000000')).resolves.toBe(false);
  });
});
