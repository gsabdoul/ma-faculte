import { NavLink } from 'react-router-dom';
import {
    HomeIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    FolderOpenIcon,
    BookOpenIcon
} from '@heroicons/react/24/solid';

const navItems = [
    {
        path: '/home',
        label: 'Accueil',
        icon: HomeIcon,
        color: 'from-blue-500 to-blue-600',
        activeColor: 'text-blue-600'
    },
    {
        path: '/stats',
        label: 'Stats',
        icon: ChartBarIcon,
        color: 'from-purple-500 to-purple-600',
        activeColor: 'text-purple-600'
    },
    {
        path: '/chat',
        label: 'Chat',
        icon: ChatBubbleLeftRightIcon,
        color: 'from-emerald-500 to-emerald-600',
        activeColor: 'text-emerald-600',
        highlight: true // Item central mis en avant
    },
    {
        path: '/drives',
        label: 'Drives',
        icon: FolderOpenIcon,
        color: 'from-amber-500 to-amber-600',
        activeColor: 'text-amber-600'
    },
    {
        path: '/livres',
        label: 'Livres',
        icon: BookOpenIcon,
        color: 'from-rose-500 to-rose-600',
        activeColor: 'text-rose-600'
    },
];

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl z-50">
            {/* Gradient decoratif en haut */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 via-emerald-500 via-amber-500 to-rose-500"></div>

            <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2 relative">
                {navItems.map((item) => (
                    <NavLink
                        to={item.path}
                        key={item.path}
                        end
                        className={({ isActive }) => `
                            relative flex flex-col items-center justify-center gap-1 
                            flex-1 h-full transition-all duration-300 ease-out group
                            ${isActive ? 'scale-105' : 'scale-100 hover:scale-110'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                {/* Indicateur actif - bulle flottante */}
                                {isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={`absolute w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} opacity-10 animate-pulse`}></div>
                                    </div>
                                )}

                                {/* Icône avec effet de gradient au survol */}
                                <div className={`
                                    relative z-10 p-2 rounded-xl transition-all duration-300
                                    ${isActive
                                        ? `bg-gradient-to-br ${item.color} shadow-lg`
                                        : 'bg-transparent group-hover:bg-gray-50'
                                    }
                                    ${item.highlight && !isActive ? 'ring-2 ring-gray-200' : ''}
                                `}>
                                    <item.icon
                                        className={`
                                            w-6 h-6 transition-all duration-300
                                            ${isActive
                                                ? 'text-white drop-shadow-md'
                                                : `text-gray-400 group-hover:${item.activeColor}`
                                            }
                                        `}
                                    />
                                </div>

                                {/* Label avec animation */}
                                <span className={`
                                    text-xs font-medium transition-all duration-300 z-10
                                    ${isActive
                                        ? `${item.activeColor} font-bold`
                                        : 'text-gray-500 group-hover:text-gray-700'
                                    }
                                `}>
                                    {item.label}
                                </span>

                                {/* Indicateur de point actif sous le label */}
                                {isActive && (
                                    <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-gradient-to-r ${item.color} animate-bounce`}></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}