import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '@/repositories/product.repository'
import { nowISO } from '@/lib/firestore-helpers'
import type { Product } from '@/types'

export async function listProducts(tenantId: string, lastDoc?: any, pageSize = 20) {
  return getProducts(tenantId, lastDoc, pageSize)
}

export async function getProductById(id: string) {
  return getProduct(id)
}

export async function saveProduct(data: Record<string, any>, userId: string) {
  return createProduct(data, userId)
}

export async function modifyProduct(id: string, data: Partial<Product>, userId: string) {
  return updateProduct(id, data, userId)
}

export async function removeProduct(id: string, userId: string) {
  return deleteProduct(id, userId)
}
