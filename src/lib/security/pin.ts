const PIN_HASH_PREFIX = 'pbkdf2';
const PIN_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

const textEncoder = new TextEncoder();

const toBase64 = (value: Uint8Array) => {
  let binary = '';
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const getCrypto = () => {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error('Web Crypto API tidak tersedia.');
  }

  return globalThis.crypto;
};

export const isHashedPin = (value: string | undefined | null): value is string =>
  typeof value === 'string' && value.startsWith(`${PIN_HASH_PREFIX}$`);

export const hashPin = async (pin: string): Promise<string> => {
  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PIN_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8,
  );

  return [
    PIN_HASH_PREFIX,
    PIN_ITERATIONS,
    toBase64(salt),
    toBase64(new Uint8Array(derivedBits)),
  ].join('$');
};

export const verifyPin = async (
  storedPin: string | undefined,
  candidatePin: string,
): Promise<boolean> => {
  if (!storedPin) {
    return false;
  }

  if (!isHashedPin(storedPin)) {
    return storedPin === candidatePin;
  }

  const [, iterationsRaw, saltRaw, hashRaw] = storedPin.split('$');
  const iterations = Number.parseInt(iterationsRaw ?? '', 10);
  if (!Number.isFinite(iterations) || iterations <= 0 || !saltRaw || !hashRaw) {
    return storedPin === candidatePin;
  }

  const crypto = getCrypto();
  const salt = fromBase64(saltRaw);
  const expectedHash = fromBase64(hashRaw);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(candidatePin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    expectedHash.length * 8,
  );

  const actualHash = new Uint8Array(derivedBits);
  if (actualHash.length !== expectedHash.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < expectedHash.length; index++) {
    mismatch |= actualHash[index] ^ expectedHash[index];
  }

  return mismatch === 0;
};

export const extractLegacyPin = (storedPin: string | undefined): string | null => {
  if (!storedPin || isHashedPin(storedPin)) {
    return null;
  }

  return storedPin;
};
