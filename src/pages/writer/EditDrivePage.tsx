import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SearchableSelect } from '../../components/SearchableSelect';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Faculty = { id: string; name: string };
type Niveau = { id: string; name: string };

export function EditDrivePage() {
    const { driveId } = useParams<{ driveId: string }>();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [selectedFacultyName, setSelectedFacultyName] = useState('');
    const [selectedNiveauId, setSelectedNiveauId] = useState('');
    const [selectedNiveauName, setSelectedNiveauName] = useState('');

    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [niveaux, setNiveaux] = useState<Niveau[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '' });

    useEffect(() => {
        const fetchData = async () => {
            if (!driveId) {
                setError("ID de drive manquant.");
                setLoading(false);
                return;
            }
            try {
                const [driveRes, facRes, nivRes] = await Promise.all([
                    supabase.from('drives').select('*, facultes(nom), niveaux(nom)').eq('id', driveId).single(),
                    supabase.from('facultes').select('id, nom'),
                    supabase.from('niveaux').select('id, nom'),
                ]);

                if (driveRes.error) throw driveRes.error;
                if (facRes.error) throw facRes.error;
                if (nivRes.error) throw nivRes.error;

                const drive = driveRes.data;
                setTitle(drive.titre);
                setDescription(drive.description || '');
                setUrl(drive.url);
                setSelectedFacultyId(drive.faculte_id);
                setSelectedFacultyName(drive.facultes?.nom || '');
                setSelectedNiveauId(drive.niveau_id);
                setSelectedNiveauName(drive.niveaux?.nom || '');

                setFaculties(facRes.data.map(f => ({ id: f.id, name: f.nom })));
                setNiveaux(nivRes.data.map(n => ({ id: n.id, name: n.nom })));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [driveId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.from('drives').update({
                titre: title,
                description: description,
                url: url,
                faculte_id: selectedFacultyId,
                niveau_id: selectedNiveauId,
            }).eq('id', driveId);

            if (updateError) throw updateError;

            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Le drive a été mis à jour avec succès !",
                onConfirm: () => navigate('/writer/dashboard')
            });

        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Modifier le Drive</h1>
            </header>

            <main className="p-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
                        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                        <p className="mt-1 text-xs text-gray-500">Aperçu ci-dessous. Prend en charge GFM (liens, listes, tableaux).</p>
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <div className="prose prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {(description || '').trim()}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700">URL</label>
                        <input type="url" id="url" value={url} onChange={(e) => setUrl(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Faculté</label>
                        <SearchableSelect
                            options={faculties}
                            value={selectedFacultyName}
                            onChange={(option) => {
                                setSelectedFacultyId(option?.id || '');
                                setSelectedFacultyName(option?.name || '');
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Niveau</label>
                        <SearchableSelect
                            options={niveaux}
                            value={selectedNiveauName}
                            onChange={(option) => {
                                setSelectedNiveauId(option?.id || '');
                                setSelectedNiveauName(option?.name || '');
                            }}
                        />
                    </div>
                    <div className="pt-4">
                        <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                            {submitting ? 'Mise à jour...' : 'Enregistrer les modifications'}
                        </button>
                    </div>
                </form>
            </main>

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