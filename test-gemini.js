import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const testGenAI = async () => {
    try {
        const fetch = globalThis.fetch;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        console.log("Available models:", data.models.map(m => m.name));
    } catch (err) {
        console.error("Error:", err);
    }
};

testGenAI();
