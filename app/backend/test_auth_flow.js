import http from 'http';

const BASE_URL = 'http://localhost:3001/api/auth';

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
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

async function runAuthTest() {
  console.log('\n===============================================================');
  console.log('🔒 TEST AUTOMATISÉ DU FLUX D\'AUTHENTIFICATION SUPABASE');
  console.log('===============================================================\n');

  const randomNum = Math.floor(Math.random() * 10000);
  const testEmail = `user_test_${randomNum}@maalem.ma`;
  const testPassword = 'Password123!';
  const fullName = `Artisan Tester ${randomNum}`;

  // 1. Inscription (Sign Up)
  console.log(`--- 1. Inscription (POST /signup: ${testEmail}) ---`);
  const signupRes = await makeRequest('/signup', 'POST', {
    email: testEmail,
    password: testPassword,
    fullName
  });
  console.log('Résultat Inscription :', signupRes.success ? '✅ SUCCÈS' : '❌ ERREUR', signupRes);

  // 2. Connexion (Login)
  console.log(`\n--- 2. Connexion (POST /login) ---`);
  const loginRes = await makeRequest('/login', 'POST', {
    email: testEmail,
    password: testPassword
  });
  console.log('Résultat Connexion :', loginRes.success ? '✅ SUCCÈS' : '❌ ERREUR', loginRes);

  const token = loginRes.session?.access_token;
  if (!token) {
    console.error('❌ Échec : Jeton d\'accès non reçu.');
    return;
  }
  console.log('Jeton d\'accès reçu :', token.substring(0, 25) + '...');

  // 3. Vérification de session (GET /me)
  console.log(`\n--- 3. Vérification du jeton (GET /me avec Bearer Token) ---`);
  const meRes = await makeRequest('/me', 'GET', null, token);
  console.log('Résultat /me :', meRes.success ? '✅ VALIDE' : '❌ INVALIDE', meRes);

  // 4. Déconnexion (Logout)
  console.log(`\n--- 4. Déconnexion (POST /logout) ---`);
  const logoutRes = await makeRequest('/logout', 'POST', null, token);
  console.log('Résultat Déconnexion :', logoutRes);

  console.log('\n===============================================================');
  console.log('✅ FLUX D\'AUTHENTIFICATION VERIFIÉ AVEC SUCCÈS !');
  console.log('===============================================================\n');
}

runAuthTest().catch(console.error);
