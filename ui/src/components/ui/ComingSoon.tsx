
import { Rocket } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description?: string;
}

const ComingSoon = ({ title, description }: ComingSoonProps) => {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center px-4">
            <div className="bg-primary/10 p-6 rounded-full mb-6">
                <Rocket className="h-12 w-12 text-primary animate-bounce" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
            <p className="text-gray-400 max-w-md mx-auto">
                {description || "We're working hard to bring this feature to you. Stay tuned for updates!"}
            </p>
            <div className="mt-8 flex gap-4">
                <button
                    onClick={() => window.history.back()}
                    className="px-6 py-2 bg-bg-card-dark border border-border-color-dark text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
};

export default ComingSoon;
