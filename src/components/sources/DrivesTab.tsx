import { useState, useMemo, useEffect } from 'react';
import { MagnifyingGlassIcon, FlagIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../supabase';
import { useUser } from '../../context/UserContext';
import { Modal } from '../../components/ui/Modal';

interface Drive {
    id: string;
    titre: string;
    description: string | null;
    url: string;
    faculte_id: string;
    niveau_id: string;
}

const DriveSkeleton = () => (
    <div className="flex items-start p-4 bg-white rounded-lg shadow-md animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-md flex-shrink-0"></div>
        <div className="ml-4 flex-grow">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
    </div>
);

export function DrivesTab() {
    const BASE_URL = import.meta.env.BASE_URL;
    const [searchTerm, setSearchTerm] = useState('');
    const [drives, setDrives] = useState<Drive[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { profile, user } = useUser();
    const [driveToReport, setDriveToReport] = useState<Drive | null>(null);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [reportDescription, setReportDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchDrives = async () => {
            if (!profile) return;

            setLoading(true);
            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from('drives')
                    .select('id, titre, description, url, faculte_id, niveau_id')
                    .eq('faculte_id', profile.faculte_id)
                    .eq('niveau_id', profile.niveau_id);

                if (fetchError) throw fetchError;

                setDrives(data || []);
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.');
            } finally {
                setLoading(false);
            }
        };

        fetchDrives();
    }, [profile]);

    const filteredDrives = useMemo(() => {
        if (!searchTerm) return drives;
        return drives.filter(drive =>
            drive.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (drive.description && drive.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [searchTerm, drives]);

    const openReportModal = (drive: Drive) => {
        setDriveToReport(drive);
        setReportModalOpen(true);
    };

    const closeReportModal = () => {
        setDriveToReport(null);
        setReportModalOpen(false);
        setReportDescription('');
        setIsSubmitting(false);
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driveToReport || !user || !reportDescription.trim()) return;

        setIsSubmitting(true);
        try {
            const { error: insertError } = await supabase
                .from('signalements')
                .insert({
                    user_id: user.id,
                    item_id: driveToReport.id,
                    type: 'drive',
                    description: reportDescription.trim(),
                });

            if (insertError) throw insertError;

            alert('Votre signalement a été envoyé avec succès. Merci !');
            closeReportModal();
        } catch (err: any) {
            alert(`Erreur lors de l'envoi du signalement : ${err.message}`);
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 drives-header">
                <h1 className="text-2xl font-bold text-gray-800">Drives Partagés</h1>
                <div className="relative mt-4">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Rechercher dans les drives..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </header>

            <main className="p-4 space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <DriveSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">Erreur: {error}</div>
                ) : filteredDrives.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">Aucun drive partagé disponible pour votre niveau.</div>
                ) : (
                    filteredDrives.map(drive => (
                        <div
                            key={drive.id}
                            className="flex items-start p-4 bg-white rounded-lg shadow-md transition-shadow group"
                        >
                            <a href={drive.url} target="_blank" rel="noopener noreferrer" className="flex items-start flex-grow">
                                <img src={`${BASE_URL}google-drive.png`} alt="Drive" className="w-12 h-12 flex-shrink-0" />
                                <div className="ml-4">
                                    <h2 className="font-semibold text-gray-800 group-hover:text-blue-600">{drive.titre}</h2>
                                    <p className="text-sm text-gray-600 mt-1">{drive.description}</p>
                                </div>
                            </a>
                            <button
                                onClick={() => openReportModal(drive)}
                                className="ml-4 p-2 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Signaler un lien mort"
                            >
                                <FlagIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                )}
            </main>

            <Modal
                isOpen={isReportModalOpen}
                onClose={closeReportModal}
                title={`Signaler un problème sur "${driveToReport?.titre}"`}
            >
                <form onSubmit={handleReportSubmit}>
                    <p className="text-sm text-gray-600 mb-4">
                        Décrivez le problème que vous avez rencontré (ex: lien mort, accès refusé, mauvais contenu, etc.).
                    </p>
                    <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Votre message..."
                        required
                    ></textarea>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={closeReportModal}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                            {isSubmitting ? 'Envoi en cours...' : 'Envoyer le signalement'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
