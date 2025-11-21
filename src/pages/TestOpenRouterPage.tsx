import { useState } from 'react';

interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string;
            role: string;
        };
    }>;
}

export function TestOpenRouterPage() {
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const OPENROUTER_API_KEY = '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';

    const testOpenRouter = async () => {
        setLoading(true);
        setError('');
        setResponse('');

        try {
            const messages: OpenRouterMessage[] = [
                {
                    role: 'user',
                    content: message || 'Hello, who are you?'
                }
            ];

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://ma-faculte.app',
                    'X-Title': 'Ma Faculte',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'mistralai/mistral-7b-instruct:free',
                    messages: messages
                })
            });

            const data: OpenRouterResponse = await res.json();

            if (!res.ok) {
                throw new Error(`API Error ${res.status}: ${JSON.stringify(data)}`);
            }

            const aiResponse = data.choices?.[0]?.message?.content || 'Aucune réponse';
            setResponse(aiResponse);

        } catch (err: any) {
            setError(err.message);
            console.error('OpenRouter Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6">Test OpenRouter API</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message à envoyer
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder="Entrez votre message..."
                        />
                    </div>

                    <button
                        onClick={testOpenRouter}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Envoi en cours...' : 'Tester l\'API'}
                    </button>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h3 className="text-red-800 font-medium mb-2">❌ Erreur</h3>
                            <p className="text-red-700 text-sm whitespace-pre-wrap">{error}</p>
                        </div>
                    )}

                    {response && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h3 className="text-green-800 font-medium mb-2">✅ Réponse</h3>
                            <p className="text-green-900 text-sm whitespace-pre-wrap">{response}</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h2 className="text-lg font-semibold mb-3">Informations de Debug</h2>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                        <div><strong>Modèle:</strong> deepseek/deepseek-r1:free</div>
                        <div><strong>API Key:</strong> {OPENROUTER_API_KEY.substring(0, 20)}...</div>
                        <div><strong>Endpoint:</strong> https://openrouter.ai/api/v1/chat/completions</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
