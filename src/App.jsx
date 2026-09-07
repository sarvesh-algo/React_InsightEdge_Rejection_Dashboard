import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import { parseUploadedFile } from './data/fileParser'
import { runPPMValidation } from './data/ppmTest'
import Overview from './pages/Overview'

function App() {
  const [activePage, setActivePage] = useState('Overview')

  const [dataSource, setDataSource] = useState(
    'Customer Complaints'
  )

  const [uploadedData, setUploadedData] =
    useState([])

  const [uploadedFileName, setUploadedFileName] =
    useState('')

  const handleFileUpload = async (file) => {
    try {
      const data = await parseUploadedFile(file)

      const validation =
        runPPMValidation(data)

      console.log(
        'PPM VALIDATION:',
        validation
      )

      setUploadedData(data)
      setUploadedFileName(file.name)
      setDataSource('Upload')

      console.log(
        `Loaded ${data.length} rows from ${file.name}`
      )
    } catch (error) {
      console.error(
        'File upload failed:',
        error
      )

      alert(
        error.message ||
          'Unable to process the uploaded file.'
      )
    }
  }

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        dataSource={dataSource}
        setDataSource={setDataSource}
        onFileUpload={handleFileUpload}
        uploadedFileName={uploadedFileName}
      />

      <main className="main-content">
        <header className="top-header">
          <div>
            <h1>
              InsightEdge Quality Intelligence
            </h1>

            <p>
              Real-time quality, rejection and PPM
              performance
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

        {activePage === 'Overview' ? (
          <Overview
            data={uploadedData}
          />
        ) : (
          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h2>{activePage}</h2>

                <p>
                  PPM performance analysis
                </p>
              </div>
            </div>

            <div className="empty-dashboard">
              <div className="empty-title">
                {activePage} Selected
              </div>

              <div className="empty-text">
                {uploadedData.length > 0
                  ? `${uploadedData.length} rows loaded from ${uploadedFileName}`
                  : 'This page will be migrated from the existing Streamlit dashboard.'}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App