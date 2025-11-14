import {
    UsersIcon,
    DocumentTextIcon,
    BookOpenIcon,
    FolderIcon,
} from "@heroicons/react/24/outline";
import { StatCard } from "./src/data/StatCard";

interface AdminDashboardStats {
    totalUsers: number;
    totalSubjects: number;
    totalBooks: number;
    totalDrives: number;
}

interface StatsCardsProps {
    stats: AdminDashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                icon={UsersIcon}
                title="Utilisateurs"
                value={stats.totalUsers}
                color="blue"
            />
            <StatCard
                icon={DocumentTextIcon}
                title="Sujets"
                value={stats.totalSubjects}
                color="green"
            />
            <StatCard icon={BookOpenIcon} title="Livres" value={stats.totalBooks} color="yellow" />
            <StatCard icon={FolderIcon} title="Drives" value={stats.totalDrives} color="red" />
        </div>
    );
}