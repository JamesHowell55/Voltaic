import { useUnitSystem } from '../lib/UnitSystemContext';

export default function UnitSystemToggle() {
  const { unitSystem, setUnitSystem } = useUnitSystem();
  return (
    <div className="segmented" aria-label="Unit system">
      <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => setUnitSystem('SI')}>SI</button>
      <button className={unitSystem === 'imperial' ? 'active' : ''} onClick={() => setUnitSystem('imperial')}>Imperial</button>
    </div>
  );
}
