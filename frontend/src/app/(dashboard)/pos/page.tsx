"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestoreMutations } from "@/hooks/use-firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, ShoppingCart, Smartphone, Printer, CreditCard } from "lucide-react";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const { data: products } = useCollection("products");
  const { data: customers } = useCollection("customers");
  const { add } = useFirestoreMutations();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wave" | "orange_money" | "credit">("cash");

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.sellingPrice, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const handlePayment = async () => {
    try {
      await add("sales", {
        items: cart,
        total,
        paymentMethod,
        customerId: selectedCustomer,
        storeId: null,
      });
      setCart([]);
      setSelectedCustomer(null);
      setShowPayment(false);
      toast("success", `Vente enregistrée! Total: ${total.toLocaleString()} F`);
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Point de vente</h1>
        <div className="flex items-center gap-2">
          <Badge variant={cart.length > 0 ? "success" : "neutral"}>
            {cart.length} article{cart.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="search"
              placeholder="Rechercher un produit (scanner ou texte)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-9 pr-3 text-sm rounded-md border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-neutral-400 focus:outline-none focus:border-teranga-500"
              autoFocus
              aria-label="Rechercher un produit"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((product) => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(product)}
                className="text-left p-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)] hover:border-teranga-500 transition-colors"
              >
                <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{product.name}</p>
                <p className="text-sm font-semibold text-teranga-500 mt-1">{product.sellingPrice?.toLocaleString()} F</p>
                <p className="text-xs text-neutral-500">Stock: {product.stock}</p>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Panier</h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-error hover:underline">Vider</button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-sm text-neutral-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Panier vide
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                      <p className="text-xs text-neutral-500">{item.price.toLocaleString()} F × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500"><Minus className="w-3 h-3" /></button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-500">Total</span>
                <span className="text-lg font-bold text-[var(--text-primary)]">{total.toLocaleString()} F</span>
              </div>

              <div className="space-y-2 mb-3">
                <p className="text-xs font-medium text-neutral-500">Client (optionnel)</p>
                <select
                  value={selectedCustomer || ""}
                  onChange={(e) => setSelectedCustomer(e.target.value || null)}
                  className="w-full h-9 px-3 text-sm rounded border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                >
                  <option value="">Client au comptoir</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0}
                onClick={() => setShowPayment(true)}
              >
                <CreditCard className="w-4 h-4" />
                Payer — {total.toLocaleString()} F
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {showPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setShowPayment(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-lg">
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Paiement</h2>
                <p className="text-3xl font-bold text-center text-[var(--text-primary)] mb-6">{total.toLocaleString()} F</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { id: "cash", label: "Espèces", icon: CreditCard },
                    { id: "wave", label: "Wave", icon: Smartphone },
                    { id: "orange_money", label: "Orange Money", icon: Smartphone },
                    { id: "credit", label: "Crédit", icon: Printer },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as "cash" | "wave" | "orange_money" | "credit")}
                      className={`p-3 rounded-md border text-center text-sm font-medium transition-colors ${paymentMethod === method.id ? "border-teranga-500 bg-teranga-50 text-teranga-600" : "border-[var(--border)] text-[var(--text-primary)] hover:border-neutral-300"}`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowPayment(false)}>Annuler</Button>
                  <Button className="flex-1" onClick={handlePayment}>Confirmer</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}