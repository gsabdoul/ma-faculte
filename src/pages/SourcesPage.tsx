import { useState } from 'react';
import { DrivesTab } from '../components/sources/DrivesTab';
import { BooksTab } from '../components/sources/BooksTab';
import { TabNavigation } from '../components/ui/TabNavigation';
import { FolderIcon, BookOpenIcon } from '@heroicons/react/24/outline';

export function SourcesPage() {
    const [activeTab, setActiveTab] = useState('drives');

    const tabs = [
        { id: 'drives', label: 'Drives', icon: FolderIcon },
        { id: 'livres', label: 'Livres', icon: BookOpenIcon },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Sources</h1>
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </header>

            <main>
                {activeTab === 'drives' ? (
                    <div className="animate-fade-in">
                        {/* We render DrivesPage but hide its header since we have a custom one */}
                        <style>{`.drives-header { display: none; }`}</style>
                        <DrivesTab />
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* We render BooksTab but hide its header */}
                        <style>{`.books-header { display: none; }`}</style>
                        <BooksTab />
                    </div>
                )}
            </main>
        </div>
    );
}
