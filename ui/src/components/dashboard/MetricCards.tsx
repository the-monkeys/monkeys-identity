import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const MetricCard: React.FC<{ label: string, value: string, change: string, positive?: boolean, neutral?: boolean }> = ({ label, value, change, positive, neutral }) => (
    <div className="p-6 rounded-xl border border-border-color-dark bg-bg-card-dark shadow-sm transition-all hover:border-zinc-700">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-main-dark mb-2">{label}</p>
        <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-text-main-dark">{value}</h3>
            <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${neutral ? 'bg-zinc-900/30 text-zinc-100' :
                positive ? 'bg-emerald-900/30 text-emerald-100' : 'bg-red-900/30 text-red-100'
                }`}
            >
                {neutral ? null : positive ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
                {change}
            </div>
        </div>
    </div>
);

export default MetricCard;