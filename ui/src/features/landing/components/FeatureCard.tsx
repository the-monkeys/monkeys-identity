export const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
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

export const CodeCard = () => {
  return (
    <pre className="text-gray-300">
      <code>{`{
  "Version": "2025-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "user:john.doe@company.com",
      "Action": ["read:content", "write:metadata"],
      "Resource": "arn:monkey:storage:us-east-1:org123:bucket/documents/*",
      "Condition": {
        "TimeOfDay": "09:00-17:00",
        "IpRange": "10.0.0.0/8",
        "MFARequired": true,
      },
      "ResourceTags": {
        "Environment": "production",
        "Sensitivity": "internal"
      }
    }
  ]
}`}</code>
    </pre>
  );
};