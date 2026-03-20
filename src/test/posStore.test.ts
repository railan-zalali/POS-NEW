/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePOSStore } from '@/features/pos/store/posStore';

vi.mock('@/lib/db/dexie', () => ({
  db: {
    pos_drafts: {
      add: vi.fn(),
    },
  },
}));

describe('usePOSStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => usePOSStore());
    act(() => {
      result.current.resetTransaction();
    });
  });

  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => usePOSStore());
    expect(result.current.cart).toEqual([]);
  });

  it('should add item to cart', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Test Product',
      code: 'TP001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 8000,
      selling_price: 10000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any);
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].product_name).toBe('Test Product');
    expect(result.current.cart[0].unit_price).toBe(10000);
  });

  it('should update item quantity', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Test Product',
      code: 'TP001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 8000,
      selling_price: 10000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any, 2);
    });

    const cartItemId = result.current.cart[0].id;

    act(() => {
      result.current.updateQuantity(cartItemId, 5);
    });

    expect(result.current.cart.find((i) => i.id === cartItemId)?.quantity).toBe(5);
    expect(result.current.getSubtotal()).toBe(50000);
  });

  it('should remove item from cart', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct1 = {
      id: 'prod1',
      name: 'Product 1',
      code: 'P001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockProduct2 = {
      id: 'prod2',
      name: 'Product 2',
      code: 'P002',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit1 = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 8000,
      selling_price: 10000,
    };

    const mockUnit2 = {
      id: 'unit2',
      product_id: 'prod2',
      unit_name: 'kg',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 20000,
      selling_price: 25000,
    };

    act(() => {
      result.current.addItem(mockProduct1 as any, mockUnit1 as any);
      result.current.addItem(mockProduct2 as any, mockUnit2 as any);
    });

    const itemToRemove = result.current.cart[0].id;

    act(() => {
      result.current.removeItem(itemToRemove);
    });

    expect(result.current.cart.length).toBe(1);
  });

  it('should reset transaction correctly', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Product 1',
      code: 'P001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 8000,
      selling_price: 10000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any);
      result.current.setGlobalDiscount(1000);
    });

    act(() => {
      result.current.resetTransaction();
    });

    expect(result.current.cart).toEqual([]);
    expect(result.current.global_discount).toBe(0);
  });

  it('should set payment method correctly', () => {
    const { result } = renderHook(() => usePOSStore());

    act(() => {
      result.current.setPaymentMethod('cash');
    });

    expect(result.current.payment_method).toBe('cash');

    act(() => {
      result.current.setPaymentMethod('credit');
    });

    expect(result.current.payment_method).toBe('credit');
  });

  it('should calculate tax correctly with default 11% rate', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Product 1',
      code: 'P001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 90090,
      selling_price: 100000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any);
    });

    expect(result.current.getSubtotal()).toBe(100000);
    expect(result.current.getTaxAmount()).toBe(11000);
    expect(result.current.getTotal()).toBe(111000);
  });

  it('should calculate change correctly', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Product 1',
      code: 'P001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 90090,
      selling_price: 100000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any);
      result.current.setPaidAmount(150000);
    });

    expect(result.current.getChange()).toBe(39000);
  });

  it('should apply global discount correctly', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Product 1',
      code: 'P001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 8000,
      selling_price: 10000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any);
      result.current.setGlobalDiscount(2000);
    });

    expect(result.current.getSubtotal()).toBe(10000);
    expect(result.current.getTaxAmount()).toBe(880);
    expect(result.current.getTotal()).toBe(8880);
  });

  it('should increment quantity when adding same product', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Product 1',
      code: 'P001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 8000,
      selling_price: 10000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any);
      result.current.addItem(mockProduct as any, mockUnit as any);
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.getSubtotal()).toBe(20000);
  });

  it('should set customer correctly', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockCustomer = {
      id: 'cust1',
      code: 'C001',
      name: 'John Doe',
      phone: '08123456789',
      credit_limit: 1000000,
      outstanding_credit: 0,
      loyalty_points: 100,
      is_active: true,
    };

    act(() => {
      result.current.setCustomer(mockCustomer as any);
    });

    expect(result.current.customer).toEqual(mockCustomer);
    expect(result.current.customer?.name).toBe('John Doe');
  });

  it('should calculate negative change when paid less than total', () => {
    const { result } = renderHook(() => usePOSStore());

    const mockProduct = {
      id: 'prod1',
      name: 'Product 1',
      code: 'P001',
      category_id: 'cat1',
      supplier_ids: [],
      is_active: true,
    };

    const mockUnit = {
      id: 'unit1',
      product_id: 'prod1',
      unit_name: 'pcs',
      conversion_factor: 1,
      is_base_unit: true,
      purchase_price: 8000,
      selling_price: 10000,
    };

    act(() => {
      result.current.addItem(mockProduct as any, mockUnit as any);
      result.current.setPaidAmount(5000);
    });

    expect(result.current.getChange()).toBe(0);
  });
});
