import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { description, images } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Tu es un expert en bâtiment et urgences domestiques. Analyse ce problème. 
    Photos fournies: ${images?.length || 0}. 
    Description: ${description || "Aucune description"}.
    
    Réponds UNIQUEMENT en JSON valide:
    {
      "category": "nom de catégorie",
      "priority": "Basse"|"Moyenne"|"Haute"|"Critique",
      "summary": "résumé pro en 1 phrase",
      "advice": "conseil de sécurité immédiat",
      "estimatedPriceRange": "min-max"
    }`;

        let result;
        if (images && images.length > 0) {
            const imageParts = images.map((base64: string) => ({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64.includes(',') ? base64.split(',')[1] : base64
                }
            }));
            result = await model.generateContent([prompt, ...imageParts]);
        } else {
            result = await model.generateContent(prompt);
        }

        const responseText = result.response.text();
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleaned);

        return res.status(200).json(json);

    } catch (error) {
        console.error('[api/analyze-urgent] Error:', error);
        return res.status(500).json({ error: 'Failed to analyze urgent request' });
    }
}
