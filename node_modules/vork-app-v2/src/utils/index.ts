

// --- Data Sanitization ---

export const sanitizeFirestoreData = (data: any, seen = new WeakSet()): any => {
  if (data === null || data === undefined) return data;

  // Primitives
  if (typeof data !== 'object') return data;

  // Handle Circular References immediately
  if (seen.has(data)) return "[Circular]";
  seen.add(data);

  // Dates
  if (data instanceof Date) return data.toISOString();

  // Firestore Timestamp
  if (typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString();
    } catch (e) {
      return null;
    }
  }

  // Firestore DocumentReference
  if (typeof data.path === 'string' && typeof data.id === 'string' && data.parent) {
    return data.path;
  }

  // Firestore GeoPoint
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number' && Object.keys(data).length <= 4) {
    return { lat: data.latitude, lng: data.longitude };
  }

  // Arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item, seen));
  }

  // Plain Objects or others
  if (typeof data.toJSON === 'function' && !data.toDate) {
    return data.toJSON();
  }

  const sanitized: any = {};

  try {
    for (const key in data) {
      if (key.startsWith('_') || key.startsWith('$')) continue;
      if (key === 'firestore' || key === 'app' || key === 'database') continue;

      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeFirestoreData(data[key], seen);
      }
    }
    return sanitized;
  } catch (e) {
    try {
      const str = String(data);
      return str === '[object Object]' ? null : str;
    } catch (e) {
      return null;
    }
  }
};

// --- String Helpers ---

export const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

export const isImageUrl = (str: string | undefined | null) => {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:') || str.startsWith('http') || str.startsWith('blob:');
};

export const migrateUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/vork-profile%20pic%20bucket/g, 'vork-profilepic-bucket')
    .replace(/vork-profile pic bucket/g, 'vork-profilepic-bucket');
};

