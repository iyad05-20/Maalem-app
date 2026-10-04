# 🛠️ Guide de Setup et Démarrage — VORK / MAALEM

Ce guide explique en détail comment configurer et lancer l'ensemble des services de l'écosystème **MAALEM** en local ou avec Docker Compose.

---

## 📋 Table des Matières

1. [Architecture & Services](#1-architecture--services)
2. [Gestion des Fichiers d'Environnement (.env)](#2-gestion-des-fichiers-denvironnement-env)
3. [Démarrage avec Docker Compose (Recommandé)](#3-démarrage-avec-docker-compose-recommandé)
4. [Démarrage en Développement Local (Sans Docker)](#4-démarrage-en-développement-local-sans-docker)
5. [Configuration Base de Données Supabase & Migrations](#5-configuration-base-de-données-supabase--migrations)
6. [Dépannage & Erreurs Fréquentes (Troubleshooting)](#6-dépannage--erreurs-fréquentes-troubleshooting)

---

## 1. Architecture & Services

Le projet est un monorepo orchestré avec 4 applications principales et un moteur de recherche :

| Service | Emplacement | Rôle | Port Docker | Port Local (dev) |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | `app/backend/` | API REST Express, Drizzle ORM, auth locale, Atelier IA, flux Sendit & séquestre | `3001` | `3001` |
| **Frontend Client** | `app/frontend/` | Application acheteur (vitrine, catalogue, commande sur-mesure, wallet) | `3000` | `5173` |
| **Espace Artisan** | `artisan-app/` | Espace Maâlem (gestion commandes, devis sur-mesure, bordereaux Sendit, retraits) | `3003` | `5175` |
| **Admin Dashboard** | `admin-dashboard/` | Tableau de bord administrateur (arbitrage litiges, monitoring, switch API) | `3002` | `5174` |
| **Meilisearch** | Conteneur Docker | Recherche full-text & sémantique rapide des produits et intentions | `7700` | `7700` |

---

## 2. Gestion des Fichiers d'Environnement (.env)

> ⚠️ **Important** : Les fichiers `.env` contenant des clés secrètes ne sont jamais versionnés dans Git. Chaque service possède un fichier `.env.example` servant de gabarit.

Quatre fichiers `.env` sont requis :

### A. Backend (`app/backend/.env`)
Ce fichier est **obligatoire** pour que Docker Compose puisse démarrer le conteneur `backend`.
```env
# Port d'écoute et environnement
PORT=3001
NODE_ENV=development

# Connexion Supabase REST
SUPABASE_URL=https://zedjyffrerxwgcqrlyab.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PostgreSQL Supabase Pooler (Transaction pooler port 6543)
DATABASE_URL="postgresql://postgres.zedjyffrerxwgcqrlyab:VOTRE_MOT_DE_PASSE@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

# Cloudflare Workers AI (Llama 3.1 & FLUX.1 pour l'Atelier)
CLOUDFLARE_ACCOUNT_ID=a2a8844a64441081af3a56b6796da92e
CLOUDFLARE_API_TOKEN=dYmO0hhV-mrAqOauwhP7qJeEvb0BViD9bxZ20IFv

# Moteur de recherche Meilisearch
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=dev_only_key_change_in_prod

# Transport & Logistique Sendit
SENDIT_SIMULATION=true
SENDIT_SECRET_KEY=vork_sendit_webhook_secret_key_2026

# Sécurité & Authentification
JWT_SECRET=vork_secure_local_jwt_secret_2026_maroc_artisanat
JWT_EXPIRY=7d
ADMIN_MASTER_KEY=vork_admin_master_passkey_2026

# URLs et CORS
FRONTEND_URL=http://localhost:3000
ARTISAN_URL=http://localhost:3003
ADMIN_URL=http://localhost:3002
PUBLIC_BACKEND_URL=http://localhost:3001
```

### B. Frontend Client (`app/frontend/.env`)
```env
VITE_BACKEND_URL=http://localhost:3001/api
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
VITE_MEILISEARCH_HOST=http://localhost:7700

VITE_SUPABASE_URL=https://zedjyffrerxwgcqrlyab.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENVIRONMENT=development
```

### C. Application Artisan (`artisan-app/.env`)
```env
VITE_BACKEND_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://zedjyffrerxwgcqrlyab.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### D. Dashboard Admin (`admin-dashboard/.env`)
```env
VITE_BACKEND_URL=http://localhost:3001/api
VITE_ADMIN_MASTER_KEY=vork_admin_master_passkey_2026
```

---

## 3. Démarrage avec Docker Compose (Recommandé)

Docker Compose permet de lancer les 5 conteneurs (Frontend, Backend, Artisan, Admin, Meilisearch) d'un seul coup.

### 1. Lancement des conteneurs
À la racine du projet (`Maalem-app`) :
```bash
docker-compose up -d
```

### 2. Vérification de l'état des conteneurs
```bash
docker-compose ps
```
Tous les conteneurs doivent être au statut `Up` :
- `maalem-app-frontend-1` sur `0.0.0.0:3000->80`
- `maalem-app-backend-1` sur `0.0.0.0:3001->3001`
- `maalem-app-admin-dashboard-1` sur `0.0.0.0:3002->80`
- `maalem-app-artisan-app-1` sur `0.0.0.0:3003->80`
- `vork-meilisearch` sur `0.0.0.0:7700->7700`

### 3. Consultation des journaux (logs)
```bash
# Tous les logs
docker-compose logs -f

# Logs du backend uniquement
docker-compose logs -f backend
```

### 4. Accès aux applications
- 🛍️ **Application Client** : [http://localhost:3000](http://localhost:3000)
- 🔨 **Espace Artisan** : [http://localhost:3003](http://localhost:3003)
- 🛡️ **Dashboard Admin** : [http://localhost:3002](http://localhost:3002) (Passkey : `vork_admin_master_passkey_2026`)
- ⚙️ **API REST Backend** : [http://localhost:3001](http://localhost:3001) / [http://localhost:3001/health](http://localhost:3001/health)
- 🔍 **Meilisearch** : [http://localhost:7700](http://localhost:7700)

### 5. Arrêt des conteneurs
```bash
docker-compose down
```

---

## 4. Démarrage en Développement Local (Sans Docker)

Pour développer avec rechargement à chaud (Hot Module Replacement / HMR) :

### Prérequis
- Node.js >= 20.x
- npm >= 10.x

### Étapes d'installation & démarrage

Ouvrez des terminaux séparés pour chaque service :

#### Terminal 1 — Backend API
```bash
cd app/backend
npm install
npm run dev
# Écoute sur http://localhost:3001
```

#### Terminal 2 — Frontend Client
```bash
cd app/frontend
npm install
npm run dev
# Écoute sur http://localhost:5173 (ou http://localhost:3000)
```

#### Terminal 3 — Espace Artisan
```bash
cd artisan-app
npm install
npm run dev
# Écoute sur http://localhost:5175
```

#### Terminal 4 — Dashboard Admin
```bash
cd admin-dashboard
npm install
npm run dev
# Écoute sur http://localhost:5174
```

*(Optionnel) Si vous avez besoin de Meilisearch en local sans Docker complet :*
```bash
docker run -d -p 7700:7700 -e MEILI_MASTER_KEY=dev_only_key_change_in_prod getmeili/meilisearch:v1.10
```

---

## 5. Configuration Base de Données Supabase & Migrations

Le backend utilise **PostgreSQL** hébergé sur Supabase avec le pilote `postgres` et l'ORM **Drizzle**.

### 1. Renseigner le mot de passe
Ouvrez `app/backend/.env` et renseignez votre mot de passe de base de données Supabase dans `DATABASE_URL` :
```env
DATABASE_URL="postgresql://postgres.zedjyffrerxwgcqrlyab:VOTRE_VRAI_MOT_DE_PASSE@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
```

### 2. Appliquer les migrations de schéma
Pour créer ou aligner les tables (`orders`, `app_users`, `vendor_profiles`, `disputes`, `custom_requests`, `client_wallets`, etc.) :
```bash
cd app/backend
node apply_migration.mjs
```

### 3. Exécuter la suite de tests de validation
Pour tester les règles de séquestre, délais de rétractation, relances J+2 et commissions :
```bash
cd app/backend
node test_vork_decisions_suite.mjs
```

---

## 6. Dépannage & Erreurs Fréquentes (Troubleshooting)

### ❌ Erreur : `env file .../app/backend/.env not found`
- **Cause** : Docker Compose spécifie `env_file: ./app/backend/.env`. Si ce fichier est manquant (par exemple après un git checkout sans copier les variables d'environnement), Docker refuse de démarrer.
- **Solution** : Créez le fichier en copiant le gabarit :
  ```bash
  cp app/backend/.env.example app/backend/.env
  ```
  Puis relancez `docker-compose up -d`.

### ❌ Erreur : `password authentication failed for user "postgres"`
- **Cause** : Le mot de passe dans `DATABASE_URL` est encore la valeur placeholder `vork_db_password_change_me`.
- **Solution** : Obtenez le mot de passe de votre projet Supabase (dans *Database Settings > Connection Pooling*), et mettez à jour `DATABASE_URL` dans `app/backend/.env`.

### ❌ Conflit de Port (`bind: address already in use`)
- **Cause** : Un autre service tourne déjà sur l'un des ports (3000, 3001, 3002, 3003 ou 7700).
- **Solution** : Identifiez le processus occupant le port avec `netstat -ano | findstr :3001` (sur Windows) ou `lsof -i :3001` (sur Unix) et terminez-le, ou modifiez les ports publiés dans `docker-compose.yml`.

### ❌ Erreur CORS lors des requêtes Frontend -> Backend
- **Cause** : L'URL de l'application frontend n'est pas autorisée dans le middleware CORS du backend.
- **Solution** : Vérifiez que `FRONTEND_URL` et `ARTISAN_URL` dans `app/backend/.env` correspondent bien aux ports de vos applications. En mode Docker standard :
  - `FRONTEND_URL=http://localhost:3000`
  - `ARTISAN_URL=http://localhost:3003`
  - `ADMIN_URL=http://localhost:3002`
