import type { ElementType, FC } from 'react';

interface QuizActionCardProps {
    title: string;
    icon: ElementType;
    onClick: () => void;
    color: string;
    delay?: number;
}

export const QuizActionCard: FC<QuizActionCardProps> = ({ title, icon: Icon, onClick, color, delay = 0 }) => {
    // Extract base color name for efficient shadow usage (assuming format like 'bg-blue-500' or similar if needed, 
    // but here we expect 'from-blue-500 to-blue-600' style for gradients. 
    // For simplicity, we'll keep 'color' as the full class string for the gradient background.

    return (
        <button
            onClick={onClick}
            className={`
                relative overflow-hidden group p-4 rounded-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02]
                flex flex-col items-center justify-between text-left h-36 w-full
                bg-gradient-to-br ${color}
                shadow-lg hover:shadow-xl
                animate-fade-in-up
            `}
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Background Pattern/Glow */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>

            {/* Icon Container with Glass effect */}
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-inner border border-white/10 self-start group-hover:rotate-6 transition-transform duration-300">
                <Icon className="w-8 h-8 text-white drop-shadow-md" />
            </div>

            {/* Title & Arrow */}
            <div className="w-full flex justify-between items-end mt-2 z-10">
                <span className="font-bold text-white text-lg tracking-wide shadow-black/5 drop-shadow-sm leading-tight text-left">
                    {title}
                </span>

                {/* Small indicator icon */}
                <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/90">
                        <path fillRule="evenodd" d="M16.72 7.72a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 11-1.06-1.06l2.47-2.47H3a.75.75 0 010-1.5h16.19l-2.47-2.47a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        </button>
    );
};
