import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabase';

// Icône SVG simple pour Facebook
const FacebookIcon = () => (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
    </svg>
);

interface TeamMember {
    id: string;
    name: string;
    role: string;
    avatarUrl: string;
    facebookUrl: string;
    faculte: string;
    niveau: string;
}

export function TeamPage() {
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeamMembers = async () => {
            setLoading(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from('equipe_view')
                    .select('*');

                if (fetchError) throw fetchError;

                const members = (data || []).map((item: any) => ({
                    id: item.user_id,
                    name: `${item.prenom || ''} ${item.nom || ''}`.trim(),
                    role: item.role,
                    avatarUrl: item.profil_url || 'https://qbrpefuxlzgtrntxdtwk.supabase.co/storage/v1/object/public/images/user/utilisateur.png',
                    faculte: item.faculte_nom || 'N/A',
                    niveau: item.niveau_nom || 'N/A',
                    facebookUrl: item.facebook_url,
                }));
                setTeamMembers(members);
            } catch (err: any) {
                setError("Impossible de charger les membres de l'équipe.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamMembers();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Notre équipe</h1>
            </header>

            <main className="p-4">
                {loading ? (
                    <div className="text-center text-gray-500">Chargement de l'équipe...</div>
                ) : error ? (
                    <div className="text-center text-red-500">{error}</div>
                ) : (
                    <div className="space-y-4">
                        {teamMembers.map(member => (
                            <div key={member.id} className="bg-white p-4 rounded-xl shadow-md flex items-center space-x-4">
                                <img
                                    src={member.avatarUrl}
                                    alt={`Avatar de ${member.name}`}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                                <div className="flex-grow">
                                    <h2 className="font-bold text-gray-900">{member.name}</h2>
                                    <p className="text-sm text-gray-600">{member.role}</p>
                                    <p className="text-xs text-gray-500">{member.faculte} · {member.niveau}</p>
                                </div>
                                {member.facebookUrl && (
                                    <a
                                        href={member.facebookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                        aria-label={`Profil Facebook de ${member.name}`}
                                    >
                                        <FacebookIcon />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}