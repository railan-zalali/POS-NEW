import { db } from '../db/dexie';
import type { Expense, ExpenseCategory } from '../db/schema';
import { coerceEntityId } from '@/lib/entityId';
import { queueDeleteInstruction } from '@/lib/supabase/deleteOutbox';

export const expenseRepository = {
  async getAll() {
    return await db.expenses.orderBy('date').reverse().toArray();
  },

  async getById(id: string | number) {
    return await db.expenses.get(coerceEntityId(id));
  },

  async getByDateRange(startDate: Date, endDate: Date) {
    return await db.expenses.where('date').between(startDate, endDate).toArray();
  },

  async getByCategory(category: ExpenseCategory) {
    return await db.expenses.where('category').equals(category).toArray();
  },

  async create(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'sync_status'>) {
    return await db.expenses.add({
      ...expense,
      created_at: new Date(),
      updated_at: new Date(),
      sync_status: 'pending',
    } as Expense);
  },

  async update(id: string | number, changes: Partial<Expense>) {
    return await db.expenses.update(coerceEntityId(id), {
      ...changes,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async delete(id: string | number) {
    const resolvedId = coerceEntityId(id);
    if (resolvedId == null) {
      return;
    }

    return await db.transaction('rw', [db.expenses, db.app_settings], async () => {
      await queueDeleteInstruction('expenses', resolvedId);
      return await db.expenses.delete(resolvedId);
    });
  },

  async getTotalByCategory(startDate: Date, endDate: Date) {
    const expenses = await this.getByDateRange(startDate, endDate);
    const totals: Record<ExpenseCategory, number> = {
      operational: 0,
      electricity: 0,
      water: 0,
      internet: 0,
      rent: 0,
      salary: 0,
      marketing: 0,
      maintenance: 0,
      supplies: 0,
      transportation: 0,
      tax: 0,
      insurance: 0,
      other: 0,
    };

    for (const expense of expenses) {
      totals[expense.category] += expense.amount;
    }

    return totals;
  },
};
