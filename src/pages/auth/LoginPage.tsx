import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';

import {
    EyeIcon,
    EyeSlashIcon,
    AcademicCapIcon,
    AtSymbolIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Récupérer le message de succès de l'inscription
    useEffect(() => {
        if (location.state && location.state.message) {
            setSuccessMessage(location.state.message);
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/home';
            navigate(from, { replace: true }); // Aller vers la route demandée ou /home
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // Construit l'URL de redirection en tenant compte du chemin de base (ex: /ma-faculte/ sur GitHub Pages)
                    // import.meta.env.BASE_URL est fourni par Vite.
                    // On s'assure de ne pas avoir de double slash (//) si BASE_URL est juste "/".
                    redirectTo: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/home`,
                },
            });

            if (error) {
                setError(error.message);
            }
            // Supabase gère la redirection, aucune action supplémentaire n'est nécessaire ici en cas de succès.
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de la connexion avec Google.");
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
                        Bienvenue
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Heureux de vous revoir !
                        Ou <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">créez un nouveau compte</Link>
                    </p>
                </div>

                {successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative">
                            <AtSymbolIcon className="pointer-events-none w-5 h-5 text-gray-400 absolute top-1/2 transform -translate-y-1/2 left-3" />
                            <label htmlFor="email-address" className="sr-only">Adresse email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                                placeholder="Adresse email"
                            />
                        </div>
                        <div className="relative">
                            <LockClosedIcon className="pointer-events-none w-5 h-5 text-gray-400 absolute top-1/2 transform -translate-y-1/2 left-3" />
                            <label htmlFor="password" className="sr-only">Mot de passe</label>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-md border-gray-300 pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                                placeholder="Mot de passe"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            >
                                {showPassword ? (
                                    <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                    <EyeIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-end">
                        <div className="text-sm">
                            <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">Mot de passe oublié ?</Link>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Connexion en cours...' : 'Se connecter'}
                        </button>
                    </div>
                </form>

                {/* Bouton de connexion Google */}
                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-gray-500">Ou continuer avec</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleGoogleSignIn}
                            className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {/* Icône Google SVG */}
                            <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c3.28 0 6.03-1.08 8.04-2.91l-3.57-2.77c-.98.65-2.23 1.05-3.57 1.05-2.77 0-5.12-1.86-5.98-4.38H2.05v2.81c1.9 3.78 5.83 6.41 9.95 6.41z" fill="#34A853" />
                                <path d="M5.98 14.18c-.22-1.05-.22-2.18 0-3.23V8.14H2.05c-.69 1.39-1.07 2.92-1.07 4.54s.38 3.15 1.07 4.54l3.93-3.04z" fill="#FBBC05" />
                                <path d="M12 5.81c1.67 0 3.13.69 4.18 1.71l3.15-3.15C18.03 2.51 15.28 1 12 1 7.88 1 3.95 3.62 2.05 7.41l3.93 3.04c.86-2.52 3.21-4.38 5.98-4.38z" fill="#EA4335" />
                            </svg>
                            Connexion avec Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}