-- Migration: Enable pgvector and create document_chunks table for RAG
-- Created: 2025-11-26
-- Description: Sets up vector storage for semantic search on PDF documents

-- Enable pgvector extension
create extension if not exists vector;

-- Table for document chunks with embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  sujet_id uuid references sujets(id) on delete cascade,
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata jsonb default '{}'::jsonb, -- {page, section, heading_level, chunk_type}
  created_at timestamptz default now()
);

-- Index for fast similarity search using IVFFlat
create index if not exists document_chunks_embedding_idx 
  on document_chunks 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for filtering by sujet
create index if not exists document_chunks_sujet_id_idx 
  on document_chunks(sujet_id);

-- Function to search similar chunks using cosine similarity
create or replace function search_document_chunks(
  query_embedding vector(1536),
  match_sujet_id uuid,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  sujet_id uuid,
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
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.sujet_id = match_sujet_id
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Grant permissions (adjust based on your RLS policies)
grant select, insert, update, delete on document_chunks to authenticated;
-- grant execute on function search_document_chunks to authenticated; -- Commented out due to function overloading

-- Add comment for documentation
comment on table document_chunks is 'Stores document chunks with vector embeddings for semantic search';
-- comment on function search_document_chunks is 'Searches for similar document chunks using cosine similarity'; -- Commented out due to function overloading
