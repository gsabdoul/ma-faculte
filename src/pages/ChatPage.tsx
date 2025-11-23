import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { PaperAirplaneIcon, PaperClipIcon, Bars3Icon, XMarkIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';



export function ChatPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ id: number; text: string; sender: 'user' | 'ai'; attachments?: any[]; suggestions?: string[] }[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // États pour la gestion de la sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const [userContext, setUserContext] = useState<any>(null);

  // Gestion du contexte sujet (PDF)
  const location = useLocation();
  const [subjectContext, setSubjectContext] = useState<{ id: string; title: string; url: string } | null>(null);

  useEffect(() => {
    if (location.state?.subjectContext) {
      setSubjectContext(location.state.subjectContext);
      // Optionnel : Message d'accueil spécifique
      if (messages.length === 0) {
        setMessages([{
          id: Date.now(),
          text: `Bonjour ! Je vois que tu étudies "${location.state.subjectContext.title}". Pose-moi des questions sur ce document !`,
          sender: 'ai'
        }]);
      }
    }
  }, [location.state]);

  // Initialisation : Charger l'utilisateur, son profil et ses conversations
  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id || null;
      setUserId(uid);

      if (uid) {
        // Charger le profil complet
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            nom, 
            prenom,
            universites (nom),
            facultes (nom),
            niveaux (nom)
          `)
          .eq('id', uid)
          .single();

        if (profile) {
          setUserContext({
            nom: profile.nom,
            prenom: profile.prenom,
            universite: (profile.universites as any)?.nom,
            faculte: (profile.facultes as any)?.nom,
            niveau: (profile.niveaux as any)?.nom
          });
        }

        fetchConversations();
      }
    };

    init();
  }, []);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching conversations:', error);
    else setConversations(data || []);
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages(data.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.is_ai ? 'ai' : 'user',
        attachments: msg.attachments || []
      })));
    }
    setIsLoading(false);
  };


  // Charger les messages quand on change de conversation
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Gestion des fichiers joints
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Vérifier le type de fichier
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(file.type)) {
        alert(`Le fichier ${file.name} n'est pas un type supporté.`);
        return false;
      }
      // Vérifier la taille (10 MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`Le fichier ${file.name} dépasse la taille maximale de 10 MB.`);
        return false;
      }
      return true;
    });

    setAttachedFiles(prev => [...prev, ...validFiles]);
    // Reset l'input pour permettre de sélectionner le même fichier à nouveau
    if (e.target) e.target.value = '';
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFileToStorage = async (file: File, conversationId: string): Promise<{ url: string; path: string } | null> => {
    if (!userId) {
      console.error('User ID is required for file upload');
      return null;
    }

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${userId}/${conversationId}/${fileName}`;

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      return { url: publicUrl, path: filePath };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if ((message.trim() || attachedFiles.length > 0) && !isLoading && userId) {
      const userText = message.trim();
      const tempId = Date.now();
      const currentFiles = [...attachedFiles];

      // Clear suggestions from all previous messages
      setMessages((prev) => prev.map(msg => ({ ...msg, suggestions: undefined })));

      // Optimistic UI update
      setMessages((prev) => [...prev, { id: tempId, text: userText, sender: 'user', attachments: currentFiles.map(f => ({ name: f.name, type: f.type, size: f.size })) }]);
      setMessage('');
      setAttachedFiles([]);
      setIsLoading(true);

      try {
        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error("La clé API OpenRouter n'est pas configurée. Vérifiez votre fichier .env");
        }
        console.log("API Key present:", !!apiKey); // Debug log (do not log the actual key)

        let conversationId = currentConversationId;

        // Si pas de conversation active, en créer une
        if (!conversationId) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              user_id: userId,
              title: userText.substring(0, 30) + (userText.length > 30 ? '...' : '') || 'Nouvelle conversation'
            })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConv.id;
          setCurrentConversationId(conversationId);
          fetchConversations(); // Rafraîchir la liste
        }

        // Upload des fichiers joints
        const uploadedAttachments = [];
        for (const file of currentFiles) {
          const uploadResult = await uploadFileToStorage(file, conversationId!);
          if (uploadResult) {
            uploadedAttachments.push({
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type,
              size: file.size,
              url: uploadResult.url,
              path: uploadResult.path,
              uploaded_at: new Date().toISOString()
            });
          }
        }

        // 1. Sauvegarder le message utilisateur avec les pièces jointes
        const { data: savedUserMessage, error: saveError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: userId,
          content: userText || '📎 Fichiers joints',
          is_ai: false,
          attachments: uploadedAttachments
        }).select().single();

        if (saveError) throw saveError;

        // 2. Construire la requête pour l'IA AVANT de mettre à jour le state local
        // (pour éviter les problèmes de closure avec l'ancien state)
        // Remove any AI messages that have empty/null content before building the request
        const filteredState = messages.filter((m) => {
          // Keep all user messages and AI messages that have non‑empty text
          if (m.sender === 'ai') {
            return m.text && m.text.trim() !== '';
          }
          return true;
        });
        const messagesForAI = [
          ...filteredState.map((msg) => ({
            text: msg.text,
            sender: msg.sender,
            attachments: msg.attachments || []
          })),
          {
            text: savedUserMessage.content,
            sender: 'user' as const,
            attachments: savedUserMessage.attachments || []
          }
        ];

        // 3. Mettre à jour le state local (remplacer le message temporaire par celui de la DB)
        setMessages((prev) => prev.map(msg =>
          msg.id === tempId ? {
            id: savedUserMessage.id,
            text: savedUserMessage.content,
            sender: 'user' as const,
            attachments: savedUserMessage.attachments || []
          } : msg
        ));

        // 4. Appeler l'IA via Edge Function
        const messagesForEdge = messagesForAI.map((msg) => ({
          sender: msg.sender,
          text: msg.text,
        }));

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
            subjectContext,
          }),
        });

        console.log('Edge Function Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Error Response Text:', errorText);
          throw new Error(`Edge Function Error ${response.status}: ${errorText}`);
        }

        // Stream the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        // Add a placeholder AI message
        const aiMessageId = Date.now();
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
                  setIsLoading(false);
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.text;
                  if (content) {
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
            if (suggestionMatch) {
              const suggestionsText = suggestionMatch[1];
              const suggestions = suggestionsText
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^\d+\.\s*/, '').trim())
                .filter(q => q.length > 0)
                .slice(0, 3);

              // Remove the [SUGGESTIONS] block from the displayed text
              const cleanText = lastMsg.text.replace(/\[SUGGESTIONS\]\s*\n[\s\S]*$/, '').trim();

              return prev.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, text: cleanText, suggestions }
                  : msg
              );
            }
          }
          return prev;
        });


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

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsHistoryOpen(false); // Sur mobile on ferme, sur desktop on pourrait laisser ouvert
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setIsHistoryOpen(false); // Sur mobile
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette conversation ?')) return;

    try {
      // 1. D'abord supprimer tous les messages de la conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id);

      if (messagesError) throw messagesError;

      // 2. Ensuite supprimer la conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (conversationError) throw conversationError;

      // 3. Mettre à jour l'état local
      setConversations(prev => prev.filter(c => c.id !== id));

      // 4. Si c'était la conversation active, créer une nouvelle
      if (currentConversationId === id) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Erreur lors de la suppression de la conversation.');
    }
  };

  const startEditing = (conv: { id: string; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveTitle = async (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editTitle.trim()) return;

    const { error } = await supabase
      .from('conversations')
      .update({ title: editTitle.trim() })
      .eq('id', id);

    if (error) {
      console.error('Error updating title:', error);
    } else {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle.trim() } : c));
      setEditingId(null);
    }
  };

  // Suggestions de questions basées sur le contexte
  const getSuggestions = () => {
    const baseSuggestions = [
      "Aide-moi à réviser un cours",
      "Trouve-moi des exercices corrigés",
      "Explique-moi un concept complexe"
    ];

    if (userContext?.modules?.length > 0) {
      const randomModule = userContext.modules[Math.floor(Math.random() * userContext.modules.length)];
      return [
        `Quels sont les livres disponibles pour ${randomModule} ?`,
        `Donne-moi un plan de révision pour ${randomModule}`,
        "Quels sont tous mes modules ce semestre ?"
      ];
    }

    return baseSuggestions;
  };

  const handleSuggestionClick = (text: string) => {
    setMessage(text);
    // Optionnel : Envoyer directement
    // handleSendMessage(text); 
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-white relative">
      {/* Panneau latéral pour l'historique */}
      <div className={`
        fixed inset-y-0 left-0 z-20 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200 lg:flex lg:flex-col
        ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex justify-between items-center p-4 lg:hidden">
          <h2 className="text-lg font-semibold">Historique</h2>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 pt-2 lg:pt-4">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center p-2 mb-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvelle discussion
          </button>
        </div>

        <div className="flex-grow overflow-y-auto px-4 pb-4">
          {filteredConversations.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-4">Aucune discussion trouvée</p>
          ) : (
            <ul className="space-y-2">
              {filteredConversations.map((conv) => (
                <li key={conv.id} className="group relative">
                  {editingId === conv.id ? (
                    <form
                      onSubmit={(e) => saveTitle(conv.id, e)}
                      className="flex items-center p-2 rounded-lg bg-blue-50 border border-blue-300"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-grow bg-transparent focus:outline-none text-sm min-w-0"
                        autoFocus
                        onBlur={() => saveTitle(conv.id)}
                      />
                      <button type="submit" className="ml-2 text-green-600 hover:text-green-800">
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <div className={`flex items-center rounded-lg ${currentConversationId === conv.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                      }`}>
                      <button
                        onClick={() => handleSelectConversation(conv.id)}
                        className="flex-grow text-left p-3 text-base truncate min-w-0"
                      >
                        {conv.title}
                      </button>
                      <div className={`flex items-center px-2 ${currentConversationId === conv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        <button
                          onClick={(e) => startEditing(conv, e)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title="Renommer"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Overlay pour mobile quand le menu est ouvert */}
      {isHistoryOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Zone principale de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* En-tête avec le bouton d'historique (visible uniquement sur mobile) */}
        <div className="flex items-center p-4 bg-white shadow-sm lg:hidden">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold ml-4">Soukma</h1>
        </div>

        {/* En-tête Desktop (optionnel, pour garder le titre) */}
        <div className="hidden lg:flex items-center p-4 bg-white border-b border-gray-100">
          <h1 className="text-xl font-bold">Soukma</h1>
        </div>

        {/* Bandeau de contexte sujet */}
        {subjectContext && (
          <div className="bg-blue-50 border-b border-blue-100 p-2 flex justify-between items-center px-4">
            <span className="text-sm text-blue-800 truncate">
              📄 Discussion sur : <strong>{subjectContext?.title}</strong>
            </span>
            <button
              onClick={() => setSubjectContext(null)}
              className="text-blue-400 hover:text-blue-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Zone d'affichage des messages */}
        <div className="flex-grow overflow-y-auto p-4 flex flex-col space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-6">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700 mb-2">Bonjour {userContext?.prenom || 'étudiant'} ! 👋</p>
                <p>Je suis <strong>Soukma</strong>, ton assistant universitaire. Comment puis-je t'aider ?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl px-4">
                {getSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-3 bg-white border border-blue-200 rounded-xl text-sm text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg max-w-[85%] text-base ${msg.sender === 'user'
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
                      {/* Suggested questions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-500 font-medium">Questions suggérées :</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setMessage(suggestion);
                                  handleSendMessage();
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
                    <div className="flex flex-col gap-2">
                      {msg.text && <div className="break-words whitespace-pre-wrap">{msg.text}</div>}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-2">
                          {msg.attachments.map((attachment: any, idx: number) => (
                            <div key={idx}>
                              {attachment.type?.startsWith('image/') ? (
                                attachment.url ? (
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(attachment.url, '_blank')}
                                  />
                                ) : (
                                  <div className="text-xs opacity-75">🖼️ {attachment.name}</div>
                                )
                              ) : (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm bg-white/20 px-3 py-2 rounded-lg hover:bg-white/30 transition-colors"
                                >
                                  <PaperClipIcon className="h-4 w-4" />
                                  <span className="truncate max-w-[200px]">{attachment.name}</span>
                                  <span className="text-xs opacity-75">({(attachment.size / 1024).toFixed(1)} KB)</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
              {isLoading && (
                <div className="self-start bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <span className="animate-pulse">L'IA réfléchit...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* AI Disclaimer */}
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
          <p className="text-xs text-yellow-800 text-center">
            💡 L'IA peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>

        {/* Champ de saisie et bouton d'envoi */}
        <div className="p-4 bg-white border-t border-gray-200">
          {/* Prévisualisation des fichiers joints */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="relative group bg-gray-100 rounded-lg p-2 flex items-center gap-2 max-w-xs">
                  {file.type.startsWith('image/') ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-12 w-12 bg-blue-100 rounded flex items-center justify-center">
                        <PaperClipIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachedFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Retirer"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input et boutons */}
          <div className="flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Envoyer un message..."
                className="flex-grow border rounded-full py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-base"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Joindre un fichier"
              >
                <PaperClipIcon className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              className={`ml-2 p-2 rounded-full text-white ${!message.trim() && attachedFiles.length === 0
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
                }`}
              disabled={!message.trim() && attachedFiles.length === 0}
            >
              <PaperAirplaneIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div >
  );
}