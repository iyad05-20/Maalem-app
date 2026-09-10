import { supabase } from './supabase.client.js';

let cachedProducts = [];

export async function getAllProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    cachedProducts = data || [];
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
    return data;
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
