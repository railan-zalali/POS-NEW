import { describe, it, expect } from 'vitest';
import { stockEngine, type StockAllocation } from '@/lib/fifo-fefo/stockEngine';

describe('stockEngine', () => {
  describe('calculateCOGS', () => {
    it('should calculate total COGS correctly', () => {
      const allocation: StockAllocation[] = [
        { batchId: 'batch1', quantity: 10, purchasePrice: 1000 },
        { batchId: 'batch2', quantity: 5, purchasePrice: 1200 },
      ];

      const cogs = stockEngine.calculateCOGS(allocation);

      expect(cogs).toBe(10 * 1000 + 5 * 1200);
    });

    it('should return 0 for empty allocation', () => {
      const allocation: StockAllocation[] = [];

      const cogs = stockEngine.calculateCOGS(allocation);

      expect(cogs).toBe(0);
    });

    it('should handle single batch correctly', () => {
      const allocation: StockAllocation[] = [
        { batchId: 'batch1', quantity: 100, purchasePrice: 5000 },
      ];

      const cogs = stockEngine.calculateCOGS(allocation);

      expect(cogs).toBe(100 * 5000);
    });

    it('should handle decimal quantities', () => {
      const allocation: StockAllocation[] = [
        { batchId: 'batch1', quantity: 2.5, purchasePrice: 10000 },
      ];

      const cogs = stockEngine.calculateCOGS(allocation);

      expect(cogs).toBe(25000);
    });
  });
});
