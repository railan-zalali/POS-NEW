import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db/dexie';
import type { Customer, Product, ProductUnit, CartItem } from '@/lib/db/schema';
import { coerceEntityId } from '@/lib/entityId';

export interface Draft {
  id: string;
  name?: string;
  customer_id?: string;
  customer_name?: string;
  items: CartItem[];
  created_at: number;
}

interface POSState {
  // Transaction State
  invoice_number: string | null;
  transaction_date: Date;
  customer: Customer | null;
  cart: CartItem[];
  // drafts: Draft[]; // Removed from state, now in Dexie

  // Payment State
  payment_method: 'cash' | 'transfer' | 'credit';
  paid_amount: number;
  payment_reference: string;
  due_date: string | null;
  global_discount: number;
  tax_rate: number; // Percentage, e.g., 11
  notes: string;

  // UI State
  is_processing: boolean;

  // Actions
  addItem: (product: Product, unit: ProductUnit, qty?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, qty: number) => void;
  updateItemDiscount: (cartItemId: string, discount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: 'cash' | 'transfer' | 'credit') => void;
  setPaidAmount: (amount: number) => void;
  setPaymentReference: (reference: string) => void;
  setDueDate: (dueDate: string | null) => void;
  setGlobalDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;
  resetTransaction: () => void;

  // Draft Actions
  saveDraft: (name?: string) => Promise<void>;
  loadDraft: (items: CartItem[], customerId?: string, notes?: string) => void;
  // removeDraft is now handled directly by components via Dexie

  // Computed (Helper)
  getTotal: () => number;
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getChange: () => number;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      invoice_number: null,
      transaction_date: new Date(),
      customer: null,
      cart: [],
      payment_method: 'cash',
      paid_amount: 0,
      payment_reference: '',
      due_date: null,
      global_discount: 0,
      tax_rate: 11, // Default 11% PPN
      notes: '',
      is_processing: false,

      addItem: (product, unit, qty = 1) => {
        const { cart } = get();
        // Check if same product+unit exists
        const existingItemIndex = cart.findIndex(
          (item) => item.product_id === product.id && item.unit_id === unit.id,
        );

        if (existingItemIndex > -1) {
          // Update quantity
          const newCart = [...cart];
          const item = newCart[existingItemIndex];
          item.quantity += qty;
          item.subtotal = item.unit_price * item.quantity - item.discount_amount;
          set({ cart: newCart });
        } else {
          // Add new item
          const newItem: CartItem = {
            id: crypto.randomUUID(),
            product_id: product.id!,
            product_name: product.name,
            unit_id: unit.id!,
            unit_name: unit.unit_name,
            quantity: qty,
            unit_price: unit.selling_price,
            discount_amount: 0,
            subtotal: unit.selling_price * qty,
          };
          set({ cart: [...cart, newItem] });
        }
      },

      removeItem: (cartItemId) => {
        set({ cart: get().cart.filter((item) => item.id !== cartItemId) });
      },

      updateQuantity: (cartItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(cartItemId);
          return;
        }

        const newCart = get().cart.map((item) => {
          if (item.id === cartItemId) {
            return {
              ...item,
              quantity: qty,
              subtotal: item.unit_price * qty - item.discount_amount,
            };
          }
          return item;
        });
        set({ cart: newCart });
      },

      updateItemDiscount: (cartItemId, discount) => {
        const newCart = get().cart.map((item) => {
          if (item.id === cartItemId) {
            return {
              ...item,
              discount_amount: discount,
              subtotal: item.unit_price * item.quantity - discount,
            };
          }
          return item;
        });
        set({ cart: newCart });
      },

      setCustomer: (customer) => set({ customer }),
      setPaymentMethod: (method) =>
        set((state) => {
          const nextState: Partial<POSState> = {
            payment_method: method,
          };

          if (method === 'transfer') {
            nextState.paid_amount = get().getTotal();
            nextState.due_date = null;
          }

          if (method === 'credit') {
            const nextDueDate = state.due_date
              ? state.due_date
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

            nextState.paid_amount = 0;
            nextState.payment_reference = '';
            nextState.due_date = nextDueDate;
          }

          if (method === 'cash') {
            nextState.payment_reference = '';
            nextState.due_date = null;
          }

          return nextState as POSState;
        }),
      setPaidAmount: (amount) => set({ paid_amount: amount }),
      setPaymentReference: (reference) => set({ payment_reference: reference }),
      setDueDate: (dueDate) => set({ due_date: dueDate }),
      setGlobalDiscount: (discount) => set({ global_discount: discount }),
      setNotes: (notes) => set({ notes }),

      resetTransaction: () =>
        set({
          invoice_number: null,
          transaction_date: new Date(),
          customer: null,
          cart: [],
          payment_method: 'cash',
          paid_amount: 0,
          payment_reference: '',
          due_date: null,
          global_discount: 0,
          tax_rate: 11,
          notes: '',
          is_processing: false,
        }),

      saveDraft: async (name) => {
        const { cart, customer, getTotal, getSubtotal, notes } = get();
        if (cart.length === 0) return;

        await db.pos_drafts.add({
          name: name,
          customer_id: customer?.id,
          customer_name: customer?.name,
          items: cart,
          subtotal: getSubtotal(),
          total: getTotal(),
          notes: notes,
          created_at: new Date(),
        });
      },

      loadDraft: async (items, customerId, notes) => {
        const customer = customerId ? await db.customers.get(coerceEntityId(customerId)) : null;

        set({
          cart: items,
          customer: customer ?? null,
          payment_method: 'cash',
          paid_amount: 0,
          payment_reference: '',
          due_date: null,
          notes: notes ?? '',
        });
      },

      getSubtotal: () => {
        return get().cart.reduce((sum, item) => sum + item.subtotal, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const afterDiscount = Math.max(0, subtotal - get().global_discount);
        const tax = (afterDiscount * get().tax_rate) / 100;
        return Math.ceil(afterDiscount + tax);
      },

      getTaxAmount: () => {
        const subtotal = get().getSubtotal();
        const afterDiscount = Math.max(0, subtotal - get().global_discount);
        return (afterDiscount * get().tax_rate) / 100;
      },

      getChange: () => {
        const total = get().getTotal();
        return Math.max(0, get().paid_amount - total);
      },
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        cart: state.cart,
        customer: state.customer,
        payment_method: state.payment_method,
        payment_reference: state.payment_reference,
        due_date: state.due_date,
        notes: state.notes,
      }),
    },
  ),
);
