import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { description, images } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `Tu es un expert en bâtiment et urgences domestiques. Analyse ce problème. 
        Photos fournies: ${images?.length || 0}. 
        Description: "${String(description || '').substring(0, 1000)}".
        
        Tâche:
        1. Identifie la catégorie d'artisan (Plomberie, Électricité, Climatisation, Serrurerie, Vitrerie, etc.).
        2. Estime la priorité (Basse, Moyenne, Haute, Critique).
        3. Rédige un résumé technique court (1 phrase).
        4. Donne un conseil de sécurité immédiat (très important).
        5. Estime une fourchette de prix approximative en dh (ex: "150 - 300").
        
        Retourne un JSON.`;

        const parts: any[] = [{ text: prompt }];

        if (images && Array.isArray(images)) {
            for (const imgBase64 of images) {
                const dataArr = String(imgBase64).split(',');
                if (dataArr.length < 2) continue;

                const base64Data = dataArr[1];
                const mimeType = dataArr[0].split(';')[0].split(':')[1];

                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType || 'image/jpeg'
                    }
                });
            }
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
                responseMimeType: 'application/json',
            }
        });

        const responseText = result.response.text();
        return res.status(200).json(JSON.parse(responseText));

    } catch (err) {
        console.error('[api/analyze-urgent] Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
