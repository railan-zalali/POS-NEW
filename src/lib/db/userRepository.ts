import { db } from './dexie';
import type { User, Role } from './schema';

export const userRepository = {
  async getAll() {
    return await db.users.toArray();
  },

  async getByUsername(username: string) {
    return await db.users.where('username').equals(username).first();
  },

  async getById(id: string) {
    return await db.users.get(id);
  },

  async create(user: Omit<User, 'id'>) {
    return await db.users.add({
      ...user,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as User);
  },

  async update(id: string, updates: Partial<User>) {
    return await db.users.update(id, {
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async delete(id: string) {
    return await db.users.delete(id);
  },

  async getRoleById(roleId: string) {
    return await db.roles.get(roleId);
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

  async updateRole(id: string, updates: Partial<Role>) {
    return await db.roles.update(id, {
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async deleteRole(id: string) {
    // Optional: check if users are assigned to this role before deleting
    const usersCount = await db.users.where('role_id').equals(id).count();
    if (usersCount > 0) {
      throw new Error('Role sedang digunakan oleh pengguna lain.');
    }
    return await db.roles.delete(id);
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
};
