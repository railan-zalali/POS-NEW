import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, Product, ProductUnit } from '@/lib/db/schema';

export interface CartItem {
  id: string; // Unique ID for cart item (not product ID)
  product_id: string;
  product_name: string;
  unit_id: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  notes?: string;
}

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
  drafts: Draft[];

  // Payment State
  payment_method: 'cash' | 'transfer' | 'credit';
  paid_amount: number;
  global_discount: number;
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
  setGlobalDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;
  resetTransaction: () => void;

  // Draft Actions
  saveDraft: (name?: string) => void;
  loadDraft: (draftId: string) => void;
  removeDraft: (draftId: string) => void;

  // Computed (Helper)
  getTotal: () => number;
  getSubtotal: () => number;
  getChange: () => number;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      invoice_number: null,
      transaction_date: new Date(),
      customer: null,
      cart: [],
      drafts: [],
      payment_method: 'cash',
      paid_amount: 0,
      global_discount: 0,
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
      setPaymentMethod: (method) => set({ payment_method: method }),
      setPaidAmount: (amount) => set({ paid_amount: amount }),
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
          global_discount: 0,
          notes: '',
          is_processing: false,
        }),

      saveDraft: (name) => {
        const { cart, customer, drafts } = get();
        if (cart.length === 0) return;

        const newDraft: Draft = {
          id: crypto.randomUUID(),
          name: name,
          customer_id: customer?.id,
          customer_name: customer?.name,
          items: cart,
          created_at: Date.now(),
        };

        set({ drafts: [...drafts, newDraft] });
      },

      loadDraft: (draftId) => {
        const { drafts } = get();
        const draft = drafts.find((d) => d.id === draftId);

        if (draft) {
          // TODO: Ideally we should re-fetch customer object if ID exists
          // For now we just load items. Customer loading needs async or passed customer object
          // We can't fully restore customer object just from ID synchronously here
          // So we might need to store full customer object in draft or fetch it

          set({
            cart: draft.items,
            // customer: ... (need to fetch)
            // For now simple reset
            customer: null,
            drafts: drafts.filter((d) => d.id !== draftId), // Remove from drafts after load? Or keep? Usually remove.
          });
        }
      },

      removeDraft: (draftId) => {
        set({ drafts: get().drafts.filter((d) => d.id !== draftId) });
      },

      getSubtotal: () => {
        return get().cart.reduce((sum, item) => sum + item.subtotal, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        return Math.max(0, subtotal - get().global_discount);
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
        drafts: state.drafts,
        payment_method: state.payment_method,
        notes: state.notes,
      }),
    },
  ),
);
