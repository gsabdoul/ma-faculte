import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccessMessage('Un email de réinitialisation a été envoyé à votre adresse email.');
            }
        } catch (err) {
            setError('Une erreur est survenue lors de la demande de réinitialisation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Récupération de mot de passe</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Entrez votre adresse email pour recevoir un lien de réinitialisation
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
                    <div className="rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Adresse email</label>
                            <input 
                                id="email-address" 
                                name="email" 
                                type="email" 
                                autoComplete="email" 
                                required 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                                placeholder="Adresse email"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Retour à la connexion
                            </Link>
                        </div>
                    </div>

                    <div>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full py-2.5 px-4 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring focus:ring-blue-300 focus:ring-opacity-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}