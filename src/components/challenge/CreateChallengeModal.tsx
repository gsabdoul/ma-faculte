import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CreateChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (challengeId: string) => void;
}

interface Module {
    id: string;
    nom: string;
}

interface University {
    id: string;
    nom: string;
}

interface Subject {
    id: string;
    titre: string;
}

export function CreateChallengeModal({ isOpen, onClose, onSuccess }: CreateChallengeModalProps) {
    const [modules, setModules] = useState<Module[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch modules on mount
    useEffect(() => {
        const fetchModules = async () => {
            // First, get the current user's profile to get their faculte_id and niveau_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('faculte_id, niveau_id')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) {
                console.error('Error fetching user profile:', profileError);
                return;
            }

            // Fetch modules that match the user's faculte and niveau
            const { data, error } = await supabase
                .from('module_faculte_niveau')
                .select(`
                    module_id,
                    modules:module_id (
                        id,
                        nom
                    )
                `)
                .eq('faculte_id', profile.faculte_id)
                .eq('niveau_id', profile.niveau_id);

            if (!error && data) {
                // Extract unique modules from the junction table
                const modulesArray: Module[] = [];
                const seenIds = new Set<string>();

                for (const item of data) {
                    const module = (item as any).modules;
                    if (module && !seenIds.has(module.id)) {
                        seenIds.add(module.id);
                        modulesArray.push(module);
                    }
                }

                setModules(modulesArray);
            }
        };

        if (isOpen) {
            fetchModules();
        }
    }, [isOpen]);

    // Fetch universities when module changes
    useEffect(() => {
        if (!selectedModule) {
            setUniversities([]);
            setSelectedUniversity(null);
            return;
        }

        const fetchUniversities = async () => {
            // Fetch universities that have at least one subject for this module
            const { data, error } = await supabase
                .from('sujets')
                .select('universite_id, universites:universite_id(id, nom)')
                .eq('module_id', selectedModule);

            if (!error && data) {
                // Extract unique universities
                const universitiesArray: University[] = [];
                const seenIds = new Set<string>();

                for (const item of data) {
                    const university = (item as any).universites;
                    if (university && !seenIds.has(university.id)) {
                        seenIds.add(university.id);
                        universitiesArray.push(university);
                    }
                }

                setUniversities(universitiesArray);
            }
        };

        fetchUniversities();
    }, [selectedModule]);

    // Fetch subjects when module and university change
    useEffect(() => {
        if (!selectedModule || !selectedUniversity) {
            setSubjects([]);
            setSelectedSubject(null);
            return;
        }

        const fetchSubjects = async () => {
            const { data, error } = await supabase
                .from('sujets')
                .select('id, titre')
                .eq('module_id', selectedModule)
                .eq('universite_id', selectedUniversity)
                .order('titre');

            if (!error && data) {
                setSubjects(data);
            }
        };

        fetchSubjects();
    }, [selectedModule, selectedUniversity]);

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleCreate = async () => {
        if (!selectedSubject) {
            setError("Veuillez sélectionner un sujet");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            const code = generateCode();

            // Create challenge
            const { data: challenge, error: createError } = await supabase
                .from('challenges')
                .insert({
                    creator_id: user.id,
                    subject_id: selectedSubject,
                    code: code,
                    status: 'waiting'
                })
                .select()
                .single();

            if (createError) throw createError;

            // Add creator as participant
            const { error: joinError } = await supabase
                .from('challenge_participants')
                .insert({
                    challenge_id: challenge.id,
                    user_id: user.id,
                    status: 'joined'
                });

            if (joinError) throw joinError;

            onSuccess(challenge.id);
            onClose();
        } catch (err: any) {
            console.error('Error creating challenge:', err);
            setError(err.message || "Impossible de créer le challenge");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-6">Créer un Challenge</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Module Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Module
                        </label>
                        <select
                            value={selectedModule || ''}
                            onChange={(e) => setSelectedModule(e.target.value || null)}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
                        >
                            <option value="">Sélectionnez un module</option>
                            {modules.map(m => (
                                <option key={m.id} value={m.id}>{m.nom}</option>
                            ))}
                        </select>
                    </div>

                    {/* University Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Université
                        </label>
                        <select
                            value={selectedUniversity || ''}
                            onChange={(e) => setSelectedUniversity(e.target.value || null)}
                            disabled={!selectedModule}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">Sélectionnez une université</option>
                            {universities.map(u => (
                                <option key={u.id} value={u.id}>{u.nom}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subject Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sujet
                        </label>
                        <select
                            value={selectedSubject || ''}
                            onChange={(e) => setSelectedSubject(e.target.value || null)}
                            disabled={!selectedUniversity}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">Sélectionnez un sujet</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.titre}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={loading || !selectedSubject}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Création...' : 'Créer le Challenge'}
                    </button>
                </div>
            </div>
        </div>
    );
}
