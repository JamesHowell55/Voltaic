import { useMemo, useState } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { exportReportToPdf, type ReportSection, type ReportRow, type CalcStepData } from '../lib/pdfExport';
import { useBranding } from '../lib/useBranding';
import PremiumGate from '../components/PremiumGate';
import InfoTooltip from '../components/InfoTooltip';
import HarnessSchematicDiagram from '../components/HarnessSchematicDiagram';
import { renderHarnessSchematicSvg } from '../lib/pdfDiagrams';
import {
  D38999_SHELL_SIZES, CONTACT_SIZE_SPECS, CONNECTOR_TYPES, FINISH_OPTIONS, getConnectorType, getFinish,
  availableContactSizes, type ContactSize,
} from '../lib/connectorLibrary';
import {
  makeDefaultConnector, validatePinCount, setPinDestination, setTwistedPartner, maxPinCountFor,
  type ConnectorSpec, type Destination, type PinSpec,
} from '../lib/harnessDesignerLogic';
import { buildSchematicLayout } from '../lib/harnessSchematicLayout';
import { WIRE_CONSTRUCTIONS, getWireConstruction, type WireCategory } from '../lib/harnessWireTypes';

const TWISTABLE_CATEGORIES: WireCategory[] = ['twistedPair', 'twistedShieldedPair', 'canBus'];
function isTwistable(constructionId: string): boolean {
  return TWISTABLE_CATEGORIES.includes(getWireConstruction(constructionId).category);
}

function destValue(d: Destination): string {
  if (d.kind === 'unused') return 'unused';
  if (d.kind === 'ground') return 'ground';
  return `${d.connectorId}:${d.pin}`;
}

/** A destination pin already claimed by some OTHER pin (not the one whose
 *  dropdown we're rendering) — used to visually dim already-taken options
 *  without blocking the user from re-picking them (setPinDestination already
 *  handles "stealing" a taken pin cleanly). */
function isPinTaken(candidate: PinSpec, editingConnectorId: string, editingPin: number): boolean {
  return candidate.destination.kind === 'pin'
    && !(candidate.destination.connectorId === editingConnectorId && candidate.destination.pin === editingPin);
}

let nextConnectorId = 3;

export default function HarnessDesigner() {
  const { accentHex } = useTheme();
  const branding = useBranding();

  const [connectors, setConnectors] = useState<ConnectorSpec[]>([
    makeDefaultConnector('c1', 'SK1', 17, '16'),
    makeDefaultConnector('c2', 'SK2', 17, '16'),
  ]);
  const [activeId, setActiveId] = useState('c1');
  const active = connectors.find((c) => c.id === activeId) ?? connectors[0];

  const addConnector = () => {
    const id = `c${nextConnectorId++}`;
    const conn = makeDefaultConnector(id, `SK${connectors.length + 1}`, 17, '16');
    setConnectors((cs) => [...cs, conn]);
    setActiveId(id);
  };
  const removeConnector = (id: string) => {
    setConnectors((cs) => {
      const remaining = cs.filter((c) => c.id !== id);
      return remaining.map((c) => ({
        ...c,
        pins: c.pins.map((p) => (p.destination.kind === 'pin' && p.destination.connectorId === id ? { ...p, destination: { kind: 'unused' as const } } : p)),
      }));
    });
    if (activeId === id) {
      const remaining = connectors.filter((c) => c.id !== id);
      setActiveId(remaining[0]?.id ?? '');
    }
  };

  const updateConnectorSpec = (id: string, patch: Partial<Pick<ConnectorSpec, 'name' | 'shellSize' | 'contactSize' | 'connectorTypeId' | 'finishId'>>) => {
    setConnectors((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const next: ConnectorSpec = { ...c, ...patch };
      if (patch.shellSize !== undefined || patch.contactSize !== undefined) {
        const validSizes = availableContactSizes(next.shellSize);
        if (!validSizes.includes(next.contactSize)) next.contactSize = validSizes[0];
        const max = maxPinCountFor(next);
        if (next.pins.length > max) next.pins = next.pins.slice(0, max);
        const allowedAwg = CONTACT_SIZE_SPECS[next.contactSize].awgRange;
        next.pins = next.pins.map((p) => (allowedAwg.includes(p.awg) ? p : { ...p, awg: allowedAwg[0] }));
      }
      return next;
    }));
  };

  const setPinCount = (id: string, count: number) => {
    setConnectors((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const max = maxPinCountFor(c);
      const target = Math.max(1, Math.min(Math.round(count), max));
      if (target === c.pins.length) return c;
      if (target < c.pins.length) return { ...c, pins: c.pins.slice(0, target) };
      const awg = CONTACT_SIZE_SPECS[c.contactSize].awgRange[0];
      const newPins = [...c.pins];
      for (let i = c.pins.length; i < target; i++) {
        newPins.push({ pin: i + 1, signalName: `SIG${i + 1}`, constructionId: 'm22759-32', awg, destination: { kind: 'unused' } });
      }
      return { ...c, pins: newPins };
    }));
  };

  const updatePin = (connectorId: string, pin: number, patch: Partial<{ signalName: string; constructionId: string; awg: number }>) => {
    setConnectors((cs) => cs.map((c) => (c.id === connectorId ? { ...c, pins: c.pins.map((p) => (p.pin === pin ? { ...p, ...patch } : p)) } : c)));
  };

  const updatePinDestination = (connectorId: string, pin: number, destination: Destination) => {
    setConnectors((cs) => setPinDestination(cs, connectorId, pin, destination));
  };

  const updateTwistedPartner = (connectorId: string, pin: number, partnerPin: number | null) => {
    setConnectors((cs) => setTwistedPartner(cs, connectorId, pin, partnerPin));
  };

  const pinCountValidations = useMemo(() => connectors.map((c) => ({ id: c.id, name: c.name, ...validatePinCount(c) })), [connectors]);
  const layout = useMemo(() => buildSchematicLayout(connectors), [connectors]);
  const overallPass = pinCountValidations.every((v) => v.valid);

  const calculationSteps: CalcStepData[] = useMemo(() => [
    {
      title: 'Pin budget per connector',
      formula: 'used pins ≤ max contacts for the selected shell size + contact size (real MIL-DTL-38999 Series III single-size insert arrangement)',
      substitution: pinCountValidations.map((v) => `${v.name}: ${v.used}/${v.max}`).join(', '),
      result: pinCountValidations.every((v) => v.valid) ? 'All connectors within their pin budget' : 'One or more connectors exceed their pin budget',
    },
    {
      title: 'Net extraction',
      formula: 'Every pin\'s destination (Unused / Ground / another connector\'s pin) is walked into a deduplicated net list; wiring is strictly one-to-one point-to-point (no multi-drop splices in this tool)',
      substitution: `${connectors.length} connector(s), ${connectors.reduce((a, c) => a + c.pins.length, 0)} total pins`,
      result: `${layout.wires.length} pin-to-pin net(s), ${layout.grounds.length} ground connection(s)`,
    },
  ], [pinCountValidations, connectors, layout]);

  const inputSections: ReportSection[] = useMemo(() => connectors.map((c) => {
    const rows: ReportRow[] = [
      { label: 'Shell size / type', value: `${c.shellSize} (${D38999_SHELL_SIZES.find((s) => s.shellSize === c.shellSize)?.militaryLetter}) · ${getConnectorType(c.connectorTypeId).label}` },
      { label: 'Contact size', value: `#${c.contactSize} (${CONTACT_SIZE_SPECS[c.contactSize].currentRatingA} A rated)` },
      { label: 'Finish / salt spray', value: `${getFinish(c.finishId).label} — ${getFinish(c.finishId).saltSprayHours} h` },
      { label: 'Pin utilization', value: `${c.pins.length}/${maxPinCountFor(c)}` },
      ...c.pins.map((p): ReportRow => ({
        label: `Pin ${p.pin} — ${p.signalName}`,
        value: `${p.awg} AWG ${getWireConstruction(p.constructionId).label}${p.twistedWithPin != null ? ` (twisted w/ pin ${p.twistedWithPin})` : ''} → ${p.destination.kind === 'unused' ? 'Unused' : p.destination.kind === 'ground' ? 'Ground/chassis' : `${connectors.find((o) => o.id === p.destination.connectorId)?.name ?? '?'} pin ${p.destination.pin}`}`,
      })),
    ];
    return { heading: `Connector ${c.name}`, rows };
  }), [connectors]);

  const outputSections: ReportSection[] = useMemo(() => [
    {
      heading: 'Validation summary',
      rows: [
        ...pinCountValidations.map((v): ReportRow => ({ label: `${v.name} pin budget`, value: `${v.used}/${v.max} — ${v.valid ? 'OK' : 'EXCEEDS BUDGET'}` })),
        { label: 'Nets', value: `${layout.wires.length} pin-to-pin, ${layout.grounds.length} ground` },
      ],
    },
  ], [pinCountValidations, layout]);

  const handleExportPdf = () => {
    exportReportToPdf({
      tabName: 'Harness_Designer',
      pageTitle: 'Harness Designer',
      accentHex,
      passStatus: { pass: overallPass, label: overallPass ? 'All connectors within pin budget' : 'One or more connectors exceed pin budget — review' },
      inputSections,
      outputSections,
      calculationSteps,
      diagrams: [
        { title: 'Wiring schematic', svgMarkup: renderHarnessSchematicSvg(layout, accentHex) },
      ],
      disclaimer: 'Engineering design tool for MIL-DTL-38999 Series III connector pinouts. Shell-size pin-count limits and contact-size current ratings are sourced from a real MIL-DTL-38999 Series III cross-reference catalog; this tool scopes to a single dominant contact size per connector and strictly one-to-one point-to-point wiring (no multi-drop splices). The generated schematic is a point-to-point wiring diagram (connectors as labelled boxes with numbered pins), not a to-scale connector face/pin-arrangement drawing — verify final pin arrangement against the manufacturer\'s insert arrangement drawing before cutting a harness.',
      ...branding,
    });
  };

  if (!active) return null;
  const otherConnectors = connectors.filter((c) => c.id !== active.id);
  const activeMax = maxPinCountFor(active);

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <div className="eyebrow">● Harness Designer</div>
          <h1>Harness Designer</h1>
          <p>
            MIL-DTL-38999 Series III connector selection, per-pin wire assignment across multiple branches, and
            an auto-generated point-to-point wiring schematic with connector naming, pin numbers, and wire specs.
          </p>
        </div>
        <PremiumGate feature="PDF export">
          <button className="btn primary" style={{ whiteSpace: 'nowrap' }} onClick={handleExportPdf}>Export PDF</button>
        </PremiumGate>
      </div>

      <div className="card">
        <div className="card-title">
          <span><span className="step-num">1</span>Connectors</span>
          <button className="btn small" onClick={addConnector} disabled={connectors.length >= 8}>+ Add connector</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {connectors.map((c) => {
            const v = pinCountValidations.find((x) => x.id === c.id)!;
            return (
              <button
                key={c.id}
                className={c.id === activeId ? 'active' : ''}
                onClick={() => setActiveId(c.id)}
                style={{
                  padding: '0.5rem 0.9rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  border: c.id === activeId ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: c.id === activeId ? 'var(--accent-glow)' : 'var(--bg-input)',
                  color: v.valid ? 'var(--text)' : 'var(--warn)',
                }}
              >
                {c.name} ({v.used}/{v.max})
              </button>
            );
          })}
        </div>
      </div>

      <div className="two-col">
        {/* LEFT COLUMN — connector settings + pinout */}
        <div>
          <div className="card">
            <div className="card-title">
              <span><span className="step-num">2</span>{active.name} settings</span>
              <button className="btn small" onClick={() => removeConnector(active.id)} disabled={connectors.length <= 1}>Remove connector</button>
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Connector name</label>
                <input autoComplete="off" value={active.name} onChange={(e) => updateConnectorSpec(active.id, { name: e.target.value })} />
              </div>
              <div className="field">
                <label>Connector type</label>
                <select value={active.connectorTypeId} onChange={(e) => updateConnectorSpec(active.id, { connectorTypeId: e.target.value })}>
                  {CONNECTOR_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>
                  Shell size (MIL-DTL-38999 III)
                  <InfoTooltip>Shell size sets the maximum number of contacts of a given size — a real single-contact-size MIL-DTL-38999 Series III insert arrangement, e.g. shell 17 holds up to 55×#22D or 26×#20 or 8×#16 or 6×#12.</InfoTooltip>
                </label>
                <select value={active.shellSize} onChange={(e) => updateConnectorSpec(active.id, { shellSize: Number(e.target.value) })}>
                  {D38999_SHELL_SIZES.map((s) => (
                    <option key={s.shellSize} value={s.shellSize}>Shell {s.shellSize} ({s.militaryLetter})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Contact size</label>
                <select value={active.contactSize} onChange={(e) => updateConnectorSpec(active.id, { contactSize: e.target.value as ContactSize })}>
                  {availableContactSizes(active.shellSize).map((size) => (
                    <option key={size} value={size}>#{size} ({CONTACT_SIZE_SPECS[size].currentRatingA} A, {CONTACT_SIZE_SPECS[size].awgRange.join('/')} AWG)</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>
                  Finish / salt spray
                  <InfoTooltip>W and Z finishes are both qualified to 500 h salt spray (Z is a RoHS-compliant alternative to cadmium); K (passivated stainless) reaches 1000 h; N (electroless nickel) is lower at 48 h.</InfoTooltip>
                </label>
                <select value={active.finishId} onChange={(e) => updateConnectorSpec(active.id, { finishId: e.target.value })}>
                  {FINISH_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label} — {f.saltSprayHours}h</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Pin count</label>
                <input autoComplete="off" type="number" min={1} max={activeMax} value={active.pins.length} onChange={(e) => setPinCount(active.id, Number(e.target.value))} />
                <span className="hint">max {activeMax} for this shell/contact combination</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">{active.name} pinout</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr><th>Pin</th><th>Signal</th><th>Wire</th><th>AWG</th><th>Twisted w/</th><th>Destination</th></tr>
                </thead>
                <tbody>
                  {active.pins.map((p) => {
                    const twistable = isTwistable(p.constructionId);
                    const twistCandidates = active.pins.filter((op) => op.pin !== p.pin && isTwistable(op.constructionId));
                    return (
                    <tr key={p.pin}>
                      <td>{p.pin}</td>
                      <td><input autoComplete="off" value={p.signalName} onChange={(e) => updatePin(active.id, p.pin, { signalName: e.target.value })} style={{ width: '90px', fontSize: '0.78rem' }} /></td>
                      <td>
                        <select value={p.constructionId} onChange={(e) => updatePin(active.id, p.pin, { constructionId: e.target.value })} style={{ fontSize: '0.75rem' }}>
                          {WIRE_CONSTRUCTIONS.map((w) => (
                            <option key={w.id} value={w.id}>{w.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select value={p.awg} onChange={(e) => updatePin(active.id, p.pin, { awg: Number(e.target.value) })} style={{ fontSize: '0.75rem' }}>
                          {CONTACT_SIZE_SPECS[active.contactSize].awgRange.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {twistable ? (
                          <select
                            value={p.twistedWithPin ?? ''}
                            onChange={(e) => updateTwistedPartner(active.id, p.pin, e.target.value === '' ? null : Number(e.target.value))}
                            style={{ fontSize: '0.75rem' }}
                          >
                            <option value="">None</option>
                            {twistCandidates.map((op) => (
                              <option key={op.pin} value={op.pin}>Pin {op.pin} ({op.signalName})</option>
                            ))}
                          </select>
                        ) : (
                          <span className="hint" title="Only available when this pin's wire construction is a twisted-pair category">—</span>
                        )}
                      </td>
                      <td>
                        <select value={destValue(p.destination)} onChange={(e) => {
                          const v = e.target.value;
                          if (v === 'unused') updatePinDestination(active.id, p.pin, { kind: 'unused' });
                          else if (v === 'ground') updatePinDestination(active.id, p.pin, { kind: 'ground' });
                          else {
                            const [cid, pinStr] = v.split(':');
                            updatePinDestination(active.id, p.pin, { kind: 'pin', connectorId: cid, pin: Number(pinStr) });
                          }
                        }} style={{ fontSize: '0.75rem' }}>
                          <option value="unused">Unused</option>
                          <option value="ground">Ground / chassis</option>
                          {otherConnectors.map((oc) => (
                            <optgroup key={oc.id} label={oc.name}>
                              {oc.pins.map((op) => {
                                const taken = isPinTaken(op, active.id, p.pin);
                                return (
                                  <option key={op.pin} value={`${oc.id}:${op.pin}`} style={taken ? { color: 'var(--text-faint)' } : undefined}>
                                    {oc.name} pin {op.pin} ({op.signalName}){taken ? ' — in use' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — results */}
        <div>
          <div className="card">
            <div className="card-title">Results</div>
            <div className={`status-banner ${overallPass ? 'pass' : 'fail'}`}>
              {overallPass ? '✓ All connectors within pin budget' : '✗ One or more connectors exceed their pin budget — review below'}
            </div>
            <div className="result-grid">
              {pinCountValidations.map((v) => (
                <div className="result-tile" key={v.id}>
                  <div className="label">{v.name} pin utilization</div>
                  <div className={`value ${v.valid ? 'pos' : 'neg'}`}>{v.used}/{v.max}</div>
                </div>
              ))}
              <div className="result-tile">
                <div className="label">Nets</div>
                <div className="value">{layout.wires.length + layout.grounds.length}</div>
                <div className="hint">{layout.wires.length} pin-to-pin, {layout.grounds.length} ground</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Reference &amp; assumptions</div>
            <p className="note">
              Shell-size pin-count limits and contact-size current ratings are sourced from a real MIL-DTL-38999
              Series III cross-reference catalog. Scope: one dominant contact size per connector (matches sizing
              by pin count/wire gauge, not a mixed-size insert arrangement), and strictly one-to-one
              point-to-point pin wiring — no multi-drop splices. The schematic is a point-to-point wiring diagram
              (labelled connector boxes with numbered pins), not a to-scale connector face/pin-arrangement
              drawing — verify final pin arrangement against the manufacturer's insert arrangement drawing.
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div className="card-title">Wiring schematic</div>
        <HarnessSchematicDiagram layout={layout} />
      </div>

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
