import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Missing or invalid messages' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemInstruction || '',
        });

        // The last message is the current user input
        const userMessage = messages[messages.length - 1];
        const history = messages.slice(0, -1);

        const chat = model.startChat({
            history: history.map((m: any) => ({
                role: m.role === 'bot' ? 'model' : 'user',
                parts: Array.isArray(m.parts) ? m.parts : [{ text: m.text }],
            })),
        });

        const result = await chat.sendMessage(
            Array.isArray(userMessage.parts) ? userMessage.parts : userMessage.text
        );
        const responseText = result.response.text();

        // Clean JSON if needed (promptParser logic)
        const cleaned = responseText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        try {
            const json = JSON.parse(cleaned);
            return res.status(200).json(json);
        } catch (e) {
            console.error('[api/chat] JSON parse error:', responseText);
            return res.status(200).json({
                error: 'Failed to parse Gemini response as JSON',
                raw: responseText
            });
        }

    } catch (err) {
        console.error('[api/chat] Gemini error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
