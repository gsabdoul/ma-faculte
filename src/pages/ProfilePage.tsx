import {
  PencilSquareIcon,
  CreditCardIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ShareIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  ChevronRightIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { supabase } from '../supabase';
import { useCallback } from 'react';
import { useModal } from '../hooks/useModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface ProfileListItemProps {
  icon: React.ElementType;
  text: string;
  onClick?: () => void;
  href?: string;
  isDestructive?: boolean;
}

// Composant réutilisable pour les éléments de la liste
const ProfileListItem: React.FC<ProfileListItemProps> = ({ icon: Icon, text, onClick, href, isDestructive = false }) => {
  const content = (
    <div className="flex items-center p-4">
      <Icon className={`w-6 h-6 mr-4 ${isDestructive ? 'text-red-500' : 'text-gray-500'}`} />
      <span className={`flex-grow font-medium ${isDestructive ? 'text-red-600' : 'text-gray-700'}`}>{text}</span>
      {!isDestructive && <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
    </div>
  );

  const className = "block w-full text-left bg-white hover:bg-gray-50 transition-colors";

  if (href) {
    return <Link to={href} className={className}>{content}</Link>;
  }

  return <button onClick={onClick} className={className}>{content}</button>;
};


export function ProfilePage() {
  const { profile, user, loading } = useUser();
  const navigate = useNavigate();
  const { modalProps, showModal } = useModal();

  const handleShare = async () => {
    const shareData = {
      title: 'Ma Faculté',
      text: 'Découvre Ma Faculté, l\'application indispensable pour les étudiants du Burkina Faso !',
      url: window.location.origin, // URL de la page d'accueil de l'application
    };

    // Utilise l'API Web Share si elle est disponible
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // L'utilisateur a annulé le partage, pas besoin de logger une erreur.
        if ((err as Error).name !== 'AbortError') {
          console.error('Erreur lors du partage :', err);
        }
      }
    } else {
      // Alternative pour les navigateurs non compatibles : copier le lien
      await navigator.clipboard.writeText(shareData.url);
      showModal({
        title: "Partage",
        message: "Lien de l'application copié dans le presse-papiers !",
      });
    }
  };

  const handleLogout = useCallback(() => {
    showModal({
      title: 'Déconnexion',
      message: "Êtes-vous sûr de vouloir vous déconnecter ?",
      isDestructive: true,
      onConfirm: async () => { await supabase.auth.signOut(); navigate('/welcome'); }
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-600">Chargement du profil...</div>
      </div>
    );
  }

  // Centralisation de la logique du menu pour plus de clarté
  const allMenuItems = [
    // Élément visible uniquement pour le rôle 'writer'
    { icon: Squares2X2Icon, text: "Mon tableau de bord", href: "/writer/dashboard", roles: ['writer'] },
    // Élément visible pour tous sauf les admins et writers
    { icon: CreditCardIcon, text: "Mon abonnement", href: "/profil/abonnement", hiddenRoles: ['admin', 'writer'] },
    { icon: UserGroupIcon, text: "Notre équipe", href: "/profil/equipe" },
    {
      icon: QuestionMarkCircleIcon,
      text: "Obtenir de l'aide",
      onClick: () => window.open('https://wa.me/22656658808', '_blank')
    },
    {
      icon: DocumentTextIcon,
      text: "Politique de confidentialité",
      onClick: () => window.open('https://docs.google.com/document/d/1CGbmt8EEZ3USSWFNftSb6yroNZbL50bHOS3sC9O-bro/edit?usp=sharing', '_blank')
    },
    {
      icon: DocumentTextIcon,
      text: "Termes et conditions d'utilisation",
      onClick: () => window.open('https://drive.google.com/file/d/VOTRE_ID_DE_FICHIER_TERMES/preview', '_blank')
    },
    { icon: ShareIcon, text: "Partager l'application", onClick: handleShare },
    // Élément visible uniquement pour le rôle 'admin'
    { icon: ShieldCheckIcon, text: "Panneau admin", href: "/admin", roles: ['admin'] },
  ];

  const visibleMenuItems = allMenuItems.filter(item => {
    const userRole = profile?.role;
    if (!userRole) return !item.roles && !item.hiddenRoles; // Affiche les éléments publics si pas de rôle
    if (item.roles) return item.roles.includes(userRole);
    if (item.hiddenRoles) return !item.hiddenRoles.includes(userRole);
    return true; // Affiche par défaut si aucune condition de rôle
  });

  return (
    <div className="bg-gray-100 min-h-full">
      <header className="bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Mon Profil</h1>
      </header>

      <main className="p-4 space-y-6">
        {/* Section Informations Personnelles */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <UserCircleIcon className="w-24 h-24 text-gray-300" />
              <Link to="/profil/modifier" className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full text-white transform hover:scale-110 transition-transform">
                <PencilSquareIcon className="w-5 h-5" />
              </Link>
            </div>
            <div className="text-center sm:text-left flex-grow">
              <h2 className="text-2xl font-bold text-gray-800">{profile?.prenom} {profile?.nom}</h2>
              <p className="text-md text-gray-600">{profile?.faculte_nom}</p>
              <p className="text-sm text-gray-500">{profile?.niveau_nom}</p>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-6 pt-4">
            <p className="text-sm font-medium text-gray-500">Adresse mail</p>
            <p className="font-medium text-gray-800">{user?.email}</p>
          </div>
        </div>

        {/* Section Menu */}
        <section className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {visibleMenuItems.map((item) => <ProfileListItem key={item.text} {...item} />)}
          </div>
        </section>

        {/* Section Déconnexion */}
        <section className="bg-white rounded-xl shadow-md overflow-hidden">
          <ProfileListItem
            icon={ArrowRightOnRectangleIcon}
            text="Déconnexion"
            onClick={handleLogout}
            isDestructive
          />
        </section>
      </main>

      <ConfirmationModal {...modalProps} />
    </div>
  );
}