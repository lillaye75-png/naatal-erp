export interface BaseDocument {
  id: string
  tenantId: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  isDeleted: boolean
  status: string
}

export interface Tenant {
  id: string
  name: string
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
  currency: string
  country: string
  logoUrl: string
  language: 'fr' | 'en' | 'wo'
  locale: string
  sector?: string
  onboardingCompleted?: boolean
}

export interface User {
  id: string
  email: string
  displayName: string
  tenantId: string
  roleId: string
  phone: string
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  tenantId: string
}

export interface Settings {
  id: string
  taxRate: number
  invoicePrefix: string
  theme: string
  language: string
  waveApiKey: string
  orangeMoneyKey: string
  tenantId: string
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  price: number
  costPrice: number
  categoryId: string
  brandId: string
  unitId: string
  imageUrl: string
  minStock: number
  warehouseId: string
  isSoldOnline: boolean
  description: string
}

export interface Category {
  id: string
  name: string
  parentId: string
  color: string
  tenantId: string
}

export interface Brand {
  id: string
  name: string
  logoUrl: string
}

export interface Unit {
  id: string
  name: string
  symbol: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  groupId: string
  creditLimit: number
  totalDebt: number
  language: string
}

export interface CustomerGroup {
  id: string
  name: string
  discountPercent: number
}

export interface Supplier {
  id: string
  name: string
  phone: string
  email: string
  address: string
  totalOwed: number
  paymentTerms: string
}

export interface Sale extends BaseDocument {
  customerId: string
  items: SaleItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  amountPaid: number
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING'
  invoiceId: string
  paymentMethod: 'CASH' | 'WAVE' | 'OM' | 'CARD' | 'DEBT'
  note: string
  cashRegisterId: string
  invoiceType: 'INVOICE' | 'PROFORMA' | 'QUOTATION' | 'CREDIT_NOTE'
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  name?: string
  qty: number
  unitPrice: number
  total: number
}

export interface Invoice extends BaseDocument {
  number: string
  saleId: string
  customerId: string
  total: number
  dueDate: string
  printCount: number
  whatsappSent: boolean
  invoiceType: 'INVOICE' | 'PROFORMA' | 'QUOTATION' | 'CREDIT_NOTE'
}

export interface Payment {
  id: string
  tenantId: string
  saleId: string
  invoiceId: string
  amount: number
  method: 'CASH' | 'WAVE' | 'OM' | 'CARD' | 'DEBT'
  reference: string
  cashRegisterId: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  items: PurchaseItem[]
  total: number
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED'
  expectedDate: string
}

export interface PurchaseItem {
  id: string
  purchaseId: string
  productId: string
  qty: number
  unitCost: number
  total: number
}

export interface InventoryMovement {
  id: string
  productId: string
  type: 'SALE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER'
  qty: number
  balance: number
  note: string
  referenceId: string
  warehouseId: string
  createdAt?: string
}

export interface StockAdjustment {
  id: string
  productId: string
  reason: string
  qtyBefore: number
  qtyAfter: number
  userId: string
}

export interface Warehouse {
  id: string
  name: string
  location: string
  isPrimary: boolean
}

export interface CashRegister {
  id: string
  name: string
  userId: string
  openedAt: string
  closedAt: string
  openingBalance: number
  closingBalance: number
  difference: number
}

export interface CashMovement {
  id: string
  registerId: string
  type: 'IN' | 'OUT'
  amount: number
  reason: string
  saleId: string
}

export interface Expense {
  id: string
  category: string
  amount: number
  description: string
  date: string
  receipt: string
}

export interface Account {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'
  tenantId: string
}

export interface JournalEntry {
  id: string
  accountId: string
  type: 'DEBIT' | 'CREDIT'
  amount: number
  referenceId: string
}

export interface Storefront {
  id: string
  tenantId: string
  slug: string
  name: string
  phone: string
  tagline: string
  theme: string
  isActive: boolean
}

export interface Order {
  id: string
  trackingId: string
  storefrontId: string
  tenantId: string
  items: OrderItem[]
  total: number
  status: 'PENDING' | 'CONFIRMED' | 'ACCEPTED' | 'REFUSED' | 'DELIVERED' | 'CANCELLED'
  customerPhone: string
  customerName: string
  source: string
  paymentMethod: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string
  name: string
  price: number
  qty: number
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entity: string
  entityId: string
  before: unknown
  after: unknown
  device: string
  ip: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  isRead: boolean
  link: string
  createdAt: string
}

export interface Counter {
  id: string
  invoiceCounter: number
}

export interface OfflineQueue {
  id: string
  tenantId: string
  action: string
  payload: unknown
  createdAt: string
  syncedAt: string
}
