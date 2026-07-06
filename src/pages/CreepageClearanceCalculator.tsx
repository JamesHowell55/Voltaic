import { useMemo, useState } from 'react';
import PaschenChart from '../components/PaschenChart';
import { useTheme } from '../lib/ThemeContext';
import { exportReportToPdf, type ReportSection, type ReportRow, type CalcStepData } from '../lib/pdfExport';
import { useBranding } from '../lib/useBranding';
import PremiumGate from '../components/PremiumGate';
import {
  MATERIAL_GROUP_CTI,
  getRatedImpulseVoltage,
  getAltitudeCorrectionFactor,
  getClearance,
  getCreepage,
  materialGroupFromCti,
  type OvervoltageCategory,
  type MaterialGroup,
  type InsulationType,
  type FieldCondition,
} from '../lib/creepageClearance';
import { pressureAtAltitude, breakdownVoltage, minGapForVoltage, paschenMinimum } from '../lib/paschen';

function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

const FT_PER_M = 3.28084;

export default function CreepageClearanceCalculator() {
  const { accentHex } = useTheme();
  const branding = useBranding();
  const [un, setUn] = useState(300);
  const [category, setCategory] = useState<OvervoltageCategory | 'custom'>('II');
  const [customUimp, setCustomUimp] = useState(2500);
  const [workingVoltage, setWorkingVoltage] = useState(300);
  const [insulationType, setInsulationType] = useState<InsulationType>('basicOrSupplementary');
  const [useApplianceFunctionalAllowance, setUseApplianceFunctionalAllowance] = useState(false);

  const [pollutionDegree, setPollutionDegree] = useState<1 | 2 | 3 | 4>(2);
  const [materialGroup, setMaterialGroup] = useState<MaterialGroup>('IIIb');
  const [showCtiHelper, setShowCtiHelper] = useState(false);
  const [ctiValue, setCtiValue] = useState(175);

  const [altitudeUnit, setAltitudeUnit] = useState<'m' | 'ft'>('ft');
  const [altitude, setAltitude] = useState(50000);

  const [safetyFactorPercent, setSafetyFactorPercent] = useState(20);
  const [fieldCondition, setFieldCondition] = useState<FieldCondition>('A');

  const [actualClearanceMm, setActualClearanceMm] = useState<number | ''>('');
  const [actualCreepageMm, setActualCreepageMm] = useState<number | ''>('');

  const altitudeM = altitudeUnit === 'ft' ? altitude / FT_PER_M : altitude;

  const impulseResult = useMemo(
    () => (category === 'custom' ? { v: customUimp, extrapolated: false } : getRatedImpulseVoltage(un, category)),
    [un, category, customUimp]
  );
  const ratedImpulseVoltage = impulseResult.v;

  const altCorrection = useMemo(() => getAltitudeCorrectionFactor(altitudeM), [altitudeM]);
  const adjustedImpulseKV = (ratedImpulseVoltage / 1000) * altCorrection.factor;
  const clearanceResult = useMemo(() => getClearance(adjustedImpulseKV, fieldCondition), [adjustedImpulseKV, fieldCondition]);
  const clearanceWithMargin = clearanceResult.mm * (1 + safetyFactorPercent / 100);

  const creepageResult = useMemo(() => {
    if (pollutionDegree === 4) return null;
    return getCreepage(workingVoltage, pollutionDegree, materialGroup, insulationType, useApplianceFunctionalAllowance);
  }, [workingVoltage, pollutionDegree, materialGroup, insulationType, useApplianceFunctionalAllowance]);
  const creepageWithMargin = creepageResult ? creepageResult.mm * (1 + safetyFactorPercent / 100) : null;

  const clearancePass = actualClearanceMm !== '' ? actualClearanceMm >= clearanceWithMargin : null;
  const creepagePass = actualCreepageMm !== '' && creepageWithMargin !== null ? actualCreepageMm >= creepageWithMargin : null;
  const overallPass = clearancePass !== null || creepagePass !== null
    ? (clearancePass !== false) && (creepagePass !== false)
    : null;

  // Paschen's Law cross-check, using the actual clearance if supplied, else the IEC-derived (with-margin) clearance
  const paschenGapMm = actualClearanceMm !== '' ? actualClearanceMm : clearanceWithMargin;
  const pressureKPa = useMemo(() => pressureAtAltitude(altitudeM), [altitudeM]);
  const paschenPd = pressureKPa * (paschenGapMm / 10); // mm -> cm
  const paschenV = breakdownVoltage(pressureKPa, paschenGapMm / 10);
  const paschenMinGapMm = minGapForVoltage(pressureKPa, ratedImpulseVoltage) * 10;
  const paschenPass = paschenV >= ratedImpulseVoltage;
  const paschenMinPd = paschenMinimum().pd;

  const calculationSteps: CalcStepData[] = useMemo(() => {
    const stepsOut: CalcStepData[] = [
      category === 'custom'
        ? { title: 'Rated impulse withstand voltage', formula: 'User-specified directly (custom overvoltage)', result: `Uimp = ${fmt(ratedImpulseVoltage, 0)} V` }
        : {
          title: 'Rated impulse withstand voltage',
          formula: 'Uimp = Uimp(Un0) × (Un / Un0)^b, b = ln(y1/y0)/ln(x1/x0) between the bracketing IEC 60664-1 Table F.1 points',
          substitution: `Un = ${un} V, category ${category}`,
          result: `Uimp = ${fmt(ratedImpulseVoltage, 0)} V${impulseResult.extrapolated ? ' (extrapolated beyond the tabulated Un range)' : ''}`,
        },
      {
        title: 'Altitude correction factor (IEC 60664-1 Table F.10)',
        formula: 'k = f(altitude), linearly interpolated between tabulated points; k = 1.0 below 2000 m',
        substitution: `Altitude = ${fmt(altitude, 0)} ${altitudeUnit} = ${fmt(altitudeM, 0)} m`,
        result: `k = ${fmt(altCorrection.factor, 3)}`,
      },
      {
        title: 'Altitude-adjusted withstand voltage for clearance',
        formula: 'Uimp,adj = Uimp × k',
        substitution: `Uimp,adj = ${fmt(ratedImpulseVoltage, 0)} V × ${fmt(altCorrection.factor, 3)}`,
        result: `Uimp,adj = ${fmt(adjustedImpulseKV * 1000, 0)} V (${fmt(adjustedImpulseKV, 3)} kV)`,
      },
      {
        title: `Required clearance (IEC 60664-1 Table F.2, Case ${fieldCondition} — ${fieldCondition === 'A' ? 'inhomogeneous' : 'homogeneous'} field) + safety factor`,
        formula: 'Clearance = f(Uimp,adj)^b (ratio-based) × (1 + FoS)',
        result: `Base clearance = ${fmt(clearanceResult.mm, 3)} mm${clearanceResult.extrapolated ? ' (extrapolated)' : ''}, with ${safetyFactorPercent}% margin = ${fmt(clearanceWithMargin, 3)} mm`,
      },
    ];

    if (pollutionDegree !== 4 && creepageResult) {
      stepsOut.push({
        title: `Required creepage distance (IEC 60335-1 Table ${useApplianceFunctionalAllowance && insulationType === 'functional' ? '18' : '17'}) + safety factor`,
        formula: `Creepage = f(working voltage band, pollution degree, material group)${insulationType === 'reinforced' ? ' × 2 (reinforced)' : ''} × (1 + FoS)`,
        substitution: `Working voltage ${workingVoltage} V falls in the ≤${creepageResult.rowMaxV} V band, PD${pollutionDegree}, ${MATERIAL_GROUP_CTI[materialGroup].label}${useApplianceFunctionalAllowance && insulationType === 'functional' ? ' (household-appliance functional-insulation allowance applied)' : ''}`,
        result: `Base creepage = ${fmt(creepageResult.mm, 3)} mm, with ${safetyFactorPercent}% margin = ${fmt(creepageWithMargin ?? 0, 3)} mm`,
      });
    }

    stepsOut.push({
      title: "Paschen's Law cross-check",
      formula: 'V_b = B·(p·d) / [ln(A·(p·d)) − ln(ln(1 + 1/γ))], A=113/(kPa·cm), B=2740 V/(kPa·cm), γ=0.01',
      substitution: `p = ${fmt(pressureKPa, 2)} kPa at ${fmt(altitude, 0)} ${altitudeUnit}, d = ${fmt(paschenGapMm, 2)} mm → p·d = ${fmt(paschenPd, 3)} kPa·cm`,
      result: `V_b = ${fmt(paschenV, 0)} V vs required ${fmt(ratedImpulseVoltage, 0)} V — ${paschenPass ? 'consistent with the design' : 'below the required withstand voltage, check the design'}`,
    });

    return stepsOut;
  }, [category, ratedImpulseVoltage, un, impulseResult, altitude, altitudeUnit, altitudeM, altCorrection, adjustedImpulseKV, fieldCondition, clearanceResult, safetyFactorPercent, clearanceWithMargin, pollutionDegree, creepageResult, useApplianceFunctionalAllowance, insulationType, workingVoltage, materialGroup, creepageWithMargin, pressureKPa, paschenGapMm, paschenPd, paschenV, paschenPass]);

  const inputSections: ReportSection[] = useMemo(() => {
    const elecRows: ReportRow[] = [
      { label: 'Rated mains voltage Un', value: category === 'custom' ? 'n/a (custom)' : `${un} V` },
      { label: 'Overvoltage category', value: category === 'custom' ? `Custom (${fmt(customUimp, 0)} V)` : category },
      { label: 'Working voltage', value: `${workingVoltage} V rms` },
      { label: 'Insulation type', value: insulationType === 'functional' ? 'Functional' : insulationType === 'reinforced' ? 'Reinforced' : 'Basic/Supplementary' },
      { label: 'Factor of safety', value: `${safetyFactorPercent}%` },
      { label: 'Electric field condition', value: fieldCondition === 'A' ? 'Inhomogeneous (Case A)' : 'Homogeneous (Case B)' },
    ];
    const envRows: ReportRow[] = [
      { label: 'Pollution degree', value: `PD${pollutionDegree}` },
      { label: 'Material group', value: MATERIAL_GROUP_CTI[materialGroup].label },
      { label: 'Altitude', value: `${altitude} ${altitudeUnit}` },
    ];
    if (actualClearanceMm !== '') envRows.push({ label: 'Actual clearance', value: `${actualClearanceMm} mm` });
    if (actualCreepageMm !== '') envRows.push({ label: 'Actual creepage', value: `${actualCreepageMm} mm` });

    return [
      { heading: 'Electrical parameters', rows: elecRows },
      { heading: 'Environment & design check', rows: envRows },
    ];
  }, [category, un, customUimp, workingVoltage, insulationType, safetyFactorPercent, fieldCondition, pollutionDegree, materialGroup, altitude, altitudeUnit, actualClearanceMm, actualCreepageMm]);

  const outputSections: ReportSection[] = useMemo(() => [
    {
      heading: 'Required distances',
      rows: [
        { label: 'Required clearance (with margin)', value: `${fmt(clearanceWithMargin, 2)} mm` },
        { label: 'Required creepage (with margin)', value: pollutionDegree === 4 ? 'N/A' : `${fmt(creepageWithMargin ?? 0, 2)} mm` },
        { label: 'Rated impulse voltage', value: `${fmt(ratedImpulseVoltage, 0)} V` },
        { label: 'Altitude correction factor', value: fmt(altCorrection.factor, 2) },
      ],
    },
    {
      heading: "Paschen's Law cross-check",
      rows: [
        { label: 'Breakdown voltage at this gap', value: `${fmt(paschenV, 0)} V` },
        { label: 'Min. gap for required voltage', value: `${fmt(paschenMinGapMm, 3)} mm` },
      ],
    },
  ], [clearanceWithMargin, pollutionDegree, creepageWithMargin, ratedImpulseVoltage, altCorrection, paschenV, paschenMinGapMm]);

  const handleExportPdf = () => {
    exportReportToPdf({
      tabName: 'Creepage_Clearance_Calculator',
      pageTitle: 'Creepage & Clearance Distance Calculator',
      accentHex,
      passStatus: overallPass !== null ? { pass: overallPass, label: overallPass ? 'Design meets minimum requirements' : 'Design does not meet minimum requirements' } : null,
      inputSections,
      outputSections,
      calculationSteps,
      disclaimer: 'Engineering estimation tool. Standards: IEC 60664-1 (clearance/altitude), IEC 60335-1 (creepage). Verify exact values against the current official IEC 60664-1 text, and any applicable product standard, before certification use.',
      ...branding,
    });
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <div className="eyebrow">● Creepage &amp; Clearance Calculator</div>
          <h1>Creepage &amp; Clearance Distance Calculator</h1>
          <p>
            Determine minimum clearance (through air) and creepage (over a surface) distances per IEC 60664-1
            methodology, accounting for pollution degree, material group (CTI) and altitude — from sea level up
            to 50,000 ft — with a Paschen's Law first-principles cross-check. Every calculation step is shown
            below with your numbers substituted in.
          </p>
        </div>
        <PremiumGate feature="PDF export">
          <button className="btn primary" style={{ whiteSpace: 'nowrap' }} onClick={handleExportPdf}>Export PDF</button>
        </PremiumGate>
      </div>

      <div className="two-col">
        {/* LEFT COLUMN — inputs */}
        <div>
          <div className="card">
            <div className="card-title"><span><span className="step-num">1</span>Electrical parameters</span></div>
            <div className="grid grid-2">
              <div className="field">
                <label>Rated mains voltage Un (V)</label>
                <input autoComplete="off" type="number" min={1} value={un} onChange={e => setUn(Number(e.target.value))} disabled={category === 'custom'} />
                <span className="hint">Any value — interpolated/extrapolated from IEC 60664-1 Table F.1 using the ratio between its tabulated points.</span>
              </div>
              <div className="field">
                <label>Overvoltage category</label>
                <div className="segmented">
                  {(['I', 'II', 'III', 'IV'] as OvervoltageCategory[]).map(c => (
                    <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>
                  ))}
                  <button className={category === 'custom' ? 'active' : ''} onClick={() => setCategory('custom')}>Custom</button>
                </div>
                <span className="hint">II = ordinary mains-connected equipment; III/IV = fixed installations, distribution level.</span>
              </div>
              {category === 'custom' && (
                <div className="field">
                  <label>Required impulse withstand voltage (V)</label>
                  <input autoComplete="off" type="number" min={1} value={customUimp} onChange={e => setCustomUimp(Number(e.target.value))} />
                </div>
              )}
              <div className="field">
                <label>Working voltage (V rms)</label>
                <input autoComplete="off" type="number" min={0} value={workingVoltage} onChange={e => setWorkingVoltage(Number(e.target.value))} />
                <span className="hint">Used for creepage — the highest RMS voltage actually across the insulation.</span>
              </div>
              <div className="field">
                <label>Insulation type</label>
                <div className="segmented">
                  <button className={insulationType === 'functional' ? 'active' : ''} onClick={() => setInsulationType('functional')}>Functional</button>
                  <button className={insulationType === 'basicOrSupplementary' ? 'active' : ''} onClick={() => setInsulationType('basicOrSupplementary')}>Basic/Supplementary</button>
                  <button className={insulationType === 'reinforced' ? 'active' : ''} onClick={() => setInsulationType('reinforced')}>Reinforced</button>
                </div>
                <span className="hint">
                  IEC 60664-1 dimensions functional and basic/supplementary/reinforced insulation separately (clauses
                  5.2.4/5.2.5, 5.3.4/5.3.5), but by default this tool uses the same (conservative) creepage table for
                  Functional as for Basic/Supplementary — see the checkbox below for an appliance-specific relaxation.
                  Reinforced creepage = 2× basic. For reinforced clearance, standards typically also require using the
                  next-higher overvoltage category as a margin — select it manually above if needed.
                </span>
                {insulationType === 'functional' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 400 }}>
                    <input type="checkbox" checked={useApplianceFunctionalAllowance} onChange={e => setUseApplianceFunctionalAllowance(e.target.checked)} style={{ width: 'auto' }} />
                    Apply IEC 60335-1 household-appliance functional-insulation allowance (smaller creepage at
                    lower voltages) — only if your product standard permits it
                  </label>
                )}
              </div>
              <div className="field">
                <label>Factor of safety (%)</label>
                <input autoComplete="off" type="number" min={0} step={5} value={safetyFactorPercent} onChange={e => setSafetyFactorPercent(Number(e.target.value))} />
                <span className="hint">Applied as a margin on top of the standard's calculated minimum distances (default 20%).</span>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Electric field condition (clearance only)</label>
                <div className="segmented">
                  <button className={fieldCondition === 'A' ? 'active' : ''} onClick={() => setFieldCondition('A')}>Inhomogeneous (Case A)</button>
                  <button className={fieldCondition === 'B' ? 'active' : ''} onClick={() => setFieldCondition('B')}>Homogeneous (Case B)</button>
                </div>
                <span className="hint">
                  Case A (IEC 60664-1 clause 5.1.3.2) can always be used, for any electrode shape, without a
                  voltage-withstand test — the safe default. Case B (clause 5.1.3.3) permits meaningfully smaller
                  clearances, but only where the geometry is specifically designed for an essentially uniform field
                  (e.g. parallel plates), and the standard requires it to be verified by an actual voltage-withstand
                  test before relying on it — don't select it just because the numbers are smaller.
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span><span className="step-num">2</span>Environment</span></div>
            <div className="field" style={{ marginBottom: '0.85rem' }}>
              <label>Pollution degree</label>
              <div className="segmented">
                {[1, 2, 3, 4].map(pd => (
                  <button key={pd} className={pollutionDegree === pd ? 'active' : ''} onClick={() => setPollutionDegree(pd as 1 | 2 | 3 | 4)}>PD{pd}</button>
                ))}
              </div>
              <span className="hint">
                PD1: no pollution (sealed/potted). PD2: normal indoor, non-conductive pollution, occasional condensation.
                PD3: conductive pollution or condensation likely. PD4: continuous conductive pollution (conductive dust,
                rain, snow) — requires enclosure/coating design rather than a simple table value; not computed below.
              </span>
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Material group</label>
                <div className="segmented">
                  {(['I', 'II', 'IIIa', 'IIIb'] as MaterialGroup[]).map(g => (
                    <button key={g} className={materialGroup === g ? 'active' : ''} onClick={() => setMaterialGroup(g)}>{g}</button>
                  ))}
                </div>
                <span className="hint">{MATERIAL_GROUP_CTI[materialGroup].label}. IIIb is the conservative default for unknown/general-purpose plastics.</span>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button className="btn small" onClick={() => setShowCtiHelper(v => !v)} style={{ marginBottom: '0.3rem' }}>
                  {showCtiHelper ? 'Hide' : 'Derive from CTI value ▾'}
                </button>
                {showCtiHelper && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input autoComplete="off" type="number" min={0} value={ctiValue} onChange={e => setCtiValue(Number(e.target.value))} />
                    <button className="btn small primary" onClick={() => setMaterialGroup(materialGroupFromCti(ctiValue))}>Use</button>
                  </div>
                )}
                <span className="hint">CTI per IEC 60112. If unknown, use Group IIIb.</span>
              </div>
            </div>
            <div className="grid grid-2" style={{ marginTop: '0.85rem' }}>
              <div className="field">
                <label>Altitude</label>
                <div className="grid grid-2">
                  <input autoComplete="off" type="number" min={0} value={altitude} onChange={e => setAltitude(Number(e.target.value))} />
                  <div className="segmented">
                    <button className={altitudeUnit === 'ft' ? 'active' : ''} onClick={() => setAltitudeUnit('ft')}>ft</button>
                    <button className={altitudeUnit === 'm' ? 'active' : ''} onClick={() => setAltitudeUnit('m')}>m</button>
                  </div>
                </div>
                <span className="hint">
                  No correction below 2000 m (6562 ft) — that is the standard's native reference condition. Correction
                  applies to clearance only; creepage (a surface-tracking property) is not altitude-dependent.
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span><span className="step-num">3</span>Your design (optional — checks pass/fail)</span></div>
            <div className="grid grid-2">
              <div className="field">
                <label>Actual clearance (mm)</label>
                <input autoComplete="off" type="number" min={0} step={0.01} value={actualClearanceMm} onChange={e => setActualClearanceMm(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Actual creepage distance (mm)</label>
                <input autoComplete="off" type="number" min={0} step={0.01} value={actualCreepageMm} onChange={e => setActualCreepageMm(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — results */}
        <div>
          <div className="card">
            <div className="card-title">Results</div>

            {overallPass !== null && (
              <div className={`status-banner ${overallPass ? 'pass' : 'fail'}`}>
                {overallPass ? '✓ Design meets minimum requirements' : '✗ Design does not meet minimum requirements'}
              </div>
            )}

            <div className="result-grid">
              <div className="result-tile">
                <div className="label">Required clearance (with margin)</div>
                <div className={`value ${clearancePass === false ? 'neg' : clearancePass === true ? 'pos' : ''}`}>
                  {fmt(clearanceWithMargin, 2)}<span className="unit">mm</span>
                </div>
                <div className="hint">base {fmt(clearanceResult.mm, 2)} mm{clearanceResult.extrapolated ? ' · extrapolated' : ''}</div>
              </div>
              <div className="result-tile">
                <div className="label">Required creepage (with margin)</div>
                <div className={`value ${creepagePass === false ? 'neg' : creepagePass === true ? 'pos' : ''}`}>
                  {pollutionDegree === 4 ? 'N/A' : fmt(creepageWithMargin ?? 0, 2)}<span className="unit">{pollutionDegree === 4 ? '' : 'mm'}</span>
                </div>
                {pollutionDegree !== 4 && <div className="hint">base {fmt(creepageResult?.mm ?? 0, 2)} mm</div>}
              </div>
              <div className="result-tile">
                <div className="label">Rated impulse voltage</div>
                <div className="value">{fmt(ratedImpulseVoltage, 0)}<span className="unit">V</span></div>
                {impulseResult.extrapolated && <div className="hint" style={{ color: 'var(--warn)' }}>Extrapolated (ratio-based)</div>}
              </div>
              <div className="result-tile">
                <div className="label">Altitude correction factor</div>
                <div className="value">{fmt(altCorrection.factor, 2)}</div>
                {altCorrection.extrapolated && <div className="hint" style={{ color: 'var(--warn)' }}>Beyond tabulated range — extrapolated</div>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span>Paschen's Law cross-check</span>
              <span className={`tag`} style={{ background: paschenPass ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: paschenPass ? 'var(--pos)' : 'var(--neg)', borderColor: 'transparent' }}>
                {paschenPass ? 'consistent' : 'check design'}
              </span>
            </div>
            <p className="note" style={{ marginBottom: '0.9rem' }}>
              First-principles physics, independent of the IEC table: air's dielectric breakdown voltage depends on
              the pressure × gap product (p·d). At {fmt(altitude, 0)} {altitudeUnit} the local pressure is{' '}
              {fmt(pressureKPa, 2)} kPa (vs {fmt(101.325, 2)} kPa at sea level) — for a {fmt(paschenGapMm, 2)} mm gap,
              p·d = {fmt(paschenPd, 3)} kPa·cm, well above the Paschen minimum ({fmt(paschenMinPd, 3)} kPa·cm),
              so breakdown voltage still falls monotonically as altitude increases — the IEC table's assumption
              holds throughout this range.
            </p>
            <div className="result-grid">
              <div className="result-tile">
                <div className="label">Breakdown voltage at this gap</div>
                <div className={`value ${paschenPass ? 'pos' : 'neg'}`}>{fmt(paschenV, 0)}<span className="unit">V</span></div>
              </div>
              <div className="result-tile">
                <div className="label">Min. gap for required voltage</div>
                <div className="value">{fmt(paschenMinGapMm, 3)}<span className="unit">mm</span></div>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <PaschenChart currentPd={paschenPd} currentV={paschenV} requiredV={ratedImpulseVoltage} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Reference &amp; assumptions</div>
            <p className="note">
              Clearance uses IEC 60664-1 Table F.2 (verified against the standard's full text), with a choice of
              Case A (inhomogeneous field, always usable) or Case B (homogeneous field, smaller clearances but
              requires geometry designed for a uniform field and verification by voltage-withstand test). Creepage uses the
              IEC 60664-1 CTI/pollution-degree methodology (subclause 2.7.1.3) as tabulated in IEC 60335-1 Table 17,
              used by default for all insulation types (Reinforced doubles it). IEC 60664-1 itself dimensions
              functional insulation separately from basic/supplementary/reinforced (clauses 5.2.4/5.2.5, 5.3.4/5.3.5),
              but its own Annex F lists a single creepage table (F.5) and this tool could not confirm from open
              sources whether it differs numerically by insulation type — so the smaller IEC 60335-1 Table 18
              household-appliance functional-insulation values are only used if explicitly opted into, not by
              default. Both Un and the resulting withstand-voltage lookup use ratio-preserving (power-law)
              interpolation/extrapolation between the standard's tabulated points, since these tables approximate a
              power law rather than a straight line. Altitude correction (IEC 60664-1 Table F.10 / Table A.2) is
              applied only to clearance — cross-checked against standard-atmosphere barometric pressure, and against
              Paschen's Law directly. Paschen's Law assumes an idealised uniform field between clean electrodes;
              real-world breakdown voltage is typically lower due to field non-uniformity, surface roughness and
              humidity — treat it as a physics sanity check, not a substitute for the standard's tested margins.
              Pollution degree 4 requires enclosure or conformal-coating design rather than a table value and is not
              computed. This tool supports engineering estimation — verify exact values against the current official
              IEC 60664-1 text, and any applicable product standard, before certification use.
            </p>
          </div>
        </div>
      </div>

      {/* CALCULATION STEPS */}
      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div className="card-title">Calculation steps</div>

        {calculationSteps.map((s, i) => (
          <div className="calc-step" key={i}>
            <div className="step-title">{i + 1}. {s.title}</div>
            <div className="step-formula">{s.formula}</div>
            {s.substitution && <div className="step-sub">{s.substitution}</div>}
            <div className="step-result">{s.result}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
