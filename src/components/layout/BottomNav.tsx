import { NavLink } from 'react-router-dom';
import { HomeIcon, FolderIcon, BookOpenIcon, UserIcon } from '@heroicons/react/24/solid';

// Icône chat personnalisée
const ChatIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.31 0-2.56-.3-3.68-.84l-.27-.14-2.81.47.47-2.81-.14-.27A7.934 7.934 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8z" />
    </svg>
);

const navItems = [
    { path: '/', label: 'Accueil', icon: HomeIcon },
    { path: '/drives', label: 'Drives', icon: FolderIcon },
    { path: '/chat', label: 'Chat', icon: ChatIcon },
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