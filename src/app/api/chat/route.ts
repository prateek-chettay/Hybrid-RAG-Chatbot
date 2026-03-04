import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { extractTextFromImage } from "@/utils/vision";
import { querySimilarDocuments, upsertDocument, resetVectorIndex } from "@/utils/vectorstore";
import { fetchLiveSearchContext, requiresLiveSearch } from "@/utils/search";
import { chunkText } from "@/utils/chunking";

// Initialize Groq client
const rawGroqKey = process.env.GROQ_API_KEY || "";
const groq = new Groq({
    apiKey: rawGroqKey.trim().replace(/^"|"$/g, ''),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, base64Image, knowledgeSource, resetIndex } = body;

        // A. Handle Knowledge Base Reset/Upload
        if (resetIndex || knowledgeSource) {
            if (resetIndex) {
                await resetVectorIndex();
            }

            if (knowledgeSource && knowledgeSource.trim().length > 0) {
                const sdkChunks = chunkText(knowledgeSource, 500);
                for (let i = 0; i < sdkChunks.length; i++) {
                    const docId = `kb-${Date.now()}-${Math.random().toString(36).substring(7)}-${i}`;
                    await upsertDocument(docId, sdkChunks[i], { type: "knowledge-base" });
                }
            }

            // If this was purely a knowledge update, return early
            if (!messages) {
                return NextResponse.json({ success: true, message: "Knowledge base updated successfully." });
            }
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
        }

        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;
        let contextStr = "";

        // 1. If an image is uploaded, extract text and insert into Upstash
        let extractedImageText = "";
        if (base64Image) {
            extractedImageText = await extractTextFromImage(base64Image);
            if (extractedImageText.trim().length > 0) {
                // Chunk and upsert background text for future retrieval via Upstash Vector
                const chunks = chunkText(extractedImageText, 500);
                for (let i = 0; i < chunks.length; i++) {
                    const docId = `img-${Date.now()}-${Math.random().toString(36).substring(7)}-${i}`;
                    await upsertDocument(docId, chunks[i], { type: "image-ocr" });
                }
                // Include extracted text as immediate context for this response
                contextStr += `[Extracted Image Text]: \n${extractedImageText}\n\n`;
            }
        }

        // 2. Decide context fetching strategy (Live Web vs local Vector RAG)
        if (requiresLiveSearch(userQuery)) {
            // Gather live web context
            const searchContext = await fetchLiveSearchContext(userQuery);
            contextStr += `[Real-Time Live Web Search Context]: \n${searchContext}\n\n`;
        } else {
            // Gather local vector context
            try {
                const matches = await querySimilarDocuments(userQuery);
                if (matches && matches.length > 0) {
                    const matchedContext = matches.map((m: any, idx: number) => `[Vector Source Context ${idx + 1}]: ${m.text}`).join("\n\n");
                    contextStr += `[Known Database Vector Context]:\n${matchedContext}\n\n`;
                }
            } catch (err) {
                console.error("Vector query error (maybe DB empty):", err);
            }
        }

        // 3. Construct System Prompt
        const systemPrompt = `You are an AI assistant powered by a Multimodal Hybrid RAG system.
You answer questions accurately using the provided context. If no context answers the question, default to your general knowledge.
Context is supplied below:
${contextStr ? "====== CONTEXT ======\n" + contextStr + "\n==================\n" : "No specific context available."}
Be concise, helpful, and clear.`;

        const mappedMessages = [
            { role: "system", content: systemPrompt },
            // Include actual chat history excluding the system setup
            ...messages.map((m: any) => ({
                role: m.role,
                content: m.content,
            })),
        ];

        // 4. Connect to Groq API and Stream Response
        // We use stream: true to avoid connection timeouts strictly
        const stream = await groq.chat.completions.create({
            messages: mappedMessages,
            model: "llama-3.3-70b-versatile", // Versatile and fast high-capability model
            stream: true,
            max_tokens: 1024,
        });

        // 5. Send streamed output leveraging standard modern Node Web Streams
        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                    }
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });

    } catch (error: any) {
        console.error("API Chat Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
