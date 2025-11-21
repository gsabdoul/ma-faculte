import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, TicketIcon, ClipboardDocumentIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { supabase } from '../supabase';
import { useModal } from '../hooks/useModal'; // Importez le nouveau hook

// Icône SVG simple pour WhatsApp
const WhatsappIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413.003 6.557-5.338 11.892-11.894 11.892-1.99 0-3.903-.52-5.586-1.459l-6.323 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.89-5.466 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.099.164-1.157 4.224 4.272-1.119.162.1zM12 6.506c-3.036 0-5.51 2.474-5.51 5.51s2.474 5.51 5.51 5.51 5.51-2.474 5.51-5.51-2.475-5.51-5.51-5.51zm0 9.51c-2.206 0-3.997-1.791-3.997-3.998s1.791-3.997 3.997-3.997 3.998 1.791 3.998 3.997-1.792 3.998-3.998 3.998z" />
  </svg>
);

const premiumBenefits = [
  "Accès à tous les modules, sans exception",
  "Téléchargement des sujets et livres en illimité",
  "Support prioritaire",
];

export function SubscriptionPage() {
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const { profile, refreshProfile } = useUser();
  const navigate = useNavigate();
  const { modalProps, showModal } = useModal(); // Utilisez le hook

  const handleActivateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode) {
      showModal({
        title: 'Erreur',
        message: "Veuillez entrer un code d'activation.",
      });
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('activate_premium_subscription', { p_active_code: activationCode });

      if (error) throw error;

      if (data.success) {
        showModal({
          title: 'Félicitations !',
          message: data.message || 'Votre abonnement Premium a été activé avec succès.',
          onConfirm: async () => {
            await refreshProfile();
            navigate('/profil');
          }
        });
      } else {
        throw new Error(data.message || "Le code d'activation est invalide ou a déjà été utilisé.");
      }
    } catch (err: any) {
      showModal({
        title: 'Échec de l\'activation',
        message: err.message || "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
      setActivationCode('');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCopyCode = () => {
    if (!profile?.code) return;
    navigator.clipboard.writeText(profile.code).then(() => {
      setCopySuccess('Copié !');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Erreur');
    });
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = "22656658808"; // Le numéro WhatsApp de destination
    const message = `Bonjour, je suis ${profile?.prenom || ''} ${profile?.nom || ''}. Mon code utilisateur est : ${profile?.code}. J'aimerais obtenir un code d'activation premium.`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };


  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white p-4 shadow-sm flex items-center">
        <Link to="/profil" className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800 text-center flex-grow">
          Mon Abonnement
        </h1>
        <div className="w-8"></div> {/* Espace pour centrer le titre */}
      </header>

      <main className="p-4 space-y-6 ">
        {/* Statut de l'abonnement */}
        {profile?.is_premium && profile.subscription_end_date ? (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Statut de votre abonnement</h2>
            <div className="flex items-center space-x-4">
              <SparklesIcon className="w-10 h-10" />
              <div>
                <p className="font-bold text-xl">Premium Actif</p>
                <p className="text-sm text-gray-600">
                  Expire le : {formatDate(profile.subscription_end_date as string)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 text-red-500">
            <div className="bg-white p-6 rounded-xl shadow-md w-full">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Statut de votre abonnement</h2>
              <div className="flex items-center space-x-3 text-amber-600">
                <XCircleIcon className="w-8 h-8" />
                <div>
                  <p className="font-bold text-lg">Inactif</p>
                  <p className="text-sm text-gray-600">
                    Passez à Premium pour un accès illimité.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Pourquoi passer Premium ? */}
        {!profile?.is_premium && (
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Pourquoi passer Premium ?</h2>
            <ul className="space-y-3">
              {premiumBenefits.map((benefit, index) => (
                <li key={index} className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!profile?.is_premium && (
          <>
            {/* Activer un code */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Activer votre abonnement</h2>
              <form onSubmit={handleActivateSubscription} className="space-y-4">
                <div className="relative">
                  <TicketIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    placeholder="Entrez votre code d'activation"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button type="submit" disabled={isLoading || !activationCode} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm hover:shadow-md">
                  {isLoading ? 'Activation en cours...' : 'Activer'}
                </button>
              </form>
            </div>

            {/* Obtenir un code d'activation */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Obtenir un code d'activation</h2>
              <p className="text-sm text-gray-600 mb-3">
                Pour passer à Premium, communiquez-nous votre code utilisateur unique via WhatsApp.
              </p>
              <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500">Votre code utilisateur</p>
                  <p className="text-lg font-mono font-bold text-gray-800 tracking-wider">{profile?.code || 'Chargement...'}</p>
                </div>
                <button onClick={handleCopyCode} className="flex items-center text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-3 rounded-md transition-all duration-200">
                  <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                  {copySuccess || 'Copier'}
                </button>
              </div>
              <button onClick={handleWhatsAppClick} disabled={!profile?.code} className="w-full flex items-center justify-center bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-green-300 transition-colors shadow-sm hover:shadow-md">
                <WhatsappIcon />
                <span className="ml-2">Envoyer via WhatsApp</span>
              </button>
            </div>
          </>
        )}


      </main>

      {/* Cette modale est maintenant gérée par le hook useModal */}
      <ConfirmationModal {...modalProps} />

    </div>
  );
}