import React from 'react';
import { Lock, Mail, User } from 'lucide-react';

export const steps = [
    { title: 'Account info', icon: React.createElement(Mail, { size: 24 }) },
    { title: 'Contact info', icon: React.createElement(User, { size: 24 }) },
    { title: 'Secure account', icon: React.createElement(Lock, { size: 24 }) }
];