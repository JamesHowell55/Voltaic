import { useState } from 'react';
import type { SavedCalculation } from '../lib/useSavedCalculations';

interface Props {
  saves: SavedCalculation[];
  loading: boolean;
  loggedIn: boolean;
  onSave: (label: string) => void;
  onLoad: (inputs: Record<string, unknown>) => void;
  onUpdate: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

export default function SavedCalculations({ saves, loading, loggedIn, onSave, onLoad, onUpdate, onRename, onDelete }: Props) {
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  if (!loggedIn) return null;

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    await onSave(label.trim());
    setLabel('');
    setSaving(false);
  };

  const handleRename = async (id: string) => {
    if (!editLabel.trim()) return;
    await onRename(id, editLabel.trim());
    setEditingId(null);
  };

  return (
    <div className="card">
      <div className="card-title">Saved calculations</div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: saves.length > 0 ? '0.75rem' : 0 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Save current inputs as</label>
          <input
            autoComplete="off"
            placeholder="e.g. 150 mm copper, 1 kA AC"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <button className="btn primary" disabled={saving || !label.trim()} onClick={handleSave} style={{ whiteSpace: 'nowrap' }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {loading && <p className="hint">Loading saves...</p>}

      {saves.length > 0 && (
        <table className="data-table" style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th>Saved</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {saves.map((s) => (
              <tr key={s.id}>
                <td style={{ textAlign: 'left' }}>
                  {editingId === s.id ? (
                    <span style={{ display: 'flex', gap: '0.3rem' }}>
                      <input
                        autoComplete="off"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                        style={{ fontSize: '0.8rem', flex: 1 }}
                        autoFocus
                      />
                      <button className="btn small" onClick={() => handleRename(s.id)}>OK</button>
                      <button className="btn small" onClick={() => setEditingId(null)}>Cancel</button>
                    </span>
                  ) : (
                    s.label
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                  {new Date(s.updated_at).toLocaleDateString()}
                </td>
                <td>
                  <span style={{ display: 'flex', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                    <button className="btn small" onClick={() => onLoad(s.inputs)}>Load</button>
                    <button className="btn small" onClick={() => onUpdate(s.id)}>Overwrite</button>
                    <button className="btn small" onClick={() => { setEditingId(s.id); setEditLabel(s.label); }}>Rename</button>
                    <button className="btn small" onClick={() => onDelete(s.id)}>Delete</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
