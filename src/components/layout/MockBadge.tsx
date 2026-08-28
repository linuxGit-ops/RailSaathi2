/**
 * MockBadge.tsx — "Sample data" / "Demo gateway" badge (§33)
 * Dotted-outline, small, always-visible on mocked screens.
 * "A deliberate design element, not a debug watermark slapped on top."
 */
import React from 'react';

interface MockBadgeProps {
  label?: string;
  style?: React.CSSProperties;
}

export const MockBadge: React.FC<MockBadgeProps> = ({
  label = 'Sample data',
  style,
}) => (
  <span
    className="badge badge-mock"
    style={style}
    title="This data is simulated for demo purposes — not real railway data"
    aria-label={`Indicator: ${label} — simulated for demonstration`}
  >
    ⬡ {label}
  </span>
);

export default MockBadge;
