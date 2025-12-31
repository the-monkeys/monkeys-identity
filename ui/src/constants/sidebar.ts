import React from 'react';
import {
    Users,
    Shield,
    Key,
    Settings,
    Database,
    Clock,
    AlertCircle,
    LayoutDashboard
} from 'lucide-react';

export const sidebarMenuItems = [
    { 
        icon: React.createElement(LayoutDashboard, { size: 20 }), 
        label: 'Dashboard', 
        id: 'dashboard' 
    },
    { 
        icon: React.createElement(Users, { size: 20 }), 
        label: 'Users', 
        id: 'users' 
    },
    { 
        icon: React.createElement(Database, { size: 20 }), 
        label: 'Groups', 
        id: 'groups' 
    },
    { 
        icon: React.createElement(Key, { size: 20 }), 
        label: 'Roles', 
        id: 'roles' 
    },
    { 
        icon: React.createElement(Shield, { size: 20 }), 
        label: 'Policies', 
        id: 'policies' 
    },
];

export const secondaryMenuItems = [
    { 
        icon: React.createElement(Clock, { size: 20 }), 
        label: 'Audit Logs' 
    },
    /*{ 
        icon: React.createElement(AlertCircle, { size: 20 }), 
        label: 'Security Alerts' 
    },*/
    { 
        icon: React.createElement(Settings, { size: 20 }), 
        label: 'Account Settings' 
    },
];
