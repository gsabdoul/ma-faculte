import { createHashRouter, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout"; // <- Chemin correct
import { HomePage } from "./pages/HomePage"; // <- Chemin correct
import { DrivesPage } from "./pages/DrivesPage"; // <- Chemin correct
import { BooksPage } from "./pages/BooksPage"; // <- Chemin correct
import { ProfilePage } from "./pages/ProfilePage"; // <- Chemin correct
import { UniversitePage } from "./pages/UniversitePage";
import { SujetPage } from "./pages/SujetPage";
import { SujetViewPage } from "./pages/SujetViewPage";
import { SujetCorrectionPage } from "./pages/SujetCorrectionPage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { TeamPage } from "./pages/TeamPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageUsersPage } from './pages/admin/ManageUsersPage';
import { ManageSubjectsPage } from './pages/admin/ManageSubjectsPage';
import { ManageBooksPage } from './pages/admin/ManageBooksPage';
import { ManageDrivesPage } from './pages/admin/ManageDrivesPage';
import { ManageModulesPage } from './pages/admin/ManageModulesPage';
import { ManageReportsPage } from './pages/admin/ManageReportsPage';
import { ManageFacultiesPage } from './pages/admin/ManageFacultiesPage';
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
import Chat from './pages/chat';

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
                    { path: "drives", element: <DrivesPage /> },
                    { path: "chat", element: <Chat /> },
                    { path: "livres", element: <BooksPage /> },
                    { path: "profil", element: <ProfilePage /> }, // Note: les sous-routes de profil sont en dehors du MainLayout
                    { path: "modules/:moduleId/universites", element: <UniversitePage /> },
                    { path: "modules/:moduleId/universites/:universityId/sujets", element: <SujetPage /> },
                    { path: "sujets/:sujetId", element: <SujetViewPage /> },
                    { path: "sujets/:sujetId/correction", element: <SujetCorrectionPage /> },
                    { path: "notifications", element: <NotificationsPage /> },
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
                    { path: "reports", element: <ManageReportsPage /> },
                    { path: "faculties", element: <ManageFacultiesPage /> },
                    { path: "revenues", element: <ManageRevenuesPage /> },
                    { path: "universities", element: <ManageUniversitiesPage /> },
                ]
            }
        ]
    },

    // Fallback: redirige toute route non reconnue vers la page de bienvenue
    { path: "*", element: <Navigate to="/welcome" replace /> },
]);