import { Code, Key, Lock, Server, Shield, Users } from "lucide-react";

type HeroMetric = {
  label: string;
  value: string;
};

type SessionPreview = {
  user: string;
  role: string;
  activity: string;
};

export const HERO_METRICS: HeroMetric[] = [
  { label: "Organizations onboarded", value: "1500+" },
  { label: "Policy evaluation latency", value: "< 50ms" },
  { label: "Uptime target", value: "99.99%" },
];

export const SESSION_PREVIEWS: SessionPreview[] = [
  {
    user: "john.doe@company.com",
    role: "Security Admin",
    activity: "Policy update approved",
  },
  {
    user: "api-client@payments",
    role: "Service Account",
    activity: "Token rotated successfully",
  },
  {
    user: "sre.team@company.com",
    role: "Operator",
    activity: "Read-only maintenance window access",
  },
];

export const FEATURE_ITEMS = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Identity Hub",
    description:
      "Unified management of users, groups, and programmatic roles. Link external providers with minimal setup.",
  },
  {
    icon: <Key className="w-5 h-5" />,
    title: "MFA & WebAuthn",
    description:
      "Native support for TOTP and hardware keys. Enforce 2FA globally or by environment with conditional access.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Fine-grained RBAC",
    description:
      "Build advanced permission models with a visual policy editor or direct JSON for full control.",
  },
  {
    icon: <Code className="w-5 h-5" />,
    title: "API First",
    description:
      "Everything available in the UI is accessible via REST and GraphQL, designed for automation and scale.",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Secrets Rotation",
    description:
      "Automated credential rotation policies that reduce risk from stale keys and long-lived access.",
  },
  {
    icon: <Server className="w-5 h-5" />,
    title: "Audit Logs",
    description:
      "Immutable, searchable event trails for every policy and access event to simplify compliance workflows.",
  },
];
