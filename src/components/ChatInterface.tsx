import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
    subjectContext?: {
        id: string;
        title: string;
        url: string;
    };
    userContext?: any;
    onClose?: () => void;
    className?: string;
}

export function ChatInterface({ subjectContext, userContext, onClose, className = '' }: ChatInterfaceProps) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<{ id: number; text: string; sender: 'user' | 'ai' }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Message de bienvenue si contexte sujet
    useEffect(() => {
        if (subjectContext && messages.length === 0) {
            setMessages([{
                id: Date.now(),
                text: `Bonjour ! Je vois que tu étudies "${subjectContext.title}". Pose-moi des questions sur ce document !`,
                sender: 'ai'
            }]);
        }
    }, [subjectContext]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (message.trim() && !isLoading) {
            const userText = message.trim();
            const tempId = Date.now();

            // Optimistic UI update
            setMessages((prev) => [...prev, { id: tempId, text: userText, sender: 'user' }]);
            setMessage('');
            setIsLoading(true);

            try {
                // Appeler l'IA
                const { data, error } = await supabase.functions.invoke('chat-ai', {
                    body: {
                        messages: [...messages, { text: userText, sender: 'user' }],
                        userContext: userContext,
                        subjectContext: subjectContext
                    }
                });

                if (error) throw error;
                if (data && data.error) throw new Error(`IA Error: ${data.error}`);

                if (data && data.text) {
                    const aiText = data.text;
                    setMessages((prev) => [
                        ...prev,
                        { id: Date.now() + 1, text: aiText, sender: 'ai' },
                    ]);
                }
            } catch (error: any) {
                console.error('Error in chat flow:', error);
                setMessages((prev) => [
                    ...prev,
                    { id: Date.now() + 2, text: `Erreur: ${error.message}`, sender: 'ai' },
                ]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                <div>
                    <h3 className="font-semibold text-gray-800">Chat IA</h3>
                    {subjectContext && (
                        <p className="text-xs text-gray-500 truncate">
                            📄 {subjectContext.title}
                        </p>
                    )}
                </div>
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

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 flex flex-col space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`p-3 rounded-lg max-w-[85%] text-base ${msg.sender === 'user'
                                ? 'self-end bg-blue-500 text-white'
                                : 'self-start bg-gray-100 text-gray-800'
                            }`}
                    >
                        {msg.sender === 'ai' ? (
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
                        ) : (
                            msg.text
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="self-start bg-gray-100 text-gray-800 p-3 rounded-lg">
                        <span className="animate-pulse">L'IA réfléchit...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
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
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !message.trim()}
                        className="absolute right-2 p-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <PaperAirplaneIcon className="h-5 w-5 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
