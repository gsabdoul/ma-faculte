# Instructions de Configuration Supabase

Pour activer la fonctionnalité de pièces jointes, vous devez effectuer les configurations suivantes dans votre projet Supabase.

## 1. Créer le bucket de stockage

1. Allez sur votre dashboard Supabase
2. Naviguez vers **Storage** dans le menu latéral
3. Cliquez sur **New Bucket**
4. Configurez le bucket comme suit:
   - **Name**: `chat-attachments`
   - **Public bucket**: ✅ Coché (pour permettre l'accès public aux fichiers)
5. Cliquez sur **Create Bucket**

## 2. Exécuter la migration SQL

Exécutez le script SQL suivant dans l'éditeur SQL de Supabase:

```sql
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
```

## 3. Configurer les politiques de sécurité (RLS)

Pour le bucket `chat-attachments`, ajoutez les politiques suivantes:

### Politique d'upload (INSERT)
```sql
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Politique de lecture (SELECT)
```sql
CREATE POLICY "Users can read their own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Politique de suppression (DELETE)
```sql
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 4. Vérifier la configuration

1. Allez dans **Storage** > **chat-attachments**
2. Vérifiez que le bucket est public
3. Testez l'upload en utilisant l'interface chat

## Types de fichiers supportés

L'application accepte les types de fichiers suivants:
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **Documents**: `.pdf`, `.doc`, `.docx`, `.txt`

Taille maximale: **10 MB** par fichier

## Structure de stockage

Les fichiers sont organisés comme suit:
```
chat-attachments/
  {user_id}/
    {conversation_id}/
      {timestamp}-{filename}
```

Cette organisation permet:
- Une gestion simple des permissions
- Une traçabilité par utilisateur et conversation
- Un nettoyage facile si nécessaire
