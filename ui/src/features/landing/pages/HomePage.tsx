import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CodeCard, FeatureCard } from "../components/FeatureCard";
import {
  FEATURE_ITEMS,
  HERO_METRICS,
  SESSION_PREVIEWS,
} from "../constants/landingContent";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 font-sans">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,85,66,0.25),transparent_60%)]" />
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-16 pt-24 text-center sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-28 lg:pt-36">
          <span className="mb-6 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary sm:text-sm">
            Developer-first Identity & Access
          </span>
          <h1 className="max-w-5xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            Centralized Access Control
            <span className="block text-primary italic">Simplified...</span>
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg lg:text-xl">
            Manage users, roles, and granular security policies from one place
            with a secure IAM platform built for modern engineering teams.
          </p>

          <div className="mt-10 flex w-full max-w-xl flex-col items-stretch justify-center gap-4 lg:flex sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main-dark sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/docs")}
              className="inline-flex w-full items-center justify-center rounded-lg border border-border-color-dark bg-slate-800 px-6 py-3 text-base font-semibold text-white transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main-dark sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              View Documentation
            </button>
          </div>

          <ul className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {HERO_METRICS.map((metric) => (
              <li
                key={metric.label}
                className="rounded-xl border border-border-color-dark bg-bg-card-dark/70 p-4 text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {metric.label}
                </p>
                <p className="mt-1 text-xl font-bold text-white sm:text-2xl">
                  {metric.value}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-bg-card-dark/30 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-5">
          <article className="overflow-hidden rounded-2xl border border-border-color-dark bg-slate-900 shadow-2xl xl:col-span-3">
            <div className="flex items-center justify-between border-b border-border-color-dark p-4">
              <span className="text-sm font-bold text-white/70">
                Policy Structure
              </span>
              <div className="flex space-x-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="overflow-x-auto p-4 font-mono text-xs sm:p-6 sm:text-sm">
              <CodeCard />
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl border border-border-color-dark bg-slate-900 shadow-2xl xl:col-span-2">
            <div className="flex items-center border-b border-border-color-dark p-4">
              <span className="text-sm font-bold text-white/70">
                Active User Sessions
              </span>
            </div>
            <ul className="divide-y divide-border-color-dark">
              {SESSION_PREVIEWS.map((session) => (
                <li
                  key={session.user}
                  className="flex items-start gap-3 p-4 sm:p-5"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {session.user}
                    </p>
                    <p className="text-xs text-gray-400">{session.role}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-300">
                      {session.activity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border-color-dark px-4 py-3 text-xs text-gray-400 sm:px-5">
              Session stream refreshes every 30 seconds.
            </div>
          </article>
        </div>
      </section>

      <section className="bg-bg-main-dark px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
            <h2 className="text-3xl font-bold text-text-main-dark sm:text-4xl">
              Next-Gen Architecture, Modern UX
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-400 sm:text-base">
              Enterprise-grade identity management with the speed and clarity
              product teams need to ship confidently.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            {FEATURE_ITEMS.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
