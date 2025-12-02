// @ts-ignore
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Voyage AI configuration
const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { document_url, sujet_id, source_id, livre_id, content, type } = await req.json()

        if ((!document_url && !content) || (!sujet_id && !source_id && !livre_id)) {
            throw new Error('Missing required fields: (document_url OR content) AND (sujet_id OR source_id OR livre_id)')
        }

        console.log(`Processing document for ${sujet_id ? `sujet_id: ${sujet_id}` : source_id ? `source_id: ${source_id}` : `livre_id: ${livre_id}`}`)


        let chunks = []
        let title = ''

        // 1. Get Content (Download or Direct)
        if (content) {
            console.log('Processing direct content')
            // Split by paragraphs
            chunks = content.split('\n\n').map((c: string) => ({ content: c }))
            title = 'Direct Content'
        } else if (document_url) {
            // Download Document from Supabase Storage
            const docResponse = await fetch(document_url)
            if (!docResponse.ok) throw new Error('Failed to download document')

            const contentType = docResponse.headers.get('content-type')

            if (contentType?.includes('application/json') || document_url.endsWith('.json')) {
                console.log('Processing JSON document')
                const json = await docResponse.json()

                // Expecting { title: string, content: string } or { title: string, chunks: { content: string }[] }
                title = json.title || 'Untitled'

                if (json.chunks && Array.isArray(json.chunks)) {
                    chunks = json.chunks
                } else if (json.content) {
                    // Simple chunking if only content is provided
                    // Split by paragraphs
                    chunks = json.content.split('\n\n').map((c: string) => ({ content: c }))
                } else {
                    throw new Error('Invalid JSON format. Expected "chunks" array or "content" string.')
                }
                console.log(`Processed ${chunks.length} chunks from JSON`)

            } else if (contentType?.includes('text/markdown') || contentType?.includes('text/plain') || document_url.endsWith('.md')) {
                console.log('Processing Markdown document')
                const text = await docResponse.text()

                // Extract title from first # heading or use filename
                const titleMatch = text.match(/^#\s+(.+)$/m)
                title = titleMatch ? titleMatch[1] : 'Untitled'

                // Split by double newlines (paragraphs) or by headings
                const sections = text.split(/\n\n+/)
                chunks = sections
                    .filter(s => s.trim().length > 0)
                    .map(content => ({ content: content.trim() }))

                console.log(`Processed ${chunks.length} chunks from Markdown`)

            } else {
                console.log('Processing PDF document')
                const pdfBlob = await docResponse.blob()

                // 2. Send to Docling Service
                // Use env var or fallback to local for testing (requires tunneling or local network access)
                const doclingUrl = Deno.env.get('DOCLING_SERVICE_URL') || 'http://host.docker.internal:8000'

                console.log(`Sending to Docling service at: ${doclingUrl}`)

                const formData = new FormData()
                formData.append('file', pdfBlob, 'document.pdf')

                const doclingResponse = await fetch(`${doclingUrl}/convert-pdf`, {
                    method: 'POST',
                    body: formData,
                })

                if (!doclingResponse.ok) {
                    const errorText = await doclingResponse.text()
                    throw new Error(`Docling service error: ${errorText}`)
                }

                const result = await doclingResponse.json()
                chunks = result.chunks
                title = result.title
                console.log(`Received ${chunks.length} chunks from Docling`)
            }
        }

        // 3. Generate Embeddings & Store
        if (!VOYAGE_API_KEY) {
            throw new Error('VOYAGE_API_KEY is not set in environment variables')
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Delete existing chunks for this subject OR source OR livre
        if (sujet_id) {
            await supabase.from('document_chunks').delete().eq('sujet_id', sujet_id)
        } else if (source_id) {
            await supabase.from('document_chunks').delete().eq('source_id', source_id)
        } else if (livre_id) {
            await supabase.from('document_chunks').delete().eq('livre_id', livre_id)
        }

        // Process chunks in batches
        let processedCount = 0
        for (const chunk of chunks) {
            // Skip empty chunks
            if (!chunk.content || chunk.content.trim().length === 0) continue

            // Generate embedding with Voyage AI
            const voyageResponse = await fetch(VOYAGE_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${VOYAGE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: chunk.content,
                    model: 'voyage-3-lite', // Free tier model, good for general use
                })
            })

            if (!voyageResponse.ok) {
                const errorText = await voyageResponse.text()
                throw new Error(`Voyage AI error: ${errorText}`)
            }

            const voyageData = await voyageResponse.json()
            const embedding = voyageData.data[0].embedding

            const { error } = await supabase.from('document_chunks').insert({
                sujet_id: sujet_id || null,
                source_id: source_id || null,
                livre_id: livre_id || null,
                content: chunk.content,
                embedding,
                metadata: chunk.metadata
            })

            if (error) {
                console.error('Error inserting chunk:', error)
                throw error
            }
            processedCount++
        }

        return new Response(
            JSON.stringify({ success: true, message: `Processed ${processedCount} chunks`, title }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error processing document:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
