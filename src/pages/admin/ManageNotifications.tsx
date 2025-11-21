import { useState, useEffect, type FormEvent, useCallback } from 'react';
import { supabase } from '../../supabase';
import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import { debounce } from 'lodash';

interface Notification {
    id: string;
    created_at: string;
    titre: string;
    message: string;
    user_id: string | null;
    profiles: { nom: string; prenom: string } | null;
}

interface Profile {
    id: string;
    nom: string;
    prenom: string;
    email: string;
}

interface Faculty {
    id: string;
    nom: string;
}

export function ManageNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for the creation form
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<'all' | 'specific' | 'faculty'>('all');
    
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<string>('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    id,
                    created_at,
                    titre,
                    message,
                    user_id,
                    profiles ( nom, prenom )
                `)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);

            const typedData = (data || []).map(item => ({
                ...item,
                profiles: Array.isArray(item.profiles) ? item.profiles[0] || null : item.profiles,
            }));
            setNotifications(typedData);
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue lors de la récupération des notifications.');
            toast.error(err.message || 'Erreur de récupération des notifications.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculties = async () => {
        const { data, error } = await supabase.from('facultes').select('id, nom');
        if (error) {
            console.error("Erreur lors de la récupération des facultés:", error);
        } else {
            setFaculties(data || []);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(debounce(async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }
        const { data, error } = await supabase
            .from('profiles')
            .select('id, nom, prenom, users(email)')
            .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,users.email.ilike.%${query}%`)
            .limit(5);

        if (error) {
            console.error("Erreur de recherche d'utilisateur:", error);
        } else {
            const formattedData = data.map((p: any) => ({ ...p, email: p.users?.email }));
            setSearchResults(formattedData);
        }
    }, 500), []);

    useEffect(() => {
        debouncedSearch(searchQuery);
    }, [searchQuery, debouncedSearch]);

    useEffect(() => {
        fetchNotifications();
        fetchFaculties();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
            const { error } = await supabase.from('notifications').delete().match({ id });
            if (error) {
                toast.error(`Erreur lors de la suppression: ${error.message}`);
            } else {
                toast.success('Notification supprimée avec succès !');
                setNotifications(notifications.filter(n => n.id !== id));
            }
        }
    };

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let userIds: string[] = [];

            if (target === 'specific' && selectedUser) {
                userIds.push(selectedUser.id);
            } else if (target === 'faculty' && selectedFaculty) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('faculte_id', selectedFaculty);
                if (error) throw error;
                userIds = data.map(p => p.id);
            }

            let notificationsToInsert: { titre: string; message: string; user_id?: string }[] = [];

            if (target === 'all') {
                notificationsToInsert.push({ titre: title, message: message }); // user_id est null pour tous
            } else {
                if (userIds.length === 0) {
                    toast.warn('Aucun destinataire trouvé pour cette sélection.');
                    setIsSubmitting(false);
                    return;
                }
                notificationsToInsert = userIds.map(id => ({
                    titre: title,
                    message: message,
                    user_id: id,
                }));
            }

            const { error } = await supabase.from('notifications').insert(notificationsToInsert);

            if (error) throw error;

            toast.success(`Notification envoyée avec succès à ${target === 'all' ? 'tous les utilisateurs' : `${notificationsToInsert.length} utilisateur(s)`}.`);
            // Reset form
            setTitle('');
            setMessage('');
            setSelectedUser(null);
            setSearchQuery('');
            setSelectedFaculty('');
            setShowForm(false);
            fetchNotifications();
        } catch (err: any) {
            toast.error(`Erreur lors de la création: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="text-center p-8">Chargement des notifications...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Gérer les Notifications</h1>
                <button onClick={() => setShowForm(true)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                    Créer une notification
                </button>
            </div>

            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Créer une nouvelle notification">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-gray-700 font-semibold mb-2">Titre</label>
                        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-gray-700 font-semibold mb-2">Message</label>
                        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={4} required />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Destinataire</label>
                        <select value={target} onChange={(e) => setTarget(e.target.value as 'all' | 'specific' | 'faculty')} className="w-full px-3 py-2 border rounded-lg bg-white">
                            <option value="all">Tous les utilisateurs</option>
                            <option value="specific">Utilisateur spécifique</option>
                            <option value="faculty">Par faculté</option>
                        </select>
                    </div>

                    {target === 'specific' && (
                        <div className="relative">
                            <label htmlFor="userSearch" className="block text-gray-700 font-semibold mb-2">Rechercher un utilisateur</label>
                            <input
                                type="text"
                                id="userSearch"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser(null); }}
                                placeholder="Taper un nom, prénom ou email..."
                                className="w-full px-3 py-2 border rounded-lg"
                                autoComplete="off"
                            />
                            {searchResults.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 max-h-60 overflow-y-auto">
                                    {searchResults.map(user => (
                                        <li key={user.id} onClick={() => { setSelectedUser(user); setSearchQuery(`${user.prenom} ${user.nom}`); setSearchResults([]); }} className="p-2 hover:bg-gray-100 cursor-pointer">
                                            {user.prenom} {user.nom} ({user.email})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {target === 'faculty' && (
                        <div>
                            <label htmlFor="facultySelect" className="block text-gray-700 font-semibold mb-2">Choisir une faculté</label>
                            <select id="facultySelect" value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                                <option value="" disabled>Sélectionner...</option>
                                {faculties.map(fac => (
                                    <option key={fac.id} value={fac.id}>{fac.nom}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
                            {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Notifications existantes</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-sm">Titre</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm">Message</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm">Destinataire</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                                <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notifications.map((notif) => (
                                <tr key={notif.id} className="border-b">
                                    <td className="py-3 px-4">{notif.titre}</td>
                                    <td className="py-3 px-4 truncate max-w-xs">{notif.message}</td>
                                    <td className="py-3 px-4">{notif.user_id ? `${notif.profiles?.prenom || ''} ${notif.profiles?.nom || ''}`.trim() || notif.user_id : 'Tous'}</td>
                                    <td className="py-3 px-4">{new Date(notif.created_at).toLocaleString('fr-FR')}</td>
                                    <td className="py-3 px-4">
                                        <button onClick={() => handleDelete(notif.id)} className="text-red-500 hover:text-red-700 font-semibold">Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}