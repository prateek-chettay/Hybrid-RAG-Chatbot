/**
 * Utility for interacting with Upstash Vector.
 */
import { Index } from "@upstash/vector";

export type VectorPayload = {
    text: string;
    source?: string;
};

// Initialize the Upstash Vector Index instance
const rawUrl = process.env.UPSTASH_VECTOR_REST_URL || "";
const rawToken = process.env.UPSTASH_VECTOR_REST_TOKEN || "";

const index = new Index({
    url: rawUrl.trim().replace(/^"|"$/g, ''),
    token: rawToken.trim().replace(/^"|"$/g, ''),
});

/**
 * Upserts a document into Upstash.
 * We pass raw 'data' directly. Because you configured the Upstash Index with the BAAI embedding model,
 * Upstash will magically create the embeddings from this text completely on their end!
 */
export async function upsertDocument(id: string, text: string, metadata?: Record<string, any>) {
    try {
        await index.upsert({
            id: id,
            data: text, // Sending raw text, Upstash generates the embedding!
            metadata: {
                text,
                ...metadata,
            },
        });
        return { success: true };
    } catch (error: any) {
        console.error("Upstash upsert error:", error);
        throw new Error(`Upstash upsert error: ${error.message}`);
    }
}

/**
 * Queries Upstash for similar documents using raw text.
 * Upstash embeds the query text and performs the vector search automatically.
 */
export async function querySimilarDocuments(query: string, topK: number = 3) {
    try {
        const results = await index.query({
            data: query, // Sending raw text query
            topK: topK,
            includeMetadata: true,
            includeVectors: false,
        });

        // Return the metadata of the matched documents (which contains the original text chunk)
        return results.map((match) => match.metadata);
    } catch (error: any) {
        console.error("Upstash query error:", error);
        throw new Error(`Upstash query error: ${error.message}`);
    }
}

/**
 * Resets the entire index (deletes all vectors).
 */
export async function resetVectorIndex() {
    try {
        await index.reset();
        return { success: true };
    } catch (error: any) {
        console.error("Upstash reset error:", error);
        throw new Error(`Upstash reset error: ${error.message}`);
    }
}
