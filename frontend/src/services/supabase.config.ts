
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Helper to upload a file to Supabase Storage.
 * Now strictly defaults to 'vork-profilepic-bucket'.
 */
export const uploadToSupabase = async (bucket: string = 'vork-profilepic-bucket', path: string, file: File | Blob) => {
  const targetBucket = (bucket === 'vork-profile pic bucket' || bucket === 'vork-profile%20pic%20bucket')
    ? 'vork-profilepic-bucket'
    : bucket;

  const { data, error } = await supabase.storage.from(targetBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true
  });

  if (error) {
    if (error.message.includes('Bucket not found')) {
      console.error(`CRITICAL: The bucket "${targetBucket}" was not found. Please create it in your Supabase dashboard and set it to Public.`);
    }
    console.error('Supabase Upload Error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage.from(targetBucket).getPublicUrl(data.path);
  return `${publicUrl}?t=${Date.now()}`; // Add timestamp for cache busting
};

/**
 * Helper to delete a file from Supabase Storage.
 */
export const deleteFromSupabase = async (bucket: string, path: string) => {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.warn('Supabase Delete Warning:', error.message);
  }
};

/**
 * Extracts the storage path from a Supabase Public URL.
 */
export const extractPathFromUrl = (url: string): string | null => {
  if (!url || !url.includes('/storage/v1/object/public/')) return null;
  try {
    const parts = url.split('/public/');
    if (parts.length < 2) return null;

    const pathWithBucket = parts[1];
    const bucketEndIndex = pathWithBucket.indexOf('/');
    if (bucketEndIndex === -1) return null;

    const path = pathWithBucket.substring(bucketEndIndex + 1).split('?')[0];
    return decodeURIComponent(path);
  } catch (e) {
    return null;
  }
};

/**
 * Helper to convert base64 to Blob for upload
 */
export const base64ToBlob = (base64: string) => {
  const byteString = atob(base64.split(',')[1]);
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};
