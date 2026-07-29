import Groq from "groq-sdk";
import * as dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GROQ_API_KEY;
console.log("GROQ_API_KEY present:", !!API_KEY);

if (!API_KEY) {
  console.error("No API key found in .env");
  process.exit(1);
}

const groq = new Groq({ apiKey: API_KEY });

// Sample contract clause to analyze
const testClause = `Clause 1 - Termination: The company may terminate this agreement at any time without cause by providing 30 days written notice. The employee may not terminate this agreement for any reason.`;

async function test() {
  try {
    console.log("Testing Groq API with a sample clause...\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a contract analyst. Analyze the clause and return JSON only.",
        },
        {
          role: "user",
          content: `Analyze this clause: "${testClause}". Return JSON with: sentiment (FAVORABLE/NEUTRAL/UNFAVORABLE/RISKY), riskLevel (LOW/MEDIUM/HIGH/CRITICAL), explanation, suggestion, severity (1-10).`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1024,
    });

    const result = completion.choices[0]?.message?.content;
    console.log("✅ Groq API responded successfully!");
    console.log("\nResponse:", JSON.stringify(JSON.parse(result), null, 2));
    console.log("\n✅ Groq integration is WORKING!");
  } catch (error) {
    console.error("❌ Groq API test failed:", error.message);
    if (error.status === 401) {
      console.error("   The API key appears to be invalid.");
    } else if (error.status === 429) {
      console.error("   Rate limited. This is fine - try again shortly.");
    }
    process.exit(1);
  }
}

test();
