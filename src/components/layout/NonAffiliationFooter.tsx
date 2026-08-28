/**
 * NonAffiliationFooter.tsx — Mandatory non-affiliation footer (§33, §32)
 * "Persistent, unobtrusive footer on every screen."
 */
import React from 'react';

const NonAffiliationFooter: React.FC = () => (
  <footer
    className="non-affiliation-footer"
    role="contentinfo"
    aria-label="Non-affiliation disclaimer"
  >
    <span>
      Independent hackathon concept prototype — not affiliated with or endorsed by Indian Railways or IRCTC.
    </span>
    <span className="footer-sep">·</span>
    <span>RailSaathi v0.1 · Build India Hackathon 2026</span>
  </footer>
);

export default NonAffiliationFooter;
