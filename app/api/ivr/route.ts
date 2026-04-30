import { NextResponse } from 'next/server';
import { callClaudeWithHistory } from '../../../lib/server/claude';
import { detectTopic } from '../../../lib/topicDetect';
import { fetchWeather } from '../../../lib/fetchWeather';
import { fetchMandi } from '../../../lib/fetchMandi';

// Dummy database for farmer profile
const DUMMY_FARMER = {
  id: 'farmer_123',
  name: 'Ramesh',
  district: 'Pune',
  state: 'Maharashtra',
  primary_crop: 'Wheat',
  language_pref: 'hi',
  fields: [{ id: 'f1' }]
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, language, farmer_id, conversation_history } = body;

    // In a real app, you would fetch from DB:
    // const farmer = await prisma.farmer.findUnique({ where: { id: farmer_id } })
    const farmer = DUMMY_FARMER;

    const topic = detectTopic(text);

    let weatherContext = '';
    if (topic === 'weather') {
      const weather = await fetchWeather(farmer.district);
      if (weather) {
        weatherContext = `District: ${farmer.district}, Temp: ${weather.main.temp}°C, 
        Max: ${weather.main.temp_max}°C, Min: ${weather.main.temp_min}°C, 
        Condition: ${weather.weather[0].description}, 
        Humidity: ${weather.main.humidity}%, Wind: ${weather.wind?.speed} km/h`;
      }
    }

    let mandiContext = '';
    if (topic === 'mandi') {
      const mandi = await fetchMandi(farmer.state, farmer.primary_crop);
      if (mandi?.records) {
        mandiContext = mandi.records.map((r: any) => 
          `${r.market}: ₹${r.modal_price}/quintal`
        ).join(', ');
      } else {
        mandiContext = 'Data unavailable';
      }
    }

    let irrigationContext = '';
    if (topic === 'irrigation') {
      irrigationContext = JSON.stringify({
        irrigation_hours_today: 2.5,
        water_liters_needed: 1200,
        advice: "Water in the early morning to minimize evaporation."
      });
    }

    const systemPrompt = `
You are Saarthi, AgriSaarthi's voice AI agent for Indian farmers.

STRICT VOICE RULES — NEVER BREAK THESE:
- Maximum 3 sentences per response. This is VOICE — not text.
- NO bullet points, NO numbered lists, NO markdown, NO asterisks.
- NO "According to my data" or "Based on information" — speak directly.
- NEVER say "I am an AI" or "as a language model".
- Always use "aap" (respectful) in Hindi. Never "tum".
- End EVERY response with exactly ONE follow-up question.
- Use the farmer's name (${farmer.name}) occasionally — feels personal.
- Speak numbers naturally: "do sau chalis rupaye" not "240".

PERSONA:
You are warm, patient, and knowledgeable — like a trusted village agronomist.
You have been helping ${farmer.name} for years. You know their farm.

FARMER PROFILE:
Name: ${farmer.name}
District: ${farmer.district}, ${farmer.state}
Primary crop: ${farmer.primary_crop}
Language preference: ${farmer.language_pref}
Respond in: ${language === 'hi' ? 'Hindi (Devanagari script)' : 'Simple English'}

REAL-TIME DATA AVAILABLE TO YOU:
${topic === 'weather' ? `Current weather: ${weatherContext}` : ''}
${topic === 'mandi' ? `Mandi prices: ${mandiContext}` : ''}
${topic === 'irrigation' ? `Irrigation advisory: ${irrigationContext}` : ''}

TOPIC DETECTED: ${topic}

If question is outside farming/weather/mandi/irrigation/schemes — 
gently redirect: "Yeh meri expertise se thoda alag hai, 
lekin main aapki fasal ke baare mein zaroor madad kar sakta hoon."
`;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ 
        reply: language === 'hi' 
          ? `नमस्ते ${farmer.name}! API Key nahi mili hai.` 
          : `Hello ${farmer.name}! API Key is missing.`, 
        detected_topic: topic, 
        detected_language: language 
      });
    }

    const messages = [
      ...(conversation_history || []),
      { role: 'user' as const, content: text }
    ];

    const reply = await callClaudeWithHistory(systemPrompt, messages, 200);

    return NextResponse.json({ 
      reply: reply || "Main samajh nahi paaya.", 
      detected_topic: topic, 
      detected_language: language 
    });

  } catch (error) {
    console.error("IVR API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
