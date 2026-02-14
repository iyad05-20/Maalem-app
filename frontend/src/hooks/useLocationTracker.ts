
import { useEffect, useRef, useState, useCallback } from 'react';
import { updateClientLocation, updateArtisanLocation, calculateDistanceMeters } from '../services/location.service';
import { Coordinates } from '../types';

export const useLocationTracker = (userId: string | undefined, role: 'user' | 'artisan' | undefined) => {
    const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
    const [location, setLocation] = useState<Coordinates | null>(null);
    const lastSavedRef = useRef<Coordinates | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // Minimum distance in meters to trigger a Firestore update
    const DISTANCE_THRESHOLD = 50;

    const handleUpdateFirestore = useCallback((lat: number, lng: number, force: boolean = false) => {
        if (!userId || !role) return;

        const currentCoords = { lat, lng };

        if (!force && lastSavedRef.current) {
            const distance = calculateDistanceMeters(lastSavedRef.current, currentCoords);
            if (distance < DISTANCE_THRESHOLD) {
                return;
            }
        }

        if (role === 'artisan') {
            updateArtisanLocation(userId, lat, lng);
        } else {
            updateClientLocation(userId, lat, lng);
        }

        lastSavedRef.current = currentCoords;
    }, [userId, role]);

    const refreshLocation = useCallback(() => {
        if (!('geolocation' in navigator)) return;

        const success = (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lng: longitude });
            handleUpdateFirestore(latitude, longitude, true);
            console.log("📍 Location forced refresh success");
        };

        const fail = (err: GeolocationPositionError) => {
            navigator.geolocation.getCurrentPosition(
                success,
                (e) => console.error("Location refresh failed completely", e.message),
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
            );
        };

        navigator.geolocation.getCurrentPosition(
            success,
            fail,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
    }, [handleUpdateFirestore]);

    useEffect(() => {
        if (!userId || !role) return;
        if (!('geolocation' in navigator)) {
            console.warn('Geolocation is not supported by this browser.');
            return;
        }

        const handlePosition = (position: GeolocationPosition) => {
            setPermissionStatus('granted');
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lng: longitude });
            handleUpdateFirestore(latitude, longitude, false);
        };

        const handleError = (error: GeolocationPositionError) => {
            if (error.code === error.TIMEOUT) {
                return;
            }
            if (error.code === error.PERMISSION_DENIED) {
                setPermissionStatus('denied');
            }
        };

        const options = {
            enableHighAccuracy: true,
            timeout: 45000,
            maximumAge: 10000
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            options
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [userId, role, handleUpdateFirestore]);

    return { permissionStatus, location, refreshLocation };
};
