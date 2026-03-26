import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionMock = vi.fn(async (...args: unknown[]) => {
  const callback = args[args.length - 1] as () => Promise<unknown>;
  return callback();
});

const salesTransactionsAdd = vi.fn();
const salesTransactionItemsBulkAdd = vi.fn();
const productStocksGet = vi.fn();
const productStocksUpdate = vi.fn();
const stockMovementsAdd = vi.fn();
const customersGet = vi.fn();
const customersUpdate = vi.fn();

vi.mock('@/lib/db/dexie', () => ({
  db: {
    transaction: transactionMock,
    sales_transactions: {
      toArray: vi.fn(),
      add: salesTransactionsAdd,
    },
    sales_transaction_items: {
      bulkAdd: salesTransactionItemsBulkAdd,
    },
    product_stocks: {
      get: productStocksGet,
      update: productStocksUpdate,
    },
    product_units: {},
    stock_movements: {
      add: stockMovementsAdd,
    },
    customers: {
      get: customersGet,
      update: customersUpdate,
    },
  },
}));

const allocateStock = vi.fn();
const calculateCOGS = vi.fn();

vi.mock('@/lib/fifo-fefo/stockEngine', () => ({
  stockEngine: {
    allocateStock,
    calculateCOGS,
  },
}));

describe('transactionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    salesTransactionsAdd.mockResolvedValue('tx-1');
    productStocksGet.mockResolvedValue({
      id: 'batch-1',
      batch_number: 'BATCH-1',
      quantity: 10,
      expire_date: undefined,
    });
    allocateStock.mockResolvedValue([{ batchId: 'batch-1', quantity: 2, purchasePrice: 5000 }]);
    calculateCOGS.mockReturnValue(10000);
  });

  it('should persist batch allocation, stock movement reference, and customer credit update', async () => {
    const { transactionRepository } = await import('@/lib/db/transactionRepository');

    customersGet.mockResolvedValue({
      id: 'cust-1',
      credit_limit: 100000,
      outstanding_credit: 10000,
    });

    await transactionRepository.create(
      {
        invoice_number: 'INV-TEST',
        customer_id: 'cust-1',
        cashier_id: 'cashier-1',
        transaction_date: new Date(),
        subtotal: 20000,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 20000,
        paid_amount: 0,
        change_amount: 0,
        payment_method: 'credit',
        status: 'completed',
      },
      [
        {
          product_id: 'prod-1',
          product_unit_id: 'unit-1',
          quantity: 2,
          unit_price: 10000,
          discount_percent: 0,
          discount_amount: 0,
          subtotal: 20000,
        },
      ],
    );

    expect(salesTransactionItemsBulkAdd).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          transaction_id: 'tx-1',
          batch_ids: ['batch-1'],
          batch_allocations: [
            {
              batch_id: 'batch-1',
              quantity: 2,
              purchase_price: 5000,
            },
          ],
          cogs: 10000,
        }),
      ]),
    );
    expect(productStocksUpdate).toHaveBeenCalledWith(
      'batch-1',
      expect.objectContaining({ quantity: 8 }),
    );
    expect(stockMovementsAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        reference_id: 'tx-1',
        movement_type: 'sale',
        quantity_change: -2,
      }),
    );
    expect(customersUpdate).toHaveBeenCalledWith(
      'cust-1',
      expect.objectContaining({ outstanding_credit: 30000 }),
    );
  });

  it('should reject credit transaction that exceeds limit', async () => {
    const { transactionRepository } = await import('@/lib/db/transactionRepository');

    customersGet.mockResolvedValue({
      id: 'cust-1',
      credit_limit: 15000,
      outstanding_credit: 10000,
    });

    await expect(
      transactionRepository.create(
        {
          invoice_number: 'INV-TEST',
          customer_id: 'cust-1',
          cashier_id: 'cashier-1',
          transaction_date: new Date(),
          subtotal: 20000,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 20000,
          paid_amount: 0,
          change_amount: 0,
          payment_method: 'credit',
          status: 'completed',
        },
        [
          {
            product_id: 'prod-1',
            product_unit_id: 'unit-1',
            quantity: 2,
            unit_price: 10000,
            discount_percent: 0,
            discount_amount: 0,
            subtotal: 20000,
          },
        ],
      ),
    ).rejects.toThrow('Limit kredit pelanggan tidak mencukupi untuk transaksi ini.');

    expect(salesTransactionsAdd).not.toHaveBeenCalled();
    expect(customersUpdate).not.toHaveBeenCalled();
  });
});
