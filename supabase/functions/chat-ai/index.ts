// @ts-ignore
declare const Deno: any;

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
        // 1. Check API Key
        if (!OPENROUTER_API_KEY) {
            throw new Error('Configuration Error: OPENROUTER_API_KEY is missing in secrets.');
        }

        // 2. Parse Body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error('Invalid JSON body');
        }

        const { messages, userContext, subjectContext } = body;
        if (!messages || !Array.isArray(messages)) {
            throw new Error('Invalid payload: messages array is required');
        }

        // 3. Build System Prompt with Application Context
        let systemInstruction = `Tu es "Soukma" (qui signifie "demande-moi" en langue mooré), l'assistant pédagogique intelligent de l'application "Ma faculté".

## Ton Identité
- Nom : Soukma
- Créateur : Savadogo Abdoul Guélilou
- Mission : Aider les étudiants universitaires au Burkina Faso

## À propos de l'application "Ma faculté"
Ma faculté est une plateforme éducative destinée aux étudiants universitaires au Burkina Faso. L'application permet d'accéder à:
- **Anciens sujets d'examens** organisés par module et université (fichiers PDF)
- **Livres académiques** par module (fichiers PDF avec couvertures)
- **Drives partagés** contenant des ressources pédagogiques
- **Chat IA** pour assistance académique personnalisée

## Structure de l'application
L'application est organisée autour de :
- **Universités** : Établissements d'enseignement supérieur (ex: Université Joseph Ki-Zerbo)
- **Facultés** : Divisions académiques (ex: Médecine, Droit, Sciences)
- **Niveaux** : Années d'étude (ex: 1ère année, 2ème année, Licence, Master)
- **Modules** : Matières/cours enseignés (peuvent être gratuits ou premium)

## RÈGLE CRITIQUE - ANTI-HALLUCINATION
Tu ne dois JAMAIS inventer de contenu qui n'existe pas dans le contexte fourni.
- Si on te demande le contenu d'un document PDF et que tu n'as pas le texte extrait ci-dessous, dis : "Je n'ai pas accès au contenu de ce document pour le moment."
- Ne génère pas de faux texte de loi, de fausses questions d'examen ou de faux résumés.

## Ton rôle
- Aide les étudiants dans leurs révisions et apprentissage
- Réponds à leurs questions académiques
- Suggère des ressources pertinentes (sujets, livres, drives) basées sur leur faculté et niveau
- Reste dans le contexte universitaire burkinabé
- Adapte tes réponses au niveau d'étude de l'étudiant
- À la fin de tes réponses, propose souvent 3 questions courtes de suivi pertinentes, formatées exactement comme ceci :
[SUGGESTIONS]
1. Question 1 ?
2. Question 2 ?
3. Question 3 ?`;

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

            if (subjectContext.content) {
                systemInstruction += `\n\n## Contenu du PDF (extrait)
Voici le texte extrait du document PDF que l'étudiant consulte. Utilise ce contenu pour répondre précisément à ses questions :

${subjectContext.content}

**RAPPEL** : Réponds en te basant UNIQUEMENT sur ce contenu pour les questions spécifiques au document.`;
            } else {
                systemInstruction += `\n\n**Note** : Le contenu du PDF n'a pas pu être extrait. Guide l'étudiant vers la lecture directe du document pour les détails spécifiques.`;
            }

            if (subjectContext.url) {
                systemInstruction += ` URL du document : ${subjectContext.url}`;
            }
        }

        // 4. Format Messages for OpenRouter (OpenAI compatible)
        const openRouterMessages = [
            { role: "system", content: systemInstruction },
            ...messages.map((msg: any) => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }))
        ];

        // 5. Call OpenRouter API with streaming enabled
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ma-faculte.app',
                'X-Title': 'Ma Faculte',
            },
            body: JSON.stringify({
                model: "x-ai/grok-4.1-fast:free",
                messages: openRouterMessages,
                stream: true,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', response.status, errorText);
            throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
        }

        // 6. Stream the response back to the client
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

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
                                        // Filter out unwanted tokens
                                        content = content.replace(/<s>/g, '').replace(/<\/s>/g, '');

                                        if (content) {
                                            // Send SSE formatted data
                                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                                        }
                                    }
                                } catch (e) {
                                    // Skip invalid JSON
                                }
                            }
                        }
                    }
                    // Send [DONE] at the end
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

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
