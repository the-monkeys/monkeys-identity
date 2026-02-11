import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Cloud,
    Server,
    Code,
    Terminal,
    ShieldCheck,
    Zap,
    Users,
    Key,
    Lock,
    CheckCircle2,
    Book
} from 'lucide-react';

const DocumentationPage = () => {
    const navigate = useNavigate();

    const sections = [
        { id: 'getting-started', title: 'Getting Started', icon: <Zap className="w-5 h-5" /> },
        { id: 'hosted-vs-self', title: 'Hosted vs Self-Hosted', icon: <Server className="w-5 h-5" /> },
        { id: 'admin-guide', title: 'Admin Guide', icon: <ShieldCheck className="w-5 h-5" /> },
        { id: 'oidc-guide', title: 'OIDC/OAuth2 Integration', icon: <Lock className="w-5 h-5" /> },
        { id: 'api-reference', title: 'API Reference', icon: <Code className="w-5 h-5" /> },
        { id: 'pricing', title: 'Pricing', icon: <Terminal className="w-5 h-5" /> },
    ];

    return (
        <div className="flex-1 bg-bg-main-dark font-sans text-text-main-dark">
            <div className="max-w-7xl mx-auto px-4 py-12 md:py-24">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center space-x-2 text-gray-400 hover:text-primary transition-colors mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    <span>Back to Home</span>
                </button>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar Navigation */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="sticky top-24 space-y-1">
                            {sections.map((section) => (
                                <a
                                    key={section.id}
                                    href={`#${section.id}`}
                                    className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                                >
                                    {section.icon}
                                    <span className="font-medium">{section.title}</span>
                                </a>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 space-y-24 pb-24">
                        <section id="getting-started" className="scroll-mt-24">
                            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">Documentation</h1>
                            <p className="text-xl text-gray-400 leading-relaxed mb-12">
                                Welcome to the Monkeys IAM documentation. Our platform provides enterprise-grade identity and access management that's easy to integrate and scale.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-bg-card-dark rounded-2xl border border-border-color-dark hover:border-primary/50 transition-colors">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">User Management</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Manage your users, their profiles, and authentication states through our intuitive UI or powerful REST APIs.
                                    </p>
                                </div>
                                <div className="p-6 bg-bg-card-dark rounded-2xl border border-border-color-dark hover:border-primary/50 transition-colors">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                                        <Key className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Secure MFA</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Enforce security with TOTP-based Multi-Factor Authentication. Easily integrate MFA setup and verification flows.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section id="hosted-vs-self" className="scroll-mt-24">
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Cloud className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-bold text-white">Hosted vs Self-Hosted</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        Hosted (Cloud) <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    </h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Our production-ready managed service. We handle the scaling, backups, and security patches so you can focus on building your product.
                                    </p>
                                    <ul className="space-y-2">
                                        {['99.9% Uptime SLA', 'Global Edge Network', 'Automatic Backups', 'Managed Infrastructure'].map(item => (
                                            <li key={item} className="flex items-center space-x-2 text-sm text-gray-300">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        Self-Hosted <Server className="w-4 h-4 text-primary" />
                                    </h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Full control over your data and infrastructure. Run Monkeys IAM on your own servers via Docker or Kubernetes.
                                    </p>
                                    <ul className="space-y-2">
                                        {['Absolute Data Sovereignty', 'No External Calls', 'Custom Infrastructure', 'Air-gapped Support'].map(item => (
                                            <li key={item} className="flex items-center space-x-2 text-sm text-gray-300">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section id="admin-guide" className="scroll-mt-24">
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-bold text-white">Admin Guide</h2>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                <p className="text-gray-400 text-lg mb-8">
                                    As an Organization Admin, you are responsible for the security posture of your workspace. Follow these steps to get started:
                                </p>

                                <div className="space-y-12">
                                    <div className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-800 border border-border-color-dark flex items-center justify-center font-bold text-primary">1</div>
                                        <h4 className="text-xl font-bold text-white mb-2">Register your Organization</h4>
                                        <p className="text-gray-400">Sign up at our portal and create your unique organization workspace. This will provide you with a dedicated tenant for your users.</p>
                                    </div>
                                    <div className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-800 border border-border-color-dark flex items-center justify-center font-bold text-primary">2</div>
                                        <h4 className="text-xl font-bold text-white mb-2">Define Global Policies</h4>
                                        <p className="text-gray-400">Navigate to the Policies section to create base permissions. Use our JSON editor or visual builder to define what users can access.</p>
                                    </div>
                                    <div className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-800 border border-border-color-dark flex items-center justify-center font-bold text-primary">3</div>
                                        <h4 className="text-xl font-bold text-white mb-2">Configure MFA Requirements</h4>
                                        <p className="text-gray-400">Enable forced MFA for administrative accounts or all users in the Security Settings tab to ensure high-level account protection.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="oidc-guide" className="scroll-mt-24">
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-bold text-white">OAuth2 / OIDC Integration</h2>
                            </div>

                            <div className="space-y-8">
                                <p className="text-gray-400 text-lg">
                                    Monkeys IAM supports standard OpenID Connect (OIDC) and OAuth2 flows, allowing you to integrate your own applications seamlessly.
                                </p>

                                <div className="bg-slate-900 rounded-2xl border border-border-color-dark p-6 space-y-6">
                                    <h4 className="text-white font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-primary" /> Understanding Client Types
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-primary">Public Applications</p>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                Apps that cannot keep a secret safe (e.g., React/Vue SPAs, Mobile Apps). These apps use PKCE or simple Auth Code flow <strong>without a client secret</strong> during token exchange.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-pink-400">Confidential Applications</p>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                Apps running on a secure server (e.g., Next.js, Go, Python). These apps <strong>must provide a Client Secret</strong> during the token exchange to verify their identity.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-2xl border border-border-color-dark p-6 space-y-4">
                                    <h4 className="text-white font-bold flex items-center gap-2">
                                        <Book className="w-4 h-4 text-primary" /> OIDC Discovery
                                    </h4>
                                    <p className="text-sm text-gray-400">Use our discovery endpoint to automatically configure your OIDC clients.</p>
                                    <div className="bg-black/30 p-3 rounded-lg font-mono text-xs text-primary border border-white/5">
                                        GET /.well-known/openid-configuration
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-lg font-mono text-xs text-primary border border-white/5">
                                        GET /.well-known/jwks.json
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-white font-bold">Step 1: Register your Application</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        Navigate to the <strong>Ecosystem</strong> section in the dashboard to register a new OIDC client. You will need to provide your application's <strong>Redirect URIs</strong>.
                                    </p>
                                    <p className="text-sm text-gray-400 leading-relaxed italic">
                                        Upon registration, you will receive a <strong>Client ID</strong> and <strong>Client Secret</strong>. Safeguard the secret!
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-white font-bold">Step 2: Authorization Code Flow</h4>
                                    <p className="text-sm text-gray-400">Redirect your users to our authorize endpoint to start the login process.</p>
                                    <div className="bg-slate-900 rounded-xl border border-border-color-dark p-4 font-mono text-xs overflow-x-auto text-gray-300">
                                        {`GET /oauth2/authorize?
  client_id=YOUR_CLIENT_ID&
  response_type=code&
  scope=openid profile email&
  redirect_uri=YOUR_REDIRECT_URI&
  state=RANDOM_STATE`}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-white font-bold">Step 3: Exchange Code for Tokens</h4>
                                    <p className="text-sm text-gray-400">Exchange the code for an access token and ID token. The request differs slightly depending on the client type.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-gray-500 uppercase">Public Clients (SPA/Mobile)</div>
                                            <div className="bg-slate-900 rounded-xl border border-border-color-dark p-4 font-mono text-xs overflow-x-auto text-gray-300">
                                                <div className="text-pink-400 mb-2">POST /api/v1/oauth2/token</div>
                                                {`{
  "grant_type": "authorization_code",
  "client_id": "CLIENT_ID",
  "code": "CODE",
  "redirect_uri": "REDIRECT_URI"
}`}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-gray-500 uppercase">Confidential Clients (Server-side)</div>
                                            <div className="bg-slate-900 rounded-xl border border-border-color-dark p-4 font-mono text-xs overflow-x-auto text-gray-300">
                                                <div className="text-pink-400 mb-2">POST /api/v1/oauth2/token</div>
                                                {`{
  "grant_type": "authorization_code",
  "client_id": "CLIENT_ID",
  "client_secret": "CLIENT_SECRET",
  "code": "CODE",
  "redirect_uri": "REDIRECT_URI"
}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-white font-bold">Step 4: Fetch User Profile</h4>
                                    <p className="text-sm text-gray-400">Use the access token to fetch the user's profile. We follow the standard OIDC userinfo format.</p>
                                    <div className="bg-slate-900 rounded-xl border border-border-color-dark p-4 font-mono text-xs overflow-x-auto text-gray-300">
                                        <div className="text-pink-400 mb-2">GET /api/v1/oauth2/userinfo</div>
                                        <div className="text-gray-500">Authorization: Bearer YOUR_ACCESS_TOKEN</div>
                                        <div className="mt-4 text-green-400">Response:</div>
                                        {`{
  "sub": "USER_ID",
  "email": "user@example.com",
  "name": "User Name",
  "preferred_username": "username"
}`}
                                    </div>
                                    <p className="text-xs text-gray-500 italic">
                                        Note: Our tokens use the standard "sub" claim to represent the user identifier, ensuring compatibility with standard OIDC libraries.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section id="api-reference" className="scroll-mt-24">
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                    <Code className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-bold text-white">API Integration</h2>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">Initial Authentication</h3>
                                    <p className="text-gray-400 mb-4 text-sm">Use the following endpoint to authenticate users and receive a session token.</p>
                                    <div className="bg-slate-900 rounded-xl border border-border-color-dark p-4 font-mono text-sm overflow-x-auto">
                                        <div className="text-primary mb-2">POST /api/v1/auth/login</div>
                                        <div className="text-gray-300">
                                            {`{
  "email": "user@example.com",
  "password": "your-secure-password"
}`}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">Password Reset Flow</h3>
                                    <p className="text-gray-400 mb-4 text-sm">Trigger a recovery email for users who have forgotten their credentials.</p>
                                    <div className="bg-slate-900 rounded-xl border border-border-color-dark p-4 font-mono text-sm overflow-x-auto">
                                        <div className="text-primary mb-2">POST /api/v1/auth/forgot-password</div>
                                        <div className="text-gray-300">
                                            {`{
  "email": "user@example.com"
}`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="pricing" className="scroll-mt-24">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                                        <Terminal className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">Pricing Models</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Community */}
                                <div className="bg-bg-card-dark border border-border-color-dark rounded-2xl p-8 flex flex-col relative overflow-hidden">
                                    <div className="mb-8">
                                        <h4 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-2 text-center">Open Source</h4>
                                        <h3 className="text-2xl font-bold text-white text-center">Community</h3>
                                    </div>
                                    <div className="mb-8 text-center">
                                        <span className="text-4xl font-bold text-white">$0</span>
                                        <span className="text-gray-500 ml-1">/ forever</span>
                                    </div>
                                    <ul className="space-y-4 mb-8 flex-1">
                                        {['Self-hosted', 'Unlimited Users', 'Core IAM Features', 'Community Support'].map(item => (
                                            <li key={item} className="flex items-center space-x-2 text-sm text-gray-300">
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button className="w-full py-3 px-4 bg-slate-800 border border-border-color-dark hover:border-primary text-white rounded-xl font-bold transition-all">
                                        Clone Repository
                                    </button>
                                </div>

                                {/* Cloud / Hosted */}
                                <div className="bg-slate-900 border-2 border-primary rounded-2xl p-8 flex flex-col relative overflow-hidden scale-105 shadow-2xl z-10">
                                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg">
                                        Most Popular
                                    </div>
                                    <div className="mb-8">
                                        <h4 className="text-primary font-bold uppercase tracking-wider text-xs mb-2 text-center">Cloud Hosted</h4>
                                        <h3 className="text-2xl font-bold text-white text-center">Pro</h3>
                                    </div>
                                    <div className="mb-8 text-center">
                                        <span className="text-4xl font-bold text-white">$199</span>
                                        <span className="text-gray-500 ml-1">/ month</span>
                                    </div>
                                    <ul className="space-y-4 mb-8 flex-1">
                                        {['Managed Service', 'MFA Protocols', 'Custom Domains', 'Priority Support', 'Daily Backups'].map(item => (
                                            <li key={item} className="flex items-center space-x-2 text-sm text-gray-300">
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button className="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold transition-all hover:bg-opacity-80 shadow-lg shadow-primary/20">
                                        Start Free Trial
                                    </button>
                                </div>

                                {/* Enterprise */}
                                <div className="bg-bg-card-dark border border-border-color-dark rounded-2xl p-8 flex flex-col relative overflow-hidden">
                                    <div className="mb-8">
                                        <h4 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-2 text-center">Custom</h4>
                                        <h3 className="text-2xl font-bold text-white text-center">Enterprise</h3>
                                    </div>
                                    <div className="mb-8 text-center">
                                        <span className="text-3xl font-bold text-white">Custom</span>
                                    </div>
                                    <ul className="space-y-4 mb-8 flex-1">
                                        {['Audit Logs API', 'SSO Synchronization', 'Air-gapped Install', 'Dedicated Account Manager'].map(item => (
                                            <li key={item} className="flex items-center space-x-2 text-sm text-gray-300">
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button className="w-full py-3 px-4 bg-slate-800 border border-border-color-dark hover:border-primary text-white rounded-xl font-bold transition-all">
                                        Contact Sales
                                    </button>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>

            {/* CTA Section */}
            <section className="bg-primary/5 py-24 border-t border-border-color-dark">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">Ready to secure your infrastructure?</h2>
                    <p className="text-gray-400 mb-10 text-lg">
                        Join hundreds of organizations already using Monkeys IAM to power their identity management.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 transition-all text-lg"
                        >
                            Get Started Free
                        </button>
                        <button className="w-full sm:w-auto px-8 py-4 bg-slate-800 border border-border-color-dark hover:border-primary text-white rounded-xl font-bold transition-all text-lg">
                            Talk to Us
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DocumentationPage;
