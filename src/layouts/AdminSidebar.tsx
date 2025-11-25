import { NavLink, Link } from 'react-router-dom';
import {
    ChartBarIcon,
    UsersIcon,
    DocumentTextIcon,
    BookOpenIcon,
    FolderIcon,
    ExclamationTriangleIcon,
    BuildingLibraryIcon,
    AcademicCapIcon,
    CurrencyDollarIcon,
    XMarkIcon,
    Squares2X2Icon,
    ArrowUturnLeftIcon,
    BellIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const menuItems = [
    { to: '/admin', text: 'Tableau de bord', icon: ChartBarIcon },
    { to: '/admin/users', text: 'Utilisateurs', icon: UsersIcon },
    { to: '/admin/revenues', text: 'Revenus', icon: CurrencyDollarIcon },
    { to: '/admin/notifications', text: 'Notifications', icon: BellIcon },
    { to: 'signalements', text: 'Signalements', icon: ExclamationTriangleIcon },
    { to: '/admin/subjects', text: 'Sujets', icon: DocumentTextIcon },
    { to: '/admin/books', text: 'Livres', icon: BookOpenIcon },
    { to: '/admin/drives', text: 'Drives', icon: FolderIcon },
    { to: '/admin/modules', text: 'Modules', icon: Squares2X2Icon },
    { to: '/admin/faculties', text: 'Facultés', icon: BuildingLibraryIcon },
    { to: '/admin/universities', text: 'Universités', icon: AcademicCapIcon },
    { to: '/admin/carousel', text: 'Gestion du Carrousel', icon: PhotoIcon },
];

const NavItem: React.FC<{ to: string; text: string; icon: React.ElementType, onClick: () => void }> = ({ to, text, icon: Icon, onClick }) => (
    <NavLink
        to={to}
        end={to === '/admin'}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center px-4 py-2.5 rounded-lg transition-colors duration-200 ${isActive
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
        }
    >
        <Icon className="w-6 h-6 mr-3" />
        <span className="font-medium">{text}</span>
    </NavLink>
);

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-40 flex flex-col transform transition-transform lg:relative lg:translate-x-0 lg:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex items-center justify-between p-4 border-b lg:justify-center">
                    <Link to="/admin" className="flex items-center space-x-2 text-xl font-bold text-gray-800">
                        <AcademicCapIcon className="w-8 h-8 text-blue-600" />
                        <span>MaFaculté</span>
                    </Link>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 lg:hidden">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {menuItems.map(item => (
                        <NavItem key={item.to} {...item} onClick={onClose} />
                    ))}
                </nav>

                <div className="p-4 border-t flex-shrink-0">
                    <Link to="/home" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                        <ArrowUturnLeftIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                        Retour à l'application
                    </Link>
                </div>
            </aside>
        </>
    );
}