import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    ArrowUturnLeftIcon,
    Bars3Icon,
} from '@heroicons/react/24/outline';
import {
    ChartBarIcon as ChartBarSolid,
    UsersIcon as UsersSolid,
    DocumentTextIcon as DocumentTextSolid,
    BookOpenIcon as BookOpenSolid,
    FolderIcon as FolderSolid,
    CubeIcon as CubeSolid,
    BuildingLibraryIcon as BuildingLibrarySolid,
    BuildingOffice2Icon as BuildingOffice2Solid,
    CurrencyDollarIcon as CurrencyDollarSolid,
} from '@heroicons/react/24/solid';

const adminNavItems = [
    { name: 'Tableau de bord', to: '/admin', icon: ChartBarSolid, end: true },
    { name: 'Gérer les utilisateurs', to: '/admin/users', icon: UsersSolid },
    { name: 'Gérer les sujets', to: '/admin/subjects', icon: DocumentTextSolid },
    { name: 'Gérer les livres', to: '/admin/books', icon: BookOpenSolid },
    { name: 'Gérer les drives', to: '/admin/drives', icon: FolderSolid },
    { name: 'Gérer les modules', to: '/admin/modules', icon: CubeSolid },
    { name: 'Gérer les facultés', to: '/admin/faculties', icon: BuildingLibrarySolid },
    { name: 'Gérer les universités', to: '/admin/universities', icon: BuildingOffice2Solid },
    { name: 'Revenus', to: '/admin/revenues', icon: CurrencyDollarSolid },
];

export function AdminLayout() {
    const [isDrawerOpen, setDrawerOpen] = useState(false);

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`;

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Backdrop pour le mode mobile */}
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 lg:hidden"
                    onClick={() => setDrawerOpen(false)}
                ></div>
            )}

            {/* Sidebar / Drawer */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out z-30 lg:relative lg:translate-x-0 ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center justify-center px-4 border-b flex-shrink-0">
                    <h1 className="text-xl font-bold text-blue-600">Admin Panel</h1>
                </div>
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {adminNavItems.map((item) => (
                        <NavLink key={item.name} to={item.to} className={navLinkClasses} end={item.end ?? false} onClick={() => setDrawerOpen(false)}>
                            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t flex-shrink-0">
                    <NavLink to="/" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                        <ArrowUturnLeftIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                        Retour à l'application
                    </NavLink>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header pour le mode mobile */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:hidden">
                    <button onClick={() => setDrawerOpen(true)} className="p-2 text-gray-600 hover:text-gray-900">
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-blue-600">Admin Panel</h1>
                    <div className="w-8"></div> {/* Espace pour centrer le titre */}
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}