import "dotenv/config";
import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { message, language } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }
    try {
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: message,
        });
        const embedding = embeddingResponse.data[0].embedding;

        const cursor = collection.find(
            {},
            {
                sort: { $vector: embedding },
                limit: 10,
                projection: { text: 1, _id: 0 },
            }
        );
        const documents = await cursor.toArray();
        const context = documents.map((doc) => doc.text).join("\n\n");

        const chatResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a knowledgeable assistant that answers questions based 
    on provided document context.

    The user's preferred langauge is ${language}
    
    Instructions:
    -Always respond in the user's preferred language, even if the context is in a different language
    - Synthesize information across multiple context sections
    - If the context partially answers the question, provide what you can and note what's missing
    - Use reasoning to infer answers even if the exact words aren't present
    - If the context truly contains no relevant information, say so honestly
    - Do not make up information that isn't supported by the context
    -Feel free to bring in outside knowledge if it helps answer the question, but clearly indicate when you're doing so
    
    Context from the document:
    ${context}`,
                },
                { role: "user", content: message },
            ],
        });

        const answer = chatResponse.choices[0].message.content;

        return res.status(200).json({ answer });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Something went wrong" });
    }
}