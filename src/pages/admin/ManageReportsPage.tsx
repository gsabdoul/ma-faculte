import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TagIcon, UserCircleIcon, ChevronUpDownIcon, LinkIcon, PencilIcon, ChatBubbleLeftEllipsisIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../components/Modal';

type ReportStatus = 'en_attente' | 'en_cours' | 'resolu' | 'rejete';

interface Report {
    id: string;
    created_at: string;
    description: string;
    item_id: string;
    statut: ReportStatus;
    type: 'sujet' | 'livre' | 'drive';
    user: {
        id: string;
        email: string | null;
        profile: {
            nom: string | null;
            prenom: string | null;
        } | null;
    } | null;
    item_title: string | null;
    admin_comment: string | null;
}

const statusColors: Record<ReportStatus, string> = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    en_cours: 'bg-blue-100 text-blue-800',
    resolu: 'bg-green-100 text-green-800',
    rejete: 'bg-red-100 text-red-800',
};

const statusOptions: ReportStatus[] = ['en_attente', 'en_cours', 'resolu', 'rejete'];

const REPORTS_PER_PAGE = 10;

export function ManageReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Report; direction: 'ascending' | 'descending' } | null>({ key: 'created_at', direction: 'descending' });
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [adminComment, setAdminComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('signalements')
                    .select(`
                    id, created_at, description, item_id, statut, type, admin_comment,
                    user:user_id(id, email, profile:profiles(nom, prenom)),
                    sujet:sujets(titre),
                    livre:livres(titre),
                    drive:drives(titre)
                `);

                if (fetchError) throw fetchError;

                const formattedData = data.map((r: any) => ({
                    ...r,
                    item_title: r.sujet?.titre || r.livre?.titre || r.drive?.titre || 'Élément inconnu',
                }));

                setReports(formattedData);
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const sortedReports = useMemo(() => {
        let sortableItems = [...reports];
        if (sortConfig !== null) {
            const { key, direction } = sortConfig;
            sortableItems.sort((a, b) => {
                const valA = a[key];
                const valB = b[key];

                // identical or both null/undefined
                if (valA === valB) return 0;

                // Handle nulls/undefined by sorting them to the beginning
                if (valA === null || valA === undefined) return -1;
                if (valB === null || valB === undefined) return 1;

                // Compare strings (also used for statut, id, etc.)
                if (typeof valA === 'string' && typeof valB === 'string') {
                    // If comparing created_at, compare as dates
                    if (key === 'created_at') {
                        const timeA = Date.parse(valA);
                        const timeB = Date.parse(valB);
                        if (!isNaN(timeA) && !isNaN(timeB)) {
                            return direction === 'ascending' ? timeA - timeB : timeB - timeA;
                        }
                    }
                    const cmp = valA.localeCompare(valB);
                    return direction === 'ascending' ? cmp : -cmp;
                }

                // Compare numbers
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'ascending' ? valA - valB : valB - valA;
                }

                // Fallback to string comparison for other types
                const strA = String(valA);
                const strB = String(valB);
                const cmp = strA.localeCompare(strB);
                return direction === 'ascending' ? cmp : -cmp;
            });
        }
        return sortableItems;
    }, [reports, sortConfig]);

    const requestSort = (key: keyof Report) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleStatusChange = async (reportId: string, newStatus: ReportStatus) => {
        try {
            const { error: updateError } = await supabase
                .from('signalements')
                .update({ statut: newStatus, updated_at: new Date().toISOString() })
                .eq('id', reportId);

            if (updateError) throw updateError;

            setReports(prev => prev.map(r => r.id === reportId ? { ...r, statut: newStatus } : r));
        } catch (err: any) {
            alert(`Erreur lors de la mise à jour du statut : ${err.message}`);
        }
    };

    const getItemLink = (report: Report) => {
        const base = window.location.origin;
        if (report.type === 'sujet') return `${base}/sujets/${report.item_id}`;
        if (report.type === 'livre') return `${base}/livres/${report.item_id}`;
        // Drives don't have a view page, so we can't link to them directly.
        return null;
    };

    const openCommentModal = (report: Report) => {
        setEditingReport(report);
        setAdminComment(report.admin_comment || '');
    };

    const closeCommentModal = () => {
        setEditingReport(null);
        setAdminComment('');
        setIsSubmittingComment(false);
    };

    const handleCommentSave = async () => {
        if (!editingReport) return;

        setIsSubmittingComment(true);
        try {
            const { data, error: updateError } = await supabase
                .from('signalements')
                .update({ admin_comment: adminComment, updated_at: new Date().toISOString() })
                .eq('id', editingReport.id)
                .select()
                .single();

            if (updateError) throw updateError;

            setReports(prev => prev.map(r => r.id === editingReport.id ? { ...r, admin_comment: data.admin_comment } : r));
            closeCommentModal();
        } catch (err: any) {
            alert(`Erreur lors de la sauvegarde du commentaire : ${err.message}`);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(sortedReports.length / REPORTS_PER_PAGE);
    const indexOfLastReport = currentPage * REPORTS_PER_PAGE;
    const indexOfFirstReport = indexOfLastReport - REPORTS_PER_PAGE;
    const currentReports = sortedReports.slice(indexOfFirstReport, indexOfLastReport);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);


    if (loading) return <div className="text-center p-8">Chargement des signalements...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les Signalements</h1>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 px-4 font-semibold text-gray-600">Utilisateur</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Élément signalé</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Description</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">
                                <button onClick={() => requestSort('created_at')} className="flex items-center space-x-1">
                                    <span>Date</span>
                                    <ChevronUpDownIcon className="h-4 w-4" />
                                </button>
                            </th>
                            <th className="py-3 px-4 font-semibold text-gray-600">
                                <button onClick={() => requestSort('statut')} className="flex items-center space-x-1">
                                    <span>Statut</span>
                                    <ChevronUpDownIcon className="h-4 w-4" />
                                </button>
                            </th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Commentaire</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentReports.map((report) => (
                            <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div className="flex items-center">
                                        <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                                        <div>
                                            <p className="font-medium text-gray-800">{report.user?.profile?.prenom || 'Utilisateur'} {report.user?.profile?.nom || ''}</p>
                                            <p className="text-xs text-gray-500">{report.user?.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center">
                                        <div className="flex-grow">
                                            <p className="font-medium text-gray-800">{report.item_title}</p>
                                            <span className="text-xs capitalize inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                <TagIcon className="w-3 h-3 mr-1" />{report.type}
                                            </span>
                                        </div>
                                        {getItemLink(report) && (
                                            <a href={getItemLink(report)!} target="_blank" rel="noopener noreferrer" className="ml-2 p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50" title="Voir l'élément">
                                                <LinkIcon className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600 max-w-sm">
                                    <p className="truncate" title={report.description}>{report.description}</p>
                                </td>
                                <td className="py-3 px-4 text-gray-500 text-sm">
                                    {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                </td>
                                <td className="py-3 px-4">
                                    <select
                                        value={report.statut}
                                        onChange={(e) => handleStatusChange(report.id, e.target.value as ReportStatus)}
                                        className={`px-2 py-1 text-xs font-semibold rounded-full border-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${statusColors[report.statut]}`}
                                    >
                                        {statusOptions.map(status => (
                                            <option key={status} value={status}>{status.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center">
                                        {report.admin_comment && (
                                            <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-400" title={report.admin_comment} />
                                        )}
                                        <button onClick={() => openCommentModal(report)} className="text-gray-400 hover:text-blue-500 p-2 ml-1" title="Ajouter/Modifier un commentaire">
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
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

            <Modal
                isOpen={!!editingReport}
                onClose={closeCommentModal}
                title={`Commentaire pour le signalement`}
            >
                <div>
                    <p className="text-sm text-gray-600 mb-1">Signalement de: <span className="font-semibold">{editingReport?.user?.profile?.prenom} {editingReport?.user?.profile?.nom}</span></p>
                    <p className="text-sm text-gray-600 mb-4">Élément: <span className="font-semibold">{editingReport?.item_title}</span></p>
                    <textarea
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        className="w-full h-40 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ajouter un commentaire interne..."
                    ></textarea>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={closeCommentModal}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                            Annuler
                        </button>
                        <button onClick={handleCommentSave} disabled={isSubmittingComment} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                            {isSubmittingComment ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}