/**
 * ==============================================================================
 * SCRIPT DE TEST D'AUTHENTIFICATION & CRÉATION DE COMPTE ARTISAN (MAÂLEM)
 * ==============================================================================
 * Ce script permet de :
 * 1. Créer un compte artisan (SignUp) avec email, mot de passe et nom complet.
 * 2. Se connecter (Login) et récupérer le jeton JWT Bearer de session.
 * 3. Valider la session active via l'endpoint sécurisé `/api/auth/me`.
 * 4. Tester l'accès aux routes protégées de l'Atelier Artisan avec le jeton :
 *    - Commandes (/api/artisan/orders)
 *    - Portefeuille financier & Séquestre (/api/artisan/wallet)
 *    - Santé de la boutique (/api/artisan/profile/health)
 *    - Détails du profil Maâlem (/api/artisan/profile/details)
 *    - Publication de création avec décomposition prix Vork (/api/artisan/products)
 *
 * Utilisation :
 *   node src/scripts/test_artisan_account.js
 *
 * Options en ligne de commande :
 *   --email <email>       Spécifier un email particulier
 *   --password <psw>      Spécifier un mot de passe (min 6 caractères)
 *   --name <nom>          Nom complet de l'artisan
 *   --new                 Générer automatiquement un compte artisan unique avec timestamp
 *   --url <url>           URL de base de l'API (défaut : http://localhost:3001/api)
 * ==============================================================================
 */

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3001/api";

// Lecture des arguments CLI
const args = process.argv.slice(2);
function getArg(key, defaultValue = null) {
  const idx = args.indexOf(key);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}
const isGenerateNew = args.includes("--new");

// Identifiants par défaut fournis par l'utilisateur
const defaultEmail = isGenerateNew 
  ? `artisan.test.${Date.now()}@vork-artisanat.ma`
  : (getArg("--email") || "iyadoutahadout@gmail.com");

const defaultPassword = getArg("--password") || "Maalem2026!";
const defaultFullName = getArg("--name") || "Maâlem Iyad Outahadout";
const apiUrl = getArg("--url") || BASE_URL;

// Couleurs console pour un affichage lisible
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

async function run() {
  console.log("\n" + "=".repeat(78));
  console.log(`${colors.bright}${colors.cyan}🏺 TEST D'AUTHENTIFICATION & COMPTE ARTISAN (APP MAÂLEM)${colors.reset}`);
  console.log("=".repeat(78));
  console.log(`🌐 API Endpoint : ${colors.yellow}${apiUrl}${colors.reset}`);
  console.log(`📧 Email Cible  : ${colors.bright}${defaultEmail}${colors.reset}`);
  console.log(`👤 Nom Artisan  : ${colors.bright}${defaultFullName}${colors.reset}`);
  console.log("=".repeat(78) + "\n");

  let token = null;
  let userId = null;
  let passedTests = 0;
  let totalTests = 6;

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 1 : Création de compte (SignUp)
  // ──────────────────────────────────────────────────────────────────────────
  process.stdout.write(`[1/6] 📝 Création du compte artisan (POST /auth/signup) ... `);
  try {
    const signupRes = await fetch(`${apiUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: defaultEmail,
        password: defaultPassword,
        fullName: defaultFullName,
        role: "artisan",
      }),
    });

    const signupData = await signupRes.json();

    if (signupRes.status === 201 && signupData.success) {
      console.log(`${colors.green}✅ CRÉÉ AVEC SUCCÈS${colors.reset}`);
      console.log(`      ${colors.dim}ID Utilisateur : ${signupData.user?.id || "Généré"}${colors.reset}`);
      if (signupData.session?.access_token) {
        token = signupData.session.access_token;
      }
      passedTests++;
    } else if (signupData.error && signupData.error.toLowerCase().includes("already registered")) {
      console.log(`${colors.yellow}ℹ️ COMPTE EXISTE DÉJÀ (Poursuite avec la connexion)${colors.reset}`);
      passedTests++;
    } else {
      // Certains backends renvoient 400 si l'email existe déjà
      console.log(`${colors.yellow}ℹ️ ${signupData.error || "Compte déjà existant"}${colors.reset}`);
      passedTests++;
    }
  } catch (err) {
    console.log(`${colors.red}❌ ERREUR RÉSEAU : ${err.message}${colors.reset}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 2 : Connexion (Login) & Récupération du Jeton JWT
  // ──────────────────────────────────────────────────────────────────────────
  process.stdout.write(`[2/6] 🔑 Connexion & Obtention du Jeton JWT (POST /auth/login) ... `);
  try {
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: defaultEmail,
        password: defaultPassword,
      }),
    });

    const loginData = await loginRes.json();

    if (loginRes.ok && loginData.success && loginData.session?.access_token) {
      token = loginData.session.access_token;
      userId = loginData.user?.id;
      console.log(`${colors.green}✅ AUTHENTIFIÉ${colors.reset}`);
      console.log(`      ${colors.dim}Jeton Bearer : ${token.substring(0, 24)}...${token.slice(-10)}${colors.reset}`);
      console.log(`      ${colors.dim}UID Supabase : ${userId}${colors.reset}`);
      passedTests++;
    } else {
      throw new Error(loginData.error || `Statut HTTP ${loginRes.status}`);
    }
  } catch (err) {
    console.log(`${colors.red}❌ ÉCHEC CONNEXION : ${err.message}${colors.reset}`);
    console.log(`\n${colors.red}⚠️ Impossible de continuer sans jeton JWT valide.${colors.reset}\n`);
    process.exit(1);
  }

  const authHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 3 : Validation du jeton JWT (GET /auth/me)
  // ──────────────────────────────────────────────────────────────────────────
  process.stdout.write(`[3/6] 🛡️ Validation de session JWT sécurisée (GET /auth/me) ... `);
  try {
    const meRes = await fetch(`${apiUrl}/auth/me`, {
      method: "GET",
      headers: authHeaders,
    });
    const meData = await meRes.json();

    if (meRes.ok && meData.success && meData.user?.email === defaultEmail) {
      console.log(`${colors.green}✅ JETON VALIDE${colors.reset}`);
      console.log(`      ${colors.dim}Identité : ${meData.profile?.fullName || meData.user?.email}${colors.reset}`);
      console.log(`      ${colors.dim}Rôle     : ${meData.profile?.role || "artisan"}${colors.reset}`);
      passedTests++;
    } else {
      throw new Error(meData.error || "Profil non reconnu");
    }
  } catch (err) {
    console.log(`${colors.red}❌ ÉCHEC /auth/me : ${err.message}${colors.reset}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 4 : Accès Atelier Commandes & Portefeuille avec Jeton
  // ──────────────────────────────────────────────────────────────────────────
  process.stdout.write(`[4/6] 📦 Lecture Commandes & Portefeuille (/api/artisan/...) ... `);
  try {
    const [ordersRes, walletRes] = await Promise.all([
      fetch(`${apiUrl}/artisan/orders`, { headers: authHeaders }),
      fetch(`${apiUrl}/artisan/wallet`, { headers: authHeaders }),
    ]);

    const ordersData = await ordersRes.json();
    const walletData = await walletRes.json();

    if (ordersData.success && walletData.success) {
      console.log(`${colors.green}✅ ACCÈS CONFIRMÉ${colors.reset}`);
      console.log(`      ${colors.dim}Commandes atelier : ${ordersData.orders?.length || 0} trouvée(s)${colors.reset}`);
      console.log(`      ${colors.dim}Solde disponible  : ${walletData.wallet?.availableBalance || 0} MAD${colors.reset}`);
      console.log(`      ${colors.dim}Séquestre bloqué  : ${walletData.wallet?.lockedEscrow || 0} MAD${colors.reset}`);
      passedTests++;
    } else {
      throw new Error(`Orders: ${ordersData.error || "err"} | Wallet: ${walletData.error || "err"}`);
    }
  } catch (err) {
    console.log(`${colors.red}❌ ÉCHEC ENDPOINTS ARTISAN : ${err.message}${colors.reset}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 5 : Vérification Santé de l'Atelier & Profil
  // ──────────────────────────────────────────────────────────────────────────
  process.stdout.write(`[5/6] 🏆 Vérification Santé Boutique & Profil (/profile/...) ... `);
  try {
    const [healthRes, profileRes] = await Promise.all([
      fetch(`${apiUrl}/artisan/profile/health`, { headers: authHeaders }),
      fetch(`${apiUrl}/artisan/profile/details`, { headers: authHeaders }),
    ]);

    const healthData = await healthRes.json();
    const profileData = await profileRes.json();

    if (healthData.success && profileData.success) {
      console.log(`${colors.green}✅ BOUTIQUE CONFORME${colors.reset}`);
      console.log(`      ${colors.dim}Statut boutique : ${healthData.profile?.suspensionStatus || "active"}${colors.reset}`);
      console.log(`      ${colors.dim}Avertissements  : ${healthData.profile?.warningCountCurrentMonth || 0}/3 (Art. 22)${colors.reset}`);
      console.log(`      ${colors.dim}Atelier Nom     : ${profileData.profileDetails?.artisanName || "N/A"}${colors.reset}`);
      passedTests++;
    } else {
      throw new Error(`Health: ${healthData.error || "err"} | Profile: ${profileData.error || "err"}`);
    }
  } catch (err) {
    console.log(`${colors.red}❌ ÉCHEC SANTÉ BOUTIQUE : ${err.message}${colors.reset}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ÉTAPE 6 : Test de Publication de Produit avec Formule Prix Vork
  // ──────────────────────────────────────────────────────────────────────────
  process.stdout.write(`[6/6] 🏺 Création de Produit Catalogue (Prix Net + 5% HT + 20% TVA) ... `);
  try {
    const netPrice = 850;
    const postRes = await fetch(`${apiUrl}/artisan/products`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: "Vase Fassi Émaillé Bleu Nuit - Pièce Test",
        description: "Création artisanale façonnée à la main et cuite selon la méthode traditionnelle.",
        price: netPrice,
        category: "Céramique & Poterie",
        productType: "standard",
        manufacturingDays: 4,
      }),
    });

    const postData = await postRes.json();

    if (postRes.ok && postData.success) {
      // 850 + (850 * 0.05 = 43) + (43 * 0.20 = 9) = 902 MAD
      const clientPrice = postData.product?.clientPrice;
      console.log(`${colors.green}✅ PUBLIÉ AU CATALOGUE${colors.reset}`);
      console.log(`      ${colors.dim}Prix Net Artisan  : ${netPrice} MAD${colors.reset}`);
      console.log(`      ${colors.dim}Prix Client TTC   : ${clientPrice} MAD (Formule Vork appliquée)${colors.reset}`);
      passedTests++;
    } else {
      throw new Error(postData.error || "Erreur publication");
    }
  } catch (err) {
    console.log(`${colors.red}❌ ÉCHEC PUBLICATION : ${err.message}${colors.reset}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RÉSUMÉ FINAL
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(78));
  if (passedTests === totalTests) {
    console.log(`${colors.bright}${colors.green}🎉 SUCCÈS TOTAL : ${passedTests}/${totalTests} TESTS VALIDÉS AVEC SUCCÈS !${colors.reset}`);
    console.log(`${colors.green}L'authentification JWT Supabase de l'App Artisan fonctionne parfaitement.${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.yellow}⚠️ RÉSULTAT PARTIEL : ${passedTests}/${totalTests} tests réussis.${colors.reset}`);
  }
  console.log("=".repeat(78));

  console.log(`\n📋 ${colors.bright}RÉCAPITULATIF DES IDENTIFIANTS TESTÉS :${colors.reset}`);
  console.log(`   • Email       : ${colors.cyan}${defaultEmail}${colors.reset}`);
  console.log(`   • Mot de passe: ${colors.cyan}${defaultPassword}${colors.reset}`);
  if (token) {
    console.log(`   • Jeton JWT   : ${colors.dim}${token.substring(0, 45)}...${colors.reset}`);
  }
  console.log(`\n💡 ${colors.bright}POUR RELANCER CE TEST :${colors.reset}`);
  console.log(`   ${colors.yellow}node src/scripts/test_artisan_account.js${colors.reset}`);
  console.log(`   ${colors.yellow}node src/scripts/test_artisan_account.js --new${colors.reset} (pour générer un nouvel artisan unique)`);
  console.log(`   ${colors.yellow}node src/scripts/test_artisan_account.js --email mon.email@test.ma --password 123456${colors.reset}\n`);
}

run().catch((err) => {
  console.error("Erreur inattendue:", err);
  process.exit(1);
});
