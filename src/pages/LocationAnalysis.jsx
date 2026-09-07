import PlotlyChart from '../components/PlotlyChart'
import {
  groupAndSum,
  monthlySummary,
} from '../data/dataEngine'

function LocationAnalysis({ data = [] }) {
  const locations =
    groupAndSum(
      data,
      'location',
      'rejection quantity'
    ).filter(
      (row) => row.name
    )

  const monthly =
    monthlySummary(data)

  const locationChart = [
    {
      x: locations.map(
        (row) => row.name
      ),
      y: locations.map(
        (row) => row.value
      ),
      type: 'bar',
      hovertemplate:
        '<b>%{x}</b>' +
        '<br>Rejections: %{y:,.0f}' +
        '<extra></extra>',
    },
  ]

  const locationNames = [
    ...new Set(
      monthly.map(
        (row) => row.location
      )
    ),
  ]

  const trendSeries =
    locationNames.map(
      (location) => {
        const rows =
          monthly.filter(
            (row) =>
              row.location ===
              location
          )

        return {
          x: rows.map(
            (row) =>
              row.month_start
          ),
          y: rows.map(
            (row) =>
              row[
                'rejection quantity'
              ]
          ),
          type: 'scatter',
          mode: 'lines+markers',
          name: location,
        }
      }
    )

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <h2>Location Analysis</h2>
        <p>
          Location-level rejection trends
        </p>
      </div>

      <div className="chart-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              Rejections by Location
            </h3>
          </div>

          <PlotlyChart
            data={locationChart}
            layout={{
              height: 400,
              xaxis: {
                title: 'Location',
              },
              yaxis: {
                title:
                  'Rejection Quantity',
                tickformat: ',.0f',
              },
              showlegend: false,
            }}
          />
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Location-wise Trend</h3>
          </div>

          <PlotlyChart
            data={trendSeries}
            layout={{
              height: 400,
              xaxis: {
                title: 'Month',
                type: 'date',
              },
              yaxis: {
                title:
                  'Rejection Quantity',
                tickformat: ',.0f',
              },
            }}
          />
        </div>
      </div>
    </section>
  )
}

export default LocationAnalysis