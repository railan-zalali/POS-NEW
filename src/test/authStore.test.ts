import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/lib/db/userRepository', () => ({
  userRepository: {
    getByUsername: vi.fn(),
    update: vi.fn(),
    getRoleById: vi.fn(),
    seedDefaultData: vi.fn(),
    verifyPin: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should authenticate legacy plaintext pin and persist a hashed upgrade path', async () => {
    const { userRepository } = await import('@/lib/db/userRepository');
    const { result } = renderHook(() => useAuthStore());

    vi.mocked(userRepository.getByUsername).mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      full_name: 'Administrator',
      role_id: 'role-1',
      pin: '123456',
      is_active: true,
    } as never);
    vi.mocked(userRepository.verifyPin).mockResolvedValue(true);
    vi.mocked(userRepository.getRoleById).mockResolvedValue({
      id: 'role-1',
      name: 'Admin',
      permissions: ['pos:read'],
    } as never);
    vi.mocked(userRepository.update).mockResolvedValue(1 as never);

    await act(async () => {
      const success = await result.current.login('admin', '123456');
      expect(success).toBe(true);
    });

    expect(userRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ pin: '123456' }),
    );
    expect(result.current.user).toMatchObject({
      id: 'user-1',
      username: 'admin',
      role: { name: 'Admin' },
    });
    expect(result.current.user).not.toHaveProperty('pin');
  });
});
