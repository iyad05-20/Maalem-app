// ─── View Router ─────────────────────────────────────────────────────────────
export type View =
  | 'home'
  | 'search'
  | 'atelier'
  | 'favorites'
  | 'profile'
  | 'cart'
  | 'product-detail'
  | 'client-wallet'
  | 'client-order-detail';

// ─── Badge Types ──────────────────────────────────────────────────────────────
export type Badge = 'Premium' | 'AI Pick' | 'Unique' | 'Dans votre style' | 'Sélection IA' | null;

export type GlowColor = 'gold' | 'blue' | 'green' | 'terracotta';

// ─── Product ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  title: string;
  category: string;
  price: string;         // e.g. "1,200 DH"
  rating: number;
  badge: Badge;
  badgeLabel?: string;    // Custom discreet badge label if needed
  image: string;
  // Extended fields (for real DB later)
  description?: string;
  artisanId?: string;
  artisanRef?: string;
  artisanName?: string;
  images?: string[];     // gallery
  stock?: number;
  occasionCategory?: 'cadeaux' | 'maison' | 'cuisine';
  region?: 'Fès' | 'Marrakech' | 'Chefchaouen' | 'Safi';
  // Recommendation System fields
  rec_tags?: {
    style?: string[];
    material?: string[];
    color_vibe?: string;
  };
  isExplore?: boolean;   // AI explore mode flag
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
export interface HeroData {
  label: string;
  title: string;
  description: string;
  price: string;
  image: string;
  glowColor: GlowColor;
}

// ─── Artisan Profile ─────────────────────────────────────────────────────────
export interface ArtisanProfile {
  id: string;
  name: string;
  title: string;          // e.g. "Maître Maâlem Dinandier"
  city: string;
  portrait: string;
  workshopImages: string[];
  bio: string;
  quote: string;
  experienceYears: number;
  creationsCount: number;
}

// ─── Promo Banner ────────────────────────────────────────────────────────────
export interface PromoData {
  title: string;
  subtitle: string;
  offer: string;
  badge: string;
  cta: string;
  image: string;
  endTimeMs: number; // timestamp for countdown
}

// ─── Collections ─────────────────────────────────────────────────────────────
export interface Collections {
  trending: string[];   // product IDs
  aiPicks: string[];
  premium: string[];
  duoSpotlight: string[];
  duoMaalem: string[];
  regionFes: string[];
  occasions: {
    cadeaux: string[];
    maison: string[];
    cuisine: string[];
  };
}

// ─── Mock Data Store ─────────────────────────────────────────────────────────
export interface MaalemData {
  products: Product[];
  collections: Collections;
  hero: HeroData;
  featuredArtisan: ArtisanProfile;
  promo: PromoData;
}

