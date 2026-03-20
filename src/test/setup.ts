import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn(),
}));

afterEach(() => {
  cleanup();
});
