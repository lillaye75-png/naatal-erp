# Naatal ERP — Master Plan

> Multi-tenant ERP for West African retail businesses (Sénégal).  
> Next.js 16 + Firebase 12 + Tailwind CSS v4 + shadcn/ui + Zustand 5.

---

## 1. Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 16 (Turbopack) |
| UI | React 19, shadcn/ui, Tailwind v4, lucide-react |
| State | Zustand 5 |
| Base de données | Firebase Firestore (client SDK) + Admin SDK (server) |
| Auth | Firebase Auth (email/password) + custom claims |
| Offline | Firestore persistence + IndexedDB queue |
| Paiements | Wave, Orange Money (webhooks) |
| Email | Resend |
| Export | xlsx (Excel), HTML-to-PDF |
| i18n | i18next (FR / EN / WO) |
| Charts | recharts |
| Upload | Cloudinary |

---

## 2. Architecture

```
Pages (React Server/Client Components)
  ↓
Feature Hooks (useDashboard, useProducts, useAuth)
  ↓
Zustand Stores (auth, cart, ui, cashRegister, offline)
  ↓
Services (business logic, transactions)
  ↓
Repositories (data access, CRUD)
  ↓
Firebase Firestore SDK / IndexedDB
```

- **Multi-tenancy**: `tenantId` scope sur chaque document
- **Soft deletes**: `isDeleted` flag partout, pas de suppression physique
- **Transactions `runTransaction`** pour ventes, paiements, inventaire (atomicité)
- **Listeners temps réel** via `useOnSnapshot` pour sales, products, customers, orders
- **Admin SDK** pour webhooks, API routes, set-claims

---

## 3. Routes

### Publiques `(auth)`

| Route | Page |
|---|---|
| `/login` | Connexion email/mot de passe |
| `/register` | Création compte entreprise |
| `/forgot-password` | Réinitialisation mot de passe |
| `/store/[slug]` | Boutique en ligne publique |

### Protégées `(dashboard)` — Sidebar + TopBar + BottomNav

| Route | Page |
|---|---|
| `/dashboard` | KPIs, graphique ventes, alertes stock |
| `/pos` | Point de vente complet (scan, panier, paiement, impression) |
| `/pos/quick` | POS rapide |
| `/sales` | Historique des ventes |
| `/sales/new` | Nouvelle vente |
| `/invoices` | Factures (AVOIR, PROFORMA, DEVIS, FACTURE) |
| `/products` | Gestion produits (CRUD, image, SKU, prix) |
| `/products/import` | Import CSV/XLSX |
| `/categories` | Catégories |
| `/brands` | Marques |
| `/units` | Unités de mesure |
| `/customers` | Clients (CRUD, recherche, export) |
| `/customers/import` | Import CSV |
| `/customer-groups` | Groupes de clients |
| `/suppliers` | Fournisseurs |
| `/purchases` | Achats / commandes fournisseurs |
| `/inventory` | Stock (niveaux, mouvements, alertes) |
| `/inventory/transfer` | Transfert entre entrepôts |
| `/debt` | Dettes clients + encaissement |
| `/payments` | Historique des paiements |
| `/expenses` | Dépenses |
| `/cash-register` | Caisse (ouverture/clôture) |
| `/reports` | Rapports (ventes, profit, stock, dette, caisse, AI) |
| `/ecommerce` | Configuration boutique en ligne |
| `/ecommerce/orders` | Commandes en ligne |
| `/warehouses` | Entrepôts |
| `/settings` | Paramètres entreprise (multi-tabs) |
| `/settings/profile` | Profil utilisateur |
| `/settings/audit` | Journal d'audit |
| `/settings/users` | Gestion des utilisateurs |

### API (server-side)

| Route | Rôle |
|---|---|
| `POST /api/auth/set-claims` | Définir custom claims Firebase |
| `GET /api/sales` | Ventes paginées |
| `GET/POST /api/products` | Produits |
| `GET/POST /api/customers` | Clients |
| `GET /api/invoice` | Facture par ID/number |
| `POST /api/expenses` | Créer dépense |
| `POST /api/email` | Envoyer email (Resend) |
| `POST /api/webhooks/wave` | Webhook Wave |
| `POST /api/webhooks/orange-money` | Webhook Orange Money |

---

## 4. Base de données (Firestore)

### Collections principales

| Collection | Clés | Notes |
|---|---|---|
| `tenants` | `id`, `name`, `plan`, `currency`, `language` | Un doc par entreprise |
| `users` | `id`, `email`, `tenantId`, `roleId` | Lié à l'auth Firebase |
| `roles` | `id`, `name`, `permissions[]` | RBAC |
| `settings` | `taxRate`, `invoicePrefix`, `waveApiKey`, etc. | Un doc par tenant |
| `products` | `name`, `sku`, `price`, `costPrice`, `categoryId`, `minStock`, `isSoldOnline` | Soft delete |
| `categories` | `name`, `color` | |
| `brands` | `name`, `logoUrl` | |
| `units` | `name`, `symbol` | |
| `customers` | `name`, `phone`, `totalDebt`, `groupId` | |
| `customer_groups` | `name`, `discountPercent` | |
| `suppliers` | `name`, `phone`, `totalOwed` | |
| `sales` | `items[]`, `total`, `amountPaid`, `paymentStatus`, `invoiceType` | Type: INVOICE / PROFORMA / QUOTATION / CREDIT_NOTE |
| `invoices` | `number`, `saleId`, `total`, `invoiceType` | |
| `payments` | `saleId`, `amount`, `method` | CASH / WAVE / OM / CARD |
| `inventory_movements` | `productId`, `type`, `qty`, `warehouseId` | Type: SALE / PURCHASE / ADJUSTMENT / TRANSFER |
| `warehouses` | `name`, `location`, `isPrimary` | |
| `purchase_orders` | `supplierId`, `items[]`, `total`, `status` | |
| `expenses` | `category`, `amount`, `date` | |
| `cash_registers` | `userId`, `openingBalance`, `closingAmount`, `expectedBalance` | |
| `storefronts` | `slug`, `name`, `isActive` | |
| `orders` | `trackingId`, `items[]`, `total`, `status`, `customerName`, `customerPhone` | E-commerce |
| `audit_logs` | `userId`, `action`, `resource`, `details` | |
| `notifications` | `userId`, `type`, `title`, `isRead` | |
| `counters` | `value` | Incrémentation automatique des numéros de facture |

---

## 5. Stores Zustand

| Store | Rôle |
|---|---|
| `useAuthStore` | User, tenant, rôle, permissions |
| `useCartStore` | Panier POS (items, discount, total) |
| `useUIStore` | Sidebar, modals, loading global |
| `useCashRegisterStore` | Session caisse ouverte |
| `useOfflineStore` | État connexion, file d'attente offline |

---

## 6. Hooks personnalisés

| Hook | Usage |
|---|---|
| `useOnSnapshot<T>` | Listener temps réel Firestore |
| `useCollection<T>` | Fetch one-shot |
| `useDocument` | CRUD générique |
| `useOnlineStatus` | État connexion navigateur |
| `useSyncManager` | Sync offline → Firestore |
| `usePWAInstall` | Installation PWA |
| `useKeyboardShortcuts` | Raccourcis clavier POS |
| `useDebounce` | Debounce valeur |
| `usePagination` | Pagination client-side |
| `useWarehouses` | Nom entrepôt par ID |
| `useCustomerSearch` | Recherche client avec debounce |
| `useDashboard` | Agrégation KPIs tableau de bord |
| `useProducts` | CRUD produits |
| `useAuth` | Login, register, logout, sync tenant |

---

## 7. Flux métier clés

### Création d'une vente (POS / `/sales/new`)

```
1. Sélection produits → useCartStore
2. Choix client (optionnel) → recherche Firestore
3. Type : INVOICE / PROFORMA / QUOTATION / CREDIT_NOTE
4. Paiement : CASH / WAVE / OM / DEBT
5. runTransaction {
     - create sale doc
     - create invoice doc
     - incrémenter counter (numéro facture)
     - create payment doc (si amountPaid > 0)
     - create inventory_movements (si INVOICE)
     - update customer.totalDebt (si INVOICE + unpaid)
   }
6. Audit log
7. Toast succès + InvoiceModal (print / WhatsApp)
```

### Paiement de dette (`/debt`)

```
1. runTransaction {
     - read sale
     - read customer (si existe)
     - update sale.amountPaid + paymentStatus
     - create payment doc
     - update customer.totalDebt
   }
2. Audit log
```

### Commande en ligne livrée (`/ecommerce/orders`)

```
1. Vérifier processedAt (guard anti-doublon)
2. runTransaction {
     - create sale doc
     - create invoice doc
     - create payment doc
     - create inventory_movements (SALE, -qty)
     - update order.status = DELIVERED + processedAt
   }
```

### Transfert de stock (`/inventory`)

```
1. OUT movement (-qty) depuis entrepôt source
2. IN movement (+qty) vers entrepôt destination
```

### Déploiement

```
git push → Vercel auto-deploy
Build: npm run build (Next.js, TypeScript, Turbopack)
Prod: https://naatal-erp.vercel.app
```

---

## 8. Règles métier

| Règle | Implémentation |
|---|---|
| PROFORMA / QUOTATION / CREDIT_NOTE ne génèrent pas de stock | `sale.service.ts:skipStock = nonInvoice` |
| PROFORMA / QUOTATION / CREDIT_NOTE sont UNPAID par défaut | `paymentStatus = nonInvoice ? 'UNPAID' : ...` |
| CREDIT_NOTE soustrait son montant des revenus | `useDashboard.ts`, `ProfitReport.tsx`, `SalesReport.tsx` — total négatif |
| CREDIT_NOTE exclu du nombre de ventes | `salesCount` filter `invoiceType !== 'CREDIT_NOTE'` |
| CREDIT_NOTE exclu du top produits | `AccountingAssistant.tsx` filter |
| CREDIT_NOTE n'a pas de COGS | `ProfitReport.tsx` — skip si CREDIT_NOTE |
| Stock inconnu (null) = disponible | `store/[slug].tsx:disabled={isOutOfStock}` sans stockUnknown |
| Livraison commande = auto vente + facture + stock + paiement | `order.repository.ts` via runTransaction |
| Paiement dette = transaction atomique | `debt.service.ts` (reads avant writes) |
| Soft delete partout | `isDeleted: false` dans toutes les queries |

---

## 9. Fonctionnalités complétées

- [x] POS avec panier, client, paiement, impression, WhatsApp
- [x] Ventes (création, historique, types INVOICE/PROFORMA/QUOTATION/CREDIT_NOTE)
- [x] Factures avec numéros auto-incrémentés
- [x] Paiements (CASH, WAVE, OM, CARD) + webhooks Wave/OM
- [x] Gestion produits (CRUD, import XLSX, images, stock)
- [x] Gestion clients (CRUD, import XLSX, groupes, dette)
- [x] Inventaire (mouvements, alertes stock bas, transfert entrepôts)
- [x] Dettes (suivi, encaissement, relance)
- [x] Caisse (ouverture/clôture, différence)
- [x] Rapports (ventes, profit, inventaire, dette, caisse, assistant AI)
- [x] Boutique en ligne (commande WhatsApp, suivi colis)
- [x] Commandes en ligne (gestion, livraison auto-stock)
- [x] Dépenses, fournisseurs, achats
- [x] RBAC (6 rôles, 27 permissions)
- [x] Offline (cache Firestore, queue IndexedDB)
- [x] PWA (installable, manifest, service worker)
- [x] i18n (français, anglais, wolof)
- [x] Audit log
- [x] Notifications
- [x] Backup/Restore (export JSON toutes collections, import avec merge)
- [x] Paramètres entreprise (multi-tabs: business, facturation, paiements, boutique, utilisateurs, sauvegarde)
- [x] Import templates avec données existantes en exemple
