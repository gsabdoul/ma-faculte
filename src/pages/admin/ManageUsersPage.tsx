import { useState, useEffect, useMemo } from 'react';
import { PencilIcon, TrashIcon, UserPlusIcon, MagnifyingGlassIcon, CheckCircleIcon, SparklesIcon, UserCircleIcon, ClipboardDocumentIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUser } from '../../context/UserContext';

interface User {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: 'admin' | 'writer' | 'reader';
    created_at: string;
    code: string;
    is_premium: boolean;
    active_code: string;
    faculte_nom: string | null;
    niveau_nom: string | null;
}

const roleOptions: User['role'][] = ['admin', 'writer', 'reader'];

export function ManageUsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activationCode, setActivationCode] = useState<string | null>(null);
    const [isActivationModalOpen, setActivationModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'ascending' | 'descending' } | null>(null);
    const USERS_PER_PAGE = 10;
    const { user: currentUser } = useUser();

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                // Get users with their profile data in a single query
                const { data: userData, error: fetchError } = await supabase
                    .from('profiles')
                    .select(`
                        id, nom, prenom, role, created_at, code, is_premium, active_code,
                        faculte:facultes (nom),
                        niveau:niveaux (nom)
                    `);

                if (fetchError) throw fetchError;

                // Get the session to get the current user's email
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                const formattedData = (userData || []).map((user: any) => ({
                    id: user.id,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: session?.user?.id === user.id ? session?.user?.email ?? '' : '',  // Only show email for current user
                    role: user.role,
                    created_at: user.created_at,
                    code: user.code,
                    is_premium: user.is_premium,
                    active_code: user.active_code,
                    faculte_nom: user.faculte?.nom,
                    niveau_nom: user.niveau?.nom,
                }));
                setAllUsers(formattedData);
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        return allUsers.filter(item => {
            return (
                item.nom.toLowerCase().includes(lowercasedFilter) ||
                item.prenom.toLowerCase().includes(lowercasedFilter) ||
                item.email.toLowerCase().includes(lowercasedFilter) ||
                item.code.toLowerCase().includes(lowercasedFilter)
            );
        });
    }, [searchTerm, allUsers]);

    const sortedUsers = useMemo(() => {
        const sortableUsers = [...filteredUsers];
        if (sortConfig !== null) {
            const { key, direction } = sortConfig;
            sortableUsers.sort((a, b) => {
                const valA = a[key];
                const valB = b[key];

                if (valA === valB) return 0;
                if (valA === null || valA === undefined) return -1;
                if (valB === null || valB === undefined) return 1;

                if (typeof valA === 'string' && typeof valB === 'string') {
                    if (key === 'created_at') {
                        const timeA = Date.parse(valA);
                        const timeB = Date.parse(valB);
                        if (!isNaN(timeA) && !isNaN(timeB)) {
                            return direction === 'ascending' ? timeA - timeB : timeB - timeA;
                        }
                    }
                    const cmp = valA.localeCompare(valB);
                    return direction === 'ascending' ? cmp : -cmp;
                }

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'ascending' ? valA - valB : valB - valA;
                }

                // Fallback for boolean or other types
                const strA = String(valA);
                const strB = String(valB);
                const cmp = strA.localeCompare(strB);
                return direction === 'ascending' ? cmp : -cmp;
            });
        }
        return sortableUsers;
    }, [filteredUsers, sortConfig]);

    const handleActivation = async (userId: string) => {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_premium: true,
                    active_code: code,
                    subscription_start_date: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            setAllUsers(currentUsers => currentUsers.map(user => user.id === userId ? { ...user, is_premium: true, active_code: code } : user));
            setActivationCode(code);
            setActivationModalOpen(true);
        } catch (err: any) {
            alert(`Erreur lors de l'activation : ${err.message}`);
        }
    };

    const handleRoleChange = async (userId: string, newRole: User['role']) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setAllUsers(currentUsers =>
                currentUsers.map(user => (user.id === userId ? { ...user, role: newRole } : user))
            );
        } catch (err: any) {
            alert(`Erreur lors de la mise à jour du rôle : ${err.message}`);
        }
    };

    const copyToClipboard = () => {
        if (!activationCode) return;
        navigator.clipboard.writeText(activationCode).then(() => {
            setCopySuccess('Copié !');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Échec de la copie');
        });
    };

    const requestSort = (key: keyof User) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Logique de pagination
    const indexOfLastUser = currentPage * USERS_PER_PAGE;
    const indexOfFirstUser = indexOfLastUser - USERS_PER_PAGE;
    const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(sortedUsers.length / USERS_PER_PAGE);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    if (loading) return <div className="text-center p-8">Chargement des utilisateurs...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Erreur: {error}</div>;


    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les utilisateurs</h1>

            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher par nom, email ou code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ml-4 flex-shrink-0">
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un utilisateur
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 px-4 font-semibold text-gray-600">Utilisateur</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Code Étudiant</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">
                                <button onClick={() => requestSort('role')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                                    <span>Rôle</span>
                                    {sortConfig?.key === 'role' ? (
                                        sortConfig.direction === 'ascending' ? <ChevronLeftIcon className="h-4 w-4 rotate-90" /> : <ChevronRightIcon className="h-4 w-4 -rotate-90" />
                                    ) : (
                                        <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                            </th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Statut</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">
                                <button onClick={() => requestSort('created_at')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                                    <span>Date d'inscription</span>
                                    {sortConfig?.key === 'created_at' ? (
                                        sortConfig.direction === 'ascending' ? <ChevronLeftIcon className="h-4 w-4 rotate-90" /> : <ChevronRightIcon className="h-4 w-4 -rotate-90" />
                                    ) : (
                                        <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                            </th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentUsers.map((user) => (
                            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 flex items-center min-w-[250px]">
                                    <UserCircleIcon className="h-10 w-10 text-gray-300 mr-4 flex-shrink-0" />
                                    <div>
                                        <div className="font-bold text-gray-800">{user.prenom} {user.nom}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                        <div className="text-xs text-gray-500 mt-1">{user.faculte_nom || 'N/A'}</div>
                                        <div className="text-xs text-gray-400">{user.niveau_nom || 'N/A'}</div>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600 font-mono">
                                    <div>
                                        <span>{user.code}</span>
                                        {user.active_code && (
                                            <div className={`flex items-center text-xs mt-1 ${user.is_premium ? 'text-green-600' : 'text-gray-500'}`}>
                                                <span className="font-sans font-semibold mr-1">Activation:</span>
                                                <span>{user.active_code}</span>
                                                <button onClick={() => navigator.clipboard.writeText(user.active_code)} className="ml-2 text-gray-400 hover:text-blue-600" title="Copier le code d'activation">
                                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])}
                                        disabled={user.id === currentUser?.id}
                                        className={`px-2 py-1 text-xs font-semibold rounded-full border-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                            user.role === 'writer' ? 'bg-purple-100 text-purple-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        {roleOptions.map(role => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
                                    </select>
                                </td>
                                <td className="py-3 px-4">
                                    {user.is_premium ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                                            Premium
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            Standard
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-gray-600">{format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}</td>
                                <td className="py-3 px-4">
                                    {!user.is_premium && user.role !== 'admin' && (
                                        <button onClick={() => handleActivation(user.id)} className="text-gray-500 hover:text-green-500 p-2" title="Activer le compte Premium">
                                            <SparklesIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                    <button className="text-gray-500 hover:text-blue-500 p-2"><PencilIcon className="h-5 w-5" /></button>
                                    <button className="text-gray-500 hover:text-red-500 p-2"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Contrôles de pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-600">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex items-center">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isActivationModalOpen}
                onClose={() => setActivationModalOpen(false)}
                title="Code d'activation généré"
            >
                <p className="text-gray-600 mb-4">
                    Le compte a été activé. Veuillez copier le code ci-dessous et l'envoyer à l'étudiant.
                </p>
                <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between">
                    <span className="text-xl font-mono font-bold text-gray-800 tracking-widest">
                        {activationCode}
                    </span>
                    <button onClick={copyToClipboard} className="flex items-center text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-md transition-all duration-200">
                        <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                        {copySuccess || 'Copier'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}