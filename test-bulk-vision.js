require('dotenv').config();
const sharp = require('sharp');

async function getBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

async function testPrompt(label, base64) {
  console.log(`\n=== Testing: ${label} ===`);
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

  const promptText = `You are a strict surplus-food inspector for FoodLoop, a rescue platform for banquet, restaurant, and catering surplus.
Analyze the attached food image and evaluate both food authenticity AND portion volume / quantity scale.

Respond with ONLY a valid JSON object, no other text, no markdown formatting, no backticks, in exactly this shape:
{
  "is_food": true or false,
  "confidence": integer from 0 to 100,
  "is_bulk": true or false,
  "quantity_level": "BULK_SURPLUS" or "MODERATE" or "LOW_QUANTITY",
  "estimated_servings_range": "e.g. 1-2 servings" or "e.g. 5-9 servings" or "e.g. 20-30 servings",
  "reason": "one concise sentence stating what the food is and whether the quantity is bulk surplus or a small/single portion"
}

Rules:
- is_food must be true ONLY if real edible food is visible.
- is_bulk must be true ONLY if the image visibly shows bulk surplus food suitable for community/shelter distribution (e.g. large cooking cauldons/degh, commercial chafing dishes, catering trays, large platters, stacks of 10+ meal packets, wholesale crates of produce).
- is_bulk must be false if it is a single plate, a single bowl, a small snack, individual drink, or a small household portion (<10 servings).
- quantity_level must be:
  * "BULK_SURPLUS" if 10 or more servings / large catering volume
  * "MODERATE" if 5 to 9 servings
  * "LOW_QUANTITY" if 1 to 4 servings (individual meal, snack, single plate/dish)`;

  const payload = {
    contents: [{
      parts: [
        { text: promptText },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.error) {
    console.error('Gemini error:', data.error);
    return;
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json/g, '').replace(/```/g, '').trim();
  console.log(text || JSON.stringify(data, null, 2));
}


async function main() {
  // 1. Single salad bowl (Low quantity / single portion)
  const singlePlate = await getBase64('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
  await testPrompt('Single Salad Bowl (Should detect LOW_QUANTITY)', singlePlate);

  // 2. Catering Buffet / Bulk Food trays
  const bulkBuffet = await getBase64('https://images.unsplash.com/photo-1555244162-803834f70033?w=400');
  await testPrompt('Catering Buffet Trays (Should detect BULK_SURPLUS)', bulkBuffet);

  // 3. Single pastry / small snack
  const singleSnack = await getBase64('https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400');
  await testPrompt('Single Pastry / Snack (Should detect LOW_QUANTITY)', singleSnack);
}

main().catch(console.error);
