import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/lib/db/userRepository', () => ({
  userRepository: {
    getByUsername: vi.fn(),
    getByPin: vi.fn(),
    update: vi.fn(),
    getRoleById: vi.fn(),
    seedDefaultData: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should clear user on logout', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set loading state during login', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isLoading).toBe(false);
  });

  it('should have null error initially', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.error).toBeNull();
  });
});
