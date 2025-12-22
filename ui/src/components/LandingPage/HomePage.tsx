import { useNavigate } from 'react-router-dom';
import { Shield, Key, Users, Code, Lock, Server, ArrowRight } from 'lucide-react';

import Navbar from '../navbar/Navbar';
import FeatureCard from './FeatureCard';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen overflow-hidden bg-bg-main-dark text-white">
            <Navbar />

            <section className="pt-24 pb-20 md:pt-40 md:pb-32 px-4">
                <div className="max-w-7xl flex flex-col justify-center items-center">
                    <h1 className="w-full text-5xl md:text-7xl font-bold tracking-tight mb-12 text-white text-center">
                        Centralized Access Control <br />
                        <span className="text-primary italic">Simplified...</span>
                    </h1>
                    <p className="w-full text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto text-center leading-relaxed">
                        The modern developer-dfirst IAM platform for managing users, roles, and granular security policies across your entire infrastructure.
                    </p>
                    <div className="max-w-2xl mx-auto flex flex-row justify-center items-center gap-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full sm:w-auto bg-primary hover:bg-opacity-90 text-white px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-xl shadow-primary/25 flex items-center justify-center space-x-2"
                        >
                            <span>Explore Dashboard</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button className="w-full sm:w-auto bg-slate-800 border border-border-color-dark hover:border-primary px-8 py-4 rounded-lg text-lg font-bold transition-all text-white flex items-center justify-center">
                            View Documentation
                        </button>
                    </div>
                </div>
            </section>

            {/* Bento UI Snippets */}
            <section className="py-20 px-4 bg-bg-card-dark/30">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900 rounded-2xl border border-border-color-dark overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-border-color-dark flex items-center justify-between">
                            <span className="text-sm font-bold opacity-60 text-white">Policy Editor</span>
                            <div className="flex space-x-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                            </div>
                        </div>
                        <div className="p-6 font-mono text-sm">
                            <pre className="text-gray-300">
                                <code>{`{
  "Version": "2025-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iam:GetUser", "iam:ListUsers"],
      "Resource": "*",
      "Condition": {
        "IpAddress": { "source": "10.0.0.0/8" }
      }
    }
  ]
}`}</code>
                            </pre>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl border border-border-color-dark overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-border-color-dark flex items-center">
                            <span className="text-sm font-bold opacity-60 text-white">Active User Sessions</span>
                        </div>
                        <div className="divide-y divide-border-color-dark">
                            {[
                                { name: 'sarah.dev', status: 'Online', ip: '192.168.1.1' },
                                { name: 'john.smith', status: 'Idle', ip: '45.12.33.10' },
                                { name: 'admin_sys', status: 'Online', ip: '10.0.4.55' },
                            ].map((user, i) => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                            {user.name[0]}
                                        </div>
                                        <span className="text-sm font-medium text-white">{user.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-[10px] font-mono text-gray-500">{user.ip}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {user.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="py-24 px-4 bg-bg-main-dark">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-text-main-dark">Next-Gen Architecture, Modern UX</h2>
                        <p className="text-gray-400">Get the power of enterprise-grade identity management without proprietary overhead.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Users />}
                            title="Identity Hub"
                            description="Unified management of Users, Groups, and Programmatic Roles. Link your external identity providers with zero friction."
                        />
                        <FeatureCard
                            icon={<Key />}
                            title="MFA & WebAuthn"
                            description="Native support for TOTP and hardware keys. Enforce 2FA globally or selectively per-environment with conditional access."
                        />
                        <FeatureCard
                            icon={<Shield />}
                            title="Fine-grained RBAC"
                            description="Construct complex permission schemas using our advanced visual policy editor or direct JSON manipulation."
                        />
                        <FeatureCard
                            icon={<Code />}
                            title="API First"
                            description="Fully documented GraphQL and REST APIs. Everything visible in the UI is actionable via automation scripts."
                        />
                        <FeatureCard
                            icon={<Lock />}
                            title="Secrets Rotation"
                            description="Automated access key rotation policies. Ensure stale credentials never remain active in your infrastructure."
                        />
                        <FeatureCard
                            icon={<Server />}
                            title="Audit Logs"
                            description="Immutable tamper-proof logging of every access request and policy modification for SOC2 compliance."
                        />
                    </div>
                </div>
            </section>

            <footer className="py-12 border-t border-border-color-dark bg-bg-card-dark px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center opacity-60">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-bold text-white">Monkeys IAM © 2025</span>
                    </div>
                    <div className="flex space-x-8 text-sm text-gray-400">
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Status</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;