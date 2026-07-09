# TODO - Naatal ERP Cloud

## 🔴 Bloquant - Auth / reCAPTCHA

1. **Configurer reCAPTCHA v2 dans Firebase Authentication**
   - Aller dans Firebase Console > Authentication > Méthode de connexion > Téléphone
   - Cliquer "Modifier" sur le fournisseur Téléphone
   - Section reCAPTCHA : sélectionner **reCAPTCHA v2**
   - Site Key : `6LdUvkstAAAAAErD_CNfyKhZ2Cdcpb1JVHGSXS47`
   - Secret Key : `6LdUvkstAAAAAIcORS1tAwzDZnrkYNHQlLiTHtCI`
   - Enregistrer
   - Puis tester la connexion avec le numéro test `+221771111111` / code `123456`

2. **Ajouter les domaines autorisés** (si connexion bloquée par unauthorized-domain)
   - Firebase Console > Authentication > Settings > Domaines autorisés
   - Ajouter : `frontend-teal-seven-r58iurlb3a.vercel.app`
   - Ajouter : `frontend-lillaye75-pngs-projects.vercel.app`

## 📋 Prochaines étapes

- [ ] Tester la connexion SMS en production
- [ ] Tester CRUD produits (ajout, modification, suppression)
- [ ] Tester le POS (vente, paiement, incrémentation stock)
- [ ] Tester les rapports et ventes
- [ ] Configurer le nom de domaine personnalisé sur Vercel
- [ ] Ajouter les variables d'env manquantes (Cloudinary, Stripe, Wave, Orange Money, OpenAI, WhatsApp)
- [ ] Alpha launch - premiers utilisateurs