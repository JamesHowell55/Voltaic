import { Link } from 'react-router-dom';
import { NAV_CATEGORIES, CONVERSIONS_LINK, type CalculatorLink } from '../lib/navCategories';

const ICONS: Record<string, string> = {
  '/busbar': '⌁',
  '/cable-voltage-drop': '⚡',
  '/capacitor-sizing': '⎓',
  '/creepage-clearance': '⏚',
  '/harness-bundle-diameter': '⌇',
  '/wire-sizing': '〰',
  '/bolted-joint': '⛭',
  '/dynamics': '⚙',
  '/orings': '⭕',
  '/conductive-heat-transfer': '♨',
  '/pressure-drop': '⇓',
  '/material-database': '⬡',
  '/conversions': '⇄',
};

function ToolCard({ link }: { link: CalculatorLink }) {
  const icon = ICONS[link.path] ?? '●';
  if (!link.available) {
    return (
      <div className="tool-card">
        <div className="icon">{icon}</div>
        <h3>{link.label}</h3>
        <p>{link.description}</p>
        <span className="tag">Coming soon</span>
      </div>
    );
  }
  return (
    <Link to={link.path} className="tool-card available">
      <div className="icon">{icon}</div>
      <h3>{link.label}</h3>
      <p>{link.description}</p>
      <span className="tag">Available</span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">● First-principles engineering tools</div>
        <h1>Engineering Calculators</h1>
        <p>
          A growing set of calculators for electrical, mechanical, thermal and material design work —
          transparent formulas, standards-referenced, every step shown.
        </p>
      </div>

      {NAV_CATEGORIES.map((category) => (
        <div key={category.label} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{category.label}</h2>
          <div className="tool-grid">
            {category.links.map((link) => (
              <ToolCard key={link.path} link={link} />
            ))}
          </div>
        </div>
      ))}

      <div>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Conversions</h2>
        <div className="tool-grid">
          <ToolCard link={CONVERSIONS_LINK} />
        </div>
      </div>
    </div>
  );
}
