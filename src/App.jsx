import { useMemo, useState } from 'react'
import './App.css'

import Sidebar from './components/Sidebar'

import { parseUploadedFile } from './data/fileParser'
import {
  filterData,
  getUniqueValues,
} from './data/dataEngine'

import Overview from './pages/Overview'
import PPMDashboard from './pages/PPMDashboard'
import PartAnalysis from './pages/PartAnalysis'
import DefectAnalysis from './pages/DefectAnalysis'
import ProcessAnalysis from './pages/ProcessAnalysis'
import MachineAnalysis from './pages/MachineAnalysis'
import LocationAnalysis from './pages/LocationAnalysis'
import CostAnalysis from './pages/CostAnalysis'
import TrendAnalysis from './pages/TrendAnalysis'

function App() {
  const [activePage, setActivePage] =
    useState('Overview')

  const [dataSource, setDataSource] =
    useState('Customer Complaints')

  const [uploadedData, setUploadedData] =
    useState([])

  const [uploadedFileName, setUploadedFileName] =
    useState('')

  const [filters, setFilters] =
    useState({
      location: 'All Locations',
      process: 'All Processes',
      machine: 'All Machines',
      part: 'All Parts',
      defect: 'All Defects',
      startDate: null,
      endDate: null,
    })

  const handleFileUpload =
    async (file) => {
      try {
        const data =
          await parseUploadedFile(file)

        setUploadedData(data)
        setUploadedFileName(
          file.name
        )
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

  const locations = useMemo(
    () => [
      'All Locations',
      ...getUniqueValues(
        uploadedData,
        'location'
      ),
    ],
    [uploadedData]
  )

  const processes = useMemo(
    () => [
      'All Processes',
      ...getUniqueValues(
        uploadedData,
        'process'
      ),
    ],
    [uploadedData]
  )

  const machines = useMemo(
    () => [
      'All Machines',
      ...getUniqueValues(
        uploadedData,
        'machine'
      ),
    ],
    [uploadedData]
  )

  const parts = useMemo(
    () => [
      'All Parts',
      ...getUniqueValues(
        uploadedData,
        'part_no_clean'
      ),
    ],
    [uploadedData]
  )

  const defects = useMemo(
    () => [
      'All Defects',
      ...getUniqueValues(
        uploadedData,
        'defect'
      ),
    ],
    [uploadedData]
  )

  const filteredData =
    useMemo(
      () =>
        filterData(
          uploadedData,
          filters
        ),
      [uploadedData, filters]
    )

  const updateFilter = (
    name,
    value
  ) => {
    setFilters(
      (current) => ({
        ...current,
        [name]: value,
      })
    )
  }

  const renderPage = () => {
    const props = {
      data: filteredData,
    }

    switch (activePage) {
      case 'Overview':
        return <Overview {...props} />

      case 'PPM Dashboard':
        return (
          <PPMDashboard
            {...props}
          />
        )

      case 'Location Analysis':
        return (
          <LocationAnalysis
            {...props}
          />
        )

      case 'Part Analysis':
        return (
          <PartAnalysis
            {...props}
          />
        )

      case 'Defect Analysis':
        return (
          <DefectAnalysis
            {...props}
          />
        )

      case 'Process Analysis':
        return (
          <ProcessAnalysis
            {...props}
          />
        )

      case 'Machine Analysis':
        return (
          <MachineAnalysis
            {...props}
          />
        )

      case 'Cost Analysis':
        return (
          <CostAnalysis
            {...props}
          />
        )

      case 'Trend Analysis':
        return (
          <TrendAnalysis
            {...props}
          />
        )

      default:
        return <Overview {...props} />
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
        uploadedFileName={
          uploadedFileName
        }
        filters={filters}
        updateFilter={
          updateFilter
        }
        locations={locations}
        processes={processes}
        machines={machines}
        parts={parts}
        defects={defects}
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

            <select
              value={
                filters.location
              }
              onChange={(event) =>
                updateFilter(
                  'location',
                  event.target.value
                )
              }
            >
              {locations.map(
                (location) => (
                  <option
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="control">
            <label>Date Range</label>

            <div className="date-controls">
              <input
                type="date"
                value={
                  filters.startDate ||
                  ''
                }
                onChange={(event) =>
                  updateFilter(
                    'startDate',
                    event.target.value ||
                      null
                  )
                }
              />

              <span>to</span>

              <input
                type="date"
                value={
                  filters.endDate ||
                  ''
                }
                onChange={(event) =>
                  updateFilter(
                    'endDate',
                    event.target.value ||
                      null
                  )
                }
              />
            </div>
          </div>
        </div>

        {filteredData.length === 0 &&
        uploadedData.length > 0 ? (
          <div className="dashboard-card empty-state">
            <h2>
              No rows match the current filters
            </h2>

            <p>
              Expand the date range or clear
              one or more filters.
            </p>
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  )
}

export default App