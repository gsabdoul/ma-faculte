import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import {
    EyeIcon,
    EyeSlashIcon,
    AcademicCapIcon,
    UserIcon,
    AtSymbolIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';

// Types pour les données récupérées
interface Option {
    id: string;
    name: string;
}


export function RegisterPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        universityId: '',
        universityNom: '',
        faculteId: '',
        faculteNom: '',
        niveauId: '',
        niveauNom: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [universities, setUniversities] = useState<Option[]>([]);
    const [facultes, setFacultes] = useState<Option[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [levels, setLevels] = useState<Option[]>([]);

    // Charger universités et facultés depuis Supabase
    useEffect(() => {
        const fetchUF = async () => {
            const { data: uniData, error: uniErr } = await supabase
                .from('universites')
                .select('id, nom')
                .order('nom', { ascending: true });
            const { data: facData, error: facErr } = await supabase
                .from('facultes')
                .select('id, nom')
                .order('nom', { ascending: true });

            if (uniErr) console.error('Erreur chargement universités:', uniErr);
            if (facErr) console.error('Erreur chargement facultés:', facErr);

            setUniversities((uniData || []).map(u => ({ id: u.id as string, name: (u as any).nom })));
            setFacultes((facData || []).map(f => ({ id: f.id as string, name: (f as any).nom })));
        };
        fetchUF();
    }, []);

    // Charger niveaux quand une faculté est sélectionnée
    useEffect(() => {
        const fetchLevels = async () => {
            if (!formData.faculteId) {
                setLevels([]);
                setFormData(prev => ({ ...prev, niveauId: '', niveauNom: '' }));
                return;
            }

            const { data: nivData, error: nivErr } = await supabase
                .from('niveaux')
                .select('id, nom, ordre')
                .eq('faculte_id', formData.faculteId)
                .order('ordre', { ascending: true });
            if (nivErr) console.error('Erreur chargement niveaux:', nivErr);
            setLevels((nivData || []).map(n => ({ id: n.id as string, name: (n as any).nom })));
        };
        fetchLevels();
    }, [formData.faculteId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextStep = () => {
        setError(null);
        if (step === 1) {
            if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
                setError("Veuillez remplir tous les champs.");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError("Les mots de passe ne correspondent pas.");
                return;
            }
        }
        if (step === 2) {
            if (!formData.universityId || !formData.faculteId || !formData.niveauId) {
                setError("Veuillez compléter votre parcours académique.");
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        setError(null);
        setStep(prev => prev - 1);
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step !== 2) {
            handleNextStep();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Inscription avec Supabase
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        prenom: formData.firstName,
                        nom: formData.lastName,
                        university_id: formData.universityId,
                        faculte_id: formData.faculteId,
                        niveau_id: formData.niveauId,
                    }
                }
            });

            if (signUpError) throw signUpError;

            // Fallback : si confirmation email activée, créer le profil côté client
            if (authData.user && !authData.user.email_confirmed_at) {
                console.log("Email confirmation requise, tentative de mise à jour du profil...");

                // Attendre un peu pour que le trigger s'exécute
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Essayer de mettre à jour le profil via la fonction RPC
                const { error: updateError } = await supabase.rpc('update_profile_after_signup', {
                    p_user_id: authData.user.id,
                    p_nom: formData.lastName,
                    p_prenom: formData.firstName,
                    p_universite_id: formData.universityId,
                    p_faculte_id: formData.faculteId,
                    p_niveau_id: formData.niveauId
                });

                if (updateError) {
                    console.error("Erreur lors de la mise à jour du profil:", updateError);
                    // Ne pas bloquer l'inscription pour cette erreur
                }
            }

            // Redirection vers la page de connexion avec un message de succès
            navigate('/login', {
                state: {
                    message: "Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte."
                }
            });

        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite lors de l'inscription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-lg">
                <div className="text-center">
                    <Link to="/" className="inline-block">
                        <AcademicCapIcon className="h-12 w-12 mx-auto text-blue-600" />
                    </Link>
                    <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-gray-900">
                        Créez votre compte
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Vous avez déjà un compte ? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Connectez-vous</Link>
                    </p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                        {error}
                    </div>
                )}

                <form className="mt-8" onSubmit={handleFinalSubmit} noValidate>
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="relative">
                                <UserIcon className="pointer-events-none w-5 h-5 text-gray-400 absolute top-1/2 transform -translate-y-1/2 left-3" />
                                <input id="firstName" name="firstName" type="text" required onChange={handleInputChange} value={formData.firstName} className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm" placeholder="Prénom" />
                            </div>
                            <div className="relative">
                                <UserIcon className="pointer-events-none w-5 h-5 text-gray-400 absolute top-1/2 transform -translate-y-1/2 left-3" />
                                <input id="lastName" name="lastName" type="text" required onChange={handleInputChange} value={formData.lastName} className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm" placeholder="Nom" />
                            </div>
                            <div className="relative">
                                <AtSymbolIcon className="pointer-events-none w-5 h-5 text-gray-400 absolute top-1/2 transform -translate-y-1/2 left-3" />
                                <input id="email-address" name="email" type="email" autoComplete="email" required onChange={handleInputChange} value={formData.email} className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm" placeholder="Adresse email" />
                            </div>
                            <div className="relative">
                                <LockClosedIcon className="pointer-events-none w-5 h-5 text-gray-400 absolute top-1/2 transform -translate-y-1/2 left-3" />
                                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required onChange={handleInputChange} value={formData.password} className="block w-full rounded-md border-gray-300 pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm" placeholder="Mot de passe" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <div className="relative">
                                <LockClosedIcon className="pointer-events-none w-5 h-5 text-gray-400 absolute top-1/2 transform -translate-y-1/2 left-3" />
                                <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required onChange={handleInputChange} value={formData.confirmPassword} className="block w-full rounded-md border-gray-300 pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm" placeholder="Confirmer le mot de passe" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                                    {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <button type="submit" className="w-full mt-6 py-3 px-4 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700">Suivant</button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="border-t border-gray-200 pt-6 space-y-4">
                                <div>
                                    <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-1">Université</label>
                                    <SearchableSelect
                                        options={universities}
                                        value={formData.universityNom}
                                        onChange={(option: any) => {
                                            setFormData(prev => ({ ...prev, universityId: option?.id || '', universityNom: option?.name || '', faculteId: '', faculteNom: '', niveauId: '', niveauNom: '' }));
                                            setLevels([]);
                                        }}
                                        placeholder="Rechercher une université..."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="faculte" className="block text-sm font-medium text-gray-700 mb-1">Faculté</label>
                                    <SearchableSelect
                                        options={facultes}
                                        value={formData.faculteNom}
                                        onChange={(option: any) => setFormData(prev => ({ ...prev, faculteId: option?.id || '', faculteNom: option?.name || '' }))}
                                        placeholder={formData.universityId ? "Rechercher une faculté..." : "Sélectionnez d'abord une université"}
                                        disabled={!formData.universityId}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">Niveau d'étude</label>
                                    <select id="level" name="level" value={formData.niveauId} onChange={(e) => {
                                        const id = e.target.value;
                                        const selected = levels.find(l => l.id === id);
                                        setFormData(prev => ({ ...prev, niveauId: id, niveauNom: selected?.name || '' }));
                                    }} required className="block w-full rounded-md border-gray-300 py-2.5 text-gray-900 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm">
                                        <option value="">Sélectionner un niveau</option>
                                        {levels.map(level => <option key={level.id} value={level.id}>{level.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={handlePrevStep} className="w-full py-3 px-4 rounded-md font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300">Précédent</button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Création du compte..." : "Terminer l'inscription"}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}