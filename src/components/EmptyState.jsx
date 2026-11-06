const HIGHLIGHTS = [
  {
    icon: '⏱',
    title: 'Local Time Preservation',
    desc: 'Departure times are kept in origin-local time for exact matching.',
  },
  {
    icon: '⚖',
    title: 'Cargo Rollover Protection',
    desc: 'Loads >30,000 lbs trigger earlier wind warnings for vehicle safety.',
  },
  {
    icon: '🛡',
    title: 'No Travel Screening',
    desc: 'Routes crossing extreme hazards are flagged immediately.',
  },
];

export default function EmptyState() {
  return (
    <div className="placeholder-state">
      <div className="placeholder-icon-wrap" aria-hidden="true">🚛</div>
      <h3 className="placeholder-title">Ready to Plan Your Trip</h3>
      <p className="placeholder-text">
        Fill in your trip details on the left and click <strong>Analyze My Route</strong>. We will check road conditions, identify high-wind rollover risks, and display the safest eligible route.
      </p>

      <div className="placeholder-cards-grid">
        {HIGHLIGHTS.map(({ icon, title, desc }) => (
          <div key={title} className="info-card">
            <span className="info-icon" aria-hidden="true">{icon}</span>
            <span className="info-title">{title}</span>
            <span className="info-desc">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
