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
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testProfileStates() {
  console.log('\n===============================================================');
  console.log('🧪 TEST AUTOMATISÉ DES ÉTATS DE PROFIL & TRANSITION DE TITRES');
  console.log('===============================================================\n');

  const userId = 'user_state_test_' + Math.floor(Math.random() * 1000);
  console.log(`👤 Utilisateur de test : ${userId}`);

  // 1. Initial Feed (Cold Start, Score < 3)
  console.log('\n--- 1. Cold Start (Score < 3) ---');
  const res1 = await makeRequest('', 'POST', { userId, pending_actions: [] });
  console.log('Résultat Cold Start :', {
    sectionState: res1.sectionState,
    sectionTitle: res1.sectionTitle,
    highestTagScore: res1.highestTagScore,
    activeTagsCount: res1.activeTagsCount,
    epsilon: res1.epsilon
  });

  // 2. Early Understanding (Score 3 - 9)
  console.log('\n--- 2. Apprentissage (VIEW + SEARCH -> Score 3 - 9) ---');
  const pending1 = [
    { actionType: 'VIEW', tags: ['cuir'] },
    { actionType: 'SEARCH', tags: ['cuir', 'maroquinerie'] }
  ];
  const res2 = await makeRequest('', 'POST', { userId, pending_actions: pending1 });
  console.log('Résultat Apprentissage :', {
    sectionState: res2.sectionState,
    sectionTitle: res2.sectionTitle,
    highestTagScore: res2.highestTagScore,
    activeTagsCount: res2.activeTagsCount,
    epsilon: res2.epsilon
  });

  // 3. Stable / Mature Profile (BOOKMARK + ORDER -> Score >= 9)
  console.log('\n--- 3. Profil Mûr (BOOKMARK + ORDER -> Score >= 9.0) ---');
  const pending2 = [
    { actionType: 'BOOKMARK', tags: ['berbere', 'traditionnel'] },
    { actionType: 'ORDER', tags: ['berbere'] }
  ];
  const res3 = await makeRequest('', 'POST', { userId, pending_actions: pending2 });
  console.log('Résultat Profil Mûr :', {
    sectionState: res3.sectionState,
    sectionTitle: res3.sectionTitle,
    highestTagScore: res3.highestTagScore,
    activeTagsCount: res3.activeTagsCount,
    epsilon: res3.epsilon
  });

  // Logout
  await makeRequest('/logout', 'POST', { userId });

  console.log('\n===============================================================');
  console.log('✅ TEST ÉTATS DE PROFIL TERMINÉ AVEC SUCCÈS !');
  console.log('===============================================================\n');
}

testProfileStates().catch(console.error);
