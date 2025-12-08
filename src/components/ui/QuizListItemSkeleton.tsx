export function QuizListItemSkeleton() {
    return (
        <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 animate-pulse">
                    {/* Module Name Placeholder */}
                    <div className="h-4 bg-gray-200 rounded-md w-1/4 mb-2"></div>
                    {/* Title Placeholder */}
                    <div className="h-6 bg-gray-300 rounded-md w-1/2 mb-3"></div>
                    {/* Info Line Placeholder */}
                    <div className="h-4 bg-gray-200 rounded-md w-3/4 mb-4"></div>
                    {/* Progress Bar Placeholder */}
                    <div className="w-full max-w-md bg-gray-200 rounded-full h-1.5"></div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
                    {/* Buttons Placeholder */}
                    <div className="h-9 w-9 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}