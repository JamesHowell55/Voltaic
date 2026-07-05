import { useLocation } from 'react-router-dom';
import { getCalculatorLinkByPath } from '../lib/navCategories';

export default function ComingSoonCalculator() {
  const { pathname } = useLocation();
  const link = getCalculatorLinkByPath(pathname);

  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">● {link?.label ?? 'Calculator'}</div>
        <h1>{link?.label ?? 'Calculator'}</h1>
        <p>{link?.description ?? 'This calculator is planned but not yet built.'}</p>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <span className="tag">Coming soon</span>
        <p className="note" style={{ marginTop: '0.85rem' }}>
          This tool hasn't been built yet — check back soon, or let us know if you'd like it prioritised.
        </p>
      </div>
    </div>
  );
}
