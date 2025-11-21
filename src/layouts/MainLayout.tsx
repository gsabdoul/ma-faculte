import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function MainLayout() {
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Le contenu de la page s'affichera ici */}
            <main className="pb-20"> {/* pb-20 pour laisser de l'espace pour la nav */}
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}