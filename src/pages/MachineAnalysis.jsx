import PlotlyChart from '../components/PlotlyChart'
import {
  groupAndSum,
} from '../data/dataEngine'

function MachineAnalysis({ data = [] }) {
  const machines =
    groupAndSum(
      data,
      'machine',
      'rejection quantity'
    )
      .filter((row) => row.name)
      .slice(0, 15)

  const chart = [
    {
      x: machines.map(
        (row) => row.value
      ),
      y: machines.map(
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

  return (
    <section className="dashboard-page">
      <div className="page-section-title">
        <h2>Machine Analysis</h2>
        <p>
          Machine-level rejection analysis
        </p>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>Rejections by Machine</h3>
        </div>

        <PlotlyChart
          data={chart}
          layout={{
            height: 520,
            xaxis: {
              title:
                'Rejection Quantity',
              tickformat: ',.0f',
            },
            yaxis: {
              title: 'Machine',
            },
            showlegend: false,
          }}
        />
      </div>
    </section>
  )
}

export default MachineAnalysis