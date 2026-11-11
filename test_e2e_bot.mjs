/**
 * Vork / Maalem — Bot Automatisé de Test E2E & Simulation de Charge
 * ═════════════════════════════════════════════════════════════════════════════
 * Mode 1 (Comportement par défaut) :
 *   node test_e2e_bot.mjs
 *
 * Mode 2 (Test de charge / concurrence pour mesurer la capacité du site) :
 *   node test_e2e_bot.mjs --concurrency 10
 * ═════════════════════════════════════════════════════════════════════════════
 */

const BASE_URL = process.env.API_URL || "http://localhost:3001/api";
const CLIENT_APP_URL = process.env.CLIENT_URL || "http://localhost:3000";
const ARTISAN_APP_URL = process.env.ARTISAN_URL || "http://localhost:3003";

const args = process.argv.slice(2);
const concIdx = args.indexOf("--concurrency");
const CONCURRENCY = concIdx >= 0 ? Math.max(1, parseInt(args[concIdx + 1] || "1", 10)) : 1;

const stats = {
  totalRequests: 0,
  failedRequests: 0,
  latenciesMs: [],
};

async function apiFetch(path, options = {}) {
  const start = performance.now();
  stats.totalRequests++;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, options);
    const elapsed = performance.now() - start;
    stats.latenciesMs.push(elapsed);
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, headers: res.headers, data, elapsedMs: elapsed };
  } catch (err) {
    const elapsed = performance.now() - start;
    stats.latenciesMs.push(elapsed);
    stats.failedRequests++;
    throw err;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function signupOrLogin({ email, password, fullName, role, city = "Fès" }) {
  const signupRes = await apiFetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullName, role, city }),
  });

  if (signupRes.ok && signupRes.data?.success && signupRes.data?.token) {
    return { user: signupRes.data.user, token: signupRes.data.token };
  }

  const loginRes = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert(loginRes.ok && loginRes.data?.success && loginRes.data?.token, `Auth failed for ${email}: ${JSON.stringify(loginRes.data)}`);
  return { user: loginRes.data.user, token: loginRes.data.token };
}

async function runSingleScenario(workerId) {
  const uid = `${Date.now()}_${workerId}_${Math.random().toString(36).slice(2, 6)}`;
  const log = (msg) => console.log(`[Bot #${workerId}] ${msg}`);

  log("1. Vérification CORS & Frontend availability...");
  if (workerId === 1) {
    const corsPreflight = await fetch(`${BASE_URL}/artisan/notifications?artisanRef=test`, {
      method: "OPTIONS",
      headers: {
        Origin: ARTISAN_APP_URL,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type,authorization,x-artisan-ref",
      },
    });
    assert(corsPreflight.status === 204, `CORS preflight expected 204, got ${corsPreflight.status}`);
    const allowedHdrs = (corsPreflight.headers.get("access-control-allow-headers") || "").toLowerCase();
    assert(allowedHdrs.includes("x-artisan-ref"), `CORS must allow x-artisan-ref, got: ${allowedHdrs}`);

    // Verify frontends respond 200
    const feRes = await fetch(CLIENT_APP_URL);
    const artRes = await fetch(ARTISAN_APP_URL);
    assert(feRes.status === 200, `Client frontend unreachable (${feRes.status})`);
    assert(artRes.status === 200, `Artisan frontend unreachable (${artRes.status})`);
    log("   ✓ CORS Preflight OK + Frontends (3000 & 3003) en ligne.");
  }

  log("2. Création & isolation de 1 Client + 2 Artisans indépendants...");
  const client = await signupOrLogin({
    email: `bot_client_${uid}@vork.ma`,
    password: "BotPassword2026!",
    fullName: `Client Bot ${workerId}`,
    role: "client",
  });
  const artisanA = await signupOrLogin({
    email: `bot_artisan_a_${uid}@vork.ma`,
    password: "BotPassword2026!",
    fullName: `Maâlem Alpha ${workerId}`,
    role: "artisan",
    city: "Fès",
  });
  const artisanB = await signupOrLogin({
    email: `bot_artisan_b_${uid}@vork.ma`,
    password: "BotPassword2026!",
    fullName: `Maâlem Beta ${workerId}`,
    role: "artisan",
    city: "Marrakech",
  });

  const headersClient = { "Content-Type": "application/json", Authorization: `Bearer ${client.token}` };
  const headersA = { "Content-Type": "application/json", Authorization: `Bearer ${artisanA.token}`, "X-Artisan-Ref": artisanA.user.id };
  const headersB = { "Content-Type": "application/json", Authorization: `Bearer ${artisanB.token}`, "X-Artisan-Ref": artisanB.user.id };

  // Check strict isolation on fresh artisan accounts (no leaked products/orders from Abdelkader or others)
  const [prodA, prodB, ordAInit, ordBInit, cliInit] = await Promise.all([
    apiFetch("/artisan/products", { headers: headersA }),
    apiFetch("/artisan/products", { headers: headersB }),
    apiFetch(`/artisan/orders?artisanRef=${artisanA.user.id}`, { headers: headersA }),
    apiFetch(`/artisan/orders?artisanRef=${artisanB.user.id}`, { headers: headersB }),
    apiFetch(`/client/orders?clientRef=${client.user.id}`, { headers: headersClient }),
  ]);

  assert(prodA.ok && prodA.data.products.length === 0, `Artisan A ne doit pas hériter de produits étrangers (${prodA.data?.products?.length})`);
  assert(prodB.ok && prodB.data.products.length === 0, `Artisan B ne doit pas hériter de produits étrangers (${prodB.data?.products?.length})`);
  assert(ordAInit.ok && ordAInit.data.orders.length === 0, "Artisan A doit démarrer avec 0 commande");
  assert(ordBInit.ok && ordBInit.data.orders.length === 0, "Artisan B doit démarrer avec 0 commande");
  assert(cliInit.ok && Array.isArray(cliInit.data) && cliInit.data.length === 0, "Client neuf doit démarrer avec 0 commande");
  log("   ✓ Isolation stricte vérifiée pour Client, Artisan A et Artisan B.");

  log("3. Client publie une demande personnalisée sur le Marché Public...");
  const customTitle = `Théière Ciseler Bot #${uid}`;
  const reqRes = await apiFetch("/client/custom-requests", {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({
      clientRef: client.user.id,
      customizationOrigin: "from_scratch",
      categoryName: "Cuivre & Métal",
      title: customTitle,
      description: "Théière marocaine artisanale en maillechort ciselé main",
      budget: 1400,
      safetyGuidelinesAccepted: true,
    }),
  });
  assert(reqRes.status === 201 && reqRes.data?.success, `Echec création demande: ${JSON.stringify(reqRes.data)}`);
  const customReqId = reqRes.data.customRequest.id;
  log(`   ✓ Demande publiée (${customReqId}).`);

  log("4. Test d'indépendance des devis entre Artisan A et Artisan B...");
  const mktA1 = await apiFetch("/artisan/custom-requests?category=all", { headers: headersA });
  const mktB1 = await apiFetch("/artisan/custom-requests?category=all", { headers: headersB });
  const itemA1 = mktA1.data.requests.find((r) => r.id === customReqId);
  const itemB1 = mktB1.data.requests.find((r) => r.id === customReqId);
  assert(itemA1 && itemB1, "La demande doit être visible sur le marché public des deux artisans");
  assert(itemA1.myQuote === null && itemB1.myQuote === null, "Aucun devis soumis au départ");

  // Artisan A soumet un devis
  const quoteARes = await apiFetch(`/artisan/custom-requests/${customReqId}/quote`, {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({ proposedPrice: 1250, confectionDays: 6, note: "Finition Fès premium" }),
  });
  assert(quoteARes.ok && quoteARes.data?.success, `Artisan A quote failed: ${JSON.stringify(quoteARes.data)}`);

  // Vérifier que Artisan B voit la demande toujours disponible ET sans myQuote bloqué !
  const [mktA2, mktB2] = await Promise.all([
    apiFetch("/artisan/custom-requests?category=all", { headers: headersA }),
    apiFetch("/artisan/custom-requests?category=all", { headers: headersB }),
  ]);
  const itemA2 = mktA2.data.requests.find((r) => r.id === customReqId);
  const itemB2 = mktB2.data.requests.find((r) => r.id === customReqId);
  assert(itemA2?.myQuote?.proposedPrice === 1250, "Artisan A doit voir son propre devis à 1250 MAD");
  assert(itemB2 && itemB2.myQuote === null, "CRITIQUE: Artisan B ne doit PAS voir le devis d'Artisan A comme étant le sien !");
  assert(itemB2.quotesCount === 1, `quotesCount attendu=1, reçu=${itemB2.quotesCount}`);

  // Artisan B soumet SON propre devis indépendant
  const quoteBRes = await apiFetch(`/artisan/custom-requests/${customReqId}/quote`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({ proposedPrice: 1050, confectionDays: 5, note: "Cuivre martelé Marrakech" }),
  });
  assert(quoteBRes.ok && quoteBRes.data?.success, `Artisan B quote failed: ${JSON.stringify(quoteBRes.data)}`);

  const [mktA3, mktB3] = await Promise.all([
    apiFetch("/artisan/custom-requests?category=all", { headers: headersA }),
    apiFetch("/artisan/custom-requests?category=all", { headers: headersB }),
  ]);
  const itemA3 = mktA3.data.requests.find((r) => r.id === customReqId);
  const itemB3 = mktB3.data.requests.find((r) => r.id === customReqId);
  assert(itemA3?.myQuote?.proposedPrice === 1250 && itemA3.quotesCount === 2, "Artisan A conserve son devis à 1250 MAD (non écrasé)");
  assert(itemB3?.myQuote?.proposedPrice === 1050 && itemB3.quotesCount === 2, "Artisan B conserve son devis à 1050 MAD");
  log("   ✓ Indépendance totale des devis validée (Alpha=1250 MAD, Beta=1050 MAD).");

  log("5. Client vérifie la liste des 2 vendeurs et accepte l'offre d'Artisan B...");
  const cliOrders1 = await apiFetch(`/client/orders?clientRef=${client.user.id}`, { headers: headersClient });
  const cliCustom = cliOrders1.data.find((o) => o.id === customReqId);
  assert(cliCustom, "Client doit voir sa demande dans Mes Commandes");
  assert(cliCustom.status === "devis_recu", `Statut attendu=devis_recu, reçu=${cliCustom.status}`);
  assert(cliCustom.quotes?.length === 2, `Client doit voir les 2 vendeurs, reçu=${cliCustom.quotes?.length}`);

  const acceptRes = await apiFetch(`/client/custom-requests/${customReqId}/accept-quote`, {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({ quoteIndex: 1, artisanRef: artisanB.user.id, useWallet: false }),
  });
  assert(acceptRes.ok && acceptRes.data?.success, `Acceptation devis échouée: ${JSON.stringify(acceptRes.data)}`);
  const createdOrderId = acceptRes.data.orderId;
  log(`   ✓ Devis Beta accepté -> Commande créée (${createdOrderId}).`);

  log("6. Vérification post-acceptation (Retrait Marché + Apparition Commandes Actuelles Artisan B)...");
  const [mktA4, mktB4, ordA4, ordB4, cliOrders2] = await Promise.all([
    apiFetch("/artisan/custom-requests?category=all", { headers: headersA }),
    apiFetch("/artisan/custom-requests?category=all", { headers: headersB }),
    apiFetch(`/artisan/orders?artisanRef=${artisanA.user.id}`, { headers: headersA }),
    apiFetch(`/artisan/orders?artisanRef=${artisanB.user.id}`, { headers: headersB }),
    apiFetch(`/client/orders?clientRef=${client.user.id}`, { headers: headersClient }),
  ]);

  assert(!mktA4.data.requests.some((r) => r.id === customReqId), "Demande doit être retirée du marché pour Artisan A");
  assert(!mktB4.data.requests.some((r) => r.id === customReqId), "Demande doit être retirée du marché pour Artisan B");
  assert(!ordA4.data.orders.some((o) => o.id === createdOrderId), "Artisan A non retenu ne doit PAS voir la commande");
  const wonOrderB = ordB4.data.orders.find((o) => o.id === createdOrderId);
  assert(wonOrderB && wonOrderB.productType === "personnalise" && wonOrderB.status === "en_preparation",
    `Artisan B doit voir la commande 'personnalise' en 'en_preparation' dans ses commandes actuelles: ${JSON.stringify(wonOrderB)}`);
  const cliFinalOrd = cliOrders2.data.find((o) => o.id === createdOrderId);
  assert(cliFinalOrd && !cliOrders2.data.some((o) => o.id === customReqId),
    "Client doit voir la commande convertie sans doublon de la demande initiale");

  // Late quote rejection check
  const lateQuote = await apiFetch(`/artisan/custom-requests/${customReqId}/quote`, {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({ proposedPrice: 900, confectionDays: 4 }),
  });
  assert(lateQuote.status === 409, `Devis tardif après acceptation doit retourner 409, reçu ${lateQuote.status}`);
  log("   ✓ Retrait marché, apparition chez le Maâlem retenu, et blocage devis tardif OK.");

  log("7. Vérification commandes Standard & Sur-Commande + Sécurité Anti-IDOR...");
  const [stdRes, surCmdRes] = await Promise.all([
    apiFetch("/client/orders", {
      method: "POST",
      headers: headersClient,
      body: JSON.stringify({
        clientRef: client.user.id,
        artisanRef: artisanA.user.id,
        artisanName: artisanA.user.fullName,
        totalPrice: 400,
        productType: "standard",
        productTitle: `Bol Zellige Std #${uid}`,
      }),
    }),
    apiFetch("/client/orders", {
      method: "POST",
      headers: headersClient,
      body: JSON.stringify({
        clientRef: client.user.id,
        artisanRef: artisanB.user.id,
        artisanName: artisanB.user.fullName,
        totalPrice: 800,
        productType: "sur_commande",
        productTitle: `Tapis Sur-Cmd #${uid}`,
      }),
    }),
  ]);
  assert(stdRes.ok && stdRes.data.productType === "standard", "Création commande standard OK");
  assert(surCmdRes.ok && surCmdRes.data.productType === "sur_commande", "Création commande sur_commande OK");

  // Artisan A ne doit pas pouvoir accepter la commande d'Artisan B
  const hijackAttempt = await apiFetch(`/artisan/orders/${surCmdRes.data.id}/accept`, {
    method: "POST",
    headers: headersA,
  });
  assert(hijackAttempt.status === 403, `Tentative d'acceptation inter-vendeur doit être refusée (403), reçu ${hijackAttempt.status}`);

  const [ordAFinal, ordBFinal] = await Promise.all([
    apiFetch(`/artisan/orders?artisanRef=${artisanA.user.id}`, { headers: headersA }),
    apiFetch(`/artisan/orders?artisanRef=${artisanB.user.id}`, { headers: headersB }),
  ]);
  assert(ordAFinal.data.orders.some((o) => o.id === stdRes.data.id && o.productType === "standard"), "Artisan A reçoit la cmd standard");
  assert(!ordAFinal.data.orders.some((o) => o.id === surCmdRes.data.id), "Artisan A ne voit pas la cmd sur_commande d'Artisan B");
  assert(ordBFinal.data.orders.some((o) => o.id === surCmdRes.data.id && o.productType === "sur_commande"), "Artisan B reçoit la cmd sur_commande");
  log("   ✓ Flux Standard, Sur-Commande et Anti-IDOR validés avec succès.");

  log("8. Création Post Sur Commande / Hors stock + Tags/Tailles/Couleurs + Commande client...");
  const badIpRes = await apiFetch("/artisan/products", {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({
      title: `Post Sans Authenticité #${uid}`,
      price: 500,
      productType: "sur_commande",
      ipAuthenticityAccepted: false,
    }),
  });
  assert(badIpRes.status === 400, `Engagement d'authenticité false doit échouer (400), reçu ${badIpRes.status}`);

  const surCmdPostRes = await apiFetch("/artisan/products", {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({
      title: `Caftan Fassi Sur-Cmd #${uid}`,
      description: "Confection main sur commande",
      price: 1000,
      productType: "sur_commande",
      category: "Textile & Caftans",
      manufacturingDays: 9,
      personalizationMode: "delegate_to_market",
      photos: ["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"],
      tags: ["FaitMain", "Zellige", "Broderie"],
      sizes: ["M", "L", "Sur mesure"],
      colors: ["Émeraude", "Or"],
      ipAuthenticityAccepted: true,
    }),
  });
  assert(surCmdPostRes.status === 201 && surCmdPostRes.data?.success, `Échec création post Sur Commande: ${JSON.stringify(surCmdPostRes.data)}`);
  const createdPost = surCmdPostRes.data.product;
  assert(createdPost.productType === "sur_commande", `Type attendu sur_commande, reçu ${createdPost.productType}`);
  assert(createdPost.sizes?.includes("L") && createdPost.colors?.includes("Or"), "Tailles et couleurs doivent être persistées sur le post");
  assert(createdPost.tags?.includes("FaitMain") && createdPost.photos?.length === 2, "Tags et multi-photos doivent être persistés");

  const clientWithSpecsOrderRes = await apiFetch("/client/orders", {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({
      clientRef: client.user.id,
      artisanRef: artisanA.user.id,
      artisanName: artisanA.user.fullName,
      totalPrice: createdPost.clientPrice || 1060,
      productType: "sur_commande",
      productTitle: createdPost.title,
      productImage: createdPost.image,
      productId: createdPost.id,
      quantity: 1,
      selectedSize: "L",
      selectedColor: "Or",
      tags: createdPost.tags,
      productPhotos: createdPost.photos,
    }),
  });
  assert(clientWithSpecsOrderRes.ok && clientWithSpecsOrderRes.data?.selectedSize === "L" && clientWithSpecsOrderRes.data?.selectedColor === "Or",
    "La commande client doit conserver Taille et Couleur choisies + Tags");

  const cliOrdersSpecs = await apiFetch(`/client/orders?clientRef=${client.user.id}`, { headers: headersClient });
  const specOrderView = cliOrdersSpecs.data.find((o) => o.id === clientWithSpecsOrderRes.data.id);
  assert(specOrderView?.selectedSize === "L" && specOrderView?.selectedColor === "Or" && specOrderView?.tags?.includes("Zellige"),
    "La vue commande client (GET /client/orders) doit retourner Taille, Couleur et Tags");

  const [catListRes, artOrdersSpecs] = await Promise.all([
    apiFetch("/products?limit=100"),
    apiFetch(`/artisan/orders?artisanRef=${artisanA.user.id}`, { headers: headersA }),
  ]);
  const catItem = catListRes.data?.data?.find((p) => p.id === createdPost.id);
  assert(catItem && catItem.productType === "sur_commande" && catItem.sizes?.includes("L") && catItem.colors?.includes("Or"),
    "Le catalogue public (/api/products) doit exposer Sur Commande + Tailles/Couleurs/Tags");
  const artSpecOrder = artOrdersSpecs.data?.orders?.find((o) => o.id === clientWithSpecsOrderRes.data.id);
  assert(artSpecOrder?.selectedSize === "L" && artSpecOrder?.selectedColor === "Or",
    "La vue commande artisan doit aussi exposer Taille et Couleur choisies");
  log("   ✓ Post Sur Commande + Tags/Tailles/Couleurs + Vue Commande Client/Artisan validés.");

  log("9. Notifications résilientes (Clôture enchère Marché Public + Accord Diagramme 5)...");
  const [notifsA, notifsB] = await Promise.all([
    apiFetch(`/notifications?userId=${artisanA.user.id}&userType=artisan`, { headers: headersA }),
    apiFetch(`/notifications?userId=${artisanB.user.id}&userType=artisan`, { headers: headersB }),
  ]);
  assert(notifsA.ok && notifsA.data.notifications.some((n) => n.type === "custom_request_closed" && n.sourceId === customReqId),
    "Artisan A non retenu doit recevoir la notification de clôture Marché Public");
  assert(notifsB.ok && notifsB.data.notifications.some((n) => n.type === "quote_accepted" && n.sourceId === createdOrderId),
    "Artisan B retenu doit recevoir la notification d'acceptation de devis");

  log("10. Diagramme 5 (#post-accord) Cas 1 (From Scratch: Client seul, VB exclu) + Retrait...");
  // Vérifier blocage avant validation réception client
  const prematureRes = await apiFetch(`/artisan/orders/${createdOrderId}/request-publication-consent`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({
      title: "Création Finale Bot",
      price: 900,
      image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
      consentMessage: "Puis-je publier cette pièce ?",
    }),
  });
  assert(prematureRes.status === 400, `Demande d'accord avant validation réception client doit être refusée (400), reçu ${prematureRes.status}`);

  // Client valide la réception
  const valDeliv1 = await apiFetch(`/client/orders/${createdOrderId}/validate-delivery`, {
    method: "POST",
    headers: headersClient,
  });
  // Si en_preparation (accept-quote), /deliver valide la réception client directement
  const ensureValidated = valDeliv1.ok
    ? valDeliv1
    : await apiFetch(`/client/orders/${createdOrderId}/deliver`, { method: "POST", headers: headersClient });
  assert(ensureValidated.ok, `Validation réception client échouée: ${JSON.stringify(ensureValidated.data)}`);

  // Maintenant Artisan B envoie la demande d'accord via Pop-up message modifiable
  const consentReq1 = await apiFetch(`/artisan/orders/${createdOrderId}/request-publication-consent`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({
      title: `Théière Finale Publiée #${uid}`,
      price: 950,
      image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
      tags: ["Maillechort", "Fès"],
      sizes: ["Unique"],
      colors: ["Argent"],
      consentMessage: "Bonjour, puis-je ajouter votre belle théière à mon catalogue ?",
    }),
  });
  assert(consentReq1.ok && consentReq1.data?.pendingConsent === true && consentReq1.data?.requiresSourceVendor === false,
    `Cas From Scratch doit interroger uniquement le client (requiresSourceVendor=false): ${JSON.stringify(consentReq1.data)}`);

  const cliNotifs1 = await apiFetch(`/notifications?userId=${client.user.id}&userType=client`, { headers: headersClient });
  const consentNotifCli = cliNotifs1.data.notifications.find((n) => n.type === "republication_consent_request" && n.sourceId === createdOrderId);
  assert(consentNotifCli && consentNotifCli.actionStatus === "pending", "Le client doit recevoir la notification interactive d'accord");

  // Client accepte -> publication automatique + notification vendeur V
  const cliAcceptRes = await apiFetch(`/notifications/consent/${createdOrderId}/respond`, {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({ decision: "accept", role: "client", userId: client.user.id }),
  });
  assert(cliAcceptRes.ok && cliAcceptRes.data?.published === true && cliAcceptRes.data?.productId,
    `Publication attendue après accord client: ${JSON.stringify(cliAcceptRes.data)}`);
  const publishedProdId = cliAcceptRes.data.productId;

  const notifsBPublished = await apiFetch(`/notifications?userId=${artisanB.user.id}&userType=artisan`, { headers: headersB });
  assert(notifsBPublished.data.notifications.some((n) => n.type === "republication_consent_accepted" && n.sourceId === publishedProdId),
    "Artisan B doit recevoir la notification Demande ACCEPTÉE — Post publié");

  // Retrait de l'accord par le client
  const withdrawRes = await apiFetch(`/notifications/consent/${createdOrderId}/withdraw`, {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({ userId: client.user.id, reason: "Changement d'avis" }),
  });
  assert(withdrawRes.ok && withdrawRes.data?.consentStatus === "withdrawn", `Retrait accord échoué: ${JSON.stringify(withdrawRes.data)}`);
  const [notifsBWithdrawn, withdrawnProdGet] = await Promise.all([
    apiFetch(`/notifications?userId=${artisanB.user.id}&userType=artisan`, { headers: headersB }),
    apiFetch(`/products/${publishedProdId}`),
  ]);
  assert(notifsBWithdrawn.data.notifications.some((n) => n.type === "republication_consent_withdrawn" && n.sourceId === publishedProdId),
    "Artisan B doit recevoir l'alerte Retrait de l'accord");
  assert(withdrawnProdGet.status === 404, `Le post retiré doit être inaccessible (404), reçu ${withdrawnProdGet.status}`);
  log("   ✓ Cas 1 From Scratch (Client seul) + Publication + Retrait de l'accord validés.");

  log("11. Diagramme 5 Cas 2 (From Post: Client + Vendeur de Base VB, veto 1 refus suffit)...");
  const reqFromPostRes = await apiFetch("/client/custom-requests", {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({
      clientRef: client.user.id,
      customizationOrigin: "from_post",
      sourceProductId: createdPost.id,
      sourceVendorId: artisanA.user.id,
      categoryName: "Textile & Caftans",
      title: `Caftan Inspiré #${uid}`,
      description: "Adaptation depuis le modèle d'Artisan A",
      budget: 1300,
      selectedSize: "M",
      selectedColor: "Émeraude",
      tags: ["FaitMain"],
      safetyGuidelinesAccepted: true,
    }),
  });
  assert(reqFromPostRes.status === 201 && reqFromPostRes.data?.success, "Création demande from_post OK");
  const fromPostReqId = reqFromPostRes.data.customRequest.id;

  // Artisan B soumet un devis, Client choisit Artisan B, valide réception
  const qFromPost = await apiFetch(`/artisan/custom-requests/${fromPostReqId}/quote`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({ proposedPrice: 1200, confectionDays: 7, note: "Confection sur base modèle" }),
  });
  assert(qFromPost.ok, "Devis Artisan B sur demande from_post OK");
  const accFromPost = await apiFetch(`/client/custom-requests/${fromPostReqId}/accept-quote`, {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({ quoteIndex: 0, artisanRef: artisanB.user.id, useWallet: false }),
  });
  assert(accFromPost.ok && accFromPost.data?.orderId, "Acceptation devis from_post OK");
  const fromPostOrderId = accFromPost.data.orderId;
  const valDeliv2 = await apiFetch(`/client/orders/${fromPostOrderId}/deliver`, { method: "POST", headers: headersClient });
  assert(valDeliv2.ok, "Validation réception from_post OK");

  // Artisan B demande l'accord -> Client + VB (Artisan A) interrogés
  const consentReq2 = await apiFetch(`/artisan/orders/${fromPostOrderId}/request-publication-consent`, {
    method: "POST",
    headers: headersB,
    body: JSON.stringify({
      title: `Caftan Dérivé Refusé #${uid}`,
      price: 1100,
      image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
      consentMessage: "Accord pour publier cette variante ?",
    }),
  });
  assert(consentReq2.ok && consentReq2.data?.requiresSourceVendor === true,
    `Cas From Post doit exiger l'accord du VB: ${JSON.stringify(consentReq2.data)}`);

  // Client accepte mais Artisan A (VB) refuse -> 1 seul refus suffit => Demande REFUSÉE
  const cliOk2 = await apiFetch(`/notifications/consent/${fromPostOrderId}/respond`, {
    method: "POST",
    headers: headersClient,
    body: JSON.stringify({ decision: "accept", role: "client", userId: client.user.id }),
  });
  assert(cliOk2.ok && cliOk2.data?.consentStatus === "partially_granted" && cliOk2.data?.published === false,
    "Ne doit PAS publier tant que VB n'a pas accepté");

  const vbNotifs = await apiFetch(`/notifications?userId=${artisanA.user.id}&userType=artisan`, { headers: headersA });
  assert(vbNotifs.data.notifications.some((n) => n.type === "republication_consent_request" && n.sourceId === fromPostOrderId),
    "Le Vendeur de Base (Artisan A) doit recevoir la notification Accepter/Refuser");

  const vbRefuse = await apiFetch(`/notifications/consent/${fromPostOrderId}/respond`, {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({ decision: "refuse", role: "source_vendor", userId: artisanA.user.id }),
  });
  assert(vbRefuse.ok && vbRefuse.data?.consentStatus === "rejected" && vbRefuse.data?.published === false,
    "1 seul refus (VB) doit rejeter sans publier");

  const notifsBRejected = await apiFetch(`/notifications?userId=${artisanB.user.id}&userType=artisan`, { headers: headersB });
  assert(notifsBRejected.data.notifications.some((n) => n.type === "republication_consent_refused" && n.sourceId === fromPostOrderId),
    "Artisan B doit recevoir la notification Demande REFUSÉE");
  log("   ✓ Cas 2 From Post (Client + VB, veto 1 refus) validé avec succès.");
}

async function main() {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`🤖 VORK BOT E2E & LOAD RUNNER (Concurrence = ${CONCURRENCY})`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  const t0 = performance.now();
  const workers = Array.from({ length: CONCURRENCY }, (_, idx) => runSingleScenario(idx + 1));
  const results = await Promise.allSettled(workers);
  const totalTimeMs = performance.now() - t0;

  const passed = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected");

  if (failed.length > 0) {
    console.error("\n❌ ÉCHECS DÉTECTÉS :");
    failed.forEach((f, i) => console.error(`  Worker Failure #${i + 1}:`, f.reason));
  }

  const sortedLatencies = [...stats.latenciesMs].sort((a, b) => a - b);
  const avgMs = sortedLatencies.length > 0 ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length : 0;
  const p95Ms = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : 0;
  const maxMs = sortedLatencies.length > 0 ? sortedLatencies[sortedLatencies.length - 1] : 0;

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`📊 RAPPORT FINAL BOT`);
  console.log(`───────────────────────────────────────────────────────────`);
  console.log(`  Scénarios réussis : ${passed} / ${CONCURRENCY}`);
  console.log(`  Requêtes totales  : ${stats.totalRequests}`);
  console.log(`  Erreurs réseau    : ${stats.failedRequests}`);
  console.log(`  Durée totale      : ${(totalTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Latence moyenne   : ${avgMs.toFixed(1)} ms`);
  console.log(`  Latence P95       : ${p95Ms.toFixed(1)} ms`);
  console.log(`  Latence Max       : ${maxMs.toFixed(1)} ms`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();

