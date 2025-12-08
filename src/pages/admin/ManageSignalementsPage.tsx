import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import {
    TagIcon,
    UserCircleIcon,
    CalendarIcon,
    PencilIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Modal } from '../../components/ui/Modal';

type Signalement = {
    id: string;
    created_at: string;
    description: string;
    type: 'livre' | 'drive' | 'sujet_correction';
    statut: 'en_attente' | 'en_cours' | 'resolu' | 'rejete';
    admin_comment: string | null;
    item_id: string;
    user_id: string;
};

const statusConfig = {
    en_attente: { text: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
    en_cours: { text: 'En cours', color: 'bg-blue-100 text-blue-800', icon: ArrowPathIcon },
    resolu: { text: 'Résolu', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    rejete: { text: 'Rejeté', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
};

const StatusBadge = ({ status }: { status: Signalement['statut'] }) => {
    const config = statusConfig[status] || statusConfig.en_attente;
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-4 h-4 mr-1.5" />
            {config.text}
        </span>
    );
};

export function ManageSignalementsPage() {
    const [signalements, setSignalements] = useState<Signalement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSignalement, setActiveSignalement] = useState<Signalement | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const [newStatus, setNewStatus] = useState<Signalement['statut']>('en_attente');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSignalements = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('signalements')
                    .select(`
                        id, created_at, description, type, statut, admin_comment, item_id, user_id
                    `)
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;
                setSignalements(data as Signalement[]);
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.');
            } finally {
                setLoading(false);
            }
        };
        fetchSignalements();
    }, []);

    const openModal = (signalement: Signalement) => {
        setActiveSignalement(signalement);
        setAdminComment(signalement.admin_comment || '');
        setNewStatus(signalement.statut);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!activeSignalement) return;
        setIsSaving(true);
        const { data, error: updateError } = await supabase
            .from('signalements')
            .update({ statut: newStatus, admin_comment: adminComment })
            .eq('id', activeSignalement.id)
            .select()
            .single();

        if (updateError) {
            alert('Erreur lors de la mise à jour: ' + updateError.message);
        } else {
            setSignalements(prev => prev.map(s => s.id === activeSignalement.id ? { ...s, ...data } : s));
            setIsModalOpen(false);
        }
        setIsSaving(false);
    };

    const filteredSignalements = signalements.filter(s => filterStatus === 'all' || s.statut === filterStatus);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Signalements</h1>
                <p className="text-gray-600 mb-6">Traitez les retours des utilisateurs pour améliorer la plateforme.</p>

                <div className="mb-6">
                    <div className="flex space-x-2 border-b border-gray-200">
                        {['all', ...Object.keys(statusConfig)].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${filterStatus === status
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {status === 'all' ? 'Tous' : statusConfig[status as Signalement['statut']].text}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && <p>Chargement des signalements...</p>}
                {error && <p className="text-red-500">Erreur: {error}</p>}

                {!loading && filteredSignalements.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">Aucun signalement</h3>
                        <p className="mt-1 text-sm text-gray-500">Il n'y a aucun signalement correspondant à ce filtre.</p>
                    </div>
                )}

                <div className="space-y-6">
                    {filteredSignalements.map(s => (
                        <div key={s.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        <StatusBadge status={s.statut} />
                                        <p className="mt-3 text-gray-700 text-base leading-relaxed">{s.description}</p>
                                    </div>
                                    <button onClick={() => openModal(s)} className="ml-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                {s.admin_comment && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500">Commentaire Admin</p>
                                        <p className="text-sm text-gray-600">{s.admin_comment}</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-gray-50/70 px-5 py-3 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-2">
                                <span className="flex items-center font-mono"><UserCircleIcon className="w-4 h-4 mr-1.5" /> ID Utilisateur: {s.user_id.substring(0, 8)}...</span>
                                <span className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5" /> {new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                                <span className="flex items-center"><TagIcon className="w-4 h-4 mr-1.5" /> Type: {s.type}</span>
                                <span className="font-mono">ID: {s.item_id.substring(0, 8)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {activeSignalement && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Traiter le signalement">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Statut</label>
                            <select value={newStatus} onChange={e => setNewStatus(e.target.value as Signalement['statut'])} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                                {Object.entries(statusConfig).map(([key, { text }]) => (
                                    <option key={key} value={key}>{text}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Commentaire (optionnel)</label>
                            <textarea
                                value={adminComment}
                                onChange={e => setAdminComment(e.target.value)}
                                rows={4}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ajouter une note pour l'équipe ou une explication..."
                            />
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}