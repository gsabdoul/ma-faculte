import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface Module {
    id: string;
    name: string;
}

interface University {
    id: string;
    name: string;
}

export function EditSubjectPage() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();

    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedModuleName, setSelectedModuleName] = useState('');
    const [selectedUniversityId, setSelectedUniversityId] = useState('');
    const [selectedUniversityName, setSelectedUniversityName] = useState('');
    const [year, setYear] = useState<string>('');
    const [session, setSession] = useState<'Normale' | 'Rattrapage'>('Normale');
    const [correction, setCorrection] = useState('');

    const [modules, setModules] = useState<Module[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);

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
            if (!subjectId) {
                setError("ID de sujet manquant.");
                setLoading(false);
                return;
            }

            try {
                const [subjectRes, modsRes, unisRes] = await Promise.all([
                    supabase.from('sujets').select('*, modules(nom), universites(nom)').eq('id', subjectId).single(),
                    supabase.from('modules').select('id, nom'),
                    supabase.from('universites').select('id, nom'),
                ]);

                if (subjectRes.error) throw subjectRes.error;
                if (modsRes.error) throw modsRes.error;
                if (unisRes.error) throw unisRes.error;

                const subject = subjectRes.data;
                setSelectedModuleId(subject.module_id);
                setSelectedModuleName(subject.modules?.nom || '');
                setSelectedUniversityId(subject.universite_id);
                setSelectedUniversityName(subject.universites?.nom || '');
                setYear(subject.annee ? String(subject.annee) : '');
                setSession(subject.session || 'Normale');
                setCorrection(subject.correction || '');

                setModules((modsRes.data || []).map((m: { id: string; nom: string }) => ({ id: m.id, name: m.nom })));
                setUniversities((unisRes.data || []).map((u: { id: string; nom: string }) => ({ id: u.id, name: u.nom })));

            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [subjectId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedModuleId || !selectedUniversityId) {
            setError("Veuillez sélectionner un module et une université.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const subjectUpdate: Record<string, unknown> = {
                module_id: selectedModuleId,
                universite_id: selectedUniversityId,
                annee: year ? Number(year) : null,
                session: session,
                correction: correction || null,
            };

            const { error: updateError } = await supabase.from('sujets').update(subjectUpdate).eq('id', subjectId!);

            if (updateError) throw updateError;

            setModalState({
                isOpen: true,
                title: "Succès",
                message: "Le sujet a été mis à jour avec succès !",
                onConfirm: () => navigate('/writer/dashboard')
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Modifier le Sujet</h1>
            </header>

            <main className="p-4">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Module <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            options={modules}
                            value={selectedModuleName}
                            onChange={(option: { id: string; name: string } | null) => {
                                setSelectedModuleId(option?.id ?? '');
                                setSelectedModuleName(option?.name ?? '');
                            }}
                            placeholder="Sélectionner un module..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Université <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            options={universities}
                            value={selectedUniversityName}
                            onChange={(option: { id: string; name: string } | null) => {
                                setSelectedUniversityId(option?.id ?? '');
                                setSelectedUniversityName(option?.name ?? '');
                            }}
                            placeholder="Sélectionner une université..."
                        />
                    </div>

                    <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                            Année
                        </label>
                        <input
                            type="number"
                            id="year"
                            min="1900"
                            max="2100"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Ex: 2023"
                        />
                    </div>

                    <div>
                        <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-2">
                            Session <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="session"
                            value={session}
                            onChange={(e) => setSession(e.target.value as 'Normale' | 'Rattrapage')}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="Normale">Normale</option>
                            <option value="Rattrapage">Rattrapage</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="correction" className="block text-sm font-medium text-gray-700 mb-2">
                            Correction (optionnel)
                        </label>
                        <textarea
                            id="correction"
                            rows={4}
                            value={correction}
                            onChange={(e) => setCorrection(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Entrez la correction..."
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting || !selectedModuleId || !selectedUniversityId}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                        >
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