import { 
  pgTable, 
  pgEnum, 
  uuid, 
  text, 
  timestamp, 
  boolean, 
  numeric, 
  jsonb, 
  index, 
  uniqueIndex 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['admin', 'seller', 'buyer']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'approved', 'rejected']);
export const productStatusEnum = pgEnum('product_status', ['draft', 'pending_review', 'approved', 'rejected']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
export const quotationStatusEnum = pgEnum('quotation_status', ['pending', 'approved', 'rejected', 'converted']);
export const dimensionTypeEnum = pgEnum('dimension_type', ['weight', 'volume', 'count']);
export const unitTypeEnum = pgEnum('unit_type', ['g', 'kg', 'mL', 'L', 'item']);
export const inventoryTransactionTypeEnum = pgEnum('inventory_transaction_type', [
  'stock_added', 
  'stock_removed', 
  'order', 
  'quotation_reservation', 
  'quotation_release', 
  'adjustment'
]);
export const referenceTypeEnum = pgEnum('reference_type', ['product', 'quotation', 'order', 'admin_adjustment']);

// --- TABLES ---

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('buyer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email)
]);

// 2. Seller Profiles Table
export const sellerProfiles = pgTable('seller_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  businessName: text('business_name').notNull(),
  gstNumber: text('gst_number').notNull(),
  drugLicenseNumber: text('drug_license_number'),
  address: text('address').notNull(),
  verificationStatus: verificationStatusEnum('verification_status').default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectedBy: uuid('rejected_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('seller_profiles_verification_status_idx').on(table.verificationStatus)
]);

// 3. Seller Documents Table (stored in Vercel Blob)
export const sellerDocuments = pgTable('seller_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerProfileId: uuid('seller_profile_id').references(() => sellerProfiles.id, { onDelete: 'cascade' }).notNull(),
  documentType: text('document_type').notNull(), // 'gst_certificate' | 'drug_license' | 'pan_card' | 'business_registration' | 'other'
  documentUrl: text('document_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Categories Table
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('categories_name_idx').on(table.name)
]);

// 5. Products Table
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerProfileId: uuid('seller_profile_id').references(() => sellerProfiles.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  sku: text('sku').notNull(),
  dimensionType: dimensionTypeEnum('dimension_type').notNull(),
  baseUnit: unitTypeEnum('base_unit').notNull(),
  inventoryQuantity: numeric('inventory_quantity', { precision: 30, scale: 10 }).default('0.0000000000').notNull(),
  reservedQuantity: numeric('reserved_quantity', { precision: 30, scale: 10 }).default('0.0000000000').notNull(),
  pricePerBaseUnit: numeric('price_per_base_unit', { precision: 30, scale: 10 }).notNull(),
  productStatus: productStatusEnum('product_status').default('draft').notNull(),
  rejectionReason: text('rejection_reason'),
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('products_name_idx').on(table.name),
  uniqueIndex('products_sku_idx').on(table.sku),
  index('products_category_id_idx').on(table.categoryId),
  index('products_seller_id_idx').on(table.sellerProfileId),
  index('products_status_idx').on(table.productStatus)
]);

// 6. Inventory Transactions Ledger Table
export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: numeric('quantity', { precision: 30, scale: 10 }).notNull(), // positive for additions, negative for removals
  transactionType: inventoryTransactionTypeEnum('transaction_type').notNull(),
  referenceType: referenceTypeEnum('reference_type').notNull(),
  referenceId: uuid('reference_id'), // points to orderId, quotationId, etc.
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Quotations Table
export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: quotationStatusEnum('status').default('pending').notNull(),
  totalAmount: numeric('total_amount', { precision: 30, scale: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('quotations_status_idx').on(table.status)
]);

// 8. Quotation Items Table
export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  enteredQuantity: numeric('entered_quantity', { precision: 30, scale: 10 }).notNull(),
  enteredUnit: unitTypeEnum('entered_unit').notNull(),
  convertedQuantity: numeric('converted_quantity', { precision: 30, scale: 10 }).notNull(),
  internalUnit: unitTypeEnum('internal_unit').notNull(),
  unitPrice: numeric('unit_price', { precision: 30, scale: 10 }).notNull(), // snapshotted at request
  totalPrice: numeric('total_price', { precision: 30, scale: 10 }).notNull(), // snapshotted total
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Orders Table
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  quotationId: uuid('quotation_id').references(() => quotations.id), // trace back to source quotation if any
  status: orderStatusEnum('status').default('pending').notNull(),
  totalAmount: numeric('total_amount', { precision: 30, scale: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('orders_status_idx').on(table.status)
]);

// 10. Order Items Table
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  enteredQuantity: numeric('entered_quantity', { precision: 30, scale: 10 }).notNull(),
  enteredUnit: unitTypeEnum('entered_unit').notNull(),
  convertedQuantity: numeric('converted_quantity', { precision: 30, scale: 10 }).notNull(),
  internalUnit: unitTypeEnum('internal_unit').notNull(),
  unitPrice: numeric('unit_price', { precision: 30, scale: 10 }).notNull(), // snapshotted at purchase
  totalPrice: numeric('total_price', { precision: 30, scale: 10 }).notNull(), // snapshotted total
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: text('action').notNull(), // e.g., 'seller_registered', 'gst_uploaded', etc.
  entityType: text('entity_type').notNull(), // e.g., 'user', 'seller_profile', 'product', 'order'
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// --- RELATIONS ---

export const usersRelations = relations(users, ({ one, many }) => ({
  sellerProfile: one(sellerProfiles, {
    fields: [users.id],
    references: [sellerProfiles.userId],
  }),
  activityLogs: many(activityLogs),
  quotations: many(quotations),
  orders: many(orders),
}));

export const sellerProfilesRelations = relations(sellerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [sellerProfiles.userId],
    references: [users.id],
  }),
  documents: many(sellerDocuments),
  products: many(products),
}));

export const sellerDocumentsRelations = relations(sellerDocuments, ({ one }) => ({
  sellerProfile: one(sellerProfiles, {
    fields: [sellerDocuments.sellerProfileId],
    references: [sellerProfiles.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  sellerProfile: one(sellerProfiles, {
    fields: [products.sellerProfileId],
    references: [sellerProfiles.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inventoryTransactions: many(inventoryTransactions),
  quotationItems: many(quotationItems),
  orderItems: many(orderItems),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  product: one(products, {
    fields: [inventoryTransactions.productId],
    references: [products.id],
  }),
  creator: one(users, {
    fields: [inventoryTransactions.createdBy],
    references: [users.id],
  }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  buyer: one(users, {
    fields: [quotations.buyerId],
    references: [users.id],
  }),
  items: many(quotationItems),
  order: one(orders, {
    fields: [quotations.id],
    references: [orders.quotationId],
  }),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  product: one(products, {
    fields: [quotationItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  quotation: one(quotations, {
    fields: [orders.quotationId],
    references: [quotations.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
