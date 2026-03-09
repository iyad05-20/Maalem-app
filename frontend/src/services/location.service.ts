import { db } from './firebase.config';
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import * as geofire from 'geofire-common';
import { Coordinates } from '../types';

export const MARRAKECH_CENTER: Coordinates = { lat: 31.6295, lng: -7.9811 };

/**
 * Reverse Geocoding using Nominatim (OpenStreetMap)
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
            headers: {
                'User-Agent': 'VorkApp/1.0'
            }
        });
        const data = await response.json();
        const address = data.address;
        return address.city || address.town || address.suburb || address.village || 'Marrakech';
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return 'Marrakech';
    }
};

/**
 * Calculates distance between two coordinates in meters.
 */
export const calculateDistanceMeters = (coord1: Coordinates, coord2: Coordinates): number => {
    if (!coord1 || !coord2) return Infinity;
    // Filter out invalid (0,0) coordinates
    if ((coord1.lat === 0 && coord1.lng === 0) || (coord2.lat === 0 && coord2.lng === 0)) return Infinity;

    const R = 6371e3; // Earth radius in meters
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Clamp result for floats and handle precision
    const distanceMeters = R * c;
    return isNaN(distanceMeters) ? 0 : distanceMeters;
};

/**
 * Calculates and formats distance between two coordinates.
 * Returns string like "500 m" or "1.2 km". Returns null if coords missing.
 */
export const getFormattedDistance = (userLoc: Coordinates | undefined | null, artisanLoc: Coordinates | undefined | null): string | null => {
    if (!userLoc || !artisanLoc) return null;

    const meters = calculateDistanceMeters(userLoc, artisanLoc);

    if (meters === Infinity) return null;

    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Updates a Client's location in Firestore.
 */
export const updateClientLocation = async (userId: string, lat: number, lng: number) => {
    if (lat === 0 && lng === 0) return; // Prevent Null Island bug
    try {
        const cityName = await reverseGeocode(lat, lng);
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            locationCoords: { lat, lng },
            city: cityName,
            lastSeen: serverTimestamp()
        });
        console.debug(`[Location] Client ${userId} updated to ${cityName}.`);
    } catch (error) {
        console.error('[Location] Failed to update client location:', error);
    }
};

/**
 * Updates an Artisan's location in Firestore.
 */
export const updateArtisanLocation = async (artisanId: string, lat: number, lng: number) => {
    if (!lat && !lng) return;
    if (lat === 0 && lng === 0) return;

    try {
        const hash = geofire.geohashForLocation([lat, lng]);
        const cityName = await reverseGeocode(lat, lng);
        const artisanRef = doc(db, 'artisans', artisanId);

        await updateDoc(artisanRef, {
            g: hash,                   // Geohash string for querying
            lastUpdate: serverTimestamp(),
            locationCoords: { lat, lng }, // Source of truth for Lat/Lng
            location: 'Localisation GPS',
            city: cityName
        });
        console.debug(`[Location] Artisan ${artisanId} updated to ${cityName} (Hash: ${hash}).`);
    } catch (error) {
        console.error('[Location] Failed to update artisan location:', error);
    }
};
