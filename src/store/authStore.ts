import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userRepository } from '@/lib/db/userRepository';
import type { User, Role, PermissionKey } from '@/lib/db/schema';
import { isHashedPin } from '@/lib/security/pin';

type AuthUser = Omit<User, 'pin'> & { role?: Role };

const toAuthUser = (user: User, role?: Role): AuthUser => {
  const authUser = { ...user, role } as AuthUser & Partial<Pick<User, 'pin'>>;
  delete authUser.pin;
  return authUser;
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, pin: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  seedData: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, pin) => {
        set({ isLoading: true, error: null });
        try {
          const user = await userRepository.getByUsername(username);

          if (!user) {
            set({ error: 'Pengguna tidak ditemukan', isLoading: false });
            return false;
          }

          const isPinValid = await userRepository.verifyPin(user.pin, pin);

          if (!isPinValid) {
            set({ error: 'PIN salah', isLoading: false });
            return false;
          }

          if (!user.is_active) {
            set({ error: 'Akun dinonaktifkan', isLoading: false });
            return false;
          }

          const role = await userRepository.getRoleById(user.role_id);

          if (!isHashedPin(user.pin)) {
            await userRepository.update(user.id!, { pin });
          }

          await userRepository.update(user.id!, { last_login: new Date() });

          set({
            user: toAuthUser(user, role || undefined),
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch {
          set({ error: 'Terjadi kesalahan saat login', isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      checkAuth: async () => {
        const state = get();

        if (!state.user?.id || !state.isAuthenticated) {
          return;
        }

        const currentUser = await userRepository.getById(state.user.id);

        if (!currentUser || !currentUser.is_active) {
          set({ user: null, isAuthenticated: false, error: null });
          return;
        }

        const role = await userRepository.getRoleById(currentUser.role_id);

        set({
          user: toAuthUser(currentUser, role || undefined),
          isAuthenticated: true,
        });
      },

      seedData: async () => {
        await userRepository.seedDefaultData();
      },

      hasPermission: (permission: PermissionKey) => {
        const state = get();
        if (!state.user) return false;
        if (!state.user.role) return false;
        return state.user.role.permissions.includes(permission);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
