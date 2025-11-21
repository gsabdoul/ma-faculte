-- Migration: Add attachments column to messages table
-- Date: 2025-11-21
-- Description: Adds support for file attachments in chat messages

-- Add attachments column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Add index for better query performance on attachments
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON public.messages USING gin(attachments);

-- Add comment to document the column structure
COMMENT ON COLUMN public.messages.attachments IS 
'JSON array of file attachments. Structure: [{"id": "uuid", "name": "filename.ext", "type": "mime/type", "size": 123456, "url": "storage_url", "uploaded_at": "timestamp"}]';
