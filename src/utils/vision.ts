/**
 * Extracts text from a base64 encoded image using OCR.Space API.
 */
export async function extractTextFromImage(base64Image: string): Promise<string> {
    const rawKey = process.env.OCR_SPACE_API_KEY;
    if (!rawKey) {
        throw new Error("OCR_SPACE_API_KEY is missing.");
    }
    const apiKey = rawKey.trim().replace(/^"|"$/g, '');

    // OCR.Space requires the base64 prefix so we ensure it's there
    // The input base64Image might already hold 'data:image/...;base64,' but let's be safe.
    let formattedBase64 = base64Image;
    if (!formattedBase64.startsWith("data:image")) {
        // Defaulting to jpeg if the prefix is missing
        formattedBase64 = `data:image/jpeg;base64,${formattedBase64}`;
    }

    const formData = new FormData();
    formData.append("apikey", apiKey);
    formData.append("base64Image", formattedBase64);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");

    const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OCR.Space API error (${response.statusText}): ${errorBody}`);
    }

    const data = await response.json();

    // OCR.Space returns error messages in the body sometimes even if HTTP status is 200
    if (data.IsErroredOnProcessing) {
        throw new Error(`OCR.Space processing error: ${data.ErrorMessage}`);
    }

    const parsedResults = data.ParsedResults;
    if (parsedResults && parsedResults.length > 0) {
        return parsedResults[0].ParsedText || "";
    }

    return "";
}
