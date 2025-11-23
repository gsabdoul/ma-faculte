import { useState, useMemo, useEffect } from 'react';
import {
    PencilIcon,
    TrashIcon,
    BookOpenIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface Book {
    id: string;
    titre: string;
    module_id: string;
    couverture_url: string | null;
    fichier_url: string;
    modules: { nom: string } | null;
}

interface Module {
    id: string;
    nom: string;
}

const BOOKS_PER_PAGE = 10;

export function ManageBooksPage() {
    const [allBooks, setAllBooks] = useState<Book[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBook, setCurrentBook] = useState<Partial<Book> | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [bookToDelete, setBookToDelete] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    { data: booksData, error: booksError },
                    { data: modulesData, error: modulesError },
                    { data: userData }
                ] = await Promise.all([
                    supabase.from('livres').select('*, modules(nom)').order('titre'),
                    supabase.from('modules').select('id, nom').order('nom'),
                    supabase.auth.getUser()
                ]);

                if (booksError) throw booksError;
                if (modulesError) throw modulesError;

                setAllBooks(booksData || []);
                setModules(modulesData || []);
                if (userData?.user) {
                    setCurrentUserId(userData.user.id);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleOpenModal = (book: Book | null = null) => {
        setCurrentBook(book ? { ...book } : {});
        setCoverFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentBook(null);
        setCoverFile(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            let couverture_url = currentBook?.couverture_url || null;

            // 1. Upload de la couverture
            if (coverFile) {
                const filePath = `public/covers/${Date.now()}_${coverFile.name.replace(/\s/g, '_')}`;
                const { error: uploadError } = await supabase.storage.from('livres').upload(filePath, coverFile);
                if (uploadError) throw uploadError;
                couverture_url = supabase.storage.from('livres').getPublicUrl(filePath).data.publicUrl;
            }

            const bookData = {
                titre: formData.get('titre') as string,
                module_id: formData.get('module_id') as string,
                couverture_url,
                fichier_url: formData.get('fichier_url') as string,
                created_by: currentUserId
            };

            if (currentBook?.id) {
                const { error: updateError } = await supabase
                    .from('livres')
                    .update(bookData)
                    .eq('id', currentBook.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('livres').insert(bookData);
                if (insertError) throw insertError;
            }

            const { data } = await supabase.from('livres').select('*, modules(nom)').order('titre');
            setAllBooks(data || []);
            handleCloseModal();

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (bookId: string) => {
        setBookToDelete(bookId);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!bookToDelete) return;
        try {
            const { error } = await supabase.from('livres').delete().eq('id', bookToDelete);
            if (error) throw error;
            setAllBooks(allBooks.filter(b => b.id !== bookToDelete));
        } catch (err: any) {
            setError(err.message);
        }
        setBookToDelete(null);
        setIsConfirmModalOpen(false);
    }

    const filteredBooks = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        if (!lowercasedFilter) return allBooks;

        return allBooks.filter(book =>
            book.titre.toLowerCase().includes(lowercasedFilter) ||
            (book.modules?.nom.toLowerCase() || '').includes(lowercasedFilter)
        );
    }, [searchTerm, allBooks]);

    // Logique de pagination
    const indexOfLastBook = currentPage * BOOKS_PER_PAGE;
    const indexOfFirstBook = indexOfLastBook - BOOKS_PER_PAGE;
    const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
    const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    if (loading) return <div className="p-4">Chargement...</div>;
    if (error) return <div className="p-4 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les livres</h1>

            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher un livre, module..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white p-2 rounded-lg flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un livre
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 px-4 font-semibold text-gray-600">Titre du livre</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Module</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentBooks.map((book) => (
                            <tr key={book.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 flex items-center">
                                    {book.couverture_url ? (
                                        <img src={book.couverture_url} alt={book.titre} className="h-12 w-9 object-cover rounded-sm mr-4" />
                                    ) : (
                                        <BookOpenIcon className="h-10 w-10 text-gray-300 mr-4" />
                                    )}
                                    <div>
                                        <span className="font-medium text-gray-800">{book.titre}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600">{book.modules?.nom || 'N/A'}</td>
                                <td className="py-3 px-4 whitespace-nowrap text-right">
                                    <button onClick={() => handleOpenModal(book)} className="text-gray-500 hover:text-blue-500 p-2" title="Modifier"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleDelete(book.id)} className="text-gray-500 hover:text-red-500 p-2" title="Supprimer"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Contrôles de pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-600">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex items-center">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentBook?.id ? 'Modifier le Livre' : 'Ajouter un Livre'}>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="titre" className="block text-sm font-medium text-gray-700">Titre</label>
                            <input type="text" name="titre" id="titre" defaultValue={currentBook?.titre || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="module_id" className="block text-sm font-medium text-gray-700">Module</label>
                            <select name="module_id" id="module_id" defaultValue={currentBook?.module_id || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                                <option value="">Sélectionner un module</option>
                                {modules.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="fichier_url" className="block text-sm font-medium text-gray-700">URL du fichier (PDF/Drive)</label>
                            <input type="text" name="fichier_url" id="fichier_url" defaultValue={currentBook?.fichier_url || ''} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="https://..." />
                        </div>
                        <div>
                            <label htmlFor="coverFile" className="block text-sm font-medium text-gray-700">Image de couverture</label>
                            <input type="file" name="coverFile" id="coverFile" accept="image/*" onChange={(e) => setCoverFile(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Annuler</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{currentBook?.id ? 'Enregistrer' : 'Créer'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmer la suppression"
                message="Êtes-vous sûr de vouloir supprimer ce livre ? Cette action est irréversible."
                isDestructive={true}
            />
        </div>
    );
}