-- Migration: Create knowledge_sources table and update document_chunks
-- Created: 2025-11-27
-- Description: Adds knowledge_sources table and updates document_chunks to support both subjects and knowledge sources

-- 1. Create knowledge_sources table
create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('text', 'pdf', 'url')),
  content text, -- For 'text' type or extracted content
  file_url text, -- For 'pdf' type
  created_at timestamptz default now()
);

-- 2. Modify document_chunks table
-- Add source_id column
alter table document_chunks 
add column if not exists source_id uuid references knowledge_sources(id) on delete cascade;

-- Make sujet_id nullable
alter table document_chunks 
alter column sujet_id drop not null;

-- Add constraint to ensure a chunk belongs to either a subject or a source, but not both (or at least one)
-- We'll use a check constraint. Note: This allows a chunk to be orphaned if both are null, so we enforce at least one is not null.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_chunks_owner_check'
  ) THEN
    ALTER TABLE document_chunks
    ADD CONSTRAINT document_chunks_owner_check 
    CHECK (
      (sujet_id IS NOT NULL AND source_id IS NULL) OR 
      (sujet_id IS NULL AND source_id IS NOT NULL)
    );
  END IF;
END $$;

-- 3. Update search function to search across both
-- Drop existing function to avoid "not unique" error due to signature change
drop function if exists search_document_chunks(vector, uuid, float, int);
drop function if exists search_document_chunks(vector, uuid, uuid, float, int);

create or replace function search_document_chunks(
  query_embedding vector(1536),
  match_sujet_id uuid default null,
  match_source_id uuid default null,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  sujet_id uuid,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.sujet_id,
    document_chunks.source_id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  and (
    -- If match_sujet_id is provided, filter by it
    (match_sujet_id is not null and document_chunks.sujet_id = match_sujet_id)
    or
    -- If match_source_id is provided, filter by it
    (match_source_id is not null and document_chunks.source_id = match_source_id)
    or
    -- If neither is provided, search everything (global search)
    (match_sujet_id is null and match_source_id is null)
  )
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Grant permissions
grant select, insert, update, delete on knowledge_sources to authenticated;
grant select, insert, update, delete on document_chunks to authenticated;
grant execute on function search_document_chunks to authenticated;
