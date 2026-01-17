import { Shield } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="w-full py-12 border-t border-border-color-dark bg-bg-card-dark px-4 font-sans">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center opacity-60">
                <div className="flex items-center space-x-2 mb-4 md:mb-0">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-bold text-white">Monkeys IAM © {new Date().getFullYear()}</span>
                </div>
                <div className="flex space-x-8 text-sm text-gray-400">
                    <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                    <a href="#" className="hover:text-primary transition-colors">Terms</a>
                    <a href="#" className="hover:text-primary transition-colors">Status</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
