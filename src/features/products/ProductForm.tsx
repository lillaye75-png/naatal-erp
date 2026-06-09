"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUpload } from "@/components/shared/ImageUpload"
import { useAuthStore } from "@/stores/auth.store"
import { getCategories, getBrands } from "@/repositories/product.repository"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import type { Product, Category, Brand, Warehouse } from "@/types"

const productSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sku: z.string().min(1, "SKU requis"),
  price: z.coerce.number().min(0, "Prix invalide"),
  costPrice: z.coerce.number().min(0, "Prix de revient invalide"),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  warehouseId: z.string().optional(),
  minStock: z.coerce.number().min(0).default(0),
  initialStock: z.coerce.number().min(0).default(0),
  barcode: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  isSoldOnline: z.boolean().default(false),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product | null
  onSubmit: (data: ProductFormValues) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  useEffect(() => {
    if (!tenantId) return
    getCategories(tenantId).then(setCategories)
    getBrands(tenantId).then(setBrands)
    initializeFirebase().then(({ db }) =>
      getDocs(query(collection(db, 'warehouses'), where('tenantId', '==', tenantId)))
        .then((snap) => setWarehouses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Warehouse))))
    )
  }, [tenantId])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          price: product.price,
          costPrice: product.costPrice,
          categoryId: product.categoryId,
          brandId: product.brandId,
          unitId: product.unitId,
          warehouseId: product.warehouseId,
          minStock: product.minStock,
          initialStock: 0,
          barcode: product.barcode,
          imageUrl: product.imageUrl || '',
          description: product.description || '',
          isSoldOnline: product.isSoldOnline ?? false,
        }
      : {
          name: "",
          sku: "",
          price: 0,
          costPrice: 0,
          minStock: 0,
          barcode: "",
          imageUrl: "",
          description: "",
          isSoldOnline: false,
        },
  })

  const imageUrl = watch('imageUrl')
  const isSoldOnline = watch('isSoldOnline')
  const warehouseId = watch('warehouseId')
  const categoryId = watch('categoryId')
  const brandId = watch('brandId')
  const unitId = watch('unitId')

  return (
    <form method="POST" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ImageUpload
        value={imageUrl || ''}
        onChange={(url) => setValue('imageUrl', url)}
      />
      <div className="space-y-1">
        <Label>Ou URL de l'image</Label>
        <Input
          value={imageUrl || ''}
          onChange={(e) => setValue('imageUrl', e.target.value)}
          placeholder="https://exemple.com/image.jpg"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nom du produit</Label>
        <Input id="name" {...register("name")} placeholder="Ex: Huile d'olive 1L" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" {...register("sku")} placeholder="Ex: HUILE-001" />
          {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Code-barres</Label>
          <Input id="barcode" {...register("barcode")} placeholder="Optionnel" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Prix de vente (FCFA)</Label>
          <Input id="price" type="number" {...register("price")} placeholder="0" />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="costPrice">Prix de revient (FCFA)</Label>
          <Input id="costPrice" type="number" {...register("costPrice")} placeholder="0" />
          {errors.costPrice && <p className="text-xs text-destructive">{errors.costPrice.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minStock">Stock minimum</Label>
          <Input id="minStock" type="number" {...register("minStock")} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="initialStock">Stock initial</Label>
          <Input id="initialStock" type="number" {...register("initialStock")} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="warehouseId">Entrepôt</Label>
          <Select
            value={warehouseId || ""}
            onValueChange={(v) => setValue("warehouseId", v || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Catégorie</Label>
          <Select
            value={categoryId || ""}
            onValueChange={(v) => setValue("categoryId", v || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandId">Marque</Label>
          <Select
            value={brandId || ""}
            onValueChange={(v) => setValue("brandId", v || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="unitId">Unité</Label>
        <Select
          value={unitId || ""}
          onValueChange={(v) => {
            const val = v ?? ""
            setValue("unitId", val || undefined)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="piece">Pièce</SelectItem>
            <SelectItem value="kg">Kg</SelectItem>
            <SelectItem value="l">Litre</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} placeholder="Description du produit (optionnelle)" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isSoldOnline}
          onChange={(e) => setValue('isSoldOnline', e.target.checked)}
          className="rounded"
        />
        <span className="text-sm font-medium">Vente en ligne</span>
      </label>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : product ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  )
}
