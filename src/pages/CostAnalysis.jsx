import PlotlyChart from '../components/PlotlyChart'
import {
  groupAndSum,
} from '../data/dataEngine'

function CostAnalysis({ data = [] }) {
  const costs =
    groupAndSum(
      data,
      'part_no_clean',
      'total cost'
    )
      .filter(
        (row) =>
          row.name &&
          row.value > 0
      )
      .slice(0, 15)

  const chart = [
    {
      x: costs.map(
        (row) => row.value
      ),
      y: costs.map(
        (row) => row.name
      ),
      type: 'bar',
      orientation: 'h',
      hovertemplate:
        '<b>%{y}</b>' +
        '<br>Cost: %{x:,.2f}' +
        '<extra></extra>',
    },
  ]

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <h2>Cost Analysis</h2>
        <p>
          Rejection cost contribution
        </p>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>
            Pareto · Rejection Cost
          </h3>
        </div>

        <PlotlyChart
          data={chart}
          layout={{
            height: 520,
            xaxis: {
              title:
                'Rejection Cost',
              tickformat: ',.2f',
            },
            yaxis: {
              title: 'Part No.',
            },
            showlegend: false,
          }}
        />
      </div>
    </section>
  )
}

export default CostAnalysis