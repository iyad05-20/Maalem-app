# 🇲🇦 MAALEM (VORK) — Plateforme d'Artisanat Marocain & IA

MAALEM est un écosystème e-commerce haut de gamme dédié à la valorisation et à la commercialisation de l'artisanat marocain authentique (céramique, maroquinerie, dinanderie, zellige, bijoux berbères, tapis). La plateforme intègre un **Atelier IA de co-création sur-mesure** et un cadre strict de protection acheteur/vendeur conforme à la législation marocaine (Loi n° 31-08 & Code des Obligations et des Contrats).

---

## 🏛️ Architecture du Projet (Monorepo)

```
Maalem-app/
├── app/
│   ├── backend/          # API REST Node.js / Express, Drizzle ORM, Supabase PostgreSQL
│   └── frontend/         # Application Web Client (React 18, Vite, Framer Motion)
├── artisan-app/          # Espace Maâlem / Artisan dédié (React 18, Vite, Bilingue FR/AR)
├── admin-dashboard/      # Tableau de bord d'administration et arbitrage litiges
└── docker-compose.yml    # Environnement multi-conteneurs local
```

---

## 🚀 Guide de Déploiement en Production

### 1. Déploiement du Backend (Heroku)

Le backend héberge les endpoints REST, les règles de conformité contractuelle (séquestre, relances J+2, délais de rétractation) et le moteur de recherche.

#### Déploiement Git :
```bash
heroku login
heroku git:remote -a <nom-de-votre-app-backend>
git subtree push --prefix app/backend heroku main
```

#### Variables d'Environnement Heroku (Config Vars) :
À configurer dans **Heroku Dashboard** > **Settings** > **Reveal Config Vars** :

| Clé (KEY) | Exemple de Valeur | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Active le mode production |
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pass]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres` | Chaîne de connexion Supabase Pooler (Port 6543) |
| `SUPABASE_URL` | `https://[ref].supabase.co` | URL de l'instance Supabase REST |
| `SUPABASE_KEY` | `eyJhbGci...` | Clé secrète `service_role` ou `anon` |
| `JWT_SECRET` | `vork_secure_local_jwt_secret_2026_maroc_artisanat` | Clé secrète de signature des tokens JWT |
| `ADMIN_MASTER_KEY` | `vork_admin_master_passkey_2026` | Clé passe-partout admin |
| `ARTISAN_URL` | `https://<votre-app-artisan>.vercel.app` | URL de l'espace artisan (CORS) |
| `FRONTEND_URL` | `https://<votre-app-client>.vercel.app` | URL de l'espace client (CORS & CMI) |
| `PUBLIC_BACKEND_URL` | `https://<nom-backend>.herokuapp.com` | URL publique du backend (webhooks) |
| `SENDIT_SIMULATION` | `true` | `true` en sandbox, `false` en production réelle |
| `SENDIT_SECRET_KEY` | `vork_sendit_webhook_secret_key_2026` | Clé de signature des webhooks transport |
| `CLOUDFLARE_ACCOUNT_ID` | `03761c197ba4099b706ff62c1daa7643` | ID compte Cloudflare Workers AI |
| `CLOUDFLARE_API_TOKEN` | `dYmO0hhV-mrAqOauwhP7qJeEvb0BViD9bxZ20IFv` | Token API pour Llama 3.1 & FLUX.1 |

---

### 2. Déploiement du Frontend Artisan (`artisan-app`) sur Vercel

L'espace artisan permet aux Maâlems de gérer leurs commandes, répondre aux demandes de devis sur-mesure de l'Atelier, valider les livraisons en mains propres et demander leurs virements.

1. Connectez-vous à [Vercel](https://vercel.com/) et cliquez sur **Add New... > Project**.
2. Sélectionnez le dépôt `Maalem-app`.
3. **Paramètres Monorepo indispensables** :
   - **Root Directory** : Cliquez sur `Edit` et sélectionnez **`artisan-app`**
   - **Framework Preset** : `Vite`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. **Variables d'Environnement Vercel** :
   - `VITE_BACKEND_URL` = `https://<nom-de-votre-app-backend>.herokuapp.com/api`
5. Cliquez sur **Deploy**.

> *Note : Le fichier `artisan-app/vercel.json` gère automatiquement la redirection SPA (`/index.html`) pour éviter toute erreur 404 lors des rafraîchissements de page.*

---

### 3. Déploiement du Frontend Client (`app/frontend`) sur Vercel

Si vous déployez l'application client séparément sur Vercel :

1. Créez un nouveau projet Vercel à partir du même dépôt.
2. **Root Directory** : `app/frontend`
3. **Framework Preset** : `Vite`
4. **Variables d'Environnement Vercel** :
   - `VITE_BACKEND_URL` = `https://<nom-de-votre-app-backend>.herokuapp.com/api`
   - `VITE_MEILISEARCH_HOST` = *(Optionnel)* URL de votre instance Meilisearch

---

## 💻 Développement en Local

### Prérequis
- Node.js >= 20.x
- npm >= 10.x

### Installation & Lancement

1. **Backend** :
   ```bash
   cd app/backend
   npm install
   npm run dev        # Tourne sur http://localhost:3001
   ```

2. **Frontend Client** :
   ```bash
   cd app/frontend
   npm install
   npm run dev        # Tourne sur http://localhost:5173
   ```

3. **Application Artisan** :
   ```bash
   cd artisan-app
   npm install
   npm run dev        # Tourne sur http://localhost:5175
   ```

---

## ⚖️ Conformité Légale & Protocoles Intégrés

- **Délai de rétractation standard** : 7 jours francs à compter de la réception effective du colis (Art. 36 de la Loi n° 31-08 édictant des mesures de protection du consommateur).
- **Produits sur-mesure / personnalisés** : Confection ferme dès 1 heure après paiement (Art. 38 Loi 31-08). Fenêtre d'annulation sans frais de 60 minutes.
- **Relance Maâlem J+2** : Notification automatique à 34h de commande sans acceptation. En l'absence de réponse avant minuit (00h00), remboursement intégral à 100% de l'acheteur.
- **Validation Réception 24h** : Déclenchement d'un compte à rebours de 24h dès la livraison constatée (POD Sendit ou approbation livraison en mains propres).
- **Garantie Vices Cachés (90 jours)** : Signalement avec blocage d'arbitrage sous 90 jours (Art. 549 et suivants du Dahir formant Code des Obligations et des Contrats).

---

## 🛠️ Scripts & Outils Utiles

- **Appliquer les migrations Drizzle / PostgreSQL** :
  ```bash
  cd app/backend
  node apply_migration.mjs
  ```
- **Vérification TypeScript** :
  ```bash
  npm run build --prefix app/frontend
  npm run build --prefix artisan-app
  ```
