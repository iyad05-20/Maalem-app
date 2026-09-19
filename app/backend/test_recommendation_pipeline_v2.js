import http from 'http';

const BASE_URL = 'http://localhost:3001/api/recommendations';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runDetailedTest() {
  console.log('\n========================================================================');
  console.log('🔬 TEST DÉTAILLÉ DU PIPELINE DE RECOMMANDATION V2 (ÉTATS & CALCULS)');
  console.log('========================================================================\n');

  const userId = 'user_demo_test_' + Math.floor(Math.random() * 1000);
  console.log(`👤 Utilisateur de test créé : ID = "${userId}"\n`);

  // ── PHASE 1 : Initialisation de session
  console.log('------------------------------------------------------------------------');
  console.log('1. ÉTAPE 1 : Initialisation de la Session (GET /session)');
  console.log('------------------------------------------------------------------------');
  const sessionRes = await makeRequest(`/session?userId=${userId}`);
  console.log(' Statut de session :', sessionRes);

  // ── PHASE 2 : Premier Feed (Cold Start)
  console.log('\n------------------------------------------------------------------------');
  console.log('2. ÉTAPE 2 : Demande de Feed Initial (Cold-Start)');
  console.log('------------------------------------------------------------------------');
  const feed1Res = await makeRequest('', 'POST', {
    userId,
    pending_actions: [],
    lastFeeds: { previousFeed: [], olderFeed: [] },
    topK: 5
  });

  const feed1Items = feed1Res.data || [];
  console.log(` Feed 1 généré (${feed1Items.length} produits) :`);
  feed1Items.forEach((p, i) => {
    console.log(`   ${i + 1}. [ID: ${p.id}] ${p.title} (${p.category_group || 'divers'}) - Badge: ${p._rec?.isExplore ? 'AI Exploration' : 'Exploitation'}`);
  });
  const feed1Ids = feed1Items.map(p => p.id);

  // ── PHASE 3 : Simulation d'interactions utilisateur
  console.log('\n------------------------------------------------------------------------');
  console.log('3. ÉTAPE 3 : Simulation d\'Interactions Utilisateur (Pending Actions)');
  console.log('------------------------------------------------------------------------');
  const pending_actions = [
    { actionType: 'BOOKMARK', tags: ['berbere', 'traditionnel'] }, // +10 points base
    { actionType: 'VIEW',     tags: ['cuir', 'maroquinerie'] },   // +2 points base
    { actionType: 'SEARCH',   tags: ['argent'] }                 // +4 points base
  ];
  console.log(' Actions accumulées en local par le Frontend :');
  pending_actions.forEach((act, i) => {
    console.log(`   Action ${i + 1}: ${act.actionType} sur les tags -> [${act.tags.join(', ')}]`);
  });

  // ── PHASE 4 : Deuxième Feed avec pending_actions + lastFeeds
  console.log('\n------------------------------------------------------------------------');
  console.log('4. ÉTAPE 4 : Demande de Feed 2 (Application Decay + Actions + Reranking)');
  console.log('------------------------------------------------------------------------');
  const feed2Res = await makeRequest('', 'POST', {
    userId,
    pending_actions,
    lastFeeds: { previousFeed: feed1Ids, olderFeed: [] },
    topK: 5
  });

  const feed2Items = feed2Res.data || [];
  console.log(`\n Feed 2 personnalisé généré (${feed2Items.length} produits) :`);
  feed2Items.forEach((p, i) => {
    const isPenalized = feed1Ids.includes(p.id) ? ' (Pénalité Feed 1 ×0.90 appliquée)' : '';
    console.log(`   ${i + 1}. [Score: ${p._rec?.score ? p._rec.score.toFixed(2) : 'Explore'}] ${p.title} (${p.category_group || 'divers'})${isPenalized}`);
  });

  // ── PHASE 5 : Vérification de la persistance & Déconnexion
  console.log('\n------------------------------------------------------------------------');
  console.log('5. ÉTAPE 5 : Terminaison de Session / Déconnexion (POST /logout)');
  console.log('------------------------------------------------------------------------');
  const logoutRes = await makeRequest('/logout', 'POST', { userId });
  console.log(' Résultat Logout / Flush Supabase :', logoutRes);

  console.log('\n========================================================================');
  console.log('✅ TEST DÉTAILLÉ DU PIPELINE DE RECOMMANDATION V2 TERMINÉ');
  console.log('========================================================================\n');
}

runDetailedTest().catch(console.error);
