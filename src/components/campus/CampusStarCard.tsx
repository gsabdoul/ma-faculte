import React from 'react';

interface CampusStarCardProps {
    rank: number;
    name: string;
    avatar?: string;
    score: number;
    university?: string;
}

export const CampusStarCard: React.FC<CampusStarCardProps> = ({ rank, name, avatar, score, university }) => {
    const getRankBadge = (r: number) => {
        switch (r) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${r}`;
        }
    };



    return (
        <div className="flex flex-col items-center min-w-[100px] snap-center">
            <div className="relative mb-2">
                <div className={`
                    w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden bg-gray-100
                    ${rank === 1 ? 'border-yellow-400 shadow-yellow-200' :
                        rank === 2 ? 'border-gray-400 shadow-gray-200' :
                            rank === 3 ? 'border-orange-400 shadow-orange-200' : 'border-blue-100'}
                    shadow-lg
                `}>
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl">🎓</span>
                    )}
                </div>
                <div className={`
                    absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-sm
                    ${rank === 1 ? 'bg-yellow-400 text-white' :
                        rank === 2 ? 'bg-gray-400 text-white' :
                            rank === 3 ? 'bg-orange-400 text-white' : 'bg-blue-100 text-blue-800'}
                `}>
                    {getRankBadge(rank)}
                </div>
            </div>
            <p className="text-xs font-bold text-gray-800 text-center truncate w-24">{name}</p>
            <p className="text-[10px] text-gray-500 text-center truncate w-24">{university}</p>
            <p className="text-xs font-semibold text-blue-600">{score} pts</p>
        </div>
    );
};
