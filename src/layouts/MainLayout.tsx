import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function MainLayout() {
    const location = useLocation();

    // Définir les routes où la BottomNav ne doit pas apparaître
    const noNavRoutes = [
        '/welcome',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password'
    ];

    const showNav = !noNavRoutes.some(route => location.pathname.startsWith(route));

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Le contenu de la page s'affichera ici */}
            <main className={showNav ? "pb-20" : ""}> {/* pb-20 pour laisser de l'espace pour la nav */}
                <Outlet />
            </main>
            {showNav && <BottomNav />}
        </div>
    );
}