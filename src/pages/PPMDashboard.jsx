import PlotlyChart from '../components/PlotlyChart'
import {
  aggregatePPM,
  topN,
} from '../data/dataEngine'

const TARGET_PPM = 20000

function PPMDashboard({ data = [] }) {
  const monthly = aggregatePPM(
    data,
    ['month_start']
  )

  const location = aggregatePPM(
    data,
    ['location']
  ).filter(
    (row) => row.location
  )

  const parts = topN(
    aggregatePPM(
      data,
      ['part_no_clean']
    ).filter(
      (row) => row.part_no_clean
    ),
    'ppm',
    10
  )

  const locationChart = [
    {
      x: location.map(
        (row) => row.location
      ),
      y: location.map(
        (row) => row.ppm
      ),
      type: 'bar',
      text: location.map(
        (row) =>
          Math.round(row.ppm)
      ),
      textposition: 'outside',
      hovertemplate:
        '<b>%{x}</b>' +
        '<br>PPM: %{y:,.0f}' +
        '<extra></extra>',
    },
  ]

  const monthlyChart = [
    {
      x: monthly.map(
        (row) => row.month_start
      ),
      y: monthly.map(
        (row) => row.ppm
      ),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'PPM',
      line: {
        width: 2,
      },
      marker: {
        size: 6,
      },
      hovertemplate:
        '<b>%{x|%b %Y}</b>' +
        '<br>PPM: %{y:,.0f}' +
        '<extra></extra>',
    },
    {
      x: monthly.map(
        (row) => row.month_start
      ),
      y: monthly.map(
        () => TARGET_PPM
      ),
      type: 'scatter',
      mode: 'lines',
      name: 'Target',
      line: {
        dash: 'dash',
        width: 1.5,
      },
      hovertemplate:
        'Target: %{y:,.0f}<extra></extra>',
    },
  ]

  const overall =
    data.length
      ? (
          data.reduce(
            (sum, row) =>
              sum +
              Number(
                row[
                  'rejection quantity'
                ] || 0
              ),
            0
          ) *
          1000000
        ) /
        data.reduce(
          (sum, row) =>
            sum +
            Number(
              row.ppm_denominator ||
                0
            ),
          0
        )
      : 0

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <div>
          <h2>PPM Dashboard</h2>
          <p>
            Parts Per Million performance
          </p>
        </div>

        <div className="metric-badge">
          Target ≤ {TARGET_PPM.toLocaleString()} PPM
        </div>
      </div>

      <div className="kpi-grid">
        <div className="dashboard-card kpi-card">
          <span>Overall PPM</span>
          <strong>
            {Math.round(
              Number.isFinite(overall)
                ? overall
                : 0
            ).toLocaleString()}
          </strong>
        </div>

        <div className="dashboard-card kpi-card">
          <span>Latest Month PPM</span>
          <strong>
            {monthly.length
              ? Math.round(
                  monthly[
                    monthly.length - 1
                  ].ppm
                ).toLocaleString()
              : '0'}
          </strong>
        </div>

        <div className="dashboard-card kpi-card">
          <span>Best Month</span>
          <strong>
            {monthly.length
              ? Math.round(
                  Math.min(
                    ...monthly.map(
                      (row) =>
                        row.ppm
                    )
                  )
                ).toLocaleString()
              : '0'}
          </strong>
        </div>

        <div className="dashboard-card kpi-card">
          <span>Worst Month</span>
          <strong>
            {monthly.length
              ? Math.round(
                  Math.max(
                    ...monthly.map(
                      (row) =>
                        row.ppm
                    )
                  )
                ).toLocaleString()
              : '0'}
          </strong>
        </div>
      </div>

      <div className="chart-grid ppm-top">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>PPM by Location</h3>
          </div>

          <PlotlyChart
            data={locationChart}
            layout={{
              height: 360,
              xaxis: {
                title: 'Location',
              },
              yaxis: {
                title: 'PPM',
                tickformat: ',.0f',
              },
              shapes: [
                {
                  type: 'line',
                  xref: 'paper',
                  x0: 0,
                  x1: 1,
                  y0: TARGET_PPM,
                  y1: TARGET_PPM,
                  line: {
                    dash: 'dot',
                    width: 1.5,
                  },
                },
              ],
              showlegend: false,
            }}
          />
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>PPM Trend</h3>
          </div>

          <PlotlyChart
            data={monthlyChart}
            layout={{
              height: 360,
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
          <h3>Top 10 Parts by PPM</h3>
        </div>

        <div className="data-table-wrapper">
          <table className="quality-table">
            <thead>
              <tr>
                <th>Part No.</th>
                <th>PPM</th>
                <th>Rejection Qty</th>
                <th>Denominator</th>
              </tr>
            </thead>

            <tbody>
              {parts.map(
                (row, index) => (
                  <tr
                    key={`${row.part_no_clean}-${index}`}
                  >
                    <td>
                      {row.part_no_clean}
                    </td>
                    <td>
                      {Math.round(
                        row.ppm
                      ).toLocaleString()}
                    </td>
                    <td>
                      {Number(
                        row[
                          'rejection quantity'
                        ] || 0
                      ).toLocaleString()}
                    </td>
                    <td>
                      {Number(
                        row.ppm_denominator ||
                          0
                      ).toLocaleString()}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default PPMDashboard