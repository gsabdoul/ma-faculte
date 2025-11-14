import React from 'react';

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: string | number;
    color: 'blue' | 'green' | 'yellow' | 'red';
}

export function StatCard({ icon: Icon, title, value, color }: StatCardProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        red: 'bg-red-100 text-red-600',
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}