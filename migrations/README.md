# Database Migrations

This directory contains all database schema migrations for the Style Intelligence System.

## Overview

The system uses three main tables:

1. **customer_profiles** - Processed profile data (output from Profile Brain)
2. **customer_interactions** - Raw interaction data (input to Profile Brain)
3. **semantic_memories** - Unstructured insights and rich context

## Running Migrations

### Option 1: Run in Supabase SQL Editor (Recommended)

1. Open your Supabase project: https://slsrksnenvagilmdwxka.supabase.co
2. Go to SQL Editor
3. Run migrations **in order**:

```sql
-- Step 1: Customer Profiles
-- Copy and paste: 01_create_customer_profiles_table.sql

-- Step 2: Customer Interactions
-- Copy and paste: 02_create_customer_interactions_table.sql

-- Step 3: Semantic Memories
-- Copy and paste: 03_create_semantic_memories_table.sql
```

### Option 2: Run All at Once

Copy the entire contents of each migration file into the SQL Editor in sequence, or use the master migration file:

```sql
-- Copy contents of: 00_RUN_ALL_MIGRATIONS.sql
```

## Migration Files

| File | Description | Dependencies |
|------|-------------|--------------|
| `01_create_customer_profiles_table.sql` | Creates customer_profiles table | None |
| `02_create_customer_interactions_table.sql` | Creates customer_interactions table | customer_profiles |
| `03_create_semantic_memories_table.sql` | Creates semantic_memories table | customer_profiles |
| `00_RUN_ALL_MIGRATIONS.sql` | Master script with instructions | All above |

## What Gets Created

### Tables

- `customer_profiles` - Structured profile data
  - Pillars, colors, brands, confidence, etc.
  - JSONB columns for flexibility
  - RLS policies for security

- `customer_interactions` - Raw interaction log
  - All customer touchpoints (swipes, quiz, chat, etc.)
  - JSONB data field for type-specific structures
  - Append-only design

- `semantic_memories` - Unstructured insights
  - Rich context that doesn't fit structured fields
  - Vector embeddings for semantic search (optional)
  - Temporal decay and consolidation support

### Indexes

- Primary indexes on customer_id, timestamp, type
- GIN indexes for JSONB querying
- Composite indexes for common query patterns
- Vector index for semantic search (if using embeddings)

### Functions

- `get_profile_summary()` - Profile overview
- `get_interaction_breakdown()` - Interaction counts by type
- `get_active_memories()` - Active memories for a customer
- `expire_old_events()` - Mark past events as expired
- `refresh_all_recency_weights()` - Update temporal decay
- `calculate_profile_confidence()` - Confidence score calculation
- `count_interaction_signals()` - Signal count for confidence

### Triggers

- Auto-update `updated_at` timestamps
- Maintains data integrity

### RLS Policies

- Users can only access their own data
- Demo personas (id starts with `persona_`) are publicly readable
- Service role has full access

## Verification

After running migrations, verify everything is set up:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  );

-- Check foreign keys
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  );

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'customer_profiles',
    'customer_interactions',
    'semantic_memories'
  );
```

## Testing with Sample Data

Uncomment the sample data section in `00_RUN_ALL_MIGRATIONS.sql` to insert:
- Sample demo persona profile
- Sample swipe interaction
- Sample semantic memory

Then test by visiting: `/profile/persona_minimal_maya`

## Vector Embeddings (Optional)

The `semantic_memories` table has an `embedding` column for semantic search using pgvector.

### Enable pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Add Embeddings

Embeddings can be added later when you implement semantic search:

```sql
UPDATE semantic_memories
SET embedding = your_embedding_vector
WHERE memory_id = 'mem_001';
```

The vector index is already created and will automatically work once embeddings are populated.

## Maintenance Jobs

Set up these periodic jobs (via Supabase Functions or cron):

### Daily Jobs

```sql
-- Expire past events
SELECT expire_old_events();

-- Refresh recency weights
SELECT refresh_all_recency_weights();
```

### Weekly Jobs

```sql
-- Archive old interactions (1 year+)
SELECT archive_old_interactions(365);
```

## Rollback (If Needed)

To remove all tables:

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS semantic_memories CASCADE;
DROP TABLE IF EXISTS customer_interactions CASCADE;
DROP TABLE IF EXISTS customer_profiles CASCADE;

-- Also drop functions
DROP FUNCTION IF EXISTS get_profile_summary CASCADE;
DROP FUNCTION IF EXISTS get_interaction_breakdown CASCADE;
DROP FUNCTION IF EXISTS get_active_memories CASCADE;
-- ... (add other functions)
```

## Next Steps After Migration

1. ✅ Verify all tables created successfully
2. 🔜 Create API endpoints (`/api/profile/*`, `/api/memory/*`)
3. 🔜 Refactor SwipeUI to use Profile Brain
4. 🔜 Test interaction → profile flow
5. 🔜 Build batch persona script
6. 🔜 Set up maintenance jobs

## Troubleshooting

### "relation already exists"

Tables already exist. Either:
- Skip that migration
- Drop and recreate (see Rollback section)

### "foreign key violation"

Run migrations in order:
1. customer_profiles (no dependencies)
2. customer_interactions (depends on customer_profiles)
3. semantic_memories (depends on customer_profiles)

### "pgvector extension not found"

The vector extension is optional. If you're not using semantic search yet:
- Comment out the `CREATE EXTENSION vector` line
- The `embedding` column will stay NULL
- Enable later when needed

### "permission denied"

Make sure you're running as the database owner or service role in Supabase.

## Documentation

- **Architecture**: See `/PROFILE-BRAIN-ARCHITECTURE.md`
- **Semantic Memory**: See `/SEMANTIC-MEMORY-ARCHITECTURE.md`
- **System Overview**: See `/SYSTEM-OVERVIEW.md`

## Schema Diagram

```
customer_profiles (1) ──< (many) customer_interactions
                  (1) ──< (many) semantic_memories

customer_interactions → Profile Brain → customer_profiles
customer_interactions → Memory Extractor → semantic_memories
```

## Questions?

Check the architecture documents or the inline comments in each migration file for detailed explanations of:
- Table structures
- JSONB field formats
- Function purposes
- RLS policies
- Design decisions
