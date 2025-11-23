import { UsersIcon, DocumentTextIcon, BookOpenIcon, FolderIcon } from '@heroicons/react/24/outline';

interface StatsCardsProps {
    stats: {
        totalUsers: number;
        totalSubjects: number;
        totalBooks: number;
        totalDrives: number;
    };
}

export function StatsCards({ stats }: StatsCardsProps) {
    const cards = [
        { name: 'Utilisateurs', value: stats.totalUsers, icon: UsersIcon, color: 'bg-blue-500' },
        { name: 'Sujets', value: stats.totalSubjects, icon: DocumentTextIcon, color: 'bg-green-500' },
        { name: 'Livres', value: stats.totalBooks, icon: BookOpenIcon, color: 'bg-yellow-500' },
        { name: 'Drives', value: stats.totalDrives, icon: FolderIcon, color: 'bg-purple-500' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card) => (
                <div key={card.name} className="bg-white rounded-xl shadow-md p-6 flex items-center">
                    <div className={`p-3 rounded-full ${card.color} text-white mr-4`}>
                        <card.icon className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">{card.name}</p>
                        <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
