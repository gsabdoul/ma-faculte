import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, EllipsisVerticalIcon, FlagIcon, PencilSquareIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid';
import { Document, Page, pdfjs } from 'react-pdf';
import { Modal } from '../components/Modal';
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
    const [pageNumber, setPageNumber] = useState(1);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfSource, setPdfSource] = useState<string | null>(null);
    const [triedBlobFetch, setTriedBlobFetch] = useState(false);
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

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

    

    const handleCorrectionClick = () => {
        setMenuOpen(false);
        const hasCorrection = !!subject?.correction && String(subject.correction).trim().length > 0;
        if (!hasCorrection) {
            // setInfoMessage('Ce sujet n’a pas encore de correction.'); // Removed as per previous change
            // setIsInfoOpen(true); // Removed as per previous change
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
                    // Resolve Google Drive preview links to direct download URLs if needed
                    const resolveDriveUrl = (url: string | null | undefined) => {
                        if (!url) return url;
                        // match /d/FILEID/ or id=FILEID
                        const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                        const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                        const id = m1?.[1] || m2?.[1];
                        if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
                        return url;
                    };

                    const pdfUrl = (raw as any).fichier_url || (raw as any).pdfUrl || null;
                    // attach resolved url used by react-pdf
                    (raw as any).pdfUrlResolved = resolveDriveUrl(pdfUrl);
                    // set initial pdf source
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
        setPageNumber(1);
    }

    // Cleanup object URLs when component unmounts or pdfSource changes
    useEffect(() => {
        return () => {
            if (pdfSource && pdfSource.startsWith('blob:')) {
                try { URL.revokeObjectURL(pdfSource); } catch (e) { /* ignore */ }
            }
        };
    }, [pdfSource]);

    const handleDocumentError = async (err: any) => {
        console.error('react-pdf load error:', err);
        // If we haven't tried fetching as blob yet, try that as a fallback
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
        setMenuOpen(false); // Close the dropdown
        setReportModalOpen(true); // Open the modal
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
                                else el.requestFullscreen().catch(() => {});
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
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-30">
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

            <main className="flex-grow overflow-auto">
                <div ref={containerRef} className="flex justify-center p-0 sm:p-4 h-full">
                    <Document
                        file={pdfSource || subject.pdfUrlResolved || subject.fichier_url || subject.pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={handleDocumentError}
                        loading={<div className="text-center p-8">Chargement du sujet...</div>}
                        error={<div className="text-center p-8 text-red-500">Erreur de chargement du PDF.</div>}
                    >
                        <Page
                            pageNumber={pageNumber}
                            renderTextLayer={false}
                            width={containerWidth ? Math.floor(containerWidth) : undefined}
                            scale={zoom}
                        />
                    </Document>
                </div>
            </main>

            {numPages && (
                <footer className="bg-white p-2 shadow-inner z-20 flex-shrink-0 flex items-center justify-center space-x-4">
                    <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="px-4 py-2 rounded disabled:opacity-50">Préc.</button>
                    <div className="text-sm">
                        Page <input
                            type="number"
                            value={pageNumber}
                            onChange={(e) => setPageNumber(Math.max(1, Math.min(numPages, Number(e.target.value))))}
                            className="w-12 text-center border rounded mx-1"
                        /> sur {numPages}
                    </div>
                    <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="px-4 py-2 rounded disabled:opacity-50">Suiv.</button>
                </footer>
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