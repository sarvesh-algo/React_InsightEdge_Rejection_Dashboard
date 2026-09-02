import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'

function App() {
  const [activePage, setActivePage] = useState('Overview')

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">
        <header className="top-header">
          <div>
            <h1>InsightEdge Quality Intelligence</h1>
            <p>
              Real-time quality, rejection and PPM performance
            </p>
          </div>

          <div className="header-label">
            Executive Quality Dashboard
          </div>
        </header>

        <div className="top-controls">
          <div className="control">
            <label>Location</label>
            <div className="select-placeholder">
              All Locations
            </div>
          </div>

          <div className="control">
            <label>Date Range</label>
            <div className="select-placeholder">
              All Dates
            </div>
          </div>
        </div>

        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>{activePage}</h2>
              <p>
                {activePage === 'Overview'
                  ? 'Quality performance overview'
                  : 'PPM performance analysis'}
              </p>
            </div>
          </div>

          <div className="empty-dashboard">
            <div className="empty-title">
              {activePage} Selected
            </div>

            <div className="empty-text">
              This page will be migrated from the existing
              Streamlit dashboard.
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App