import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userRepository } from '@/lib/db/userRepository';
import type { User, Role, PermissionKey } from '@/lib/db/schema';

interface AuthState {
  user: (User & { role?: Role }) | null;
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

          if (user.pin !== pin) {
            set({ error: 'PIN salah', isLoading: false });
            return false;
          }

          if (!user.is_active) {
            set({ error: 'Akun dinonaktifkan', isLoading: false });
            return false;
          }

          const role = await userRepository.getRoleById(user.role_id);

          set({
            user: { ...user, role: role || undefined },
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (err) {
          console.error(err);
          set({ error: 'Terjadi kesalahan saat login', isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {},

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
