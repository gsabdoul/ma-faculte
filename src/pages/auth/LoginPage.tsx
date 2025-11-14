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
            </div>
        </div>
    );
}