import { createHashRouter, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { UniversitePage } from "./pages/UniversitePage";
import { StatsPage } from "./pages/StatsPage";
import { SourcesPage } from "./pages/SourcesPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { TeamPage } from "./pages/TeamPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageUsersPage } from './pages/admin/ManageUsersPage';
import { ManageSubjectsPage } from './pages/admin/ManageSubjectsPage';
import { ManageBooksPage } from './pages/admin/ManageBooksPage';
import { ManageDrivesPage } from './pages/admin/ManageDrivesPage';
import { ManageModulesPage } from './pages/admin/ManageModulesPage';
import { ManageRevenuesPage } from './pages/admin/ManageRevenuesPage';
import { ManageUniversitiesPage } from './pages/admin/ManageUniversitiesPage';
import { WelcomePage } from './pages/WelcomePage';
import { RequireAuth } from './components/auth/RequireAuth';
import { LoginPage } from './pages/auth/LoginPage';
import { WriterDashboard } from './pages/writer/WriterDashboard';
import { AddSubjectPage } from './pages/writer/AddSubjectPage';
import { AddBookPage } from './pages/writer/AddBookPage';
import { AddDrivePage } from './pages/writer/AddDrivePage';
import { EditSubjectPage } from './pages/writer/EditSubjectPage';
import { EditBookPage } from './pages/writer/EditBookPage';
import { EditDrivePage } from './pages/writer/EditDrivePage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ChatPage } from './pages/ChatPage';
import { ManageNotifications } from './pages/admin/ManageNotifications';
import { ManageFacultiesPage } from './pages/admin/ManageFacultiesPage';
import { ManageSignalementsPage } from './pages/admin/ManageSignalementsPage';
import { ManageCarouselPage } from './pages/admin/ManageCarouselPage';
import { ManageKnowledgePage } from './pages/admin/ManageKnowledgePage';
import { QuizPage } from './pages/QuizPage';
import { SubjectListPage } from './pages/SubjectListPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import ChallengesPage from './pages/ChallengesPage';
import ChallengeLobbyPage from './pages/ChallengeLobbyPage';
import ChallengeGamePage from './pages/ChallengeGamePage';


export const router = createHashRouter([
    {
        // Routes publiques et layout principal
        path: "/",
        element: <MainLayout />,
        children: [
            // Redirection de la racine vers la page de bienvenue
            { index: true, element: <Navigate to="/welcome" replace /> },
            { path: "welcome", element: <WelcomePage /> },
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
            { path: "forgot-password", element: <ForgotPasswordPage /> },

            // Routes protégées nécessitant une authentification
            {
                element: <RequireAuth />,
                children: [
                    { path: "home", element: <HomePage /> },
                    { path: "sujets", element: <SubjectsPage /> },
                    { path: "chat", element: <ChatPage /> },
                    { path: "stats", element: <StatsPage /> },
                    { path: "sources", element: <SourcesPage /> },
                    { path: "drives", element: <Navigate to="/sources" replace /> },
                    { path: "livres", element: <Navigate to="/sources" replace /> },
                    { path: "profil", element: <ProfilePage /> }, // Note: les sous-routes de profil sont en dehors du MainLayout
                    { path: "modules/:moduleId/universites", element: <UniversitePage /> },
                    { path: "modules/:moduleId/universites/:universityId/sujets", element: <SubjectListPage /> },
                    { path: "notifications", element: <NotificationsPage /> },
                    { path: "quiz", element: <QuizPage /> },
                    { path: "quiz/:subjectId", element: <QuizPage /> },
                    { path: "playlists", element: <PlaylistsPage /> },
                    { path: "playlists/:id", element: <PlaylistDetailPage /> },
                    { path: "challenges", element: <ChallengesPage /> },
                    { path: "challenges/lobby/:id", element: <ChallengeLobbyPage /> },
                    { path: "challenges/game/:id", element: <ChallengeGamePage /> },
                ]
            },
        ],
    },

    // Routes spécifiques (hors MainLayout) mais protégées
    {
        element: <RequireAuth />,
        children: [
            { path: "/profil/modifier", element: <EditProfilePage /> },
            { path: "/profil/abonnement", element: <SubscriptionPage /> },
            { path: "/profil/equipe", element: <TeamPage /> },
        ]
    },

    // Routes pour les rédacteurs (Writer)
    {
        path: "/writer",
        element: <RequireAuth />, // Vous pourriez avoir un RequireAuth spécifique au rôle ici
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <WriterDashboard /> },
            { path: "add-subject", element: <AddSubjectPage /> },
            { path: "add-book", element: <AddBookPage /> },
            { path: "add-drive", element: <AddDrivePage /> },
            { path: "edit-subject/:subjectId", element: <EditSubjectPage /> },
            { path: "edit-book/:bookId", element: <EditBookPage /> },
            { path: "edit-drive/:driveId", element: <EditDrivePage /> },
        ]
    },

    // Routes pour l'administration
    {
        path: "/admin",
        element: <RequireAuth />, // Protéger aussi le layout admin
        children: [
            {
                element: <AdminLayout />, children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    { path: "dashboard", element: <AdminDashboard /> },
                    { path: "users", element: <ManageUsersPage /> },
                    { path: "subjects", element: <ManageSubjectsPage /> },
                    { path: "books", element: <ManageBooksPage /> },
                    { path: "drives", element: <ManageDrivesPage /> },
                    { path: "modules", element: <ManageModulesPage /> },
                    { path: "revenues", element: <ManageRevenuesPage /> },
                    { path: "universities", element: <ManageUniversitiesPage /> },
                    { path: "notifications", element: <ManageNotifications /> },
                    { path: "signalements", element: <ManageSignalementsPage /> },
                    { path: "faculties", element: <ManageFacultiesPage /> },
                    { path: "carousel", element: <ManageCarouselPage /> },
                    { path: "knowledge", element: <ManageKnowledgePage /> },
                ]
            }
        ]
    },

    // Fallback: redirige toute route non reconnue vers la page de bienvenue
    { path: "*", element: <Navigate to="/welcome" replace /> },
]);