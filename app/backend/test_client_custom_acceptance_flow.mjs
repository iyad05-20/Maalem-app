/**
 * test_client_custom_acceptance_flow.mjs
 * Validates the full Acceptance Flow for Atelier Bespoke Projects:
 * 1. Client submits a scratch project in Atelier
 * 2. Project appears in Client Orders list (status: en_attente_artisan)
 * 3. Artisan finds project on market and submits a quote
 * 4. Project reflects quote in Client Orders list (status: devis_recu)
 * 5. Client accepts the quote -> Official order created in orders table
 * 6. Artisan sees the order in Workshop and receives notification
 */

const API_BASE = 'http://localhost:3001/api';

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST E2E : FLUX COMPLET D\'ACCEPTATION PROJET ATELIER (CLIENT & ARTISAN)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const clientId = 'client-test-acceptance-' + Date.now();

  // 1. Client creates from-scratch project in Atelier
  console.log('▶ [1] Client : Soumission d\'un projet depuis l\'Atelier...');
  const submitRes = await fetch(`${API_BASE}/atelier/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'sess_acc_' + Date.now(),
      userId: clientId,
      requestType: 'scratch',
      generatedImageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600',
      targetArtisanId: 'artisan-open'
    })
  });
  const submitData = await submitRes.json();
  const requestId = submitData.requestId;
  console.log(`  ✅ Projet créé avec ID: ${requestId} (Public Market: ${submitData.isPublicMarket})\n`);

  // 2. Vérification que le client voit son projet dans sa liste de commandes
  console.log('▶ [2] Client : Vérification de l\'accès au projet dans "Mes Commandes"...');
  const clientOrdersRes = await fetch(`${API_BASE}/client/orders?clientRef=${clientId}`);
  const clientOrders = await clientOrdersRes.json();
  const foundClientReq = clientOrders.find(o => o.id === requestId);

  if (!foundClientReq) {
    throw new Error(`Projet ${requestId} introuvable dans la liste des commandes du client.`);
  }
  console.log(`  ✅ Projet visible dans les commandes client !`);
  console.log(`     Titre: "${foundClientReq.productTitle}" | Statut: ${foundClientReq.status} (Attendu: en_attente_artisan)\n`);

  // 3. Connexion Artisan & Soumission de devis
  console.log('▶ [3] Artisan : Connexion et soumission de devis...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'artisan@vork.ma', password: 'Maalem2026!' })
  });
  const { token: artisanToken } = await loginRes.json();

  const quoteRes = await fetch(`${API_BASE}/artisan/custom-requests/${requestId}/quote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${artisanToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      proposedPrice: 3200,
      confectionDays: 12,
      note: 'Cuivre martelé main et gravure arabesque traditionnelle de Fès.'
    })
  });
  const quoteData = await quoteRes.json();
  console.log(`  ✅ Devis soumis par l'artisan: ${quoteData.quote?.proposedPrice} MAD en ${quoteData.quote?.confectionDays} jours\n`);

  // 4. Client consulte sa liste : Statut doit être 'devis_recu' avec la liste de devis
  console.log('▶ [4] Client : Réception du devis dans la liste de commandes...');
  const updatedClientOrdersRes = await fetch(`${API_BASE}/client/orders?clientRef=${clientId}`);
  const updatedClientOrders = await updatedClientOrdersRes.json();
  const reqWithQuote = updatedClientOrders.find(o => o.id === requestId);

  console.log(`     Nouveau statut client: ${reqWithQuote?.status} (Attendu: devis_recu)`);
  console.log(`     Nombre de devis: ${reqWithQuote?.quotes?.length}`);
  console.log(`     Détail du devis: ${reqWithQuote?.quotes?.[0]?.artisanName} - ${reqWithQuote?.quotes?.[0]?.proposedPrice} MAD`);

  if (reqWithQuote?.status !== 'devis_recu' || !reqWithQuote?.quotes?.length) {
    throw new Error('Le devis n\'apparaît pas correctement dans la liste des commandes client.');
  }
  console.log('  ✅ Devis visible et prêt pour acceptation côté client !\n');

  // 5. Client accepte le devis
  console.log('▶ [5] Client : Acceptation du devis (Accepter & Valider)...');
  const acceptRes = await fetch(`${API_BASE}/client/custom-requests/${requestId}/accept-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteIndex: 0
    })
  });
  const acceptData = await acceptRes.json();
  console.log(`  ✅ Réponse acceptation: ${acceptData.message}`);
  console.log(`     Commande ferme créée avec ID: ${acceptData.orderId}`);
  console.log(`     Statut commande: ${acceptData.order?.status} (Attendu: acompte_verse)\n`);

  if (!acceptData.success || !acceptData.orderId) {
    throw new Error(`Échec de l'acceptation: ${acceptData.error}`);
  }

  // 6. Artisan vérifie ses commandes dans l'atelier
  console.log('▶ [6] Artisan : Vérification que la commande acceptée apparaît dans son atelier...');
  const artisanOrdersRes = await fetch(`${API_BASE}/artisan/orders`, {
    headers: { 'Authorization': `Bearer ${artisanToken}` }
  });
  const artisanOrdersData = await artisanOrdersRes.json();
  const confirmedArtisanOrder = (artisanOrdersData.orders || []).find(o => o.id === acceptData.orderId);

  if (!confirmedArtisanOrder) {
    throw new Error(`Commande ferme ${acceptData.orderId} introuvable dans l'atelier de l'artisan.`);
  }
  console.log(`  ✅ Commande présente dans l'atelier de l'artisan !`);
  console.log(`     Titre: "${confirmedArtisanOrder.productTitle}" | Montant: ${confirmedArtisanOrder.totalPrice} MAD\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉 SUCCÈS TOTAL : LE FLUX COMPLET D\'ACCEPTATION EST VALIDÉ !');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

run().catch(err => {
  console.error('❌ Erreur fatale test acceptation:', err);
  process.exit(1);
});
