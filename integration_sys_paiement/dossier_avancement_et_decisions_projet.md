# Dossier Général d'Avancement & Registre des Décisions (Projet Vork)

> **Document Maître de Synthèse & Organisation du Travail** :
> * **Développement Frontend (Camarade)** : Conçoit et génère les interfaces utilisateur, formulaires et boutons à partir des spécifications UI.
> * **Développement Backend (Ziad)** : Raccorde les fonctions et modules de `vork-wallet` au Frontend.

---

## 1. 🎯 Objectifs du Projet & Modèle Général

Le projet **Vork** est une plateforme de mise en relation entre des Clients et des Artisans/Créateurs pour la vente de produits artisanaux (Standards, Personnalisés via IA et Sur Commande).

### Modèle Moteur Financier & Wallet (`vork-wallet`) :
1. **Modèle 100 % CMI En Ligne (Zéro Cash Direct)** : Aucun flux de liquide de main à main entre le client et l'artisan.
2. **Architecture Wallet-First** : Portefeuille virtuel immuable. Tout remboursement ou gain y est crédité avant virement RIB.
3. **Séquestre Uniforme de 15 Jours (Escrow)** : Bloquer 100 % des fonds d'une commande pendant 15 jours révolus après livraison (couvrant la rétractation 7j et la garantie vices cachés 15j).
4. **Grand Livre Immuable (`ledgerEntries`)** : Écriture comptable en append-only à double-entrée.

---

## 2. 👥 Répartition des Tâches Frontend & Backend

### 2.1. Ce que génère le Camarade (Frontend UI)
*   **App Client** :
    *   Bouton `[Payer en Ligne CMI]` (avec gestion acompte 50% si $\ge 1000\text{ MAD}$).
    *   Bouton `[Annuler la Commande]` (Annulation gratuite si Standard ou Perso $\le 1\text{h}$ ; bloqué si Perso $> 1\text{h}$).
    *   Bouton `[Demander un Retour (7j)]` (Modale choix Cathedis vs Propres moyens).
    *   Bouton `[Signaler Vice Caché]` (Formulaire photos et description).
    *   Écran **Wallet Client** + Bouton `[Demander un Virement RIB]`.
*   **App Artisan** :
    *   Boutons `[Accepter la Commande]` (Démarre compte à rebours 60 min) et `[Refuser la Commande]`.
    *   Bouton `[Expédier le Colis]` avec **Formulaire Upload Photos Obligatoire**.
    *   Écran `[Inspection Colis Retourné (48h)]` (Bouton valider vs Signaler dégradation).
    *   Écran **Wallet Artisan** (Solde Bloqué 15j vs Solde Disponible) + Bouton `[Demander un Virement RIB]`.
*   **Dashboard Admin** :
    *   Écran **Gestion des Litiges** + Boutons d'arbitrage (`Faute Vendeur`, `Faute Cathedis`, `Faute Client`).
    *   Boutons d'exécution des crons (`Release Escrow 15j` & `Payout Run du Lundi`).

### 2.2. Ce qu'intègre Ziad (Backend `vork-wallet`)
*   Raccordement des 4 modules découplés (`src/core/`, `src/client/`, `src/artisan/`, `src/admin/`).
*   Validation de la suite de 36 tests automatisés (Vitest).

---

## 3. ⚖️ Registre des Décisions Valides & Arrêtées

1. **Annulations Avant Expédition** :
   * Standard : Annulation gratuite 100% avant transport.
   * Personnalisé : Annulation gratuite pendant l'heure de grâce (60 min). Passé 60 min, commande **ferme et irrévocable**.
2. **Retours & Rétractation** :
   * Standard : Rétractation sous 7j. Cathedis (frais déduits) vs Propres moyens (100% remboursé).
   * Inspection Vendeur : 48 heures pour signaler une dégradation. Sans réponse, auto-validation du remboursement client.
3. **Vices Cachés (15j)** :
   * Déclarable sous 15 jours max. Arbitrage Admin ou Expert Indépendant. Faute Cathedis = avance 95% net à l'artisan par Vork.
4. **Escrow Uniforme (15 Jours) & Payouts du Lundi** :
   * 100% des fonds bloqués 15 jours post-livraison (`deliveredAt`).
   * À J+15 : Libération de **95.00 %** au wallet artisan, **5.00 %** commission Vork, **0.01 %** TVA.
   * Virements RIB exécutés chaque **Lundi matin** (seuil $\ge 100\text{ MAD}$). Solde Client retirable à tout moment.

---

## 4. 💻 État du Code & Framework de Test

Le code backend `vork-wallet` contient **36 tests automatisés passants à 100 %** couvrant l'ensemble du périmètre.

Le guide complet à transmettre au développeur Frontend est rédigé dans :
📄 **[guide_integration_assistants_apps.md](file:///C:/Users/ZIAD/.gemini/antigravity-ide/brain/0f2af555-2bf1-4037-8253-1e5c8e1b55b7/guide_integration_assistants_apps.md)**.
