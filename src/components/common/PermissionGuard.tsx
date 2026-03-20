import { useAuthStore } from '@/store/authStore';
import type { PermissionKey } from '@/lib/db/schema';

interface PermissionGuardProps {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = useAuthStore();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequirePermissionProps {
  permission: PermissionKey;
  children: React.ReactNode;
  redirectTo?: string;
}

export function RequirePermission({ permission, children, redirectTo }: RequirePermissionProps) {
  const { hasPermission, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  if (!hasPermission(permission)) {
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    return null;
  }

  return <>{children}</>;
}
