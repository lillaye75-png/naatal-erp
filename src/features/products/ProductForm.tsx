"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUpload } from "@/components/shared/ImageUpload"
import type { Product } from "@/types"

const productSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sku: z.string().min(1, "SKU requis"),
  price: z.coerce.number().min(0, "Prix invalide"),
  costPrice: z.coerce.number().min(0, "Prix de revient invalide"),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  minStock: z.coerce.number().min(0).default(0),
  barcode: z.string().optional(),
  imageUrl: z.string().optional(),
  isSoldOnline: z.boolean().default(false),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product | null
  onSubmit: (data: ProductFormValues) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
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
          minStock: product.minStock,
          barcode: product.barcode,
          imageUrl: product.imageUrl || '',
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
          isSoldOnline: false,
        },
  })

  const imageUrl = watch('imageUrl')
  const isSoldOnline = watch('isSoldOnline')

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
          <Label htmlFor="unitId">Unité</Label>
          <Select
            value={product?.unitId || ""}
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
