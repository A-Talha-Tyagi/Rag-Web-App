import "dotenv/config";
import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

// Split text into chunks with overlap
function splitTextIntoChunks(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, filename } = req.body;

    if (!text) {
        return res.status(400).json({ error: "No text provided" });
    }

    try {
        const chunks = splitTextIntoChunks(text);

        let processed = 0;

        for (const chunk of chunks) {
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
            });

            const embedding = embeddingResponse.data[0].embedding;

            await collection.insertOne({
                text: chunk,
                filename: filename || "uploaded-document",
                $vector: embedding,
            });

            processed++;
        }

        return res.status(200).json({
            success: true,
            message: `Processed ${processed} chunks from "${filename}"`,
            chunks: processed,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ error: "Failed to process document" });
    }
}