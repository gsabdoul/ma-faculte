import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { PaperAirplaneIcon, ClipboardDocumentIcon, StopIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
    subjectContext?: {
        id: string;
        title: string;
        url: string;
        content?: string; // Extracted PDF text
    };
    userContext?: any;
    onClose?: () => void;
    className?: string;
}

export function ChatInterface({ subjectContext, userContext, onClose, className = '' }: ChatInterfaceProps) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<{ id: number; text: string; sender: 'user' | 'ai'; suggestions?: string[] }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // States for edit and stop
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editMessageContent, setEditMessageContent] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load or create conversation for this subject
    useEffect(() => {
        const loadConversation = async () => {
            if (!subjectContext || !userContext?.id) return;

            try {
                // Try to find existing conversation for this subject
                const { data: existingConv, error: convError } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('user_id', userContext.id)
                    .eq('sujet_id', subjectContext.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (convError) throw convError;

                if (existingConv) {
                    // Load existing conversation
                    setConversationId(existingConv.id);

                    // Load messages
                    const { data: msgs, error: msgsError } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', existingConv.id)
                        .order('created_at', { ascending: true });

                    if (msgsError) throw msgsError;

                    if (msgs && msgs.length > 0) {
                        setMessages(msgs.map(m => ({
                            id: m.id,
                            text: m.content,
                            sender: m.is_ai ? 'ai' : 'user'
                        })));
                    } else {
                        // No messages yet, show welcome
                        showWelcomeMessage();
                    }
                } else {
                    // Create new conversation for this subject
                    const { data: newConv, error: newConvError } = await supabase
                        .from('conversations')
                        .insert({
                            user_id: userContext.id,
                            title: `Discussion sur: ${subjectContext.title}`,
                            sujet_id: subjectContext.id
                        })
                        .select('id')
                        .single();

                    if (newConvError) throw newConvError;

                    if (newConv) {
                        setConversationId(newConv.id);
                        showWelcomeMessage();
                    }
                }
            } catch (error) {
                console.error('Error loading conversation:', error);
                showWelcomeMessage();
            }
        };

        const showWelcomeMessage = () => {
            setMessages([{
                id: Date.now(),
                text: `Bonjour ! Je suis Soukma. Je vois que tu étudies "${subjectContext?.title}". Pose-moi des questions sur ce document !`,
                sender: 'ai'
            }]);
        };

        loadConversation();
    }, [subjectContext?.id, userContext?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || message;
        if (textToSend.trim() && !isLoading) {
            const userText = textToSend.trim();
            const tempId = Date.now();

            // Clear suggestions from all previous messages
            setMessages((prev) => prev.map(msg => ({ ...msg, suggestions: undefined })));

            // Optimistic UI update
            setMessages((prev) => [...prev, { id: tempId, text: userText, sender: 'user' }]);
            setMessage('');
            setIsLoading(true);

            try {
                // Prepare messages for Edge Function
                const messagesForEdge = messages.map((msg) => ({
                    sender: msg.sender,
                    text: msg.text,
                }));
                messagesForEdge.push({ sender: 'user', text: userText });

                // Create AbortController for stop functionality
                abortControllerRef.current = new AbortController();

                const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
                const response = await fetch(edgeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        messages: messagesForEdge,
                        userContext,
                        subjectContext: subjectContext ? {
                            ...subjectContext,
                            content: subjectContext.content ? subjectContext.content.substring(0, 30000) : undefined
                        } : undefined,
                    }),
                    signal: abortControllerRef.current.signal,
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Edge Function Error ${response.status}: ${errorText}`);
                }

                // Stream the response
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                // Add a placeholder AI message
                const aiMessageId = Date.now();
                let fullAiResponse = '';
                setMessages((prev) => [...prev, { id: aiMessageId, text: '', sender: 'ai' }]);

                if (!reader) throw new Error('No reader available');

                let done = false;
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;

                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                const data = line.slice(5).trim();
                                if (data === '[DONE]') {
                                    // Save user and AI messages to database
                                    if (conversationId && userContext?.id) {
                                        // Save user message
                                        await supabase.from('messages').insert({
                                            conversation_id: conversationId,
                                            user_id: userContext.id,
                                            content: userText,
                                            is_ai: false
                                        });

                                        // Save AI message
                                        const { data: savedAiMessage } = await supabase.from('messages').insert({
                                            conversation_id: conversationId,
                                            user_id: userContext.id,
                                            content: fullAiResponse,
                                            is_ai: true
                                        }).select().single();

                                        // Update with real ID
                                        if (savedAiMessage) {
                                            setMessages((prev) =>
                                                prev.map((msg) =>
                                                    msg.id === aiMessageId ? { ...msg, id: savedAiMessage.id } : msg
                                                )
                                            );
                                        }
                                    }
                                    setIsLoading(false);
                                    return;
                                }

                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.text;
                                    if (content) {
                                        fullAiResponse += content;
                                        setMessages((prev) =>
                                            prev.map((msg) =>
                                                msg.id === aiMessageId
                                                    ? { ...msg, text: msg.text + content }
                                                    : msg
                                            )
                                        );
                                    }
                                } catch (err) {
                                    // Ignore parse errors for partial chunks
                                }
                            }
                        }
                    }
                }

                // After streaming is complete, parse suggestions from the AI response
                setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.id === aiMessageId && lastMsg.text) {
                        const suggestionMatch = lastMsg.text.match(/\[SUGGESTIONS\]\s*\n([\s\S]*?)(?:\n\n|$)/);
                        let suggestions: string[] | undefined;
                        let cleanText = lastMsg.text;

                        if (suggestionMatch) {
                            const suggestionsText = suggestionMatch[1];
                            suggestions = suggestionsText
                                .split('\n')
                                .filter(line => line.trim())
                                .map(line => line.replace(/^\d+\.\s*/, '').trim())
                                .filter(q => q.length > 0)
                                .slice(0, 3);

                            // Remove the [SUGGESTIONS] block from the displayed text
                            cleanText = lastMsg.text.replace(/\[SUGGESTIONS\]\s*\n[\s\S]*$/, '').trim();
                        }

                        return prev.map(msg =>
                            msg.id === aiMessageId
                                ? { ...msg, text: cleanText, suggestions }
                                : msg
                        );
                    }
                    return prev;
                });

            } catch (error: any) {
                console.error('Error in chat flow:', error);

                if (error.name === 'AbortError') {
                    console.log('Generation stopped by user');
                } else {
                    setMessages((prev) => [
                        ...prev,
                        { id: Date.now() + 2, text: `Erreur: ${error.message}`, sender: 'ai' },
                    ]);
                }
            } finally {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleEditMessage = (msg: { id: number; text: string }) => {
        setEditingMessageId(msg.id);
        setEditMessageContent(msg.text);
    };

    const handleUpdateMessage = async (id: number) => {
        if (!editMessageContent.trim()) return;

        setMessages(prev => prev.map(m => m.id === id ? { ...m, text: editMessageContent } : m));
        setEditingMessageId(null);

        try {
            const { error } = await supabase
                .from('messages')
                .update({ content: editMessageContent })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating message:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditMessageContent('');
    };

    const handleDeleteConversation = async () => {
        if (!conversationId || !confirm('Voulez-vous vraiment supprimer cette conversation ?')) return;

        try {
            // Try to delete conversation (should cascade to messages if configured)
            const { error: conversationError } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

            if (conversationError) {
                // If cascade failed, delete messages first
                console.log('Cascade delete failed, trying manual message deletion:', conversationError);

                const { error: messagesError } = await supabase
                    .from('messages')
                    .delete()
                    .eq('conversation_id', conversationId);

                if (messagesError) {
                    console.error('Error deleting messages:', messagesError);
                    throw messagesError;
                }

                // Retry conversation deletion
                const { error: retryError } = await supabase
                    .from('conversations')
                    .delete()
                    .eq('id', conversationId);

                if (retryError) throw retryError;
            }

            setMessages([]);
            setConversationId(null);
            if (onClose) onClose();
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Erreur lors de la suppression de la conversation.');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {/* Header - Fixed at top */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0 sticky top-0 bg-white z-10">
                <div>
                    <h3 className="font-semibold text-gray-800">Soukma</h3>
                    {subjectContext && (
                        <p className="text-xs text-gray-500 truncate">
                            📄 {subjectContext.title}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {conversationId && (
                        <button
                            onClick={handleDeleteConversation}
                            className="p-1 hover:bg-red-50 rounded-full text-red-600"
                            title="Supprimer la conversation"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 flex flex-col space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`group relative p-3 rounded-lg max-w-[85%] text-base ${msg.sender === 'user'
                            ? 'self-end bg-blue-500 text-white'
                            : 'self-start bg-gray-100 text-gray-800'
                            }`}
                    >
                        {msg.sender === 'ai' ? (
                            <>
                                <div className="prose prose-base max-w-none dark:prose-invert">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            pre: ({ node, ...props }) => <pre className="overflow-auto w-full my-2 bg-gray-800 text-white p-2 rounded" {...props} />,
                                            code: ({ node, ...props }) => <code className="bg-gray-200 text-red-500 px-1 rounded" {...props} />
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                                {/* Copy button */}
                                <div className="flex justify-end mt-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopyMessage(msg.text)}
                                        className="p-1.5 bg-white rounded hover:bg-gray-50 shadow-sm border border-gray-200"
                                        title="Copier"
                                    >
                                        <ClipboardDocumentIcon className="h-3.5 w-3.5 text-gray-600" />
                                    </button>
                                </div>
                                {/* Suggested questions */}
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-xs text-gray-500 font-medium">Questions suggérées :</p>
                                        <div className="flex flex-wrap gap-2">
                                            {msg.suggestions.map((suggestion, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        handleSendMessage(suggestion);
                                                    }}
                                                    className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            editingMessageId === msg.id ? (
                                <div className="flex flex-col gap-2">
                                    <textarea
                                        value={editMessageContent}
                                        onChange={(e) => setEditMessageContent(e.target.value)}
                                        className="w-full p-2 border rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        rows={3}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateMessage(msg.id)}
                                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                        >
                                            Enregistrer
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {msg.text}
                                    <div className="flex gap-1 mt-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditMessage(msg)}
                                            className="p-1.5 bg-white/90 rounded hover:bg-white shadow-sm border border-white/50"
                                            title="Modifier"
                                        >
                                            <PencilIcon className="h-3.5 w-3.5 text-blue-600" />
                                        </button>
                                        <button
                                            onClick={() => handleCopyMessage(msg.text)}
                                            className="p-1.5 bg-white/90 rounded hover:bg-white shadow-sm border border-white/50"
                                            title="Copier"
                                        >
                                            <ClipboardDocumentIcon className="h-3.5 w-3.5 text-blue-600" />
                                        </button>
                                    </div>
                                </>
                            )
                        )}
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* AI Disclaimer */}
            <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100 flex-shrink-0">
                <p className="text-xs text-yellow-800 text-center">
                    💡 L'IA peut faire des erreurs. Vérifiez les informations importantes.
                </p>
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder="Envoyer un message..."
                        className="flex-grow border rounded-full py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-base"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                    {isLoading ? (
                        <button
                            onClick={handleStopGeneration}
                            className="absolute right-2 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                            title="Arrêter la génération"
                        >
                            <StopIcon className="h-5 w-5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!message.trim()}
                            className="absolute right-2 p-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
                        >
                            <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
