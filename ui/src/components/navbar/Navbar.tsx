import { useNavigate } from 'react-router-dom';
import { Shield, Github } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();

    return (
        <nav className="absolute top-0 z-50 w-full border-b bg-bg-main-dark/80 backdrop-blur-md border-border-color-dark">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div
                        className="flex items-center space-x-2 cursor-pointer group"
                        onClick={() => navigate('/home')}
                    >
                        <Shield className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
                        <span onClick={() => navigate('/home')}
                            className="text-xl font-bold tracking-tight text-white cursor-pointer"
                        >
                            Monkeys{' '}<span className="text-primary">IAM</span>
                        </span>
                    </div>

                    <div className="flex items-center space-x-8">
                        <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer">Documentation</a>
                        <a href="https://github.com/the-monkeys/monkeys-identity/tree/main" target="_blank" rel="noopener noreferrer"
                            className="group flex items-center space-x-1 text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <Github className="w-4 h-4 transition-colors group-hover:text-primary" />
                            <span>GitHub</span>
                        </a>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-primary/80 hover:bg-opacity-70 text-white px-5 py-2 rounded-md text-sm font-semibold transition-all shadow-lg shadow-primary/20 cursor-pointer"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;