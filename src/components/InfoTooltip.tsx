import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function InfoTooltip({ children }: Props) {
  return (
    <span className="info-tip">
      <button type="button" aria-label="More information" className="info-tip-trigger">?</button>
      <span className="info-tip-bubble">{children}</span>
    </span>
  );
}
