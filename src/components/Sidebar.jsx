import { useRef } from 'react'

function Sidebar({
  activePage,
  setActivePage,
  dataSource,
  setDataSource,
  onFileUpload,
  uploadedFileName,
  filters,
  updateFilter,
  locations,
  processes,
  machines,
  parts,
  defects,
}) {
  const fileInputRef =
    useRef(null)

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

  const handleUploadClick =
    () => {
      fileInputRef.current?.click()
    }

  const handleFileChange =
    (event) => {
      const file =
        event.target.files?.[0]

      if (file) {
        onFileUpload(file)
      }

      event.target.value = ''
    }

  const renderFilter = (
    label,
    name,
    values
  ) => (
    <div className="sidebar-filter">
      <label>{label}</label>

      <select
        value={filters[name]}
        onChange={(event) =>
          updateFilter(
            name,
            event.target.value
          )
        }
      >
        {values.map((value) => (
          <option
            key={value}
            value={value}
          >
            {value}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">
          InsightEdge
        </div>

        <div className="brand-subtitle">
          Quality Intelligence
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          Data Source
        </div>

        <button
          className={`sidebar-option ${
            dataSource ===
            'Customer Complaints'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setDataSource(
              'Customer Complaints'
            )
          }
        >
          Customer Complaints
        </button>

        <button
          className={`sidebar-option ${
            dataSource ===
            'Internal Rejection'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setDataSource(
              'Internal Rejection'
            )
          }
        >
          Internal Rejection
        </button>

        <button
          className={`sidebar-option ${
            dataSource === 'Upload'
              ? 'active'
              : ''
          }`}
          onClick={
            handleUploadClick
          }
        >
          Upload
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={
            handleFileChange
          }
          style={{
            display: 'none',
          }}
        />

        {uploadedFileName && (
          <div className="uploaded-file-name">
            {uploadedFileName}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          Navigation
        </div>

        {navigationItems.map(
          ([icon, page]) => (
            <button
              key={page}
              className={`nav-item ${
                activePage === page
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setActivePage(page)
              }
            >
              {icon} {page}
            </button>
          )
        )}
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          Dashboard Filters
        </div>

        {renderFilter(
          'Process',
          'process',
          processes
        )}

        {renderFilter(
          'Machine',
          'machine',
          machines
        )}

        {renderFilter(
          'Part',
          'part',
          parts
        )}

        {renderFilter(
          'Defect',
          'defect',
          defects
        )}
      </div>
    </aside>
  )
}

export default Sidebar