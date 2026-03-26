import { db } from './dexie';
import type { User, Role } from './schema';
import { coerceEntityId, sameEntityId } from '@/lib/entityId';
import { hashPin, verifyPin as verifyPinHash } from '@/lib/security/pin';
import { queueDeleteInstruction } from '@/lib/supabase/deleteOutbox';

export const userRepository = {
  async getAll() {
    return await db.users.toArray();
  },

  async getByUsername(username: string) {
    return await db.users.where('username').equals(username).first();
  },

  async getById(id: string | number) {
    return await db.users.get(coerceEntityId(id));
  },

  async create(user: Omit<User, 'id'>) {
    const pin = user.pin?.trim() ? await hashPin(user.pin) : undefined;
    return await db.users.add({
      ...user,
      ...(pin ? { pin } : {}),
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as User);
  },

  async update(id: string | number, updates: Partial<User>) {
    const nextUpdates = { ...updates } as Partial<User>;

    if (typeof nextUpdates.pin === 'string') {
      if (nextUpdates.pin.trim() === '') {
        delete nextUpdates.pin;
      } else {
        nextUpdates.pin = await hashPin(nextUpdates.pin);
      }
    }

    return await db.users.update(coerceEntityId(id), {
      ...nextUpdates,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async delete(id: string | number) {
    const resolvedId = coerceEntityId(id);
    if (resolvedId == null) {
      return;
    }

    return await db.transaction('rw', [db.users, db.app_settings], async () => {
      await queueDeleteInstruction('users', resolvedId);
      return await db.users.delete(resolvedId);
    });
  },

  async getRoleById(roleId: string | number) {
    const resolvedRoleId = coerceEntityId(roleId);
    if (resolvedRoleId == null) {
      return undefined;
    }

    return await db.roles.get(resolvedRoleId);
  },

  async getAllRoles() {
    return await db.roles.toArray();
  },

  async createRole(role: Omit<Role, 'id'>) {
    return await db.roles.add({
      ...role,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as Role);
  },

  async updateRole(id: string | number, updates: Partial<Role>) {
    return await db.roles.update(coerceEntityId(id), {
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async deleteRole(id: string | number) {
    const resolvedId = coerceEntityId(id);
    if (resolvedId == null) {
      return;
    }
    // Optional: check if users are assigned to this role before deleting
    const usersCount = (await db.users.toArray()).filter((user) =>
      sameEntityId(user.role_id, resolvedId),
    ).length;
    if (usersCount > 0) {
      throw new Error('Role sedang digunakan oleh pengguna lain.');
    }

    return await db.transaction('rw', [db.roles, db.app_settings], async () => {
      await queueDeleteInstruction('roles', resolvedId);
      return await db.roles.delete(resolvedId);
    });
  },

  async seedDefaultData() {
    // Check if roles exist
    const rolesCount = await db.roles.count();
    if (rolesCount === 0) {
      // Create default roles
      const adminRoleId = await this.createRole({
        name: 'Admin',
        permissions: [
          'pos:read',
          'pos:create',
          'pos:edit',
          'pos:delete',
          'pos:void',
          'purchase:read',
          'purchase:create',
          'purchase:edit',
          'purchase:approve',
          'product:read',
          'product:create',
          'product:edit',
          'product:delete',
          'customer:read',
          'customer:create',
          'customer:edit',
          'supplier:read',
          'supplier:create',
          'supplier:edit',
          'report:view',
          'report:export',
          'user:read',
          'user:create',
          'user:edit',
          'user:delete',
          'settings:read',
          'settings:edit',
          'stock:read',
          'stock:adjust',
        ],
      });

      await this.createRole({
        name: 'Kasir',
        permissions: [
          'pos:read',
          'pos:create',
          'product:read',
          'customer:read',
          'customer:create',
          'stock:read',
        ],
      });

      // Create default admin user
      await this.create({
        username: 'admin',
        full_name: 'Administrator',
        role_id: adminRoleId as string, // Dexie returns ID as generic type
        pin: '123456', // Default PIN
        is_active: true,
      });
    }
  },

  async verifyPin(storedPin: string | undefined, candidatePin: string) {
    return await verifyPinHash(storedPin, candidatePin);
  },
};
