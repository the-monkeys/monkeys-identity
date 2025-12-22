const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="p-8 bg-bg-card-dark border border-border-color-dark rounded-xl transition-all hover:shadow-xl hover:border-primary/30 group">
        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-slate-800 border border-border-color-dark text-primary mb-6 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 text-text-main-dark">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-sm">
            {description}
        </p>
    </div>
);

export default FeatureCard;