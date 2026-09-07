import PlotlyChart from '../components/PlotlyChart'
import {
  groupAndSum,
  aggregatePPM,
} from '../data/dataEngine'

function PartAnalysis({ data = [] }) {
  const rejectionParts =
    groupAndSum(
      data,
      'part_name_clean',
      'rejection quantity'
    )
      .filter((row) => row.name)
      .slice(0, 10)

  const ppmParts =
    aggregatePPM(
      data,
      ['part_no_clean']
    )
      .filter(
        (row) => row.part_no_clean
      )
      .sort(
        (a, b) => b.ppm - a.ppm
      )
      .slice(0, 10)

  const chart = [
    {
      x: rejectionParts.map(
        (row) => row.value
      ),
      y: rejectionParts.map(
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

  const ppmChart = [
    {
      x: ppmParts.map(
        (row) => row.part_no_clean
      ),
      y: ppmParts.map(
        (row) => row.ppm
      ),
      type: 'bar',
      hovertemplate:
        '<b>%{x}</b>' +
        '<br>PPM: %{y:,.0f}' +
        '<extra></extra>',
    },
  ]

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <h2>Part Analysis</h2>
        <p>
          Part-level rejection and PPM analysis
        </p>
      </div>

      <div className="chart-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              Top 10 Defective Parts
            </h3>
          </div>

          <PlotlyChart
            data={chart}
            layout={{
              height: 420,
              xaxis: {
                title:
                  'Rejection Quantity',
                tickformat: ',.0f',
              },
              yaxis: {
                title: 'Part',
              },
              showlegend: false,
            }}
          />
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              Top 10 Parts by PPM
            </h3>
          </div>

          <PlotlyChart
            data={ppmChart}
            layout={{
              height: 420,
              xaxis: {
                title: 'Part No.',
              },
              yaxis: {
                title: 'PPM',
                tickformat: ',.0f',
              },
              showlegend: false,
            }}
          />
        </div>
      </div>
    </section>
  )
}

export default PartAnalysis