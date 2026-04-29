# Smart Casual Pattern Configuration

This document explains how to add, modify, or disable smart casual patterns without touching code.

## What are Smart Casual Patterns?

Smart casual patterns are recognized outfit combinations that **intentionally mix formality levels**. Examples:
- Tailored dress pants + casual t-shirt + sneakers ✅ (Modern minimalist)
- Blazer + jeans + anything ✅ (Classic smart casual)
- Evening gown + sneakers ❌ (Still rejected - not a valid pattern)

## File Location

**`formality-patterns.json`** - All patterns are defined here

## Pattern Structure

```json
{
  "id": "pattern-id",
  "name": "Pattern Name",
  "description": "When this pattern applies",
  "enabled": true,
  "rules": {
    "role": {
      "minFormality": 1-6,
      "maxFormality": 1-6,
      "keywords": ["word1", "word2"],
      "productTypes": ["type1", "type2"],
      "required": true
    }
  }
}
```

## Rule Fields

### Role Names
- `"tops"` - Shirts, tees, sweaters, blouses
- `"bottoms"` - Pants, jeans, skirts
- `"shoes"` - All footwear
- `"one-piece"` - Dresses, jumpsuits
- `"outerwear"` - Jackets, coats, cardigans
- `"accessories"` - Bags, jewelry, belts, scarves
- `"anyItem"` - Must match at least one item (any role)
- `"anyItem2"` - Second anyItem rule (useful for "X OR Y" patterns)

### Rule Properties

**`minFormality`** (1-6) - Item must be at this formality level or higher
- 1 = Athletic/Sporty
- 2 = Casual
- 3 = Smart Casual
- 4 = Business
- 5 = Cocktail/Semi-Formal
- 6 = Formal/Evening

**`maxFormality`** (1-6) - Item must be at this formality level or lower

**`keywords`** (array) - Product title must contain at least one keyword (case-insensitive)

**`productTypes`** (array) - Product type (productType2) must contain one of these

**`required`** (boolean) - Outfit must have this role for pattern to match

## Examples

### Example 1: Modern Minimalist
"Tailored pants + casual top + sneakers"

```json
{
  "id": "modern-minimalist",
  "name": "Modern Minimalist",
  "description": "Tailored/dress pants + casual top + sneakers",
  "enabled": true,
  "rules": {
    "bottoms": {
      "minFormality": 4,
      "keywords": ["tailored", "dress pant"]
    },
    "tops": {
      "maxFormality": 2,
      "keywords": ["t-shirt", "tee"]
    },
    "shoes": {
      "keywords": ["sneaker"]
    }
  }
}
```

**This matches:**
- Bottoms with formality ≥4 OR containing "tailored"/"dress pant"
- AND tops with formality ≤2 OR containing "t-shirt"/"tee"
- AND shoes containing "sneaker"

### Example 2: Athleisure Elevated
"Athletic wear + elevated pieces"

```json
{
  "id": "athleisure-elevated",
  "name": "Athleisure Elevated",
  "description": "Joggers/hoodie + blazer/dress pants",
  "enabled": true,
  "rules": {
    "anyItem": {
      "keywords": ["jogger", "sweatpant", "hoodie"]
    },
    "anyItem2": {
      "keywords": ["blazer", "dress pant", "tailored"]
    }
  }
}
```

**This matches:**
- At least one item with athletic keywords
- AND at least one item with elevated keywords

## How to Add a New Pattern

1. **Open `formality-patterns.json`**

2. **Add a new pattern to the `patterns` array:**

```json
{
  "id": "your-pattern-id",
  "name": "Your Pattern Name",
  "description": "When this applies",
  "enabled": true,
  "rules": {
    "role": {
      "keywords": ["keyword1", "keyword2"]
    }
  }
}
```

3. **Save the file** - Changes take effect on next recipe cook

4. **Test** - Cook a recipe that should match the pattern and check diagnostics

## How to Disable a Pattern

Set `"enabled": false` - pattern will be ignored but not deleted:

```json
{
  "id": "athleisure-elevated",
  "enabled": false,  // ← Changed from true
  ...
}
```

## Common Patterns to Add

### Business Casual with Loafers
"Dress pants + casual shirt + loafers"

```json
{
  "id": "business-casual-loafers",
  "name": "Business Casual with Loafers",
  "description": "Dress pants + casual shirt + loafers",
  "enabled": true,
  "rules": {
    "bottoms": {
      "minFormality": 4
    },
    "tops": {
      "maxFormality": 3,
      "keywords": ["polo", "button-down", "oxford"]
    },
    "shoes": {
      "keywords": ["loafer", "driver"]
    }
  }
}
```

### Maxi Dress + Denim Jacket
"Flowy dress + casual jacket"

```json
{
  "id": "dress-denim-jacket",
  "name": "Dress + Denim Jacket",
  "description": "Maxi/midi dress + denim/jean jacket",
  "enabled": true,
  "rules": {
    "one-piece": {
      "required": true,
      "keywords": ["maxi", "midi", "slip dress"]
    },
    "outerwear": {
      "keywords": ["denim", "jean jacket"]
    }
  }
}
```

## Debugging

When a recipe cooks, check the browser console for:
```
✓ Smart casual pattern "Modern Minimalist" detected: bottoms: Black Dress Pants, tops: White Tee, shoes: Grey Sneakers
```

If patterns aren't matching:
1. Check keyword spelling (must be exact substring)
2. Check formality levels (use diagnostics page)
3. Verify pattern is `"enabled": true`
4. Check that ALL rules in the pattern are satisfied

## Best Practices

1. **Be specific with keywords** - "dress pant" not just "dress"
2. **Test before enabling** - Set `"enabled": false` initially
3. **Document edge cases** - Use `"description"` field
4. **Start broad, narrow if needed** - Easier to restrict than expand
5. **Keep patterns simple** - 2-3 rules per pattern is ideal

## Phase 2: Discovery Mode (Coming Soon)

Future enhancement will track outfits that score well despite formality mismatches:
- System suggests: "15 outfits matched this pattern - add to config?"
- Merchandiser reviews and approves
- Pattern auto-generated from examples

For now, patterns must be added manually based on fashion knowledge.
