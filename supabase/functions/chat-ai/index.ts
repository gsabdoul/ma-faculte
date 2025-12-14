declare const Deno: { env: { get: (name: string) => string | undefined } };

// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

type ChatMessage = { sender: 'user' | 'assistant'; text: string };
type DocChunk = {
  content: string;
  metadata?: { page?: number; section?: string } | undefined;
  sujet_id?: string | null;
  livre_id?: string | null;
  source_id?: string | null;
};
type SourceMeta = { type: 'sujet' | 'livre' | 'source'; page?: number; section?: string };

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Check API Keys
        if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY');
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase credentials');

        // 2. Parse Body
        let body;
        try {
            body = await req.json();
        } catch {
            throw new Error('Invalid JSON body');
        }

        const { messages, userContext, subjectContext } = body;
        if (!messages || !Array.isArray(messages)) {
            throw new Error('Invalid payload: messages array is required');
        }

        // 3. RAG: Search for relevant context
        let ragContext = "";
        let sourcesMetadata: SourceMeta[] = [];

        if (VOYAGE_API_KEY) {
            try {
                // Get the last user message for search query
                const lastUserMessage = (messages as ChatMessage[]).filter((m) => m.sender === 'user').pop();

                if (lastUserMessage) {
                    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

                    // Generate embedding with Voyage AI
                    const voyageResponse = await fetch(VOYAGE_API_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${VOYAGE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            input: lastUserMessage.text,
                            model: 'voyage-3-lite',
                        })
                    });

                    if (!voyageResponse.ok) {
                        throw new Error('Voyage AI embedding failed');
                    }

                    const voyageData = await voyageResponse.json();
                    const embedding = voyageData.data[0].embedding;

                    // Search similar chunks
                    // If we have a subject context, search in that subject
                    // Otherwise, do a global search (includes books, knowledge sources, etc.)
                    const { data: chunks, error } = await supabase.rpc('search_document_chunks', {
                        query_embedding: embedding,
                        match_sujet_id: subjectContext?.id || null,
                        match_source_id: null,
                        match_livre_id: null,
                        match_threshold: 0.5,
                        match_count: 5
                    });

                    if (error) {
                        console.error('Error searching chunks:', error);
                    } else if (chunks && chunks.length > 0) {
                        console.log(`Found ${chunks.length} relevant chunks`);

                        ragContext = (chunks as DocChunk[]).map((c) => {
                            // Determine the source type
                            let sourceType = 'Document';
                            let sourceInfo = '';

                            if (c.sujet_id) {
                                sourceType = 'Sujet';
                                sourceInfo = `Page ${c.metadata?.page || 'N/A'}`;
                            } else if (c.livre_id) {
                                sourceType = 'Livre';
                                sourceInfo = `Page ${c.metadata?.page || 'N/A'}`;
                            } else if (c.source_id) {
                                sourceType = 'Source de connaissance';
                                sourceInfo = c.metadata?.section || '';
                            }

                            return `
[Source: ${sourceType} - ${sourceInfo}${c.metadata?.section ? `, Section "${c.metadata.section}"` : ''}]
${c.content}
`;
                        }).join('\n\n');

                        sourcesMetadata = (chunks as DocChunk[]).map((c) => ({
                            type: c.sujet_id ? 'sujet' : c.livre_id ? 'livre' : 'source',
                            page: c.metadata?.page,
                            section: c.metadata?.section
                        }));
                    }
                }
            } catch (err) {
                console.error('RAG Error:', err);
                // Continue without RAG if error
            }
        }

        // 4. Build System Prompt with Application Context
        let systemInstruction = `Tu es "Soukma" (qui signifie "demande-moi" en langue mooré), l'assistant pédagogique intelligent de l'application "Ma faculté".

## Ton Identité
- Nom : Soukma
- Créateur : Savadogo Abdoul Guélilou
- Mission : Aider les étudiants universitaires au Burkina Faso

## RÈGLE CRITIQUE - ANTI-HALLUCINATION
Tu ne dois JAMAIS inventer de contenu qui n'existe pas dans le contexte fourni.
- Si on te demande le contenu d'un document PDF et que tu n'as pas le texte extrait ci-dessous, dis : "Je n'ai pas accès au contenu de ce document pour le moment."
- Ne génère pas de faux texte de loi, de fausses questions d'examen ou de faux résumés.

## Style de Réponse
- **Sois concis et interactif.** Garde tes réponses initiales courtes (3-5 phrases maximum).
- **Ne liste pas tout d'un coup.** Pour une question large (comme "aide-moi à réviser"), ne donne pas une longue liste de stratégies.
- **Propose un plan.** Présente plutôt les thèmes que tu peux aborder (ex: "Je peux te donner des stratégies de révision, des ressources pertinentes ou des méthodes actives. Qu'est-ce qui t'intéresse le plus ?").
- **Attends que l'utilisateur choisisse.** Laisse l'étudiant te guider sur le point qu'il veut approfondir.
- **Découpe l'information.** Donne l'information point par point, pas en un seul bloc.
- **Utilise des puces (`- ` ou ` * `) pour les listes dans le corps de tes messages.** Ne numérote que les questions dans la section SUGGESTIONS.

## Ton rôle
- Aide les étudiants dans leurs révisions et apprentissage
- Réponds à leurs questions académiques
- Suggère des ressources pertinentes (sujets, livres, drives) basées sur leur faculté et niveau
- Reste dans le contexte universitaire burkinabé
- Adapte tes réponses au niveau d'étude de l'étudiant
- Utilise le contenu des livres/cours disponibles pour enrichir tes réponses
- À la fin de tes réponses, propose 3 questions de suivi pertinentes. Demande à l'utilisateur de répondre avec le numéro de son choix. Formate les questions exactement comme ceci :
[SUGGESTIONS]
1. Question 1 ?
2. Question 2 ?
3. Question 3 ?
`;

        if (userContext) {
            systemInstruction += `\n\n## Contexte de l'étudiant actuel
- **Nom complet**: ${userContext.prenom} ${userContext.nom}
- **Université**: ${userContext.universite || 'Non spécifiée'}
- **Faculté**: ${userContext.faculte || 'Non spécifiée'}
- **Niveau d'étude**: ${userContext.niveau || 'Non spécifié'}`;

            if (userContext.modules && userContext.modules.length > 0) {
                systemInstruction += `\n- **Modules suivis**: ${userContext.modules.join(', ')}`;
            }
        }

        if (subjectContext) {
            systemInstruction += `\n\n## Contexte du document actuel
L'étudiant consulte actuellement le document : "${subjectContext.title}".`;

            if (ragContext) {
                systemInstruction += `\n\n## Contenu PERTINENT (RAG)
Voici les extraits les plus pertinents trouvés pour la question de l'étudiant (provenant de sujets, livres ou sources de connaissance).
Utilise ces extraits pour formuler ta réponse.
CITE TES SOURCES en mentionnant le type de source et les numéros de page (ex: "Selon le livre, page 5..." ou "D'après le sujet, page 3...").

${ragContext}

**INSTRUCTION IMPORTANTE** : Base ta réponse PRINCIPALEMENT sur ces extraits.`;
            } else if (subjectContext.content) {
                // Fallback to full content if available and no RAG results (or RAG failed)
                // Truncate if too long to avoid token limits
                const truncatedContent = subjectContext.content.substring(0, 20000);
                systemInstruction += `\n\n## Contenu du PDF (extrait global)
Voici le début du texte extrait du document PDF :
${truncatedContent}
... (contenu tronqué)`;
            } else {
                systemInstruction += `\n\n**Note** : Aucun contenu extrait disponible pour ce document.`;
            }
        }

        // 5. Format Messages for OpenRouter
        const openRouterMessages = [
            { role: "system", content: systemInstruction },
            ...((messages as ChatMessage[]).map((msg) => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            })))
        ];

        // 6. Call OpenRouter API
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ma-faculte.app',
                'X-Title': 'Ma Faculte',
            },
            body: JSON.stringify({
                model: body.model || "google/gemini-flash-1.5", // Utilise le modèle du client ou un fallback
                messages: openRouterMessages,
                stream: true,
                temperature: 0.5, // Lower temperature for more factual answers
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', response.status, errorText);
            throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
        }

        // 7. Stream the response
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                // Send sources metadata first if available
                if (sourcesMetadata.length > 0) {
                    // We could send a special event for sources, but for now let's just let the AI cite them in text
                    // Or we could append a sources block at the end if the AI doesn't.
                    // For this prototype, we rely on the AI following instructions to cite pages.
                }

                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;

                                try {
                                    const parsed = JSON.parse(data);
                                    let content = parsed.choices?.[0]?.delta?.content;

                                    if (content) {
                                        content = content.replace(/<s>/g, '').replace(/<\/s>/g, '');
                                        if (content) {
                                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                                        }
                                    }
                                } catch { console.warn('Invalid SSE data chunk'); }
                            }
                        }
                    }
                    controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
                } catch (error) {
                    console.error('Streaming error:', error);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: unknown) {
        console.error('Edge Function Error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
