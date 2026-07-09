# TODO - Naatal ERP Cloud

## ✅ Done

- [x] Firebase project `naatal-erp-cloud` created
- [x] Firestore enabled with tenant-based rules
- [x] App Check configured with reCAPTCHA Enterprise
- [x] Vercel env vars set (6 Firebase variables)
- [x] Authorized domains added (frontend-teal-seven-r58iurlb3a.vercel.app, frontend-lillaye75-pngs-projects.vercel.app)
- [x] Vercel deployed successfully
- [x] GitHub repo pushed
- [x] Google Login enabled in Firebase Auth
- [x] Google Login works in production (user can reach dashboard)

## 🟡 Bugs to Fix

1. **React error #418** — `HTML` as React child (likely Card component rendering issue or translation fallback). Check `dashboard/page.tsx` and `card.tsx` component.
2. **404 on `/boutique` and `/guide`** — sidebar links to routes that don't exist. Placeholder pages need to be created.
3. **Product added but not displaying** — Firestore collection not refreshing in UI. Check `use-firestore.ts` real-time listener.
4. **"Bonjour, Utilisateur"** instead of displayName — auth context gets Firebase user but displayName is null for Google users. Need to handle Google profile data.

## 🔴 Restant - Auth

1. Configurer reCAPTCHA v2 dans Firebase Authentication > Phone > reCAPTCHA
   - Site Key : `6LdUvkstAAAAAErD_CNfyKhZ2Cdcpb1JVHGSXS47`
   - Secret Key : `6LdUvkstAAAAAIcORS1tAwzDZnrkYNHQlLiTHtCI`
2. Tester SMS login avec numéro test `+221771111111` / code `123456`

## 📋 Prochaines étapes

- [ ] Créer pages `/boutique` et `/guide`
- [ ] Fixer React error 418
- [ ] Debug Firestore refresh après ajout produit
- [ ] Afficher le vrai nom Google (displayName)
- [ ] Tester CRUD produits (ajout, modification, suppression)
- [ ] Tester le POS (vente, paiement, incrémentation stock)
- [ ] Tester les rapports et ventes
- [ ] Configurer le nom de domaine personnalisé sur Vercel
- [ ] Ajouter les variables d'env manquantes (Cloudinary, Stripe, Wave, Orange Money, OpenAI, WhatsApp)
- [ ] Alpha launch - premiers utilisateurs