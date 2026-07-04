import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">● First-principles engineering tools</div>
        <h1>Engineering Calculators</h1>
        <p>
          A growing set of calculators for electrical and mechanical first-principles design work —
          transparent formulas, standards-referenced, every step shown.
        </p>
      </div>

      <div className="tool-grid">
        <Link to="/busbar" className="tool-card available">
          <div className="icon">⌁</div>
          <h3>Busbar Calculator</h3>
          <p>
            Build a busbar cross-section from multiple bar sections, apply AC or DC current,
            duration, ambient temperature and material, and calculate steady-state or
            short-circuit conductor temperature.
          </p>
          <span className="tag">Available</span>
        </Link>

        <Link to="/creepage-clearance" className="tool-card available">
          <div className="icon">⏚</div>
          <h3>Creepage &amp; Clearance Calculator</h3>
          <p>
            Minimum creepage and clearance distances per IEC 60664-1 — pollution degree, material group (CTI),
            overvoltage category, and altitude correction from sea level up to 50,000 ft.
          </p>
          <span className="tag">Available</span>
        </Link>

        <div className="tool-card">
          <div className="icon">⚡</div>
          <h3>Fault Level Calculator</h3>
          <p>Short-circuit level calculation from source impedance and network data.</p>
          <span className="tag">Coming soon</span>
        </div>
      </div>
    </div>
  );
}
