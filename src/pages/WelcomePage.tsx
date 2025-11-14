import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export function WelcomePage() {
    const navigate = useNavigate();
    const [checkingSession, setCheckingSession] = useState(true);
    const [termsAccepted, setTermsAccepted] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            const session = data.session;
            if (session) {
                // Utilisateur connecté: aller vers la vraie page d'accueil
                navigate('/home', { replace: true });
            } else {
                setCheckingSession(false);
            }
        };
        checkSession();
    }, [navigate]);

    if (checkingSession) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-gray-600">Chargement...</div>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="text-center mb-12">
                {/* Vous pouvez remplacer ceci par votre logo */}
                <span className="text-6xl" role="img" aria-label="logo">🎓</span>
                <h1 className="text-4xl font-bold text-blue-600 mt-4">Ma Faculté</h1>
                <p className="text-lg text-gray-600 mt-2">Votre compagnon académique au Burkina Faso.</p>
            </div>

            <div className="w-full max-w-sm mb-6 px-4">
                <div className="flex items-start">
                    <input
                        id="terms-checkbox"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                    />
                    <label htmlFor="terms-checkbox" className="ml-2 text-sm text-gray-600">
                        J'ai lu et j'accepte les <Link to="/terms" className="underline font-medium text-blue-600 hover:text-blue-800">Termes & Conditions</Link> et la <Link to="/privacy" className="underline font-medium text-blue-600 hover:text-blue-800">Politique de Confidentialité</Link>.
                    </label>
                </div>
            </div>

            <div className="w-full max-w-sm space-y-4">
                <Link
                    to="/login"
                    className={`w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-full text-white transition-colors ${termsAccepted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
                    onClick={(e) => !termsAccepted && e.preventDefault()}
                >
                    Se connecter
                </Link>
                <Link
                    to="/register"
                    className={`w-full flex items-center justify-center px-4 py-3 border text-base font-medium rounded-full transition-colors ${termsAccepted ? 'border-blue-600 text-blue-600 bg-white hover:bg-gray-50' : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'}`}
                    onClick={(e) => !termsAccepted && e.preventDefault()}
                >
                    Créer un compte
                </Link>
            </div>
        </div>
    );
}