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
    (window as any).updateSW = updateSW;
  }, [updateSW]);

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