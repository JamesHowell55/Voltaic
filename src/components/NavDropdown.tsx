import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { NavCategory } from '../lib/navCategories';

interface Props {
  category: NavCategory;
}

export default function NavDropdown({ category }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="nav-dropdown" ref={panelRef}>
      <button type="button" className={`nav-dropdown-trigger ${open ? 'active' : ''}`} onClick={() => setOpen((v) => !v)}>
        {category.label} <span className="nav-dropdown-caret">▾</span>
      </button>
      {open && (
        <div className="nav-dropdown-panel">
          {category.links.map((link) => (
            <NavLink key={link.path} to={link.path} className="nav-dropdown-link" onClick={() => setOpen(false)}>
              {link.label}
              {!link.available && <span className="tag" style={{ marginLeft: '0.5rem' }}>Soon</span>}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
