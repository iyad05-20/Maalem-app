import type { VercelRequest, VercelResponse } from '@vercel/node';
import FormData from 'form-data';
import fetch from 'node-fetch'; // Use node-fetch for compatibility

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
        return res.status(500).json({ error: 'Cloudflare credentials not configured' });
    }

    const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs`;

    const { prompt, steps, model, userPhoto } = req.body as {
        prompt: string;
        steps: number;
        model: string;
        userPhoto?: string; // base64, max 511px, for flux-2-dev only
    };

    if (!prompt || !model) {
        return res.status(400).json({ error: 'Missing required fields: prompt, model' });
    }

    try {
        let cfResponse;

        // ── flux-1-schnell: JSON body ──────────────────────────────────────────
        if (model === 'flux-1-schnell') {
            cfResponse = await fetch(`${CF_BASE}/flux-1-schnell`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,           // already a JSON string from Gemini
                    num_steps: steps, // "num_steps" for flux-1-schnell
                }),
            });

            // ── flux-2-dev: multipart/form-data ────────────────────────────────────
        } else if (model === 'flux-2-dev') {
            if (!userPhoto) {
                return res.status(400).json({ error: 'flux-2-dev requires userPhoto' });
            }

            const formData = new FormData();
            formData.append('prompt', prompt);
            formData.append('steps', String(steps));  // "steps" for flux-2-dev
            formData.append('width', '768');
            formData.append('height', '768');

            // Convert base64 back to Buffer
            const photoBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
            const photoBuffer = Buffer.from(photoBase64, 'base64');
            formData.append('input_image_0', photoBuffer, {
                filename: 'input.jpeg',
                contentType: 'image/jpeg',
            });

            // SPEC REQUIREMENT: flux-2-dev call must be JSON-wrapped multipart
            const formBuffer = formData.getBuffer();
            const formHeaders = formData.getHeaders();

            cfResponse = await fetch(`${CF_BASE}/flux-2-dev`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    multipart: {
                        body: formBuffer.toString('base64'),
                        contentType: formHeaders['content-type'],
                    },
                }),
            });

        } else {
            return res.status(400).json({ error: `Unknown model: ${model}` });
        }

        const data = await cfResponse.json() as { success: boolean; result?: { image: string }; errors?: unknown[] };

        if (!data.success || !data.result?.image) {
            console.error('[generate-image] Cloudflare API error:', data.errors);
            return res.status(502).json({ error: 'Image generation failed', details: data.errors });
        }

        return res.status(200).json({
            imageUrl: `data:image/png;base64,${data.result.image}`,
        });

    } catch (err) {
        console.error('[generate-image] Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
