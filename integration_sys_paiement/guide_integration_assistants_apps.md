# Guide d'Intégration & Spécifications UI / API (Front-End & Back-End)

> **Organisation de l'Équipe** :
> * **Frontend (Camarade)** : Génère et conçoit les écrans, boutons, formulaires et modales UI à partir de ce document.
> * **Backend (Ziad)** : Raccorde les endpoints API de `vork-wallet` aux actions générées par le Frontend.

---

## 1. 📱 App Client : Écrans, Boutons UI & Recommandations API

### 1.1. Écran "Mes Commandes" & Détail de Commande
*   **Bouton UI : `[Payer en Ligne via CMI]`**
    *   *Condition d'affichage* : Statut commande = `en_attente_paiement` ou `paiement_echoue`.
    *   *Action Frontend* : Déclenche l'appel `POST /api/client/orders/:id/pay`.
    *   *Comportement* : Redirige le client vers l'URL CMI renvoyée (3D Secure). Affiche l'acompte (50% si $\ge 1000\text{ MAD}$, 100% sinon).
*   **Bouton UI : `[Annuler la Commande]`**
    *   *Condition d'affichage* : Statut $\neq$ `en_cours_de_transport`, `livre`, `complete` ou `annulee`.
    *   *Comportement pour Produit Personnalisé* :
        *   Si $\le 60\text{ min}$ post-acceptation : Annulation gratuite (100% remboursé sur Wallet).
        *   Si $> 60\text{ min}$ post-acceptation : Désactiver le bouton ou afficher la modale *"Annulation impossible : la commande est ferme après 1h"*.
    *   *Action Frontend* : Déclenche `POST /api/client/orders/:id/cancel`.
*   **Bouton UI : `[Demander un Retour (7j)]`**
    *   *Condition d'affichage* : Produit Standard ET statut = `livre` ET $\le 7\text{ jours}$ après livraison.
    *   *Modale Choix du Transporteur* :
        1. Option Cathedis (frais de retour déduits).
        2. Propres moyens (saisie numéro de suivi transporteur perso).
    *   *Action Frontend* : Déclenche `POST /api/client/orders/:id/return`.
*   **Bouton UI : `[Signaler un Vice Caché / Litige]`**
    *   *Condition d'affichage* : Statut = `livre` ou `livre_reserve_bloquee` ET $\le 15\text{ jours}$ après livraison.
    *   *Formulaire UI* : Saisie motif + Upload photos obligatoires du défaut.
    *   *Action Frontend* : Déclenche `POST /api/admin/orders/:id/disputes`.

### 1.2. Écran "Mon Wallet Client Vork"
*   **Affichage Solde** : Carte visuelle affichant le solde disponible (`GET /api/client/wallet/:userId/balance`). *Remarque : Le solde client n'est JAMAIS bloqué*.
*   **Bouton UI : `[Demander un Virement sur mon RIB]`**
    *   *Formulaire Modal* : Saisie du montant + Saisie du RIB bancaire (24 caractères).
    *   *Action Frontend* : Déclenche `POST /api/client/wallet/:userId/withdraw`.
    *   *Message d'information* : *"Votre virement sera exécuté le Lundi matin."*

---

## 2. 🔨 App Artisan : Écrans, Boutons UI & Recommandations API

### 2.1. Écran "Gestion des Commandes Reçues"
*   **Bouton UI : `[Accepter la Commande]`**
    *   *Condition d'affichage* : Statut = `payee_integralement` ou `acompte_verse` (Délai 24h minuit-à-minuit).
    *   *Action Frontend* : Déclenche `POST /api/artisan/orders/:id/accept`.
    *   *Indicateur UI* : Affiche un compte à rebours de **60 minutes** (Heure de grâce client) avec l'avertissement *"Attendre 1h avant d'acheter la matière ou démarrer la fabrication"*.
*   **Bouton UI : `[Refuser la Commande]`**
    *   *Condition d'affichage* : Statut = `payee_integralement` ou `acompte_verse`.
    *   *Action Frontend* : Déclenche `POST /api/artisan/orders/:id/refuse` (Rembourse 100% le client).
*   **Bouton UI : `[Expédier le Colis]` (avec Upload Photos)**
    *   *Condition d'affichage* : Statut = `en_preparation` (après l'heure de grâce).
    *   *Formulaire Bloquant* : Upload obligatoire des photos du produit fini et de l'emballage.
    *   *Action Frontend* : Déclenche `POST /api/artisan/orders/:id/ship`.
*   **Écran UI : `[Inspection Colis Retourné (48h)]`**
    *   *Condition d'affichage* : Statut = `retour_initie`.
    *   *Bouton 1* : `[Confirmer Retour Conforme]` $\rightarrow$ Valide le remboursement client.
    *   *Bouton 2* : `[Signaler Produit Endommagé]` $\rightarrow$ Ouvre un litige Admin.
    *   *Compte à rebours UI* : 48 heures avant auto-validation.

### 2.2. Écran "Mon Wallet Artisan Vork"
*   **Affichage Solde Double Carte** :
    1. **Solde Bloqué (Escrow 15j)** : Montants des commandes livrées depuis moins de 15 jours.
    2. **Solde Disponible (Retirable)** : Montants débloqués après J+15.
*   **Bouton UI : `[Demander un Virement RIB]`**
    *   *Formulaire Modal* : Saisie du montant ($\le$ Solde Disponible) + Saisie du RIB.
    *   *Action Frontend* : Déclenche `POST /api/artisan/wallet/:artisanId/withdraw`.

---

## 3. 🛡️ Dashboard Admin Vork : Écrans, Boutons UI & Recommandations API

### 3.1. Écran "Gestion & Arbitrage des Litiges"
*   **Table des Litiges** : Liste des réclamations avec statut `en_reclamation`.
*   **Bouton UI : `[Trancher Litige : Faute Vendeur]`** $\rightarrow$ Rembourse 100% le client, retour charge vendeur.
*   **Bouton UI : `[Trancher Litige : Faute Cathedis]`** $\rightarrow$ Rembourse 100% le client + avance 95% net à l'artisan.
*   **Bouton UI : `[Trancher Litige : Faute Client]`** $\rightarrow$ Applique retenues transport + 20% pénalité + 5% commission + 0.01% TVA.
*   **Bouton UI : `[Assigner Expert Indépendant]`** $\rightarrow$ Transmet le dossier anonymisé à un artisan tiers pour avis sous 15j.

### 3.2. Écran "Finance & Virements du Lundi"
*   **Bouton UI : `[Exécuter le Payout Run du Lundi]`** $\rightarrow$ Traite les demandes de retraits RIB $\ge 100\text{ MAD}$.
*   **Bouton UI : `[Exécuter Cron Release Escrow 15j]`** $\rightarrow$ Libère les commandes livrées depuis $\ge 15\text{ jours}$.

---

## 4. 🔄 Récapitulatif du Contrat de Travail (Frontend vs Backend)

```text
1. Camarade (Frontend)  ──>  Crée les composants UI, boutons, modales et formulaires listés ci-dessus.
2. Camarade (Frontend)  ──>  Passe les données d'entrée (orderId, amount, rib, photos) au Backend.
3. Ziad (Backend)       ──>  Raccorde les fonctions de vork-wallet à ces boutons et valide les tests.
```
