import { Menu, ChevronLeft, Search, Command, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AuthenticatedHeaderProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

const AuthenticatedNavbar = ({ collapsed, setCollapsed }: AuthenticatedHeaderProps) => {
    const { user } = useAuth();

    return (
        <header className="h-14 border-b border-border-color-dark flex items-center justify-between px-6 bg-bg-main-dark/50 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand' : 'Collapse'}
                    className="p-1 hover:bg-slate-700 rounded-md transition-colors text-gray-300 cursor-pointer"
                >
                    {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>

                <p className="text-lg font-semibold text-gray-300">{user?.username}</p>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative group hidden md:block">
                    <div className="absolute left-2 top-2.5 text-gray-400 group-focus-within:text-primary transition-colors">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-12 py-2 bg-slate-900 border border-border-color-dark rounded-md text-sm w-xl focus:outline-none text-text-main-dark placeholder:text-gray-500"
                    />
                    <div className="absolute right-1 top-2 flex items-center space-x-1 px-1 py-0.5 rounded border border-border-color-dark bg-bg-card-dark text-[10px] text-gray-400 font-mono">
                        <Command size={10} />
                        <span>K</span>
                    </div>
                </div>

                <select className="bg-transparent text-xs font-bold focus:outline-none border-l border-border-color-dark pl-4 h-6 text-gray-500 hover:text-text-main-dark transition-colors cursor-pointer">
                    <option className="bg-bg-card-dark">Production-Cloud</option>
                    <option className="bg-bg-card-dark">Staging-Sandbox</option>
                    <option className="bg-bg-card-dark">Local-Dev</option>
                </select>

                <button className="p-1.5 text-gray-500 hover:text-text-main-dark transition-colors relative">
                    <Bell size={18} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-bg-main-dark"></span>
                </button>
                <button className="p-1.5 text-gray-500 hover:text-text-main-dark transition-colors">
                    <HelpCircle size={18} />
                </button>

                <div>

                </div>
            </div>
        </header>
    );
};

export default AuthenticatedNavbar;
