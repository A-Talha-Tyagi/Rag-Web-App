import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import chatHandler from "./api/chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(join(__dirname, "public")));

app.post("/api/chat", (req, res) => chatHandler(req, res));ß

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});