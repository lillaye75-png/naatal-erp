"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "fr" | "wo" | "en";

const translations: Record<Lang, Record<string, string>> = {
  fr: {
    "app.name": "Naatal ERP Cloud",
    "nav.dashboard": "Tableau de bord",
    "nav.pos": "Point de vente",
    "nav.products": "Produits",
    "nav.customers": "Clients",
    "nav.sales": "Ventes",
    "nav.purchases": "Achats",
    "nav.suppliers": "Fournisseurs",
    "nav.expenses": "Dépenses",
    "nav.stock": "Stocks",
    "nav.reports": "Rapports",
    "nav.whatsapp": "WhatsApp",
    "nav.settings": "Paramètres",
    "nav.store": "Boutique en ligne",
    "nav.help": "Guide d'utilisation",
    "action.new_sale": "Nouvelle vente",
    "action.add_product": "Ajouter un produit",
    "action.add_customer": "Ajouter un client",
    "action.save": "Enregistrer",
    "action.cancel": "Annuler",
    "action.delete": "Supprimer",
    "action.edit": "Modifier",
    "action.search": "Rechercher...",
    "action.pay": "Payer",
    "action.print": "Imprimer",
    "state.loading": "Chargement...",
    "state.empty": "Aucune donnée",
    "state.error": "Une erreur est survenue",
    "state.offline": "Mode hors-ligne",
    "state.online": "Synchronisé",
    "state.syncing": "Synchronisation...",
  },
  wo: {
    "app.name": "Naatal ERP Cloud",
    "nav.dashboard": "Tablo de bor",
    "nav.pos": "Nyaar",
    "nav.products": "Liggey",
    "nav.customers": "Samaay",
    "nav.sales": "Aay",
    "nav.purchases": "Jaay",
    "nav.suppliers": "Fournisseurs",
    "nav.expenses": "Dépenses",
    "nav.stock": "Mbokk",
    "nav.reports": "Rapporti",
    "nav.whatsapp": "WhatsApp",
    "nav.settings": "Parametra",
    "nav.store": "Boutique online",
    "nav.help": "Guide d'utilisation",
    "action.new_sale": "Nouvelle vente",
    "action.add_product": "Ajouter un produit",
    "action.add_customer": "Ajouter un client",
    "action.save": "Enregistrer",
    "action.cancel": "Annuler",
    "action.delete": "Supprimer",
    "action.edit": "Modifier",
    "action.search": "Rechercher...",
    "action.pay": "Payer",
    "action.print": "Imprimer",
    "state.loading": "Chargement...",
    "state.empty": "Aucune donnée",
    "state.error": "Une erreur est survenue",
    "state.offline": "Mode hors-ligne",
  },
  en: {
    "app.name": "Naatal ERP Cloud",
    "nav.dashboard": "Dashboard",
    "nav.pos": "POS",
    "nav.products": "Products",
    "nav.customers": "Customers",
    "nav.sales": "Sales",
    "nav.purchases": "Purchases",
    "nav.suppliers": "Suppliers",
    "nav.expenses": "Expenses",
    "nav.stock": "Stock",
    "nav.reports": "Reports",
    "nav.whatsapp": "WhatsApp",
    "nav.settings": "Settings",
    "nav.store": "Online Store",
    "nav.help": "User Guide",
    "action.new_sale": "New Sale",
    "action.add_product": "Add Product",
    "action.add_customer": "Add Customer",
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.edit": "Edit",
    "action.search": "Search...",
    "action.pay": "Pay",
    "action.print": "Print",
    "state.loading": "Loading...",
    "state.empty": "No data",
    "state.error": "An error occurred",
    "state.offline": "Offline mode",
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");

  const t = (key: string): string => {
    return translations[lang]?.[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);