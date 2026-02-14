# VORK App V2

Une plateforme moderne de mise en relation entre clients et artisans au Sénégal.

## Structure du Projet

Le projet est organisé en un monorepo utilisant les workspaces npm :

- **`frontend/`** : L'application React (Vite, Tailwind CSS, TypeScript).
- **`backend/`** : Configuration backend et règles de sécurité Firestore.

## Fonctionnalités Clés

- **PWA (Progressive Web App)** : Installable sur mobile avec support hors-ligne et mise à jour automatique.
- **Gestion des Rôles** : Interfaces distinctes pour les Clients et les Artisans.
- **Géolocalisation** : Calcul de distance en temps réel et recommandations basées sur la position.
- **Système de Réservation** : Flux complet de la demande à la finalisation avec avis et photos.
- **Messagerie Intégrée** : Chat en temps réel entre clients et prestataires.

## Installation et Développement

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/iyad05-20/MAALEM-app.git
   ```

2. Installez les dépendances à la racine :
   ```bash
   npm install
   ```

3. Configurez les variables d'environnement dans `frontend/.env` :
   ```env
   GEMINI_API_KEY=votre_cle_api
   ```

4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

## Déploiement

Pour générer le build de production :
```bash
npm run build
```
Les fichiers générés se trouveront dans `frontend/dist`.

---
*Projet développé pour optimiser la mise en relation locale avec une expérience utilisateur premium.*
