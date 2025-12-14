import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabase';

export function WelcomePage() {
    const navigate = useNavigate();
    const [checkingSession, setCheckingSession] = useState(true);

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

            <div className="w-full max-w-sm">
                <Link
                    to="/register"
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 border border-transparent text-base font-bold rounded-full text-white transition-all duration-300 transform bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl hover:-translate-y-1`}
                >
                    Commencez maintenant
                    <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>

                <p className="text-xs text-gray-500 mt-4 text-center">
                    En continuant, vous acceptez nos <br />
                    <Link to="https://drive.google.com/file/d/147PFQ1cSDWwEbBFSCRjeowEFTLgJ4J8n/view?usp=sharing" className="underline hover:text-blue-600">Termes et Conditions</Link> et notre {' '}
                    <Link to="https://drive.google.com/file/d/1b-WtUZuNAedPdWiRdpmtjeiJQ3zIN7zC/view?usp=sharing" className="underline hover:text-blue-600">Politique de Confidentialité</Link>.
                </p>
            </div>
        </div>
    );
}