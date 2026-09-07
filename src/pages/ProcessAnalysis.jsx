import PlotlyChart from '../components/PlotlyChart'
import {
  groupAndSum,
} from '../data/dataEngine'

function ProcessAnalysis({ data = [] }) {
  const processes =
    groupAndSum(
      data,
      'process',
      'rejection quantity'
    )
      .filter((row) => row.name)
      .slice(0, 15)

  const locations = [
    ...new Set(
      data
        .map((row) => row.location)
        .filter(Boolean)
    ),
  ]

  const grouped = []

  locations.forEach(
    (location) => {
      const locationRows =
        data.filter(
          (row) =>
            row.location ===
            location
        )

      const processRows =
        groupAndSum(
          locationRows,
          'process',
          'rejection quantity'
        ).slice(0, 5)

      processRows.forEach(
        (row) => {
          grouped.push({
            process: row.name,
            location,
            value: row.value,
          })
        }
      )
    }
  )

  const processChart = [
    {
      x: processes.map(
        (row) => row.value
      ),
      y: processes.map(
        (row) => row.name
      ),
      type: 'bar',
      orientation: 'h',
      hovertemplate:
        '<b>%{y}</b>' +
        '<br>Rejections: %{x:,.0f}' +
        '<extra></extra>',
    },
  ]

  const locationNames = [
    ...new Set(
      grouped.map(
        (row) => row.location
      )
    ),
  ]

  const processNames = [
    ...new Set(
      grouped.map(
        (row) => row.process
      )
    ),
  ]

  const series =
    locationNames.map(
      (location) => ({
        x: processNames,
        y: processNames.map(
          (process) => {
            const found =
              grouped.find(
                (row) =>
                  row.location ===
                    location &&
                  row.process ===
                    process
              )

            return found
              ? found.value
              : 0
          }
        ),
        type: 'bar',
        name: location,
      })
    )

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <h2>Process Analysis</h2>
        <p>
          Process-level rejection analysis
        </p>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>Rejections by Process</h3>
        </div>

        <PlotlyChart
          data={processChart}
          layout={{
            height: 500,
            xaxis: {
              title:
                'Rejection Quantity',
              tickformat: ',.0f',
            },
            yaxis: {
              title: 'Process',
            },
            showlegend: false,
          }}
        />
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>
            Top Processes by Location
          </h3>
        </div>

        <PlotlyChart
          data={series}
          layout={{
            height: 500,
            barmode: 'group',
            xaxis: {
              title: 'Process',
            },
            yaxis: {
              title:
                'Rejection Quantity',
              tickformat: ',.0f',
            },
          }}
        />
      </div>
    </section>
  )
}

export default ProcessAnalysis