"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart, BarChart3, Package, WifiOff, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: ShoppingCart, title: "Point de vente", desc: "Vendez en un clic. Scanner, panier, paiement Wave/Orange Money." },
  { icon: Package, title: "Gestion des stocks", desc: "Suivez vos produits avec alertes de réapprovisionnement intelligentes." },
  { icon: BarChart3, title: "Rapports & Analyses", desc: "Comprenez votre entreprise sans être comptable." },
  { icon: WifiOff, title: "Mode hors-ligne", desc: "Vendez même sans Internet. Synchronisation automatique." },
  { icon: MessageCircle, title: "Assistant WhatsApp", desc: "Gérez votre entreprise via WhatsApp en Wolof ou Français." },
  { icon: Smartphone, title: "Mobile d'abord", desc: "Tout fonctionne sur un téléphone à 50 000 F." },
];

const plans = [
  { name: "Gratuit", price: "0 F", period: "toujours", features: ["10 produits", "50 clients", "1 utilisateur"] },
  { name: "Starter", price: "5 000 F", period: "/mois", features: ["200 produits", "2 boutiques", "Boutique en ligne", "CSV Export"] },
  { name: "Pro", price: "10 000 F", period: "/mois", features: ["Produits illimités", "Multi-boutiques", "IA prédictions", "WhatsApp"] },
  { name: "Enterprise", price: "15 000 F", period: "/mois", features: ["Tout débloqué", "Stock avancé", "Support prioritaire", "API"] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-50 bg-[var(--bg-card)]/80 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Naatal ERP Cloud</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-neutral-600 hover:text-[var(--text-primary)]">Connexion</Link>
            <Link href="/register">
              <Button size="sm">Essai gratuit</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teranga-500/10 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-32 text-center relative">
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--text-primary)] leading-tight">
            L&apos;ERP que l&apos;Afrique mérite
          </h1>
          <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
            Gérez votre entreprise depuis votre téléphone. Ventes, stocks, clients, rapports — tout en un.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Démarrer gratuitement
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">Voir la démo</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-12">
          Tout ce dont vous avez besoin
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="w-10 h-10 rounded-lg bg-teranga-50 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-teranga-500" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{f.title}</h3>
              <p className="text-sm text-neutral-500 mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-12">
          Tarifs simples
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div key={plan.name} className="p-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{plan.price}</span>
                <span className="text-sm text-neutral-500">{plan.period}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Button variant="secondary" className="w-full mt-6" size="sm">
                {plan.price === "0 F" ? "Commencer" : "Souscrire"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-neutral-500">
          Naatal ERP Cloud — Développé par Abdoulaye Sow
        </div>
      </footer>
    </div>
  );
}