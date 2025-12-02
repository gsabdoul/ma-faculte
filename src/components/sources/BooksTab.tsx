import { useState, useMemo, useEffect } from 'react';
import { MagnifyingGlassIcon, FlagIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../supabase';
import { useUser } from '../../context/UserContext';
import { Modal } from '../../components/ui/Modal';
import { useCachedStatus } from '../../hooks/useCachedStatus';

type Book = {
    id: string;
    titre: string;
    module_id: string;
    couverture_url: string | null;
    fichier_url: string;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
};

type Module = {
    id: string;
    nom: string;
    description: string | null;
    icone_url: string | null;
    created_at: string | null;
    updated_at: string | null;
    is_free: boolean;
};

const BookSkeleton = () => {
    return <div className="group block bg-gray-200 rounded-lg shadow-md animate-pulse aspect-[2/3]"></div>;
};

export function BooksTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState<string>('all');
    const [books, setBooks] = useState<Book[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();
    const [bookToReport, setBookToReport] = useState<Book | null>(null);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [reportDescription, setReportDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const { data: modulesData, error: modulesError } = await supabase
                    .from('modules')
                    .select('id,nom,description,icone_url,is_free,created_at,updated_at')
                    .order('nom');

                if (modulesError) throw modulesError;

                const { data: booksData, error: booksError } = await supabase
                    .from('livres')
                    .select('id,titre,module_id,couverture_url,fichier_url,created_at,updated_at,created_by')
                    .order('titre');

                if (booksError) throw booksError;

                setModules(modulesData ?? []);
                setBooks(booksData ?? []);
            } catch (err: any) {
                setError(err?.message ?? 'Erreur lors du chargement des données');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const availableModules = useMemo(() => {
        const moduleIds = new Set(books.map(book => book.module_id));
        return modules.filter(m => moduleIds.has(m.id));
    }, [modules, books]);

    const filteredBooks = useMemo(() => {
        let filtered = books;

        if (selectedModule !== 'all') filtered = filtered.filter(b => b.module_id === selectedModule);
        if (searchTerm) filtered = filtered.filter(b => b.titre.toLowerCase().includes(searchTerm.toLowerCase()));
        return filtered;
    }, [books, searchTerm, selectedModule]);

    const openReportModal = (e: React.MouseEvent, book: Book) => {
        e.preventDefault(); // Empêche la navigation
        e.stopPropagation(); // Empêche la propagation de l'événement au lien parent
        setBookToReport(book);
        setReportModalOpen(true);
    };

    const closeReportModal = () => {
        setBookToReport(null);
        setReportModalOpen(false);
        setReportDescription('');
        setIsSubmitting(false);
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookToReport || !user || !reportDescription.trim()) return;

        setIsSubmitting(true);
        try {
            const { error: insertError } = await supabase
                .from('signalements')
                .insert({
                    user_id: user.id,
                    item_id: bookToReport.id,
                    type: 'livre',
                    description: reportDescription.trim(),
                });

            if (insertError) throw insertError;

            alert('Votre signalement a été envoyé avec succès. Merci !');
            closeReportModal();
        } catch (err: any) {
            alert(`Erreur lors de l'envoi du signalement : ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resolveDriveUrl = (url: string): string => {
        try {
            // Normalise vers l’endpoint UC de Google Drive pour le cache SW
            const dMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
            if (dMatch?.[1]) {
                return `https://drive.google.com/uc?export=download&id=${dMatch[1]}`;
            }
            const u = new URL(url);
            const idParam = u.searchParams.get('id');
            if (idParam) {
                return `https://drive.google.com/uc?export=download&id=${idParam}`;
            }
            return url;
        } catch {
            return url;
        }
    };

    const DownloadButton = ({ url, title }: { url: string; title?: string }) => {
        const isCached = useCachedStatus(url);
        if (isCached) return null;
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 left-2 p-2 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title={title ? `Télécharger ${title}` : 'Télécharger'}
            >
                <DocumentArrowDownIcon className="w-5 h-5" />
            </a>
        );
    };

    return (
        <div>
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 books-header">
                <h1 className="text-2xl font-bold text-gray-800">Bibliothèque</h1>
                <div className="relative mt-4">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Rechercher un livre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </header>

            <div className="px-4 pt-4 overflow-x-auto">
                <div className="flex space-x-2 pb-2">
                    <button
                        onClick={() => setSelectedModule('all')}
                        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${selectedModule === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        Tous
                    </button>
                    {availableModules.map(module => (
                        <button
                            key={module.id}
                            onClick={() => setSelectedModule(module.id)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors flex-shrink-0 ${selectedModule === module.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            {module.nom}
                        </button>
                    ))}
                </div>
            </div>

            <main className="p-4">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {[...Array(12)].map((_, i) => (
                            <BookSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">Erreur: {error}</div>
                ) : books.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">Aucun livre disponible.</div>
                ) : filteredBooks.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">Aucun livre ne correspond à votre recherche.</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredBooks.map(book => {
                            const fileUrl = resolveDriveUrl(book.fichier_url);
                            return (
                                <div key={book.id} className="relative group">
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block bg-gray-100 rounded-lg shadow-md overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 aspect-[2/3]"
                                    >
                                        <img
                                            src={book.couverture_url || '/placeholder-book.png'}
                                            alt={`Couverture de ${book.titre}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </a>
                                    <DownloadButton url={fileUrl} title={book.titre} />
                                    <button
                                        onClick={(e) => openReportModal(e, book)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Signaler un problème"
                                    >
                                        <FlagIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <Modal
                isOpen={isReportModalOpen}
                onClose={closeReportModal}
                title={`Signaler un problème sur "${bookToReport?.titre}"`}
            >
                <form onSubmit={handleReportSubmit}>
                    <p className="text-sm text-gray-600 mb-4">
                        Décrivez le problème que vous avez rencontré (ex: lien mort, mauvais livre, etc.).
                    </p>
                    <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Votre message..."
                        required
                    ></textarea>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeReportModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                            {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
