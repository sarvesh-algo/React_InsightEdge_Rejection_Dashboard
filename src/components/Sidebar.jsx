function Sidebar({ activePage, setActivePage }) {
  const navigationItems = [
    ['🏠', 'Overview'],
    ['📊', 'PPM Dashboard'],
    ['📍', 'Location Analysis'],
    ['📦', 'Part Analysis'],
    ['❌', 'Defect Analysis'],
    ['⚙️', 'Process Analysis'],
    ['🏭', 'Machine Analysis'],
    ['💰', 'Cost Analysis'],
    ['📈', 'Trend Analysis'],
  ]

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">InsightEdge</div>
        <div className="brand-subtitle">
          Quality Intelligence
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">Data Source</div>

        <button className="sidebar-option active">
          Customer Complaints
        </button>

        <button className="sidebar-option">
          Internal Rejection
        </button>

        <button className="sidebar-option">
          Upload
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-title">Navigation</div>

        {navigationItems.map(([icon, page]) => (
          <button
            key={page}
            className={`nav-item ${
              activePage === page ? 'active' : ''
            }`}
            onClick={() => setActivePage(page)}
          >
            {icon} {page}
          </button>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          Dashboard Filters
        </div>

        <div className="filter-placeholder">Process</div>
        <div className="filter-placeholder">Machine</div>
        <div className="filter-placeholder">Part</div>
        <div className="filter-placeholder">Defect</div>
      </div>
    </aside>
  )
}

export default Sidebar