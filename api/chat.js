import "dotenv/config";
import { DataAPIClient } from "@data/astra-db-ts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { message } = req.body;

    if (!message) {
        return res.status(400).json({error: "Message is required" });
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
                limit: 5,
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
                    content: `You are helpful assistant. Answer the user's question based
                    on the following context. If the context doesn't contain relevant
                    information, say so honestly.
                    Context: 
                    ${context}`,
                },
                {role: "user", content: message },
            ],
        });

        const answer = chatResponse.choices[0].message.content;

        return res.status(200).json({ answer });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Something went wrong" });
    }
}