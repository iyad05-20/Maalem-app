import { supabase } from './supabase.client.js';

let cachedProducts = [];

function normalizeProduct(p) {
  if (!p) return p;
  return {
    ...p,
    artisanName: p.artisan_name || p.artisanName || 'Maâlem',
    artisan_name: p.artisan_name || p.artisanName || 'Maâlem',
    imageUrl: p.image_url || p.imageUrl,
    image_url: p.image_url || p.imageUrl,
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

