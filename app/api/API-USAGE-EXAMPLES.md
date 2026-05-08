# API Usage Examples

Complete guide for using the Profile Brain API endpoints.

## Overview

All endpoints are located under `/api/`:

```
/api/profile/process          - Process interactions through Profile Brain
/api/profile/[customerId]     - Get customer profile
/api/interactions/save        - Save interaction(s)
/api/interactions/[customerId] - Get customer interactions
/api/memory/extract           - Extract semantic memories from text
/api/memory/[customerId]      - Get customer memories
/api/memory/retrieve          - Semantic search for relevant memories
```

---

## Complete Flow: User Completes Swipe Session

### Step 1: Save Interaction

```typescript
// User just finished swipe session
const interaction = {
  interaction_id: `swipe_${userId}_${Date.now()}`,
  customer_id: userId,
  interaction_type: 'style_swipe',
  timestamp: new Date().toISOString(),
  source: 'web_app',
  session_id: `session_${Date.now()}`,
  data: {
    stack_id: 'broadcast_001',
    stack_type: 'broadcast',
    stack_recipe: 'style_discovery',
    completion_type: 'full',
    completion_percentage: 100,
    cards: [
      {
        card_id: 'card_001',
        card_type: 'lifestyle',
        position: 1,
        verdict: 'yes',
        dwell_ms: 3200,
        saved: false,
        mini_pdp_opened: false,
        content_tags: {
          pillars: ['minimal', 'classic'],
          colors: ['black', 'neutral'],
          gender: 'womenswear',
          formality: 6
        }
      },
      // ... more cards
    ]
  }
};

const response = await fetch('/api/interactions/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ interaction })
});

const result = await response.json();
// { success: true, saved: 1, interactionIds: ['swipe_...'] }
```

### Step 2: Process Through Profile Brain

```typescript
// Fetch all interactions for this user
const interactionsResponse = await fetch(`/api/interactions/${userId}`);
const { interactions } = await interactionsResponse.json();

// Process through Profile Brain
const processResponse = await fetch('/api/profile/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: userId,
    customerName: 'Alice Chen',
    interactions: interactions,
    mode: 'incremental' // Merge with existing profile
  })
});

const processResult = await processResponse.json();
// {
//   success: true,
//   profile: { customer_id, pillars, confidence_score, ... },
//   metadata: {
//     processedAt: "2026-05-06T...",
//     interactionCount: 1,
//     signalCount: 20,
//     processingTimeMs: 45,
//     warnings: []
//   }
// }
```

### Step 3: Get Updated Profile

```typescript
const profileResponse = await fetch(`/api/profile/${userId}`);
const profileData = await profileResponse.json();
// {
//   success: true,
//   profile: {
//     customer_id: 'user_123',
//     customer_name: 'Alice Chen',
//     pillars: { minimal: 45, classic: 35, casual: 20 },
//     color_affinity: { black: 100, neutral: 90 },
//     confidence_score: 0.65,
//     sessions_processed: 3,
//     total_signals: 60,
//     style_personality: "Alice's style leans Minimal and Classic..."
//   },
//   interactionCount: 3,
//   memoryCount: 5
// }
```

---

## Request A Look with Memory Extraction

### Step 1: Save RAL Interaction

```typescript
const ralInteraction = {
  interaction_id: `ral_${userId}_${Date.now()}`,
  customer_id: userId,
  interaction_type: 'request_a_look',
  timestamp: new Date().toISOString(),
  source: 'web_app',
  data: {
    request_id: 'ral_001',
    occasion: 'winter vacation',
    event_date: '2026-12-15',
    budget_range: { min: 200, max: 500 },
    description: 'I need outfits for my annual ski trip to Colorado in December. Looking for warm layers that are stylish for après-ski dinners.',
    fulfilled: false
  }
};

await fetch('/api/interactions/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ interaction: ralInteraction })
});
```

### Step 2: Extract Semantic Memories

```typescript
const memoryResponse = await fetch('/api/memory/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: userId,
    text: ralInteraction.data.description,
    sourceType: 'request_a_look',
    sourceId: ralInteraction.interaction_id,
    sourceContext: `Occasion: ${ralInteraction.data.occasion}`
  })
});

const memoryResult = await memoryResponse.json();
// {
//   success: true,
//   memories: [
//     {
//       memory_id: 'mem_...',
//       text: 'Goes on annual ski trips to Colorado',
//       memory_type: 'life_context',
//       category: 'hobbies',
//       confidence: 0.95
//     },
//     {
//       memory_id: 'mem_...',
//       text: 'Needs warm layers for winter activities',
//       memory_type: 'preference',
//       category: 'fabric_preference',
//       confidence: 0.85
//     }
//   ],
//   extractionMetadata: {
//     modelUsed: 'gemini-2.0-flash-exp',
//     processingTimeMs: 850,
//     confidence: 0.85
//   }
// }
```

### Step 3: Process Profile (includes RAL data)

```typescript
// Get new interactions including RAL
const interactionsResponse = await fetch(
  `/api/interactions/${userId}?since=${lastProcessedAt}`
);
const { interactions } = await interactionsResponse.json();

// Process
await fetch('/api/profile/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: userId,
    customerName: 'Alice Chen',
    interactions: interactions,
    mode: 'incremental'
  })
});
```

---

## Retrieve Relevant Memories for Personalization

```typescript
// When showing winter vacation outfits
const memoryRetrievalResponse = await fetch('/api/memory/retrieve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: userId,
    context: 'winter vacation outfits',
    limit: 10,
    minConfidence: 0.7
  })
});

const { memories, relevanceScores } = await memoryRetrievalResponse.json();
// memories: [
//   { text: 'Goes on annual ski trips to Colorado', ... },
//   { text: 'Prefers warm layers...', ... },
//   { text: 'Likes après-ski style', ... }
// ]

// Use memories to personalize recommendations
const personalizedContext = memories.map(m => m.text).join('; ');
// "Goes on annual ski trips to Colorado; Prefers warm layers; Likes après-ski style"
```

---

## Get All Memories for Display

```typescript
// Fetch all active memories
const memoriesResponse = await fetch(`/api/memory/${userId}`);
const { memories, analytics } = await memoriesResponse.json();
// {
//   memories: [
//     { text: 'Goes on ski trips...', memory_type: 'life_context', ... },
//     { text: 'Works in tech...', memory_type: 'life_context', ... },
//     { text: 'Dislikes florals...', memory_type: 'negative', ... }
//   ],
//   analytics: {
//     totalMemories: 12,
//     averageConfidence: 0.88,
//     memoryTypes: {
//       life_context: 5,
//       preference: 4,
//       negative: 2,
//       event: 1
//     }
//   }
// }

// Filter by category
const hobbyMemories = await fetch(
  `/api/memory/${userId}?category=hobbies`
);
```

---

## Batch Processing (Build Persona)

```typescript
// Build a complete persona with multiple interaction types
const personaInteractions = [
  // Swipe session 1
  {
    interaction_id: 'swipe_maya_001',
    customer_id: 'persona_minimal_maya',
    interaction_type: 'style_swipe',
    timestamp: '2026-01-15T10:00:00Z',
    source: 'web_app',
    data: { stack_id: 'broadcast_001', cards: [...] }
  },
  // Swipe session 2
  {
    interaction_id: 'swipe_maya_002',
    customer_id: 'persona_minimal_maya',
    interaction_type: 'style_swipe',
    timestamp: '2026-01-20T14:30:00Z',
    source: 'web_app',
    data: { stack_id: 'deepening_001', cards: [...] }
  },
  // Quiz
  {
    interaction_id: 'quiz_maya_001',
    customer_id: 'persona_minimal_maya',
    interaction_type: 'style_quiz',
    timestamp: '2026-01-22T09:00:00Z',
    source: 'web_app',
    data: { quiz_id: 'onboarding_v2', questions: [...] }
  },
  // Purchase
  {
    interaction_id: 'purchase_maya_001',
    customer_id: 'persona_minimal_maya',
    interaction_type: 'purchase',
    timestamp: '2026-02-01T16:45:00Z',
    source: 'online',
    data: { order_id: 'ORD123', items: [...] }
  }
];

// Save all interactions
await fetch('/api/interactions/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ interactions: personaInteractions })
});

// Process in batch mode (from scratch)
const processResponse = await fetch('/api/profile/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'persona_minimal_maya',
    customerName: 'Maya Kim',
    interactions: personaInteractions,
    mode: 'batch' // Process from scratch
  })
});

// Result: Complete persona profile with high confidence
```

---

## Error Handling

```typescript
try {
  const response = await fetch('/api/profile/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* data */ })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    // { error: 'Failed to save profile', details: '...' }
    return;
  }

  const result = await response.json();
  // Success
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Testing Endpoints

### Using curl

```bash
# Save interaction
curl -X POST http://localhost:3000/api/interactions/save \
  -H "Content-Type: application/json" \
  -d '{
    "interaction": {
      "interaction_id": "test_001",
      "customer_id": "test_user",
      "interaction_type": "style_swipe",
      "timestamp": "2026-05-06T10:00:00Z",
      "source": "web_app",
      "data": {"cards": []}
    }
  }'

# Get profile
curl http://localhost:3000/api/profile/test_user

# Extract memories
curl -X POST http://localhost:3000/api/memory/extract \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test_user",
    "text": "I love skiing in Colorado",
    "sourceType": "request_a_look",
    "sourceId": "ral_001"
  }'
```

---

## Next Steps

1. **Refactor SwipeUI** to use these endpoints
2. **Add to ProfileView** to display memories
3. **Create batch script** to pre-generate personas
4. **Test complete flow** end-to-end

See `SYSTEM-OVERVIEW.md` for complete architecture.
