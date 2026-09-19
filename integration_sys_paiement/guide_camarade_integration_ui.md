# Guide Complet d'Utilisation & d'Intégration Frontend Vork-Wallet

> **DOCUMENT DESTINÉ AU DÉVELOPPEUR FRONTEND (CAMARADE)**
> Ce guide explique en détail l'ensemble des nouveaux composants UI React, leurs fonctionnalités, les modales, les flux d'actions, la couche d'API locale de simulation (`vorkWallet.api.ts`), ainsi que la marche à suivre pour manipuler et tester les interfaces ou basculer vers les vrais endpoints du backend `vork-wallet` (géré par Ziad).

---

## 1. 📂 Structure des Fichiers Ajoutés & Modifiés

Les fichiers suivants ont été créés et intégrés sous `vork-app-v2-teammate/apps/frontend/src/` :

```text
src/
├── types/
│   └── index.ts                       <-- Extensions des types View, Order, Wallets & Litiges
├── services/
│   └── vorkWallet.api.ts              <-- Couche d'API locale (Mock Fallback & LocalStorage)
├── views/
│   ├── client/
│   │   ├── ClientWalletView.tsx       <-- Écran Wallet Client & Demande Virement RIB
│   │   └── ClientOrderDetailView.tsx  <-- Actions CMI, Annulation 60m, Retour 7j, Litige 15j
│   ├── artisan/
│   │   ├── ArtisanWalletView.tsx      <-- Wallet Artisan Double Carte (Escrow 15j vs Disponible)
│   │   └── ArtisanOrderDetailView.tsx <-- Acceptation (Timer 60m), Refus, Expédition & Inspection 48h
│   └── admin/
│       ├── AdminDisputesView.tsx      <-- Dashboard d'Arbitrage des Litiges (4 Sentences)
│       └── AdminFinanceView.tsx       <-- Dashboard Finance (Payout Run Lundi & Cron Escrow)
└── components/Navigation/
    └── ViewSwitcher.tsx               <-- Routage lazy-loaded des 4 nouveaux écrans
```

---

## 2. 📱 Description des Écrans, Fonctions et Manipulations UI

### 2.1. App Client (Interface Acheteur)

#### 1. Écran "Détail Commande" (`ClientOrderDetailView.tsx`)
- **Bouton `[Payer en Ligne via CMI]`** :
  - *Condition d'apparition* : Statut = `en_attente_paiement` ou `paiement_echoue`.
  - *Fonctionnement* : Ouvre la modale CMI. Calcule automatiquement l'acompte (50 % si montant $\ge 1000$ MAD, 100 % si $< 1000$ MAD) et simule la redirection 3D Secure.
  - *Code déclenché* : `vorkWalletAPI.payOrder(orderId, amount)`.

- **Bouton `[Annuler la Commande]`** :
  - *Condition d'apparition* : Statut non terminal (`en_cours_de_transport`, `livre`, `complete`, `annulee`).
  - *Règle Produit Sur-Mesure* : Se déclenche gratuitement si $\le 60$ minutes post-acceptation (100% remboursé sur Wallet). Si $> 60$ minutes, le bouton affiche un avertissement bloquant : *"Annulation impossible : la commande est ferme après 1h"*.
  - *Code déclenché* : `vorkWalletAPI.cancelOrder(orderId, isCustom, acceptedAt)`.

- **Bouton `[Demander un Retour (7j)]`** :
  - *Condition d'apparition* : Produit Standard ET statut = `livre` ET $\le 7$ jours post-livraison.
  - *Modale Choix Transporteur* : Option A (Cathedis - frais de retour déduits) vs Option B (Propres moyens - saisie N° de suivi).
  - *Code déclenché* : `vorkWalletAPI.returnOrder(orderId, carrierChoice, trackingNumber)`.

- **Bouton `[Signaler un Vice Caché / Litige]`** :
  - *Condition d'apparition* : Statut = `livre` ou `livre_reserve_bloquee` ET $\le 15$ jours post-livraison.
  - *Formulaire* : Saisie du motif + upload obligatoire des photos du défaut.
  - *Code déclenché* : `vorkWalletAPI.createDispute(orderId, reason, photos)`.

#### 2. Écran "Mon Wallet Client Vork" (`ClientWalletView.tsx`)
- **Affichage Solde** : Carte visuelle affichant le solde disponible retirable (les fonds client ne sont **jamais bloqués**).
- **Bouton `[Demander un Virement sur mon RIB]`** :
  - *Modale* : Saisie du montant et du RIB (exactement 24 chiffres).
  - *Message d'information* : *"Votre virement sera exécuté le Lundi matin."*
  - *Code déclenché* : `vorkWalletAPI.withdrawClient(userId, amount, rib)`.

---

### 2.2. App Artisan (Interface Créateur)

#### 1. Écran "Commandes Reçues" (`ArtisanOrderDetailView.tsx`)
- **Bouton `[Accepter la Commande]`** :
  - *Condition d'apparition* : Statut = `payee_integralement` ou `acompte_verse`.
  - *Comportement UI* : Active un **compte à rebours dynamique de 60 minutes** (Heure de grâce client) avec le message d'avertissement *"Attendre 1h avant d'acheter la matière ou démarrer la fabrication"*.
  - *Code déclenché* : `vorkWalletAPI.acceptOrder(orderId)`.

- **Bouton `[Refuser la Commande]`** :
  - *Condition d'apparition* : Statut = `payee_integralement` ou `acompte_verse`. Rembourse 100% au client.
  - *Code déclenché* : `vorkWalletAPI.refuseOrder(orderId)`.

- **Bouton `[Expédier le Colis]` (avec Upload Photos)** :
  - *Condition d'apparition* : Statut = `en_preparation` (après l'heure de grâce).
  - *Formulaire Bloquant* : Exige l'upload des photos du produit fini ET du colis d'emballage avant de valider l'expédition.
  - *Code déclenché* : `vorkWalletAPI.shipOrder(orderId, packagePhotos, itemPhotos)`.

- **Section `[Inspection Colis Retourné (48h)]`** :
  - *Condition d'apparition* : Statut = `retour_initie`.
  - *Compte à rebours UI* : 48 heures avant auto-validation du remboursement.
  - *Bouton 1* : `[Confirmer Retour Conforme]` $\rightarrow$ Valide le remboursement client.
  - *Bouton 2* : `[Signaler Produit Endommagé]` $\rightarrow$ Ouvre un litige Admin pour dégradation.
  - *Code déclenché* : `vorkWalletAPI.inspectReturn(orderId, action, damageNote)`.

#### 2. Écran "Mon Wallet Artisan Vork" (`ArtisanWalletView.tsx`)
- **Affichage Double Carte** :
  1. **Solde Bloqué (Escrow 15j)** : Montants des commandes livrées depuis $< 15$ jours (garantie Vork).
  2. **Solde Disponible (Retirable)** : Fonds débloqués à J+15.
- **Bouton `[Demander un Virement RIB]`** : Modale de saisie du montant ($\le$ Solde Disponible) + RIB 24 chiffres.
- *Code déclenché* : `vorkWalletAPI.withdrawArtisan(artisanId, amount, rib)`.

---

### 2.3. Dashboard Admin Vork (Interface Administration)

#### 1. Écran "Arbitrage des Litiges" (`AdminDisputesView.tsx`)
- **Table des Litiges** : Liste des réclamations actives (`en_reclamation`).
- **4 Boutons d'Arbitrage** :
  1. `[Trancher : Faute Vendeur]` : Rembourse 100% le client, retour charge vendeur.
  2. `[Trancher : Faute Cathedis]` : Rembourse 100% le client + avance 95% net à l'artisan par Vork.
  3. `[Trancher : Faute Client]` : Applique les retenues de transport + 20% pénalité + 5% commission + 0.01% TVA.
  4. `[Assigner Expert Indépendant]` : Transmet le dossier anonymisé à un artisan tiers pour avis sous 15j.
- *Code déclenché* : `vorkWalletAPI.arbitrateDispute(disputeId, decision)` & `vorkWalletAPI.assignExpert(disputeId, expertId)`.

#### 2. Écran "Finance & Virements du Lundi" (`AdminFinanceView.tsx`)
- **Bouton `[Exécuter le Payout Run du Lundi]`** : Traite en lot les demandes de virements RIB $\ge 100$ MAD.
- **Bouton `[Exécuter Cron Release Escrow 15j]`** : Libère les fonds des commandes livrées depuis $\ge 15$ jours avec rapport financier (commission 5% Vork et TVA 0.01%).
- *Code déclenché* : `vorkWalletAPI.executeMondayPayouts()` & `vorkWalletAPI.executeEscrowReleaseCron()`.

---

## 3. 🧪 Comment Naviguer et Tester dans l'Interface

Toutes les vues sont câblées dans `ViewSwitcher.tsx` et accessibles soit par les boutons d'action des commandes, soit par le panneau **"Accès Vork Wallet & Admin"** ajouté au bas de la vue profil (`ProfileView.tsx`).

### Accès Rapides dans la Console / Code :
Vous pouvez naviguer instantanément vers n'importe quel écran en appelant la fonction globale window dans votre navigateur ou vos composants :
```javascript
// Ouvrir le Wallet Client
window.__vorkSetView('client-wallet');

// Ouvrir le Wallet Artisan
window.__vorkSetView('artisan-wallet');

// Ouvrir l'Arbitrage Litiges Admin
window.__vorkSetView('admin-disputes');

// Ouvrir la Finance Admin
window.__vorkSetView('admin-finance');
```

---

## 🔌 4. Guide de Raccordement au Backend Réel `vork-wallet` (De Ziad)

Le service `vorkWallet.api.ts` agit actuellement en mode **Mock Fallback** pour simuler les réponses et sauvegarder l'état dans le `localStorage`.

Lorsque **Ziad** aura mis en ligne les endpoints réels du serveur Backend `vork-wallet`, il suffira de remplacer les fonctions internes de `vorkWallet.api.ts` par de vrais appels `fetch` / `axios` vers l'URL du serveur backend :

```typescript
// Exemple de bascule d'un endpoint mock vers le vrai backend :
export const vorkWalletAPI = {
  async payOrder(orderId: string, totalAmount: number) {
    // Vrai appel REST vers le backend Ziad :
    const response = await fetch(`/api/client/orders/${orderId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: totalAmount })
    });
    return await response.json();
  }
};
```

---

## ✅ Résumé
Toutes les exigences UI, boutons, modales, règles métiers et animations sont prêtes et validées par la compilation Vite !
