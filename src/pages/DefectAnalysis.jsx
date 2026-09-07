import PlotlyChart from '../components/PlotlyChart'
import {
  groupAndSum,
} from '../data/dataEngine'

function DefectAnalysis({ data = [] }) {
  const defects =
    groupAndSum(
      data,
      'defect',
      'rejection quantity'
    )
      .filter((row) => row.name)
      .slice(0, 10)

  const chart = [
    {
      x: defects.map(
        (row) => row.name
      ),
      y: defects.map(
        (row) => row.value
      ),
      type: 'bar',
      hovertemplate:
        '<b>%{x}</b>' +
        '<br>Rejections: %{y:,.0f}' +
        '<extra></extra>',
    },
  ]

  const rootCauseChart = [
    {
      x: defects.map(
        (row) => row.value
      ),
      y: defects.map(
        (row) => row.name
      ),
      type: 'bar',
      orientation: 'h',
      hovertemplate:
        '<b>%{y}</b>' +
        '<br>Impact: %{x:,.0f}' +
        '<extra></extra>',
    },
  ]

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <h2>Defect Analysis</h2>
        <p>
          Defect types and impactful causes
        </p>
      </div>

      <div className="chart-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              Pareto · Defect Types
            </h3>
          </div>

          <PlotlyChart
            data={chart}
            layout={{
              height: 430,
              xaxis: {
                title: 'Defect',
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
              Most Impactful Root Causes
            </h3>
          </div>

          <PlotlyChart
            data={rootCauseChart}
            layout={{
              height: 430,
              xaxis: {
                title: 'Impact',
                tickformat: ',.0f',
              },
              yaxis: {
                title: 'Defect',
              },
              showlegend: false,
            }}
          />
        </div>
      </div>
    </section>
  )
}

export default DefectAnalysis