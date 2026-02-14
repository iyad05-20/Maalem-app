
import { db } from './firebase.config';
import { collection, query, orderBy, startAt, endAt, getDocs, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import * as geofire from 'geofire-common';
import { Artisan, Order, Coordinates } from '../types';
import { sanitizeFirestoreData } from '../utils';

// --- Types ---

interface ScoredArtisan extends Artisan {
  compositeScore: number;
  scoreDetails: {
    distanceScore: number;
    ratingScore: number;
    reactivityScore: number;
    workloadScore: number;
  };
  realDistance: number;
}

// --- Helpers ---

/**
 * Calculates distance between two points using Haversine formula (Meters)
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  if (!coord1 || !coord2) return Infinity;
  const distanceInM = geofire.distanceBetween(
    [coord1.lat, coord1.lng],
    [coord2.lat, coord2.lng]
  ) * 1000;
  return distanceInM;
};

/**
 * Weighted Scoring Formula
 */
const calculateScore = (artisan: Artisan, distanceKm: number): ScoredArtisan => {
  // 1. Distance Score (40%): 100pts at 0km, -10pts per km. Min 0.
  const distScore = Math.max(0, 100 - (distanceKm * 10));

  // 2. Rating Score (30%): Scaled to 100.
  const ratingVal = artisan.rating || 0;
  const ratingScore = (ratingVal / 5) * 100;

  // 3. Reactivity Score (20%): 100pts at 0min, -2pts per min. Min 0.
  const responseTime = artisan.averageResponseTime || 60;
  const reactivityScore = Math.max(0, 100 - (responseTime * 2));

  // 4. Workload Score (10%): Penalty if overloaded.
  const activeJobs = artisan.currentActiveJobs || 0;
  const maxJobs = artisan.maxConcurrentJobs || 3;
  const workloadScore = activeJobs < maxJobs ? 100 : 30;

  const total = (distScore * 0.4) + (ratingScore * 0.3) + (reactivityScore * 0.2) + (workloadScore * 0.1);

  return {
    ...artisan,
    realDistance: distanceKm,
    compositeScore: Number(total.toFixed(1)),
    scoreDetails: {
      distanceScore: distScore,
      ratingScore: ratingScore,
      reactivityScore: reactivityScore,
      workloadScore: workloadScore
    }
  };
};

/**
 * Fetches artisans within a specific radius using Geohash bounds.
 */
const getArtisansInRadius = async (
  category: string,
  center: Coordinates,
  radiusKm: number,
  excludeIds: Set<string>
): Promise<Artisan[]> => {
  const centerArr: [number, number] = [center.lat, center.lng];
  const radiusInM = radiusKm * 1000;

  const bounds = geofire.geohashQueryBounds(centerArr, radiusInM);
  const promises = [];
  const artisansRef = collection(db, "artisans");

  for (const b of bounds) {
    const q = query(
      artisansRef,
      orderBy('g'),
      startAt(b[0]),
      endAt(b[1])
    );
    promises.push(getDocs(q));
  }

  const snapshots = await Promise.all(promises);
  const candidates: Artisan[] = [];

  for (const snap of snapshots) {
    for (const d of snap.docs) {
      if (excludeIds.has(d.id)) continue;

      const data = sanitizeFirestoreData(d.data());
      const art = { ...data, id: d.id } as Artisan;

      if (art.category !== category) continue;
      if (art.available !== true) continue;

      if (art.locationCoords) {
        const distInM = geofire.distanceBetween(centerArr, [art.locationCoords.lat, art.locationCoords.lng]) * 1000;
        if (distInM <= radiusInM) {
          candidates.push(art);
        }
      }
    }
  }

  return candidates;
};

// --- Core Logic ---

/**
 * Finds the top artisans for a new order.
 */
export const findBestArtisans = async (category: string, initialRadius: number = 1, excludeIds: string[] = []): Promise<string[]> => {
  // Fallback case: we need location context. 
  // Ideally CreateOrderView passes it. For now, default to Dakar for safety.
  const DAKAR_CENTER = { lat: 14.7167, lng: -17.4677 };
  return findBestArtisansWithLocation(category, DAKAR_CENTER, excludeIds);
};

export const findBestArtisansWithLocation = async (
  category: string,
  center: Coordinates,
  excludeIdsArray: string[] = []
): Promise<string[]> => {
  const RADIUS_STEPS = [1, 2, 4, 8, 15, 30]; // Expanded radius steps
  const TARGET_COUNT = 10;

  const foundArtisans = new Map<string, ScoredArtisan>();
  const excludeSet = new Set(excludeIdsArray);

  for (const radius of RADIUS_STEPS) {
    if (foundArtisans.size >= TARGET_COUNT) break;

    const candidates = await getArtisansInRadius(category, center, radius, excludeSet);

    for (const art of candidates) {
      if (!foundArtisans.has(art.id)) {
        const distKm = geofire.distanceBetween(
          [center.lat, center.lng],
          [art.locationCoords!.lat, art.locationCoords!.lng]
        );
        const scored = calculateScore(art, distKm);
        foundArtisans.set(art.id, scored);
        excludeSet.add(art.id);
      }
    }
  }

  const ranked = Array.from(foundArtisans.values())
    .sort((a, b) => b.compositeScore - a.compositeScore);

  return ranked.slice(0, 10).map(a => a.id);
};

/**
 * Finds the NEXT best artisan when one is rejected.
 */
export const getNextBestArtisan = async (orderId: string): Promise<string | null> => {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return null;

    const order = orderSnap.data() as Order;

    if (order.status !== "EN ATTENTE D'EXPERT") {
      return null;
    }

    const category = order.category;
    const center = order.locationCoords || { lat: 14.7167, lng: -17.4677 };

    const excludeIds = [
      ...(order.contactedArtisanIds || []),
      ...(order.rejectedArtisanIds || [])
    ];

    const recommendations = await findBestArtisansWithLocation(category, center, excludeIds);

    if (recommendations.length > 0) {
      const nextArtisanId = recommendations[0];

      await updateDoc(orderRef, {
        contactedArtisanIds: arrayUnion(nextArtisanId),
        targetedArtisans: arrayUnion(nextArtisanId),
        updatedAt: new Date().toISOString()
      });

      return nextArtisanId;
    }
    return null;
  } catch (error) {
    console.error("Error getting next best artisan:", error);
    return null;
  }
};

/**
 * Initial search for artisans when an order is created.
 */
export const getInitialArtisans = async (_orderId: string, category: string, center: Coordinates): Promise<string[]> => {
  return findBestArtisansWithLocation(category, center);
};
