import React from 'react';

interface QuizActionCardProps {
    title: string;
    icon: React.ElementType;
    onClick: () => void;
    color: string;
    delay?: number;
}

export const QuizActionCard: React.FC<QuizActionCardProps> = ({ title, icon: Icon, onClick, color, delay = 0 }) => {
    return (
        <button
            onClick={onClick}
            className={`
                relative overflow-hidden group p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 
                flex flex-col items-center justify-center gap-3 text-center h-32 w-full
                bg-white border border-gray-100
                animate-fade-in-up
            `}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`
                p-3 rounded-full ${color} bg-opacity-10 text-opacity-100
                group-hover:scale-110 transition-transform duration-300
            `}>
                <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
            </div>
            <span className="font-semibold text-gray-700 text-sm leading-tight group-hover:text-blue-600 transition-colors">
                {title}
            </span>

            {/* Decorative background circle */}
            <div className={`
                absolute -right-4 -bottom-4 w-16 h-16 rounded-full ${color} opacity-5 
                group-hover:scale-150 transition-transform duration-500
            `} />
        </button>
    );
};
