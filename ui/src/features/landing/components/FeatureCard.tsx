export const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="h-full rounded-xl border border-border-color-dark bg-bg-card-dark p-6 transition-all group hover:border-primary/30 hover:shadow-xl sm:p-8">
    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border-color-dark bg-slate-800 text-primary transition-transform group-hover:scale-105 sm:mb-6 sm:h-12 sm:w-12">
      {icon}
    </div>
    <h3 className="mb-3 text-lg font-bold text-text-main-dark sm:text-xl">{title}</h3>
    <p className="text-sm leading-relaxed text-gray-400 sm:text-base">
      {description}
    </p>
  </div>
);

export default FeatureCard;

export const CodeCard = () => {
  return (
    <pre className="whitespace-pre text-gray-300">
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
