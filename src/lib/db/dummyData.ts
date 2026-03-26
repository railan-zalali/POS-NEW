import { db } from './dexie';
import { productRepository } from './productRepository';
import type { Category, Customer, Supplier } from './schema';

export const seedDummyData = async () => {
  return await db.transaction(
    'rw',
    [db.categories, db.products, db.product_units, db.product_stocks, db.customers, db.suppliers],
    async () => {
      // 1. Clear existing data (optional, but good for clean seed)
      await db.categories.clear();
      await db.products.clear();
      await db.product_units.clear();
      await db.product_stocks.clear();
      await db.customers.clear();
      await db.suppliers.clear();

      // 2. Seed Categories
      const categories: Omit<Category, 'id'>[] = [
        { name: 'Pupuk', code: 'PPK', description: 'Berbagai jenis pupuk tanaman' },
        { name: 'Benih', code: 'BNH', description: 'Bibit dan benih unggul' },
        { name: 'Pestisida', code: 'PST', description: 'Obat-obatan pembasmi hama' },
        { name: 'Alat Pertanian', code: 'ALT', description: 'Peralatan pendukung pertanian' },
      ];

      const categoryIds: Record<string, string> = {};
      for (const cat of categories) {
        const id = await db.categories.add({
          ...cat,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as Category);
        categoryIds[cat.name] = id;
      }

      // 3. Seed Suppliers
      const suppliers: Omit<Supplier, 'id'>[] = [
        { code: 'SUP001', name: 'PT Pupuk Indonesia', is_active: true },
        { code: 'SUP002', name: 'Toko Tani Makmur Sentosa', is_active: true },
      ];
      const supplierIds: string[] = [];
      for (const sup of suppliers) {
        const id = await db.suppliers.add({
          ...sup,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as Supplier);
        supplierIds.push(id);
      }

      // 4. Seed Products with Units and Stock
      const productsData = [
        {
          product: {
            code: 'P001',
            name: 'Urea Subsidi',
            category_id: categoryIds['Pupuk'],
            supplier_ids: [supplierIds[0]],
            is_active: true,
          },
          units: [
            {
              unit_name: 'Kg',
              conversion_factor: 1,
              is_base_unit: true,
              purchase_price: 2000,
              selling_price: 2500,
              barcode: '888001',
            },
            {
              unit_name: 'Karung (50kg)',
              conversion_factor: 50,
              is_base_unit: false,
              purchase_price: 100000,
              selling_price: 120000,
              barcode: '888002',
            },
          ],
          stocks: [
            { unitIndex: 1, quantity: 20, purchasePrice: 100000, batch_number: 'B-UREA-01' },
          ],
        },
        {
          product: {
            code: 'P002',
            name: 'NPK Mutiara 16-16-16',
            category_id: categoryIds['Pupuk'],
            supplier_ids: [supplierIds[1]],
            is_active: true,
          },
          units: [
            {
              unit_name: 'Kg',
              conversion_factor: 1,
              is_base_unit: true,
              purchase_price: 15000,
              selling_price: 18000,
              barcode: '888003',
            },
            {
              unit_name: 'Karung (50kg)',
              conversion_factor: 50,
              is_base_unit: false,
              purchase_price: 750000,
              selling_price: 850000,
              barcode: '888004',
            },
          ],
          stocks: [{ unitIndex: 1, quantity: 10, purchasePrice: 750000, batch_number: 'B-NPK-01' }],
        },
        {
          product: {
            code: 'B001',
            name: 'Benih Padi IR64',
            category_id: categoryIds['Benih'],
            supplier_ids: [supplierIds[1]],
            is_active: true,
          },
          units: [
            {
              unit_name: 'Kg',
              conversion_factor: 1,
              is_base_unit: true,
              purchase_price: 10000,
              selling_price: 13000,
              barcode: '888005',
            },
            {
              unit_name: 'Karung (25kg)',
              conversion_factor: 25,
              is_base_unit: false,
              purchase_price: 250000,
              selling_price: 300000,
              barcode: '888006',
            },
          ],
          stocks: [
            { unitIndex: 1, quantity: 15, purchasePrice: 250000, batch_number: 'B-PADI-01' },
          ],
        },
        {
          product: {
            code: 'PST001',
            name: 'Roundup 1L',
            category_id: categoryIds['Pestisida'],
            supplier_ids: [supplierIds[0]],
            is_active: true,
          },
          units: [
            {
              unit_name: 'Botol 1L',
              conversion_factor: 1,
              is_base_unit: true,
              purchase_price: 85000,
              selling_price: 95000,
              barcode: '888007',
            },
          ],
          stocks: [
            { unitIndex: 0, quantity: 50, purchasePrice: 85000, batch_number: 'B-ROUNDUP-01' },
          ],
        },
        {
          product: {
            code: 'ALT001',
            name: 'Cangkul Baja',
            category_id: categoryIds['Alat Pertanian'],
            supplier_ids: [supplierIds[1]],
            is_active: true,
          },
          units: [
            {
              unit_name: 'Pcs',
              conversion_factor: 1,
              is_base_unit: true,
              purchase_price: 45000,
              selling_price: 60000,
              barcode: '888008',
            },
          ],
          stocks: [
            { unitIndex: 0, quantity: 12, purchasePrice: 45000, batch_number: 'B-CANGKUL-01' },
          ],
        },
      ];

      for (const item of productsData) {
        await productRepository.createWithUnits(item.product, item.units, item.stocks);
      }

      // 5. Seed Customers
      const customers: Omit<Customer, 'id'>[] = [
        {
          code: 'CUST001',
          name: 'Pak Tono',
          phone: '08123456789',
          is_active: true,
          credit_limit: 1000000,
          outstanding_credit: 0,
          loyalty_points: 0,
        },
        {
          code: 'CUST002',
          name: 'Ibu Sari',
          phone: '08567890123',
          is_active: true,
          credit_limit: 500000,
          outstanding_credit: 0,
          loyalty_points: 0,
        },
        {
          code: 'CUST003',
          name: 'Kelompok Tani Harapan',
          phone: '08999999999',
          is_active: true,
          credit_limit: 5000000,
          outstanding_credit: 0,
          loyalty_points: 0,
        },
      ];

      for (const cust of customers) {
        await db.customers.add({
          ...cust,
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as Customer);
      }
    },
  );
};
