import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronLeftIcon,
    DocumentTextIcon,
    BookOpenIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    FolderIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../supabase';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { getSubjectTitle } from '../../utils/subjectUtils';

interface Creation {
    id: string;
    titre: string;
    created_at: string;
    type: 'Sujet' | 'Livre' | 'Drive';
}

const typeToIcon: Record<Creation['type'], React.ElementType> = {
    Sujet: DocumentTextIcon,
    Livre: BookOpenIcon,
    Drive: FolderIcon,
};

type FilterType = 'Tout' | 'Sujet' | 'Livre' | 'Drive';
const filters: FilterType[] = ['Tout', 'Sujet', 'Livre', 'Drive'];

export function WriterDashboard() {
    const CreationSkeleton = () => (
        <li className="p-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center min-w-0">
                <div className="w-6 h-6 bg-gray-200 rounded-full mr-4 flex-shrink-0"></div>
                <div className="min-w-0">
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
        </li>
    );
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const [allCreations, setAllCreations] = useState<Creation[]>([]);
    const [filteredCreations, setFilteredCreations] = useState<Creation[]>([]);
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('Tout');
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '' });

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchCreations = async () => {
            setLoading(true);
            try {
                const [subjects, books, drives] = await Promise.all([
                    supabase.from('sujets').select('id, created_at, modules(nom), universites(nom), annee, session').eq('created_by', user.id),
                    supabase.from('livres').select('id, titre, created_at').eq('created_by', user.id),
                    supabase.from('drives').select('id, titre, created_at').eq('created_by', user.id),
                ]);

                if (subjects.error) throw subjects.error;
                if (books.error) throw books.error;
                if (drives.error) throw drives.error;

                const combinedCreations: Creation[] = [
                    ...(subjects.data || []).map(item => ({
                        id: item.id,
                        titre: getSubjectTitle({
                            modules: item.modules[0], // Assuming the first module is relevant
                            universites: item.universites[0], // Assuming the first university is relevant
                            annee: item.annee,
                            session: item.session,
                        }),
                        created_at: item.created_at,
                        type: 'Sujet' as const
                    })),
                    ...(books.data || []).map(item => ({ ...item, type: 'Livre' as const })),
                    ...(drives.data || []).map(item => ({ ...item, type: 'Drive' as const })),
                ];

                combinedCreations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setAllCreations(combinedCreations);

            } catch (error) {
                console.error("Erreur lors du chargement des créations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCreations();
    }, [user, location.key]);

    useEffect(() => {
        let creations = allCreations;

        if (activeFilter !== 'Tout') {
            creations = creations.filter(c => c.type === activeFilter);
        }

        if (searchTerm) {
            creations = creations.filter(c =>
                c.titre.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredCreations(creations);
    }, [searchTerm, activeFilter, allCreations]);

    const creationCounts = useMemo(() => {
        return {
            Tout: allCreations.length,
            Sujet: allCreations.filter(c => c.type === 'Sujet').length,
            Livre: allCreations.filter(c => c.type === 'Livre').length,
            Drive: allCreations.filter(c => c.type === 'Drive').length,
        };
    }, [allCreations]);

    const handleDelete = (item: Creation) => {
        setModalState({
            isOpen: true,
            title: `Supprimer "${item.titre}"`,
            message: `Êtes-vous sûr de vouloir supprimer ce ${item.type.toLowerCase()} ? Cette action est irréversible.`,
            onConfirm: async () => {
                try {
                    const tableName = `${item.type.toLowerCase()}s`; // sujets, livres, drives
                    const { error } = await supabase.from(tableName).delete().eq('id', item.id);
                    if (error) throw error;

                    // Mettre à jour l'état local pour refléter la suppression
                    setAllCreations(prev => prev.filter(c => c.id !== item.id));

                } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                    setModalState({
                        isOpen: true,
                        title: "Erreur de suppression",
                        message: err.message || "Une erreur est survenue.",
                    });
                }
            }
        });
    };

    const getEditLink = (item: Creation) => {
        const type = item.type.toLowerCase();
        if (type === 'sujet') return `/writer/edit-subject/${item.id}`;
        if (type === 'livre') return `/writer/edit-book/${item.id}`;
        if (type === 'drive') return `/writer/edit-drive/${item.id}`;
        return '#';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate('/profil')} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Mon tableau de bord</h1>
            </header>

            <main className="p-4 space-y-4">
                {/* Barre de recherche et filtres */}
                <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Rechercher par titre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${activeFilter === filter
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            > {`${filter} (${creationCounts[filter]})`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Liste des créations */}
                {loading ? (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {[...Array(5)].map((_, i) => (
                                <CreationSkeleton key={i} />
                            ))}
                        </ul>
                    </div>
                ) : filteredCreations.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {filteredCreations.map((item) => {
                                const Icon = typeToIcon[item.type];
                                return (
                                    <li key={`${item.type}-${item.id}`} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center min-w-0">
                                            <Icon className="w-6 h-6 text-blue-500 mr-4 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-800 truncate">{item.titre}</p>
                                                <p className="text-sm text-gray-500">{item.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 ml-4 space-x-2">
                                            <p className="text-sm text-gray-400 hidden sm:flex items-center">
                                                <ClockIcon className="w-4 h-4 mr-1.5" />
                                                {formatDate(item.created_at)}
                                            </p>

                                            {item.type === 'Sujet' && (
                                                <Link
                                                    to={`/writer/sujets/${item.id}`}
                                                    className="text-gray-400 hover:text-indigo-600 p-2 rounded-full"
                                                    title="Gérer les questions"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </Link>
                                            )}

                                            <Link to={getEditLink(item)} className="text-gray-400 hover:text-blue-600 p-2 rounded-full">
                                                <PencilIcon className="w-5 h-5" />
                                            </Link>
                                            <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-600 p-2 rounded-full">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : <p className="text-gray-500 text-center py-8">Aucun contenu ne correspond à votre recherche.</p>}
            </main>

            {/* Bouton d'action flottant (FAB) */}
            <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end space-y-3">
                {isFabMenuOpen && (
                    <div className="flex flex-col items-end space-y-3">
                        <Link to="/writer/add-drive" className="flex items-center bg-white pl-4 pr-3 py-2 rounded-full shadow-lg hover:bg-gray-100 transition-all text-sm font-medium text-gray-700">
                            Ajouter un drive <div className="ml-3 bg-blue-100 p-2 rounded-full"><FolderIcon className="w-5 h-5 text-blue-600" /></div>
                        </Link>
                        <Link to="/writer/add-book" className="flex items-center bg-white pl-4 pr-3 py-2 rounded-full shadow-lg hover:bg-gray-100 transition-all text-sm font-medium text-gray-700">
                            Ajouter un livre
                            <div className="ml-3 bg-blue-100 p-2 rounded-full"><BookOpenIcon className="w-5 h-5 text-blue-600" /></div>
                        </Link>
                        <Link to="/writer/add-subject" className="flex items-center bg-white pl-4 pr-3 py-2 rounded-full shadow-lg hover:bg-gray-100 transition-all text-sm font-medium text-gray-700">
                            Ajouter un sujet
                            <div className="ml-3 bg-blue-100 p-2 rounded-full"><DocumentTextIcon className="w-5 h-5 text-blue-600" /></div>
                        </Link>
                    </div>
                )}
                <button
                    onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                    className="bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform duration-300 ease-in-out"
                    style={{ transform: isFabMenuOpen ? 'rotate(45deg)' : 'rotate(0)' }}
                >
                    {isFabMenuOpen ? (
                        <XMarkIcon className="w-6 h-6" />
                    ) : (
                        <PlusIcon className="w-6 h-6" />
                    )}
                </button>
            </div>

            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
            />
        </div>
    );
}