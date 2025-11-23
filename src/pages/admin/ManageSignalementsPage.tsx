import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TagIcon, UserCircleIcon, ChevronUpDownIcon, LinkIcon, PencilIcon, ChatBubbleLeftEllipsisIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

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
        nom: string | null;
        prenom: string | null;
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

export function ManageSignalementsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Report; direction: 'ascending' | 'descending' } | null>({ key: 'created_at', direction: 'descending' });
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [adminComment, setAdminComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch signalements first (without polymorphic joins)
                const { data: reportsData, error: fetchError } = await supabase
                    .from('signalements')
                    .select(`
                    id, created_at, description, item_id, statut, type, admin_comment,
                    user:profiles(id, nom, prenom)
                `);

                if (fetchError) throw new Error(fetchError.message);

                // 2. Collect IDs for each type
                const sujetIds = reportsData.filter((r: any) => r.type === 'sujet').map((r: any) => r.item_id);
                const livreIds = reportsData.filter((r: any) => r.type === 'livre').map((r: any) => r.item_id);
                const driveIds = reportsData.filter((r: any) => r.type === 'drive').map((r: any) => r.item_id);

                // 3. Fetch related items in parallel
                const [sujetsRes, livresRes, drivesRes] = await Promise.all([
                    sujetIds.length > 0 ? supabase.from('sujets').select('id, titre').in('id', sujetIds) : { data: [] },
                    livreIds.length > 0 ? supabase.from('livres').select('id, titre').in('id', livreIds) : { data: [] },
                    driveIds.length > 0 ? supabase.from('drives').select('id, titre').in('id', driveIds) : { data: [] }
                ]);

                // 4. Create lookup maps
                const sujetsMap = new Map(sujetsRes.data?.map((s: any) => [s.id, s.titre]));
                const livresMap = new Map(livresRes.data?.map((l: any) => [l.id, l.titre]));
                const drivesMap = new Map(drivesRes.data?.map((d: any) => [d.id, d.titre]));

                // 5. Merge data
                const formattedData = reportsData.map((r: any) => {
                    let title = 'Élément inconnu';
                    if (r.type === 'sujet') title = sujetsMap.get(r.item_id) || 'Sujet introuvable';
                    else if (r.type === 'livre') title = livresMap.get(r.item_id) || 'Livre introuvable';
                    else if (r.type === 'drive') title = drivesMap.get(r.item_id) || 'Drive introuvable';

                    return {
                        ...r,
                        item_title: title,
                    };
                });

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

                if (valA == null && valB == null) return 0;
                if (valA == null) return direction === 'ascending' ? -1 : 1;
                if (valB == null) return direction === 'ascending' ? 1 : -1;

                if (valA < valB) return direction === 'ascending' ? -1 : 1;
                if (valA > valB) return direction === 'ascending' ? 1 : -1;
                return 0;
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
        const base = window.location.origin + '/#';
        if (report.type === 'sujet') return `${base}/sujets/${report.item_id}`;
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

    const handleDelete = async () => {
        if (!reportToDelete) return;
        try {
            const { error } = await supabase.from('signalements').delete().eq('id', reportToDelete.id);
            if (error) throw error;
            setReports(prev => prev.filter(r => r.id !== reportToDelete.id));
        } catch (err: any) {
            alert(`Erreur lors de la suppression : ${err.message}`);
        } finally {
            setReportToDelete(null);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(sortedReports.length / REPORTS_PER_PAGE);
    const currentReports = sortedReports.slice((currentPage - 1) * REPORTS_PER_PAGE, currentPage * REPORTS_PER_PAGE);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    if (loading) return <div className="text-center p-8">Chargement des signalements...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
                <h1 className="text-3xl font-bold text-gray-800">Gérer les Signalements</h1>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-gray-200">
                        <tr>
                            <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                            <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider">Élément signalé</th>
                            <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider">
                                <button onClick={() => requestSort('created_at')} className="flex items-center space-x-1">
                                    <span>Date</span>
                                    <ChevronUpDownIcon className="h-4 w-4" />
                                </button>
                            </th>
                            <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider">
                                <button onClick={() => requestSort('statut')} className="flex items-center space-x-1">
                                    <span>Statut</span>
                                    <ChevronUpDownIcon className="h-4 w-4" />
                                </button>
                            </th>
                            <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentReports.map((report) => (
                            <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full">
                                            <UserCircleIcon className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{`${report.user?.prenom || ''} ${report.user?.nom || ''}`.trim() || 'Utilisateur Anonyme'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center">
                                        <div className="flex-grow">
                                            <p className="font-medium text-gray-800">{report.item_title}</p>
                                            <span className="text-xs capitalize inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
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
                                <td className="py-3 px-4 text-gray-600 max-w-xs">
                                    <p className="truncate" title={report.description}>{report.description}</p>
                                </td>
                                <td className="py-3 px-4 text-gray-500">
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
                                <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {report.admin_comment && (
                                            <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-500" title={report.admin_comment} />
                                        )}
                                        <button onClick={() => openCommentModal(report)} className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50" title="Ajouter/Modifier un commentaire">
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setReportToDelete(report)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50" title="Supprimer le signalement">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <span className="text-sm text-gray-600">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
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
                    <p className="text-sm text-gray-600 mb-1">Signalement de: <span className="font-semibold">{`${editingReport?.user?.prenom || ''} ${editingReport?.user?.nom || ''}`.trim()}</span></p>
                    <p className="text-sm text-gray-600 mb-4">Élément: <span className="font-semibold">{editingReport?.item_title}</span></p>
                    <textarea
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        className="w-full h-40 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ajouter un commentaire interne..."
                    ></textarea>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeCommentModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                            Annuler
                        </button>
                        <button onClick={handleCommentSave} disabled={isSubmittingComment} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                            {isSubmittingComment ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!reportToDelete}
                onClose={() => setReportToDelete(null)}
                onConfirm={handleDelete}
                title="Confirmer la suppression"
                message={`Êtes-vous sûr de vouloir supprimer ce signalement ? Cette action est irréversible.`}
                isDestructive={true}
            />
        </div>
    );
}