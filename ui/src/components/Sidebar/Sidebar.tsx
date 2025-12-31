import { LogOut, Shield } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { sidebarMenuItems, secondaryMenuItems } from '@/constants/sidebar';
import { SidebarProps } from '@/Types/interfaces';

const Sidebar = ({ activeView, collapsed }: SidebarProps) => {
    const { logout } = useAuth();

    return (
        <aside
            className={`fixed top-0 left-0 h-screen bg-bg-card-dark border-r border-border-color-dark transition-all duration-300 z-40 ${collapsed ? 'w-16' : 'w-64'
                }`}
        >
            <div className="h-14 flex items-center justify-center border-b border-border-color-dark">
                <div className='font-bold text-gray-300 transition-all duration-300 text-xl'>
                    {collapsed ?
                        <Shield size={24} className='text-primary font-bold' /> :
                        <p className='text-gray-200 flex items-center space-x-2'>
                            <Shield size={24} className='text-primary font-bold' />
                            Monkeys&nbsp;
                            <span className='text-primary/90 font-bold'>IAM</span>
                        </p>
                    }
                </div>
            </div>

            <div className="py-4 flex flex-col justify-between h-[calc(100%-60px)]">
                <nav className="space-y-1 px-2">
                    {sidebarMenuItems.map((item) => (
                        <button
                            key={item.label}
                            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group relative cursor-pointer ${activeView === item.id
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-gray-400 hover:bg-slate-700'
                                }`}
                        >
                            <div className={`${activeView === item.id ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                                {item.icon}
                            </div>
                            {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="px-2 space-y-1">
                    <div className="my-4 border-t border-border-color-dark mx-2 opacity-50"></div>
                    {secondaryMenuItems.map((item) => (
                        <button
                            key={item.label}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-slate-700 transition-all group cursor-pointer"
                        >
                            <div className="group-hover:text-primary transition-colors">
                                {item.icon}
                            </div>
                            {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                        </button>
                    ))}

                    <button
                        onClick={logout}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-slate-700 transition-all group cursor-pointer"
                        title="Logout"
                    >
                        <div className="group-hover:text-primary transition-colors">
                            <LogOut size={20} />
                        </div>
                        {!collapsed && <span className="text-sm truncate">Logout</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
