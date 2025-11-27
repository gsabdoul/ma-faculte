-- Update embedding column to support 512 dimensions (Voyage AI)
-- This migration changes from OpenAI (1536 dims) to Voyage AI (512 dims)

-- Drop existing index first
DROP INDEX IF EXISTS document_chunks_embedding_idx;

-- Drop the existing embedding column (this will delete existing embeddings)
ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;

-- Recreate it with 512 dimensions for Voyage AI voyage-3-lite
ALTER TABLE document_chunks ADD COLUMN embedding vector(512);

-- Recreate the index for vector similarity search
CREATE INDEX document_chunks_embedding_idx ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
