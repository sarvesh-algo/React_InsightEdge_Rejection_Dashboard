import PlotlyChart from '../components/PlotlyChart'
import {
  monthlyTotals,
  aggregatePPM,
  monthlySummary,
} from '../data/dataEngine'

const TARGET_PPM = 20000

function TrendAnalysis({ data = [] }) {
  const monthly =
    monthlyTotals(data)

  const monthlyPPM =
    aggregatePPM(
      data,
      ['month_start']
    )

  const locationMonthly =
    monthlySummary(data)

  const rejectionChart = [
    {
      x: monthly.map(
        (row) => row.month_start
      ),
      y: monthly.map(
        (row) =>
          row[
            'rejection quantity'
          ]
      ),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Rejections',
    },
  ]

  const ppmChart = [
    {
      x: monthlyPPM.map(
        (row) => row.month_start
      ),
      y: monthlyPPM.map(
        (row) => row.ppm
      ),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'PPM',
    },
    {
      x: monthlyPPM.map(
        (row) => row.month_start
      ),
      y: monthlyPPM.map(
        () => TARGET_PPM
      ),
      type: 'scatter',
      mode: 'lines',
      name: 'Target',
      line: {
        dash: 'dash',
      },
    },
  ]

  const locations = [
    ...new Set(
      locationMonthly.map(
        (row) => row.location
      )
    ),
  ]

  const shareSeries =
    locations.map(
      (location) => {
        const values =
          locationMonthly.map(
            (monthRow) => {
              const monthRows =
                locationMonthly.filter(
                  (row) =>
                    row.month_start.getTime() ===
                    monthRow.month_start.getTime()
                )

              const total =
                monthRows.reduce(
                  (sum, row) =>
                    sum +
                    row[
                      'rejection quantity'
                    ],
                  0
                )

              const locationValue =
                monthRows.find(
                  (row) =>
                    row.location ===
                    location
                )?.[
                  'rejection quantity'
                ] || 0

              return total > 0
                ? (
                    locationValue /
                    total
                  ) * 100
                : 0
            }
          )

        return {
          x: locationMonthly
            .filter(
              (row, index) =>
                locationMonthly.findIndex(
                  (item) =>
                    item.month_start.getTime() ===
                    row.month_start.getTime()
                ) === index
            )
            .map(
              (row) =>
                row.month_start
            ),
          y: values.filter(
            (_, index) =>
              locationMonthly.findIndex(
                (item) =>
                  item.month_start.getTime() ===
                  locationMonthly[index].month_start.getTime()
              ) === index
          ),
          type: 'scatter',
          mode: 'lines',
          stackgroup: 'one',
          name: location,
        }
      }
    )

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <h2>Trend Analysis</h2>
        <p>
          Monthly rejection, PPM and location contribution trends
        </p>
      </div>

      <div className="chart-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              Monthly Rejection Trend
            </h3>
          </div>

          <PlotlyChart
            data={rejectionChart}
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
              showlegend: false,
            }}
          />
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              Monthly PPM Trend
            </h3>
          </div>

          <PlotlyChart
            data={ppmChart}
            layout={{
              height: 400,
              xaxis: {
                title: 'Month',
                type: 'date',
              },
              yaxis: {
                title: 'PPM',
                tickformat: ',.0f',
              },
            }}
          />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>
            Monthly Location Contribution %
          </h3>
        </div>

        <PlotlyChart
          data={shareSeries}
          layout={{
            height: 420,
            barmode: 'stack',
            xaxis: {
              title: 'Month',
              type: 'date',
            },
            yaxis: {
              title:
                'Location Contribution %',
              ticksuffix: '%',
              range: [0, 100],
            },
          }}
        />
      </div>
    </section>
  )
}

export default TrendAnalysis