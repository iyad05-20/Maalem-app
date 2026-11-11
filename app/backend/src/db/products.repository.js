import { supabase } from './supabase.client.js';

let cachedProducts = [];

function normalizeStringList(val) {
  if (Array.isArray(val)) {
    return Array.from(new Set(val.map((x) => String(x || '').trim()).filter(Boolean)));
  }
  if (typeof val === 'string' && val.trim()) {
    return Array.from(new Set(val.split(',').map((x) => x.trim()).filter(Boolean)));
  }
  return [];
}

export function extractNormalizedTags(p) {
  if (!p) return [];
  const tags = [];
  if (Array.isArray(p.tags)) tags.push(...p.tags);
  if (Array.isArray(p.identity?.tags)) tags.push(...p.identity.tags);
  if (p.rec_tags && typeof p.rec_tags === 'object') {
    for (const key of ['style', 'material', 'color_vibe', 'custom']) {
      if (Array.isArray(p.rec_tags[key])) tags.push(...p.rec_tags[key]);
      else if (typeof p.rec_tags[key] === 'string' && p.rec_tags[key].trim()) {
        tags.push(p.rec_tags[key].trim());
      }
    }
  }
  return Array.from(new Set(tags.map((t) => String(t || '').trim()).filter(Boolean)));
}

export function normalizeProduct(p) {
  if (!p) return p;
  const identity = p.identity && typeof p.identity === 'object' ? p.identity : {};
  const rawType = identity.product_type || p.product_type || p.productType || 'standard';
  const productType = rawType === 'sur_commande' ? 'sur_commande' : 'standard';
  const photos = normalizeStringList(identity.photos || p.photos);
  const primaryImage = photos[0] || p.image_url || p.imageUrl || p.image || '';
  if (primaryImage && !photos.includes(primaryImage)) {
    photos.unshift(primaryImage);
  }
  const sizes = normalizeStringList(identity.sizes || p.sizes);
  const colors = normalizeStringList(identity.colors || p.colors);
  const tags = extractNormalizedTags(p);
  const isOutOfStock = Boolean(p.is_out_of_stock || p.isOutOfStock);

  return {
    ...p,
    artisanName: p.artisan_name || p.artisanName || 'Maâlem',
    artisan_name: p.artisan_name || p.artisanName || 'Maâlem',
    artisanRef: p.facets?.artisan_ref || identity.artisan_id || p.artisanRef || null,
    imageUrl: primaryImage,
    image_url: primaryImage,
    image: primaryImage,
    photos,
    tags,
    sizes,
    colors,
    productType,
    product_type: productType,
    isOnDemand: productType === 'sur_commande',
    availabilityMode: productType === 'sur_commande' ? 'hors_stock_sur_commande' : 'en_stock',
    isOutOfStock,
    manufacturingDays: identity.manufacturing_days || p.manufacturingDays || 5,
    netPrice: identity.net_price ?? p.netPrice ?? p.price,
    clientPrice: p.price ?? p.clientPrice,
    shippingFee: identity.shipping_fee ?? p.shippingFee ?? 0,
    shippingThreshold: identity.shipping_threshold ?? p.shippingThreshold ?? 1,
    dimensions: identity.dimensions || p.dimensions || null,
    personalizationMode: p.personalization_mode || identity.personalization_mode || p.personalizationMode || 'accept_direct',
    ipAuthenticityAccepted: Boolean(identity.ip_authenticity_accepted ?? p.ipAuthenticityAccepted),
  };
}

export async function getAllProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    cachedProducts = (data || []).map(normalizeProduct);
    return cachedProducts;
  } catch (err) {
    console.warn(`[VORK-API] ⚠️ Failed to fetch products from Supabase (${err.message}). Using cache/fallback.`);
    if (cachedProducts.length > 0) {
      return cachedProducts;
    }
    // Return a basic mock fallback list if cache is empty
    return [
      {
        id: "p1",
        title: "Vase en Céramique Bleue Fez",
        category: "Céramique",
        category_group: "Decoration",
        price: 250,
        in_stock: true,
        artisan_name: "Artisan Fez",
        image_url: ""
      },
      {
        id: "p2",
        title: "Tapis Berbère Beni Ourain",
        category: "Tapis",
        category_group: "Textile",
        price: 1800,
        in_stock: true,
        artisan_name: "Tisseuse Atlas",
        image_url: ""
      },
      {
        id: "p3",
        title: "Lanterne en Cuivre Gravé",
        category: "Luminaires",
        category_group: "Decoration",
        price: 450,
        in_stock: true,
        artisan_name: "Forgeron Marrakech",
        image_url: ""
      }
    ];
  }
}

export async function getProductById(id) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return normalizeProduct(data);
  } catch (err) {
    console.warn(`[VORK-API] ⚠️ Failed to fetch product ${id} from Supabase (${err.message}). Using cache/fallback.`);
    const found = cachedProducts.find(p => p.id === id);
    if (found) return found;
    return {
      id,
      title: "Produit Artisanat",
      category: "Général",
      category_group: "Artisanat",
      price: 150,
      in_stock: true,
      artisan_name: "Maâlem Vork",
      image_url: ""
    };
  }
}

export async function decrementProductStock(id, qty = 1) {
  try {
    const { data: prod } = await supabase
      .from('products')
      .select('stock, initial_stock, in_stock, is_out_of_stock, stock_policy')
      .eq('id', id)
      .single();

    if (prod && typeof prod.stock === 'number') {
      const newStock = Math.max(0, prod.stock - qty);
      const isOutOfStock = newStock === 0;
      // initial_stock est la valeur 100% définie lors du dernier ajout de stock par le vendeur
      const initialStock = prod.initial_stock || prod.stock;
      const stockPercentage = initialStock > 0 ? Math.round((newStock / initialStock) * 100) : 0;
      const isLowStock = stockPercentage <= 20 && !isOutOfStock;

      await supabase
        .from('products')
        .update({
          stock: newStock,
          in_stock: !isOutOfStock,
          is_out_of_stock: isOutOfStock,
          is_hidden: isOutOfStock, // Masquage automatique du post sur le marché (Décision 27)
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Mettre à jour le cache local
      const cached = cachedProducts.find(p => p.id === id);
      if (cached) {
        cached.stock = newStock;
        cached.in_stock = !isOutOfStock;
        cached.is_out_of_stock = isOutOfStock;
        cached.is_hidden = isOutOfStock;
      }

      return { success: true, newStock, isOutOfStock, initialStock, stockPercentage, isLowStock };
    }
  } catch (err) {
    console.warn(`[VORK-API] ⚠️ Failed to decrement stock for ${id} in Supabase:`, err.message);
  }
  return { success: false };
}

/**
 * Vérifie le stock AVANT d'accepter une commande (P5 - Gestion Stock)
 * Si stock = 0 → bloque l'acceptation et renvoie une erreur avec redirection
 * Si stock ≤ 20% → autorise mais signale "Stock Limité"
 * 
 * @returns {{ canAccept, stock, isLowStock, isOutOfStock, message }}
 */
export async function checkStockBeforeAccept(productId, qtyNeeded = 1) {
  try {
    const { data: prod } = await supabase
      .from('products')
      .select('stock, initial_stock, in_stock, is_out_of_stock, stock_policy, title')
      .eq('id', productId)
      .single();

    if (!prod) return { canAccept: true, stockTracked: false };

    // Si le vendeur n'a pas activé le stock (stock = null) → pas de blocage
    if (prod.stock === null || prod.stock === undefined) {
      return { canAccept: true, stockTracked: false };
    }

    const currentStock = Number(prod.stock);
    const initialStock = Number(prod.initial_stock || prod.stock);
    const stockPercentage = initialStock > 0 ? Math.round((currentStock / initialStock) * 100) : 0;

    // Politique de la boutique (stock_policy)
    const policy = prod.stock_policy || {};
    const allowOverstock = policy.allow_order_exceeding_stock === true; // Option 1: Commande possible si qté > stock

    if (currentStock <= 0) {
      return {
        canAccept: false,
        stockTracked: true,
        stock: currentStock,
        isOutOfStock: true,
        isLowStock: false,
        productTitle: prod.title,
        message: "stock_epuise_incrementer_dabord",
        // Le vendeur doit incrémenter le stock avant de pouvoir accepter
        redirectTo: `/artisan/products/${productId}/stock`,
      };
    }

    if (currentStock < qtyNeeded && !allowOverstock) {
      return {
        canAccept: false,
        stockTracked: true,
        stock: currentStock,
        isOutOfStock: false,
        isLowStock: true,
        productTitle: prod.title,
        message: "stock_insuffisant_pour_quantite",
        redirectTo: `/artisan/products/${productId}/stock`,
      };
    }

    return {
      canAccept: true,
      stockTracked: true,
      stock: currentStock,
      isOutOfStock: false,
      isLowStock: stockPercentage <= 20,
      stockPercentage,
    };
  } catch (err) {
    console.warn(`[VORK-API] ⚠️ Failed to check stock for ${productId}:`, err.message);
    return { canAccept: true, stockTracked: false };
  }
}

/**
 * Récupérer les infos de stock d'un produit (pour affichage côté vendeur)
 */
export async function getProductStockInfo(productId) {
  try {
    const { data: prod } = await supabase
      .from('products')
      .select('stock, initial_stock, in_stock, is_out_of_stock, is_hidden, stock_policy, title')
      .eq('id', productId)
      .single();

    if (!prod) return null;

    const currentStock = prod.stock !== null ? Number(prod.stock) : null;
    const initialStock = prod.initial_stock ? Number(prod.initial_stock) : currentStock;
    const stockPercentage = (initialStock && initialStock > 0 && currentStock !== null)
      ? Math.round((currentStock / initialStock) * 100) 
      : null;

    return {
      productId,
      title: prod.title,
      currentStock,
      initialStock,
      stockPercentage,
      isOutOfStock: prod.is_out_of_stock || false,
      isHidden: prod.is_hidden || false,
      isLowStock: stockPercentage !== null && stockPercentage <= 20 && currentStock > 0,
      stockPolicy: prod.stock_policy || {},
    };
  } catch (err) {
    console.warn(`[VORK-API] ⚠️ Failed to get stock info for ${productId}:`, err.message);
    return null;
  }
}

export async function updateProductStockAction(id, action, payload = {}) {
  try {
    const updateData = { updated_at: new Date().toISOString() };
    if (action === "add_stock") {
      const newStockValue = Number(payload.stock) || 0;
      updateData.stock = newStockValue;
      // La valeur modifiée devient le nouveau 100% (initial_stock) — Décision P5
      updateData.initial_stock = newStockValue;
      updateData.in_stock = newStockValue > 0;
      updateData.is_out_of_stock = newStockValue === 0;
      updateData.is_hidden = false; // Ré-afficher le post quand le vendeur ajoute du stock
    } else if (action === "disable_tracking") {
      updateData.stock = null;
      updateData.initial_stock = null;
      updateData.in_stock = true;
      updateData.is_out_of_stock = false;
      updateData.is_hidden = false;
    } else if (action === "switch_to_on_demand") {
      updateData.product_type = "sur_commande";
      updateData.fabrication_lead_time_days = Number(payload.days) || 7;
      updateData.in_stock = true;
      updateData.is_out_of_stock = false;
      updateData.is_hidden = false;
    } else if (action === "hide_manually") {
      updateData.is_hidden = true;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, product: data };
  } catch (err) {
    console.warn(`[VORK-API] ⚠️ Failed to update product action for ${id}:`, err.message);
    return { success: false, error: err.message };
  }
}

export const artisanRamProducts = [];

export function mapCategoryToGroup(cat = "") {
  const c = String(cat).toLowerCase();
  if (c.includes("céra") || c.includes("pot") || c.includes("فخار") || c.includes("خزف")) return "ceramique";
  if (c.includes("cuir") || c.includes("maroquin") || c.includes("جلد")) return "maroquinerie";
  if (c.includes("text") || c.includes("caftan") || c.includes("نسيج") || c.includes("قفطان")) return "textile";
  if (c.includes("bois") || c.includes("zellige") || c.includes("خشب") || c.includes("زليج")) return "menuiserie";
  if (c.includes("cuiv") || c.includes("métal") || c.includes("نحاس") || c.includes("معادن")) return "dinanderie";
  if (c.includes("tapis") || c.includes("broder") || c.includes("زرابي") || c.includes("طرز")) return "broderie";
  if (c.includes("bijou") || c.includes("حلي") || c.includes("إكسسوار")) return "bijouterie";
  return "artisanat";
}

/**
 * Construit, persiste dans Supabase + cache RAM (et indexe éventuellement dans Meilisearch) un post produit unifié.
 */
export async function createCatalogProduct({
  productId = `prd-${Date.now()}`,
  artisanRef,
  artisanName = "Maâlem",
  title,
  description = "",
  category = "Céramique & Poterie",
  netPrice,
  productType = "standard",
  photos = [],
  image = "",
  tags = [],
  sizes = [],
  colors = [],
  manufacturingDays = 5,
  dimensions = null,
  shippingFee = 0,
  shippingThreshold = 1,
  personalizationMode = "accept_direct",
  stock = null,
  stockPolicy = {},
  ipAuthenticityAccepted = true,
  sourceOrderId = null,
}) {
  const normalizedType = productType === "sur_commande" ? "sur_commande" : "standard";
  const normalizedPhotos = normalizeStringList([...(Array.isArray(photos) ? photos : []), image]);
  const primaryImage = normalizedPhotos[0] || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600";
  const allPhotos = normalizedPhotos.length > 0 ? normalizedPhotos : [primaryImage];
  const normalizedTags = normalizeStringList(tags);
  const normalizedSizes = normalizeStringList(sizes);
  const normalizedColors = normalizeStringList(colors);

  const numNet = Number(netPrice);
  const commissionHt = Math.round(numNet * 0.05);
  const tvaVal = Math.round(commissionHt * 0.20);
  const clientPrice = numNet + commissionHt + tvaVal;
  const categoryGroup = mapCategoryToGroup(category);

  // Sur Commande => Hors stock immédiat (stock: null, commandable à la confection)
  const parsedStock = normalizedType === "sur_commande"
    ? null
    : (stock !== undefined && stock !== null && stock !== "" ? Math.max(0, parseInt(stock, 10)) : null);
  const isOutOfStock = normalizedType === "standard" && parsedStock !== null ? parsedStock === 0 : false;
  const isHidden = normalizedType === "standard" && parsedStock === 0;
  const resolvedStockPolicy = normalizedType === "sur_commande"
    ? { ...(stockPolicy && typeof stockPolicy === "object" ? stockPolicy : {}), allow_order_exceeding_stock: true }
    : (stockPolicy && typeof stockPolicy === "object" ? stockPolicy : {});

  const recTags = {
    style: normalizedTags.length > 0 ? normalizedTags : ["traditionnel", "fait-main"],
    material: [categoryGroup],
    color_vibe: normalizedColors.length > 0 ? normalizedColors : ["authentique", "naturel"],
    ...(normalizedTags.length > 0 ? { custom: normalizedTags } : {}),
  };

  const supabaseRow = {
    id: productId,
    title: String(title).trim(),
    category: category || "Céramique & Poterie",
    category_group: categoryGroup,
    price: clientPrice,
    in_stock: normalizedType === "sur_commande" ? true : (parsedStock !== null ? parsedStock > 0 : true),
    stock: parsedStock,
    initial_stock: parsedStock,
    is_out_of_stock: isOutOfStock,
    is_hidden: isHidden,
    stock_policy: resolvedStockPolicy,
    artisan_name: artisanName,
    image_url: primaryImage,
    personalization_mode: personalizationMode,
    accept_customization: personalizationMode !== "disabled",
    allow_public_customization: personalizationMode === "delegate_to_market",
    identity: {
      artisan_id: artisanRef,
      category: category || "Céramique & Poterie",
      category_group: categoryGroup,
      description: String(description || "").trim(),
      product_type: normalizedType,
      availability_mode: normalizedType === "sur_commande" ? "hors_stock_sur_commande" : "en_stock",
      net_price: numNet,
      commission_ht: commissionHt,
      tva: tvaVal,
      manufacturing_days: Number(manufacturingDays) || 5,
      shipping_fee: Number(shippingFee) || 0,
      shipping_threshold: Number(shippingThreshold) || 1,
      dimensions: dimensions || null,
      photos: allPhotos,
      tags: normalizedTags,
      sizes: normalizedSizes,
      colors: normalizedColors,
      ip_authenticity_accepted: Boolean(ipAuthenticityAccepted),
      personalization_mode: personalizationMode,
      accept_customization: personalizationMode !== "disabled",
      allow_public_customization: personalizationMode === "delegate_to_market",
      ...(sourceOrderId ? { source_order_id: sourceOrderId } : {}),
    },
    rec_tags: recTags,
    facets: {
      origin: ["maroc"],
      artisan_ref: artisanRef,
      ...(normalizedSizes.length > 0 ? { sizes: normalizedSizes } : {}),
      ...(normalizedColors.length > 0 ? { colors: normalizedColors } : {}),
    },
  };

  let persisted = false;
  try {
    const { error: sbError } = await supabase.from("products").insert(supabaseRow);
    if (sbError) {
      console.warn("[VORK-API] ⚠️ Failed to insert product into Supabase:", sbError.message);
    } else {
      persisted = true;
    }
  } catch (err) {
    console.warn("[VORK-API] ⚠️ Error writing product to Supabase:", err.message);
  }

  const normalizedProduct = normalizeProduct({
    ...supabaseRow,
    created_at: new Date().toISOString(),
  });
  // Conserver les champs historiques attendus par artisan-app (price = net artisan, clientPrice = TTC)
  const artisanProduct = {
    ...normalizedProduct,
    price: numNet,
    clientPrice,
    status: isHidden ? "hidden" : (normalizedType === "sur_commande" ? "active" : "active"),
    createdAt: normalizedProduct.created_at,
  };

  artisanRamProducts.unshift(artisanProduct);
  if (!cachedProducts.some((p) => p.id === normalizedProduct.id)) {
    cachedProducts.unshift(normalizedProduct);
  }

  return {
    persisted,
    supabaseRow,
    normalizedProduct,
    artisanProduct,
  };
}

/**
 * Masque ou supprime un post catalogue (ex: suppression vendeur ou retrait de l'accord Diagramme 5)
 * sans affecter les commandes déjà en cours.
 */
export async function withdrawOrDeleteCatalogProduct(productId, reason = "consent_withdrawn") {
  if (!productId) return { success: false };
  const idx = artisanRamProducts.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    artisanRamProducts.splice(idx, 1);
  }
  const cacheIdx = cachedProducts.findIndex((p) => p.id === productId);
  if (cacheIdx !== -1) {
    cachedProducts[cacheIdx].is_hidden = true;
    cachedProducts[cacheIdx].identity = {
      ...(cachedProducts[cacheIdx].identity || {}),
      [reason]: true,
    };
  }

  try {
    const { data: existing } = await supabase.from("products").select("identity").eq("id", productId).single();
    const updatedIdentity = {
      ...(existing?.identity || {}),
      [reason]: true,
      removed_at: new Date().toISOString(),
    };
    await supabase
      .from("products")
      .update({
        is_hidden: true,
        identity: updatedIdentity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
    return { success: true };
  } catch (err) {
    console.warn(`[VORK-API] ⚠️ Failed to withdraw/delete product ${productId}:`, err.message);
    return { success: false, error: err.message };
  }
}

