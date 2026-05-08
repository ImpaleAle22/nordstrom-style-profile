# Migration Syntax Fixed ✅

## Issue
PostgreSQL doesn't allow `DESC` keyword in inline `INDEX` definitions within `CREATE TABLE` statements.

## Error
```
ERROR: 42601: syntax error at or near "DESC"
LINE 98: INDEX idx_customer_profiles_confidence (confidence_score DESC),
```

## Fix Applied

All three migration files have been updated:

### ✅ 01_create_customer_profiles_table.sql
- Removed inline INDEX definitions from CREATE TABLE
- Created indexes separately with CREATE INDEX statements
- DESC keyword now works correctly

### ✅ 02_create_customer_interactions_table.sql
- Removed inline INDEX definitions from CREATE TABLE
- Created indexes separately with CREATE INDEX statements
- All composite indexes now created correctly

### ✅ 03_create_semantic_memories_table.sql
- Already correct (indexes were separate)
- Added warning comment about pgvector extension

## Ready to Run

All migrations are now syntactically correct and ready to run in Supabase!

**Run in order:**
1. `01_create_customer_profiles_table.sql` ✅
2. `02_create_customer_interactions_table.sql` ✅
3. `03_create_semantic_memories_table.sql` ✅

## Note on pgvector

If you get an error about the `vector` extension in migration 03:
```
ERROR: extension "vector" is not available
```

**Solution:** Comment out this line in `03_create_semantic_memories_table.sql`:
```sql
-- CREATE EXTENSION IF NOT EXISTS vector;
```

The table will still work fine - the `embedding` column will just stay NULL until you enable pgvector later for semantic search.
