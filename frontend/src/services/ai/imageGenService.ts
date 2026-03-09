/**
 * Client-side service for image generation.
 * Calls the /api/generate-image Vercel serverless function — NEVER calls Cloudflare directly.
 */

export async function generateImage(
    prompt: string,
    steps: number,
    model: string,
    userPhoto?: string, // base64, already resized to max 511px (for flux-2-dev)
): Promise<string> {
    const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, steps, model, userPhoto }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('[imageGenService] API Error:', { status: response.status, error: err });
        throw new Error(err.error ?? `Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.imageUrl) throw new Error('No imageUrl in response');
    return data.imageUrl;
}

/**
 * Resizes a File to max 511px on the longest side (no crop, keeps aspect ratio).
 * Returns base64 JPEG string (without the data: prefix).
 * Required before sending a photo to flux-2-dev.
 */
export function resizeForFlux2dev(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = 511 / Math.max(img.width, img.height);
            // If image is already small enough, don't upscale
            const finalScale = Math.min(scale, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(img.width * finalScale);
            canvas.height = Math.floor(img.height * finalScale);
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context unavailable'));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Reads a File as base64 string (without data: prefix).
 * Used to send original photo to Gemini (no resize needed).
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
