# AI Model Reference

**Purpose:** Single source of truth for AI model names. STOP GUESSING.

**Last Verified:** April 11, 2026

## Google Gemini Models (via @google/generative-ai SDK)

### API Version: v1beta

| Model ID | Status | Use Case | Cost |
|----------|--------|----------|------|
| `gemini-2.5-flash-lite` | ✅ VERIFIED | Fast generation, low cost | $0.075/1M tokens |
| `gemini-1.5-flash` | ❌ BROKEN | Does not exist in v1beta | N/A |
| `gemini-1.5-pro` | ❌ BROKEN | Does not exist in v1beta | N/A |
| `gemini-2.0-flash-exp` | ❌ BROKEN | Does not exist in v1beta | N/A |
| `gemini-1.5-flash-latest` | ❌ BROKEN | Does not exist in v1beta | N/A |
| `gemini-pro` | ❌ BROKEN | Does not exist in v1beta | N/A |

### Working Configuration:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',  // ← USE THIS (VERIFIED WORKING)
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json', // Force structured JSON output
  },
});
```

## Anthropic Claude Models (future)

### API Version: 2023-06-01

| Model ID | Status | Use Case | Cost |
|----------|--------|----------|------|
| `claude-opus-4` | 🔮 PLANNED | Highest quality | $15/$75 per 1M tokens |
| `claude-sonnet-4` | 🔮 PLANNED | Balanced quality/speed | $3/$15 per 1M tokens |
| `claude-haiku-4` | 🔮 PLANNED | Fast, cheap | $0.25/$1.25 per 1M tokens |

## How to Verify a Model Exists

Run this test script before adding a new model:

```bash
npx tsx lib/recipe-cooking/test-model-availability.ts
```

## Update History

- **April 11, 2026**: Initial version. Tested all models. ONLY `gemini-2.5-flash-lite` works with v1beta API.
- **[Future]**: Add Claude models when implemented
- **[Future]**: Add OpenAI models if needed

## Notes

- Google's model naming is inconsistent between API versions (v1 vs v1beta)
- Always test with actual API call before deploying
- Model IDs are case-sensitive
- Some models require specific API keys or quotas
