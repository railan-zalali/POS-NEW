import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userRepository } from '@/lib/db/userRepository';
import type { User, Role } from '@/lib/db/schema';

interface AuthState {
  user: (User & { role?: Role }) | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, pin: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  seedData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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

          // In real app, verify hashed PIN. For now simple comparison
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

      checkAuth: async () => {
        // Implementation for checking valid session if using tokens
        // For local-first, we trust the persisted state but could re-validate user existence
      },

      seedData: async () => {
        await userRepository.seedDefaultData();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
