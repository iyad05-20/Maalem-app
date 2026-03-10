import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, systemInstruction } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction,
        });

        // Reconstruct history
        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'bot' ? 'model' : 'user',
            parts: m.parts || [{ text: m.text }],
        }));

        const chat = model.startChat({ history });
        const lastMessage = messages[messages.length - 1];

        // Prepare parts for the last message
        const lastParts = lastMessage.parts || [{ text: lastMessage.text }];

        const result = await chat.sendMessage(lastParts);
        const responseText = result.response.text();

        // Try to parse as JSON to ensure validity
        try {
            const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(cleaned);
            return res.status(200).json(json);
        } catch (e) {
            console.error('[api/chat] Failed to parse Gemini response as JSON:', responseText);
            return res.status(500).json({ error: 'Invalid AI response format' });
        }

    } catch (error: any) {
        console.error('[api/chat] Error:', error);

        // QUOTA RESILIENCE: If 429 occurs, return a simulated valid response
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
            console.log('[api/chat] Quota reached, sending resilience fallback');

            const fallbackResponse = {
                clarity_score: 5,
                has_user_photo: false,
                photo_quality: null,
                photo_sufficient: null,
                ask_for_photo: false,
                needs_image_gen: false,
                image_gen_purpose: null,
                model: null,
                image_prompt: null,
                image_steps: null,
                order_ready: false,
                order_title: null,
                order_description: null,
                risk_level: "none",
                safety_warning: null,
                category_valid: true,
                suggested_category: null,
                multi_order_detected: false,
                pending_orders: null,
                order_sequence: null,
                reason: "Quota reached fallback",
                suggestion: "Continuer | Réessayer plus tard",
                message_to_user: "Je reçois beaucoup de demandes en ce moment ! 👷 On peut continuer, mais je serai un peu plus lent à traiter les images."
            };

            return res.status(200).json(fallbackResponse);
        }

        return res.status(500).json({ error: 'Failed to process chat request' });
    }
}
