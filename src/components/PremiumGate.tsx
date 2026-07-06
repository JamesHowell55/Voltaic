import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useEntitlement } from '../lib/useEntitlement';

interface Props {
  feature: string;
  children: ReactNode;
}

// Wraps a premium-only control (the PDF export button, an advanced-mode toggle,
// etc.) — renders it as-is for a premium user, or a locked upsell link to
// /account for everyone else. This checks a real, server-verified entitlement
// row (via useEntitlement -> Supabase), not a spoofable local flag.
export default function PremiumGate({ feature, children }: Props) {
  const { isPremium, loading } = useEntitlement();

  if (loading) return null;
  if (isPremium) return <>{children}</>;

  return (
    <Link to="/account" className="btn" title={`${feature} is a Premium feature — click to upgrade`}>
      🔒 {feature} <span className="tag" style={{ marginLeft: '0.4rem' }}>Premium</span>
    </Link>
  );
}
