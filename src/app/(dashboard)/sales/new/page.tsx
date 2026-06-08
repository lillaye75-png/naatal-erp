"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Search, Plus, Minus, Trash2, ShoppingCart, ChevronDown } from "lucide-react"

import { useAuthStore } from "@/stores/auth.store"
import { getProducts } from "@/repositories/product.repository"
import { getCustomers } from "@/repositories/customer.repository"
import { createSale } from "@/services/sale.service"
import { formatXOF } from "@/lib/currency"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { EmptyState } from "@/components/shared/EmptyState"

import type { Product, Customer } from "@/types"

const paymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "WAVE", "OM", "DEBT"]),
  amountPaid: z.number().min(0, "Le montant doit être positif"),
})

type PaymentForm = z.infer<typeof paymentSchema>

interface CartItem {
  productId: string
  name: string
  qty: number
  unitPrice: number
  total: number
}

export default function NewSalePage() {
  const router = useRouter()
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [customersError, setCustomersError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [invoiceType, setInvoiceType] = useState<'INVOICE' | 'PROFORMA' | 'QUOTATION' | 'CREDIT_NOTE'>('INVOICE')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "CASH",
      amountPaid: 0,
    },
  })

  const paymentMethod = watch("paymentMethod")
  const amountPaid = watch("amountPaid")

  useEffect(() => {
    if (!tenantId) { setLoadingProducts(false); return }
    setLoadingProducts(true)
    setProductsError(null)
    getProducts(tenantId)
      .then((res) => setProducts(res.items))
      .catch((err) => setProductsError(err instanceof Error ? err.message : "Erreur lors du chargement des produits"))
      .finally(() => setLoadingProducts(false))
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) { setLoadingCustomers(false); return }
    setLoadingCustomers(true)
    setCustomersError(null)
    getCustomers(tenantId)
      .then((res) => setCustomers(res.items))
      .catch((err) => setCustomersError(err instanceof Error ? err.message : "Erreur lors du chargement des clients"))
      .finally(() => setLoadingCustomers(false))
  }, [tenantId])

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    const term = searchTerm.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term),
    )
  }, [products, searchTerm])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers
    const term = customerSearch.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term),
    )
  }, [customers, customerSearch])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.unitPrice }
            : item,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPrice: product.price,
          total: product.price,
        },
      ]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) return
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty, total: qty * item.unitPrice }
          : item,
      ),
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart])

  const tax = useMemo(() => {
    const afterDiscount = subtotal - discount
    return afterDiscount > 0 ? afterDiscount * 0.18 : 0
  }, [subtotal, discount])

  const total = useMemo(() => Math.max(0, subtotal - discount + tax), [subtotal, discount, tax])

  const getPaymentStatus = (paid: number, tot: number): "PAID" | "PARTIAL" | "UNPAID" => {
    if (paid >= tot) return "PAID"
    if (paid > 0) return "PARTIAL"
    return "UNPAID"
  }

  const onSubmit = async (paymentData: PaymentForm) => {
    if (!tenantId || !userId) {
      toast.error("Session invalide")
      return
    }
    if (!selectedCustomer) {
      toast.error("Veuillez sélectionner un client")
      return
    }
    if (cart.length === 0) {
      toast.error("Veuillez ajouter des produits au panier")
      return
    }

    setSubmitting(true)
    try {
      const result = await createSale({
        customerId: selectedCustomer.id,
        items: cart.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: paymentData.paymentMethod,
        amountPaid: paymentData.paymentMethod === "DEBT" ? 0 : paymentData.amountPaid,
        tenantId,
        userId,
        invoiceType,
      })
      const label = invoiceType === 'PROFORMA' ? 'Pro Forma' : invoiceType === 'QUOTATION' ? 'Devis' : invoiceType === 'CREDIT_NOTE' ? 'Avoir' : 'Facture'
      toast.success(`${label} créée avec succès — ${result.invoiceNumber}`)
      router.push("/sales")
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création de la vente")
    } finally {
      setSubmitting(false)
    }
  }

  if (!tenantId || !userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Authentification requise</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Type de document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={invoiceType}
              onValueChange={(v) => setInvoiceType(v as typeof invoiceType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INVOICE">Facture</SelectItem>
                <SelectItem value="PROFORMA">Pro Forma</SelectItem>
                <SelectItem value="QUOTATION">Devis</SelectItem>
                <SelectItem value="CREDIT_NOTE">Avoir</SelectItem>
              </SelectContent>
            </Select>
            {(invoiceType === 'PROFORMA' || invoiceType === 'QUOTATION') && (
              <p className="text-xs text-muted-foreground">
                Aucun mouvement de stock ne sera créé.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" className="w-full justify-between" />
                }
              >
                {selectedCustomer ? selectedCustomer.name : "Sélectionner un client"}
                <ChevronDown className="size-4" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rechercher un client</DialogTitle>
                </DialogHeader>
                <Input
                  placeholder="Rechercher par nom, téléphone ou email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="mb-2"
                  autoFocus
                />
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {customersError ? (
                    <p className="text-sm text-destructive p-2">{customersError}</p>
                  ) : loadingCustomers ? (
                    <p className="text-sm text-muted-foreground p-2">Chargement...</p>
                  ) : filteredCustomers.length === 0 ? (
                    <EmptyState
                      title="Aucun client trouvé"
                      description={
                        customerSearch
                          ? "Essayez un autre terme de recherche"
                          : "Aucun client enregistré"
                      }
                    />
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setCustomerDialogOpen(false)
                          setCustomerSearch("")
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="font-medium">{customer.name}</div>
                        {customer.phone && (
                          <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit par nom, SKU ou code-barres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {productsError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-destructive mb-4">{productsError}</p>
                <Button variant="outline" onClick={() => { setProductsError(null); setLoadingProducts(true); getProducts(tenantId!).then((res) => setProducts(res.items)).catch((err) => setProductsError(err instanceof Error ? err.message : "Erreur")).finally(() => setLoadingProducts(false)) }}>
                  Réessayer
                </Button>
              </div>
            ) : loadingProducts ? (
              <TableSkeleton rows={5} />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                title="Aucun produit trouvé"
                description={
                  searchTerm
                    ? "Essayez un autre terme de recherche"
                    : "Aucun produit disponible"
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <Card key={product.id} size="sm">
                    <CardContent className="flex flex-col gap-1 p-3">
                      <div className="font-medium text-sm truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{product.sku}</div>
                      <div className="text-sm font-semibold mt-1">{formatXOF(product.price)}</div>
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => addToCart(product)}
                      >
                        <Plus className="size-3.5 mr-1" />
                        Ajouter
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-96 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Panier ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <EmptyState
                title="Panier vide"
                description="Ajoutez des produits depuis la liste"
              />
            ) : (
              <>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatXOF(item.unitPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon-xs"
                          variant="outline"
                          onClick={() => updateQty(item.productId, item.qty - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">{item.qty}</span>
                        <Button
                          size="icon-xs"
                          variant="outline"
                          onClick={() => updateQty(item.productId, item.qty + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <div className="text-sm font-medium w-20 text-right">
                        {formatXOF(item.total)}
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total</span>
                    <span>{formatXOF(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="discount" className="text-sm">
                      Remise
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-24 h-7 text-right text-sm"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>TVA (18%)</span>
                    <span>{formatXOF(tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-1.5">
                    <span>Total</span>
                    <span>{formatXOF(total)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="POST" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) =>
                    setValue("paymentMethod", (v ?? "CASH") as "CASH" | "WAVE" | "OM" | "DEBT")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Espèces</SelectItem>
                    <SelectItem value="WAVE">Wave</SelectItem>
                    <SelectItem value="OM">Orange Money</SelectItem>
                    <SelectItem value="DEBT">Dette</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod !== "DEBT" && (
                <div className="space-y-1.5">
                  <Label htmlFor="amountPaid">Montant payé</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    min={0}
                    step="any"
                    {...register("amountPaid", { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.amountPaid && (
                    <p className="text-xs text-destructive">{errors.amountPaid.message}</p>
                  )}
                </div>
              )}

              {selectedCustomer && cart.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {paymentMethod !== "DEBT" && (
                    <>
                      <p>
                        Statut du paiement :{" "}
                        {getPaymentStatus(amountPaid, total) === "PAID"
                          ? "Payé"
                          : getPaymentStatus(amountPaid, total) === "PARTIAL"
                            ? "Paiement partiel"
                            : "Non payé"}
                      </p>
                      {amountPaid < total && amountPaid > 0 && (
                        <p>Reste à payer : {formatXOF(total - amountPaid)}</p>
                      )}
                    </>
                  )}
                  {paymentMethod === "DEBT" && (
                    <p>Cette vente sera enregistrée comme une dette</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || cart.length === 0 || !selectedCustomer}
              >
                {submitting ? "Création en cours..." : "Créer la vente"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
