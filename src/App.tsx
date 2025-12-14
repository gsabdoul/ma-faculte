import { useMemo, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Modal } from './components/ui/Modal';
import InstallPrompt from './components/ui/InstallPrompt';
import { registerSW } from 'virtual:pwa-register';

export default function App() {
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const updateSW = useMemo(() =>
    registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedsRefresh(true);
      },
    }), []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).updateSW = updateSW;
  }, [updateSW]);

  useEffect(() => {
    // Gestion du bouton retour Android
    import('@capacitor/app').then(({ App: CapacitorApp }) => {
      CapacitorApp.addListener('backButton', () => {
        // Si on est sur une modale, on pourrait vouloir la fermer (logique à ajouter si besoin)

        // Vérifier l'URL actuelle (hash router)
        const currentHash = window.location.hash;
        console.log('Back button pressed. Current hash:', currentHash);

        // Liste des routes principales où le retour doit mener à l'accueil
        // Stats, Chat, Drives, Livres, Profil, etc.
        // Si on n'est PAS sur /home (et pas sur welcome/login qui sont gérés autrement)
        // On retourne à l'accueil
        if (!currentHash.includes('#/home') && !currentHash.includes('#/welcome') && !currentHash.includes('#/login')) {
          window.location.hash = '/home';
        } else {
          // Si on est sur l'accueil, on quitte l'app
          CapacitorApp.exitApp();
        }
      });
    });

    return () => {
      import('@capacitor/app').then(({ App: CapacitorApp }) => {
        CapacitorApp.removeAllListeners();
      });
    };
  }, []);

  const closePrompt = () => setNeedsRefresh(false);
  const doRefresh = () => {
    // Demande au SW d'activer la nouvelle version, puis recharge
    updateSW();
    // La page se rechargera automatiquement après contrôle du nouveau SW
  };

  return (
    <>
      <Outlet /> {/* Le contenu de vos routes s'affichera ici */}
      <InstallPrompt />
      <Modal isOpen={needsRefresh} onClose={closePrompt} title="Mise à jour disponible">
        <p className="text-sm text-gray-700">
          Une nouvelle version de l’application est prête. Voulez-vous l’appliquer maintenant ?
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={closePrompt}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Plus tard
          </button>
          <button
            onClick={doRefresh}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Mettre à jour
          </button>
        </div>
      </Modal>
    </>
  );
}