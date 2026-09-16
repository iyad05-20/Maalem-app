/**
 * test_complete_flows.mjs
 * End-to-end validation of the 3 Atelier Submission Flows:
 * 1. Flow 1: Direct Buy from Search / Catalog to Private Artisan
 * 2. Flow 2: Private Custom Request after Customization
 * 3. Flow 3: From-Scratch Creation to Public Market + Artisan Quote
 */

const API_BASE = 'http://localhost:3001/api';

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST E2E : LES 3 PARCOURS DE SOUMISSION ATELIER & MARCHÉ ARTISAN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 0. Authentifier un artisan pour les tests marché
  console.log('▶ [Étape 0] Connexion Artisan (Maâlem Abdelkader)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'artisan@vork.ma', password: 'Maalem2026!' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error(`Login artisan échoué: ${loginData.error}`);
  }
  const artisanToken = loginData.token;
  console.log('  ✅ Artisan connecté avec succès (ID:', loginData.user.id, ')\n');

  // ──────────────────────────────────────────────────────────────────────────
  // FLOW 1 : Achat direct post-recherche
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ [FLUX 1] Commande directe (Acheter tel quel vers l\'artisan privé)...');
  const directRes = await fetch(`${API_BASE}/atelier/direct-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'prod_fibule_berbere_01',
      userId: 'client-test-flow1'
    })
  });
  const directData = await directRes.json();
  console.log('  Réponse commande directe:', directData.message);
  console.log('  Commande ID:', directData.orderId);
  console.log('  Type Produit:', directData.order?.productType, '(Attendu: standard)');
  console.log('  Transporteur:', directData.order?.transportProvider, '(Attendu: sendit)');
  console.log('  Artisan assigné:', directData.order?.artisanRef);

  const flow1Pass = directData.success &&
    directData.order?.productType === 'standard' &&
    directData.order?.transportProvider === 'sendit';
  console.log('  Verdict Flux 1:', flow1Pass ? '✅ PASSÉ' : '❌ ÉCHOUÉ');

  // ──────────────────────────────────────────────────────────────────────────
  // FLOW 2 : Demande personnalisée privée
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [FLUX 2] Demande sur-mesure privée (Pièce catalogue personnalisée)...');
  const session2Id = 'sess_flow2_' + Date.now();

  // Anchor a product
  await fetch(`${API_BASE}/atelier/select-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session2Id, productId: 'prod_siniya_cuivre_01' })
  });

  // Customize it
  await fetch(`${API_BASE}/atelier/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session2Id, message: 'je veux changer la couleur vers argenté' })
  });

  // Submit to private artisan
  const submit2Res = await fetch(`${API_BASE}/atelier/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session2Id,
      userId: 'client-test-flow2',
      requestType: 'customize',
      targetArtisanId: 'artisan_abdelkader'
    })
  });
  const submit2Data = await submit2Res.json();
  console.log('  Réponse soumission privée:', submit2Data.message);
  console.log('  Request ID:', submit2Data.requestId);
  console.log('  Artisan ciblé:', submit2Data.targetArtisan);
  console.log('  Public Market ?', submit2Data.isPublicMarket ? 'Oui' : 'Non (Privé direct)');

  const flow2Pass = submit2Data.success && !submit2Data.isPublicMarket && submit2Data.targetArtisan === 'artisan_abdelkader';
  console.log('  Verdict Flux 2:', flow2Pass ? '✅ PASSÉ' : '❌ ÉCHOUÉ');

  // ──────────────────────────────────────────────────────────────────────────
  // FLOW 3 : Création from scratch vers Marché Public
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [FLUX 3] Création from scratch ex nihilo vers le Marché Public...');
  const session3Id = 'sess_flow3_' + Date.now();

  // Describe scratch creation
  await fetch(`${API_BASE}/atelier/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session3Id, message: 'je veux fabriquer une grande table en bois de cèdre sculpté' })
  });

  // Submit to public market
  const submit3Res = await fetch(`${API_BASE}/atelier/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session3Id,
      userId: 'client-test-flow3',
      requestType: 'scratch'
    })
  });
  const submit3Data = await submit3Res.json();
  console.log('  Réponse soumission publique:', submit3Data.message);
  console.log('  Request ID:', submit3Data.requestId);
  console.log('  Artisan assigné:', submit3Data.targetArtisan, '(Attendu: artisan-open)');
  console.log('  Public Market ?', submit3Data.isPublicMarket ? '✅ Oui (Marché Public)' : '❌ Non');

  // Vérifier que la création apparaît dans l'onglet Marché de l'Artisan (/api/artisan/custom-requests)
  console.log('\n▶ [Vérification Marché Artisan] Consultation des annonces ouvertes par l\'artisan...');
  const marketRes = await fetch(`${API_BASE}/artisan/custom-requests`, {
    headers: { 'Authorization': `Bearer ${artisanToken}` }
  });
  const marketData = await marketRes.json();
  console.log(`  Nombre d'annonces sur le marché : ${marketData.requests?.length || 0}`);
  
  const foundInMarket = (marketData.requests || []).find(r => r.id === submit3Data.requestId);
  console.log('  Projet visible sur le marché des artisans :', foundInMarket ? `✅ OUI ("${foundInMarket.title}", ${foundInMarket.budget})` : '❌ NON');

  // Artisan soumet un devis sur l'annonce
  console.log('\n▶ [Devis Artisan] Soumission d\'un devis par Maâlem Abdelkader...');
  const quoteRes = await fetch(`${API_BASE}/artisan/custom-requests/${submit3Data.requestId}/quote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${artisanToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      proposedPrice: 2400,
      confectionDays: 14,
      note: 'Bois de cèdre massif de l\'Atlas séché naturellement, sculpture arabesque réalisée à la main.'
    })
  });
  const quoteData = await quoteRes.json();
  console.log('  Réponse devis artisan:', quoteData.message);
  console.log('  Devis proposé:', quoteData.quote?.proposedPrice, 'MAD en', quoteData.quote?.confectionDays, 'jours');

  const flow3Pass = submit3Data.success && submit3Data.isPublicMarket && foundInMarket && quoteData.success;
  console.log('  Verdict Flux 3:', flow3Pass ? '✅ PASSÉ' : '❌ ÉCHOUÉ');

  // ──────────────────────────────────────────────────────────────────────────
  // Synthèse
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SYNTHÈSE DES 3 PARCOURS :');
  console.log(` • Flux 1 (Commande Directe Standard) : ${flow1Pass ? '✅ VALIDÉ' : '❌ ERREUR'}`);
  console.log(` • Flux 2 (Demande Sur-Mesure Privée) : ${flow2Pass ? '✅ VALIDÉ' : '❌ ERREUR'}`);
  console.log(` • Flux 3 (Marché Public & Devis)     : ${flow3Pass ? '✅ VALIDÉ' : '❌ ERREUR'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!flow1Pass || !flow2Pass || !flow3Pass) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
