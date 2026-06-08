import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from '@/repositories/customer.repository'
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from '@/repositories/supplier.repository'

export { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier }
export { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer }

export async function searchContacts(
  tenantId: string,
  query: string,
  type: 'customer' | 'supplier' | 'all' = 'all',
) {
  const results: Array<{ id: string; name: string; type: 'customer' | 'supplier'; phone?: string }> = []

  if (type === 'customer' || type === 'all') {
    const { items: customers } = await getCustomers(tenantId)
    for (const c of customers) {
      if (c.name.toLowerCase().includes(query.toLowerCase())) {
        results.push({ id: c.id, name: c.name, type: 'customer', phone: c.phone })
      }
    }
  }

  if (type === 'supplier' || type === 'all') {
    const { items: suppliers } = await getSuppliers(tenantId)
    for (const s of suppliers) {
      if (s.name.toLowerCase().includes(query.toLowerCase())) {
        results.push({ id: s.id, name: s.name, type: 'supplier', phone: s.phone })
      }
    }
  }

  return results
}
