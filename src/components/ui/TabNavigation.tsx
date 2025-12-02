import React from 'react';

interface Tab {
    id: string;
    label: string;
    icon?: React.ElementType;
}

interface TabNavigationProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="flex p-1 space-x-1 bg-gray-100 rounded-xl">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            flex items-center justify-center w-full py-2.5 text-sm font-medium leading-5 rounded-lg transition-all duration-200
                            ${isActive
                                ? 'bg-white text-blue-700 shadow'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }
                        `}
                    >
                        {Icon && (
                            <Icon className={`w-5 h-5 mr-2 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                        )}
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};
