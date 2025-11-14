import { NavLink } from 'react-router-dom';
import { HomeIcon, FolderIcon, BookOpenIcon, UserIcon } from '@heroicons/react/24/solid';

const navItems = [
    { path: '/', label: 'Accueil', icon: HomeIcon },
    { path: '/drives', label: 'Drives', icon: FolderIcon },
    { path: '/livres', label: 'Livres', icon: BookOpenIcon },
    { path: '/profil', label: 'Profil', icon: UserIcon },
];

export function BottomNav() {
    const linkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center gap-1 p-2 transition-colors duration-200 ${isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
        }`;

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-t-md">
            <div className="flex justify-around items-center h-full max-w-lg mx-auto">
                {navItems.map((item) => (
                    <NavLink to={item.path} key={item.path} className={linkClasses} end>
                        <item.icon className="h-6 w-6" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}