import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories, getBrands, getUnits } from '@/repositories/product.repository'
import type { Product } from '@/types'

export function useProducts() {
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const fetchProducts = useCallback(async (lastDoc?: any, pageSize?: number) => {
    if (!tenantId) return { items: [], lastDoc: null, hasMore: false }
    return getProducts(tenantId, lastDoc, pageSize)
  }, [tenantId])

  const fetchProduct = async (id: string) => {
    return getProduct(id)
  }

  const addProduct = useCallback(async (data: Record<string, any>, userId: string) => {
    if (!tenantId) throw new Error('Tenant non trouvé')
    return createProduct({ ...data, tenantId }, userId)
  }, [tenantId])

  const editProduct = useCallback(async (id: string, data: Partial<Product>, userId: string) => {
    return updateProduct(id, data, userId)
  }, [])

  const removeProduct = useCallback(async (id: string, userId: string) => {
    return deleteProduct(id, userId)
  }, [])

  const fetchCategories = useCallback(async () => {
    if (!tenantId) return []
    return getCategories(tenantId)
  }, [tenantId])

  const fetchBrands = async () => {
    return getBrands(tenantId)
  }

  const fetchUnits = async () => {
    return getUnits(tenantId)
  }

  return {
    fetchProducts,
    fetchProduct,
    addProduct,
    editProduct,
    removeProduct,
    fetchCategories,
    fetchBrands,
    fetchUnits,
  }
}
