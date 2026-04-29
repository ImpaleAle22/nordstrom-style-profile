import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface IngredientData {
  productTypes: string[];
  ingredientTitle: string;
  searchQuery: string;
  brands: string[];
  materials: string[];
}

interface GenerateTitleRequest {
  department: string;
  slotCount: number;
  seasons: string[];
  ingredients: IngredientData[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTitleRequest = await request.json();
    const { department, slotCount, seasons, ingredients } = body;

    // Build prompt for Gemini
    const ingredientDescriptions = ingredients
      .map((ing, i) => {
        const filters = [
          ...ing.productTypes,
          ...ing.brands,
          ...ing.materials,
        ].join(', ');
        return `Slot ${i + 1}: ${ing.ingredientTitle} (${ing.searchQuery}) [Filters: ${filters || 'none'}]`;
      })
      .join('\n');

    const seasonText = seasons.length > 0 ? seasons.join('/') : 'year-round';

    const prompt = `Generate a creative, descriptive outfit recipe title (max 60 characters) based on these ingredients:

Department: ${department}
Slots: ${slotCount}
Season: ${seasonText}

Ingredients:
${ingredientDescriptions}

Requirements:
- Be specific and descriptive (e.g., "Boho Maxi Dress Summer Look" not "Outfit Recipe")
- Capture the style/vibe suggested by the ingredients
- Include season if it adds context
- Keep it under 60 characters
- Don't use generic words like "outfit", "recipe", "look" unless they add meaning
- Focus on the key pieces and overall aesthetic

Return ONLY the title, no explanation or quotes.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const title = response.text().trim().replace(/^["']|["']$/g, ''); // Remove quotes if present

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
