import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, EllipsisVerticalIcon, FlagIcon, PencilSquareIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Document, Page, pdfjs } from 'react-pdf';
import { Modal } from '../components/ui/Modal';
import { ChatInterface } from '../components/ChatInterface';
import { supabase } from '../supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuration pour react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export function SujetViewPage() {
    const { sujetId } = useParams<{ sujetId?: string }>();
    const navigate = useNavigate();

    const [subject, setSubject] = useState<any | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfSource, setPdfSource] = useState<string | null>(null);
    const [triedBlobFetch, setTriedBlobFetch] = useState(false);
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    // Chat state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [userContext, setUserContext] = useState<any>(null);
    const [isChatFullscreen, setIsChatFullscreen] = useState(false);
    const [chatPanelWidth, setChatPanelWidth] = useState(40); // Largeur en pourcentage

    const [isResizingChat, setIsResizingChat] = useState(false);
    const [pdfTextContent, setPdfTextContent] = useState<string | null>(null);
    const [isExtractingText, setIsExtractingText] = useState(false);
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);

    // Floating button state - sticky to right edge
    const [buttonPosition, setButtonPosition] = useState({ y: window.innerHeight / 2 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ y: 0 });
    const [showTooltip, setShowTooltip] = useState(true);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const updateWidth = () => {
            setContainerWidth(el.clientWidth);
        };

        // Initial width
        updateWidth();

        // Use ResizeObserver to detect size changes (window resize OR layout changes like chat opening)
        const observer = new ResizeObserver(() => {
            updateWidth();
        });

        observer.observe(el);

        return () => {
            observer.disconnect();
        };
    }, []);

    // Charger le contexte utilisateur
    useEffect(() => {
        const loadUserContext = async () => {
            const { data: userData } = await supabase.auth.getUser();
            const uid = userData.user?.id || null;

            if (uid) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select(`
                        nom, 
                        prenom,
                        universite_id,
                        faculte_id,
                        niveau_id,
                        universites (nom),
                        facultes (nom),
                        niveaux (nom)
                    `)
                    .eq('id', uid)
                    .single();

                let modulesList: string[] = [];

                if (profile && profile.faculte_id && profile.niveau_id) {
                    const { data: modulesData } = await supabase
                        .from('module_faculte_niveau')
                        .select('modules(nom)')
                        .eq('faculte_id', profile.faculte_id)
                        .eq('niveau_id', profile.niveau_id);

                    if (modulesData) {
                        modulesList = modulesData.map((m: any) => m.modules?.nom).filter(Boolean);
                    }
                }

                if (profile) {
                    setUserContext({
                        id: uid,
                        nom: profile.nom,
                        prenom: profile.prenom,
                        universite: (profile.universites as any)?.nom,
                        faculte: (profile.facultes as any)?.nom,
                        niveau: (profile.niveaux as any)?.nom,
                        modules: modulesList
                    });
                }
            }
        };

        loadUserContext();
    }, []);

    // Extract PDF text for chat context
    const extractPdfText = async (pdfUrl: string, maxPages = 10): Promise<string> => {
        try {
            const loadingTask = pdfjs.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            const numPages = Math.min(pdf.numPages, maxPages);
            let fullText = '';

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += `--- Page ${i} ---\n${pageText}\n\n`;
            }

            return fullText;
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            return '';
        }
    };

    // Extract PDF text when chat opens
    useEffect(() => {
        if (isChatOpen && pdfSource && !pdfTextContent && !isExtractingText) {
            setIsExtractingText(true);
            extractPdfText(pdfSource)
                .then(text => {
                    setPdfTextContent(text);
                    setIsExtractingText(false);
                })
                .catch(err => {
                    console.error('Failed to extract PDF text:', err);
                    setIsExtractingText(false);
                });
        }
    }, [isChatOpen, pdfSource, pdfTextContent, isExtractingText]);

    // Cacher le menu de navigation du bas sur cette page
    useEffect(() => {
        const bottomNav = document.querySelector('nav[class*="bottom"]') ||
            document.querySelector('[class*="BottomNav"]') ||
            document.querySelector('nav.fixed.bottom-0');

        if (bottomNav) {
            (bottomNav as HTMLElement).style.display = 'none';
        }

        return () => {
            if (bottomNav) {
                (bottomNav as HTMLElement).style.display = '';
            }
        };
    }, []);

    const handleCorrectionClick = () => {
        setMenuOpen(false);
        const hasCorrection = !!subject?.correction && String(subject.correction).trim().length > 0;
        if (!hasCorrection) {
            return;
        }
        navigate(`/sujets/${subject.id}/correction`);
    };

    useEffect(() => {
        if (!sujetId) {
            setSubject(null);
            setLoading(false);
            return;
        }

        let cancel = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await supabase.from('sujets').select('*').eq('id', sujetId).maybeSingle();
                if (res.error) throw res.error;
                if (cancel) return;
                const raw = res.data || null;
                if (raw) {
                    const resolveDriveUrl = (url: string | null | undefined) => {
                        if (!url) return url;
                        const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                        const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                        const id = m1?.[1] || m2?.[1];
                        if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
                        return url;
                    };

                    const pdfUrl = (raw as any).fichier_url || (raw as any).pdfUrl || null;
                    (raw as any).pdfUrlResolved = resolveDriveUrl(pdfUrl);

                    // Check if it's a markdown file
                    const isMarkdownOrJson = (url: string) => {
                        if (!url) return false;
                        const lowerUrl = url.toLowerCase();
                        // Remove query parameters for extension check
                        const urlPath = lowerUrl.split('?')[0];
                        return urlPath.endsWith('.md') ||
                            urlPath.endsWith('.markdown') ||
                            urlPath.endsWith('.json');
                    };

                    if (pdfUrl && isMarkdownOrJson(pdfUrl)) {
                        try {
                            const contentRes = await fetch(resolveDriveUrl(pdfUrl) || pdfUrl);
                            if (contentRes.ok) {
                                if (pdfUrl.endsWith('.json')) {
                                    const json = await contentRes.json();
                                    if (json.content) {
                                        setMarkdownContent(json.content);
                                    } else if (json.chunks && Array.isArray(json.chunks)) {
                                        setMarkdownContent(json.chunks.map((c: any) => c.content).join('\n\n'));
                                    }
                                } else {
                                    const text = await contentRes.text();
                                    setMarkdownContent(text);
                                }
                            }
                        } catch (err) {
                            console.error('Failed to fetch markdown content:', err);
                        }
                    } else {
                        setPdfSource(resolveDriveUrl(pdfUrl) || null);
                    }
                }
                setSubject(raw);
            } catch (err: any) {
                setError(err?.message || String(err));
                setSubject(null);
            } finally {
                if (!cancel) setLoading(false);
            }
        };

        load();
        return () => { cancel = true; };
    }, [sujetId]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    useEffect(() => {
        return () => {
            if (pdfSource && pdfSource.startsWith('blob:')) {
                try { URL.revokeObjectURL(pdfSource); } catch (e) { /* ignore */ }
            }
        };
    }, [pdfSource]);

    const handleDocumentError = async (err: any) => {
        console.error('react-pdf load error:', err);
        if (!triedBlobFetch && subject) {
            setTriedBlobFetch(true);
            const src = subject.pdfUrlResolved || subject.fichier_url || subject.pdfUrl;
            if (!src) return;
            try {
                const res = await fetch(src);
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                setPdfSource(blobUrl);
            } catch (fetchErr) {
                console.error('Fallback fetch-as-blob failed:', fetchErr);
                setError(String(fetchErr));
            }
        } else {
            setError(err?.message || String(err));
        }
    };

    const handleReportClick = () => {
        setMenuOpen(false);
        setReportModalOpen(true);
    };

    const handleChatToggle = () => {
        setIsChatOpen(!isChatOpen);
        setIsChatFullscreen(false);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({
            y: e.clientY - buttonPosition.y
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const newY = Math.max(60, Math.min(window.innerHeight - 120, e.clientY - dragOffset.y));
            setButtonPosition({ y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    // Auto-hide tooltip after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTooltip(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <div className="p-4 text-center text-gray-600">Chargement du sujet...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Erreur : {error}</div>;
    }

    if (!subject) {
        return <div className="p-4 text-center text-red-500">Sujet non trouvé.</div>;
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-200 overflow-hidden">
            {/* Header with title and controls - Fixed */}
            <header className="bg-white p-4 shadow-md z-50 fixed top-0 left-0 right-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                        <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                            <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800 truncate">{subject.titre || subject.title}</h1>
                    </div>
                    <div className="flex items-center gap-2 relative">
                        {/* Zoom controls */}
                        <button
                            onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title="Zoom -"
                        >
                            <MagnifyingGlassMinusIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={() => setZoom(z => Math.min(3, Number((z + 0.1).toFixed(2))))}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title="Zoom +"
                        >
                            <MagnifyingGlassPlusIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        {/* Fullscreen toggle */}
                        <button
                            onClick={() => {
                                const el = containerRef.current;
                                if (!el) return;
                                if (document.fullscreenElement) document.exitFullscreen();
                                else el.requestFullscreen().catch(() => { });
                            }}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title="Plein écran"
                        >
                            <ArrowsPointingOutIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        <button onClick={() => setMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-gray-100">
                            <EllipsisVerticalIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-30 top-full">
                                <button onClick={handleCorrectionClick} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <PencilSquareIcon className="w-5 h-5 mr-3" /> Correction
                                </button>
                                <button onClick={handleReportClick} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <FlagIcon className="w-5 h-5 mr-3" /> Signaler
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Floating Chat Button - Sticky to right edge - Hidden when chat is open */}
            {!isChatOpen && (
                <div className="fixed right-0 z-40" style={{ top: `${buttonPosition.y}px` }}>
                    {/* Tooltip bubble */}
                    {showTooltip && (
                        <div className="absolute right-20 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                            <div className="text-sm whitespace-nowrap">💬 Discutez avec l'IA !</div>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-800"></div>
                        </div>
                    )}

                    <button
                        onMouseDown={handleMouseDown}
                        onClick={() => {
                            if (!isDragging) {
                                handleChatToggle();
                                setShowTooltip(false);
                            }
                        }}
                        className={`p-4 rounded-l-full shadow-2xl transition-all bg-white text-blue-600 hover:bg-blue-50 ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-105'
                            }`}
                        title="Discuter avec l'IA (Déplaçable verticalement)"
                    >
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.31 0-2.56-.3-3.68-.84l-.27-.14-2.81.47.47-2.81-.14-.27A7.934 7.934 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8z" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex absolute top-[72px] left-0 right-0 bottom-0">
                {/* PDF Viewer */}
                <div
                    className={`flex-1 overflow-y-auto ${isResizingChat ? '' : 'transition-all duration-300'} ${isChatFullscreen ? 'hidden lg:block' : ''
                        }`}
                    style={{
                        marginRight: isChatOpen ? `${chatPanelWidth}%` : '0'
                    }}
                >
                    <div ref={containerRef} className="flex flex-col items-center p-4 space-y-4 min-h-full">
                        {markdownContent ? (
                            <div
                                className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8"
                                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                            >
                                <div className="prose prose-lg max-w-none
                                    [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6
                                    [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5
                                    [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-4
                                    [&>h4]:text-base [&>h4]:font-bold [&>h4]:mb-2 [&>h4]:mt-3
                                    [&>h5]:text-base [&>h5]:font-bold [&>h5]:mb-2 [&>h5]:mt-3
                                    [&>h6]:text-base [&>h6]:font-bold [&>h6]:mb-2 [&>h6]:mt-3
                                    [&>p]:mb-4 [&>p]:leading-7 [&>p]:text-base
                                    [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>ul]:text-base
                                    [&>ol]:list-decimal [&>ol]:ml-6 [&>ol]:mb-4 [&>ol]:text-base
                                    [&>li]:mb-2 [&>li]:text-base
                                    [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4 [&>blockquote]:text-base
                                    [&>code]:bg-gray-100 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm
                                    [&>pre]:bg-gray-100 [&>pre]:p-4 [&>pre]:rounded [&>pre]:overflow-x-auto [&>pre]:mb-4 [&>pre]:text-sm
                                    [&>table]:w-full [&>table]:mb-4 [&>table]:border-collapse [&>table]:text-base
                                    [&>table>thead>tr>th]:border [&>table>thead>tr>th]:border-gray-300 [&>table>thead>tr>th]:bg-gray-100 [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:font-bold
                                    [&>table>tbody>tr>td]:border [&>table>tbody>tr>td]:border-gray-300 [&>table>tbody>tr>td]:p-2
                                    [&>hr]:my-8 [&>hr]:border-gray-300
                                    [&>a]:text-blue-600 [&>a]:underline [&>a]:hover:text-blue-800
                                    [&>strong]:font-bold
                                    [&>em]:italic
                                ">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {markdownContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <Document
                                file={pdfSource || subject.pdfUrlResolved || subject.fichier_url || subject.pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={handleDocumentError}
                                loading={<div className="text-center p-8">Chargement du sujet...</div>}
                                error={<div className="text-center p-8 text-red-500">Erreur de chargement du PDF.</div>}
                            >
                                {numPages && Array.from(new Array(numPages), (_, index) => (
                                    <div key={`page_${index + 1}`} className="mb-4 shadow-lg">
                                        <Page
                                            pageNumber={index + 1}
                                            renderTextLayer={false}
                                            width={containerWidth ? Math.floor(containerWidth * 0.9) : undefined}
                                            scale={zoom}
                                        />
                                    </div>
                                ))}
                            </Document>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Panel - Desktop with resize handle - Fixed position below header */}
            {isChatOpen && (
                <div
                    className="hidden lg:flex flex-col border-l border-gray-200 fixed right-0 top-[72px] bottom-0 bg-white z-30"
                    style={{ width: `${chatPanelWidth}%`, minWidth: '25%', maxWidth: '70%' }}
                >
                    {/* Resize handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize z-10 group"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizingChat(true);
                            const startX = e.clientX;
                            const startWidth = chatPanelWidth;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                const delta = startX - moveEvent.clientX;
                                const newWidth = Math.min(70, Math.max(25, startWidth + (delta / window.innerWidth) * 100));
                                setChatPanelWidth(newWidth);
                            };

                            const handleMouseUp = () => {
                                setIsResizingChat(false);
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }}
                    >
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gray-400 group-hover:bg-blue-600 rounded-full"></div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <ChatInterface
                            subjectContext={{
                                id: subject.id,
                                title: subject.titre || subject.title,
                                url: pdfSource || subject.pdfUrlResolved || subject.fichier_url || subject.pdfUrl,
                                content: markdownContent || pdfTextContent || undefined
                            }}
                            userContext={userContext}
                            onClose={() => setIsChatOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Bottom Sheet - Mobile */}
            {isChatOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
                    {/* Backdrop */}
                    {!isChatFullscreen && (
                        <div
                            className="flex-1 bg-black/30"
                            onClick={() => setIsChatOpen(false)}
                        />
                    )}

                    {/* Sheet */}
                    <div className={`bg-white rounded-t-xl shadow-2xl flex flex-col transition-all duration-300 ${isChatFullscreen ? 'h-full' : 'h-[70vh]'
                        }`}>
                        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                            <h3 className="font-semibold truncate flex-1">Chat sur : {subject.titre || subject.title}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                    title={isChatFullscreen ? "Réduire" : "Plein écran"}
                                >
                                    {isChatFullscreen ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    ) : (
                                        <ArrowsPointingOutIcon className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsChatOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1">
                            <ChatInterface
                                subjectContext={{
                                    id: subject.id,
                                    title: subject.titre || subject.title,
                                    url: pdfSource || subject.pdfUrlResolved || subject.fichier_url || subject.pdfUrl,
                                    content: markdownContent || pdfTextContent || undefined
                                }}
                                userContext={userContext}
                            />
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setReportModalOpen(false)}
                title="Signaler un problème"
            >
                <form>
                    <p className="text-sm text-gray-600 mb-4">
                        Décrivez le problème que vous avez rencontré avec ce sujet (ex: pages illisibles, mauvais fichier, etc.).
                    </p>
                    <textarea
                        className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Votre message..."
                    ></textarea>
                    <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">Envoyer le signalement</button>
                </form>
            </Modal>
        </div>
    );
}