/**
 * Strips markdown code fences from Gemini raw text and parses JSON safely.
 * Always use this instead of calling JSON.parse() directly on Gemini output.
 */
export function parseGeminiJSON(raw: string): Record<string, unknown> {
    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('[promptParser] Gemini parse error. Raw response:', raw);
        throw e;
    }
}
