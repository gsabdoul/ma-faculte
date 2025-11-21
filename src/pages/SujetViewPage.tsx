import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, EllipsisVerticalIcon, FlagIcon, PencilSquareIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Document, Page, pdfjs } from 'react-pdf';
import { Modal } from '../components/Modal';
import { ChatInterface } from '../components/ChatInterface';
import { supabase } from '../supabase';
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

    useEffect(() => {
        const updateWidth = () => {
            const el = containerRef.current;
            if (!el) return;
            setContainerWidth(el.clientWidth);
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
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
                    setPdfSource(resolveDriveUrl(pdfUrl) || null);
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
        <div className="flex flex-col h-screen bg-gray-200">
            <header className="bg-white p-4 shadow-md z-20 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                        <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                            <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800 truncate">{subject.titre || subject.title}</h1>
                    </div>
                    <div className="flex items-center gap-2 relative">
                        {/* Chat button */}
                        <button
                            onClick={handleChatToggle}
                            className={`p-2 rounded-full ${isChatOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-blue-100 text-blue-600'}`}
                            title="Discuter avec l'IA"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.31 0-2.56-.3-3.68-.84l-.27-.14-2.81.47.47-2.81-.14-.27A7.934 7.934 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8z" />
                            </svg>
                        </button>
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

            <div className="flex flex-1 overflow-hidden">
                {/* PDF Viewer */}
                <div
                    className={`flex-1 overflow-auto transition-all duration-300 ${isChatOpen ? 'lg:w-3/5' : 'w-full'
                        } ${isChatFullscreen ? 'hidden lg:block' : ''}`}
                >
                    <div ref={containerRef} className="flex flex-col items-center p-4 space-y-4 overflow-auto h-full">
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
                    </div>
                </div>

                {/* Chat Panel - Desktop */}
                {isChatOpen && (
                    <div className="hidden lg:flex lg:w-2/5 border-l border-gray-200 overflow-hidden">
                        <ChatInterface
                            subjectContext={{
                                id: subject.id,
                                title: subject.titre || subject.title,
                                url: pdfSource || subject.pdfUrlResolved || subject.fichier_url || subject.pdfUrl
                            }}
                            userContext={userContext}
                            onClose={() => setIsChatOpen(false)}
                        />
                    </div>
                )}
            </div>

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
                                    url: pdfSource || subject.pdfUrlResolved || subject.fichier_url || subject.pdfUrl
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