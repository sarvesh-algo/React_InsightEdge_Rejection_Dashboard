import PlotlyChart from '../components/PlotlyChart'
import {
  monthlyTotals,
  sumColumn,
} from '../data/dataEngine'

function Overview({ data = [] }) {
  const monthlyData = monthlyTotals(data)

  const totalRejection = sumColumn(
    data,
    'rejection quantity'
  )

  const chartData = [
    {
      x: monthlyData.map(
        (row) => row.month_start
      ),

      y: monthlyData.map(
        (row) =>
          row['rejection quantity']
      ),

      type: 'scatter',
      mode: 'lines+markers',

      name: 'Rejections',

      line: {
        width: 2,
      },

      marker: {
        size: 6,
      },

      hovertemplate:
        '<b>%{x|%b %Y}</b>' +
        '<br>Rejections: %{y:,.0f}' +
        '<extra></extra>',
    },
  ]

  const chartLayout = {
    title: {
      text: 'Monthly Rejection Trend',
      font: {
        size: 18,
        color: '#edf5ff',
      },
    },

    xaxis: {
      title: 'Month',
      type: 'date',
      gridcolor: '#173a5d',
      color: '#c7d8e8',
    },

    yaxis: {
      title: 'Rejection Quantity',
      gridcolor: '#173a5d',
      color: '#c7d8e8',
      tickformat: ',.0f',
    },

    hovermode: 'x unified',

    showlegend: false,

    annotations: [
      {
        text: `Total Rejections: ${totalRejection.toLocaleString()}`,
        x: 1,
        y: 1.12,
        xref: 'paper',
        yref: 'paper',
        showarrow: false,
        font: {
          color: '#c7d8e8',
          size: 13,
        },
      },
    ],
  }

  return (
    <section className="overview-page">
      <div className="dashboard-card">
        <div className="card-header">
          <div>
            <h2>Overview</h2>

            <p>
              Quality performance overview
            </p>
          </div>
        </div>

        <PlotlyChart
          data={chartData}
          layout={chartLayout}
          style={{
            minHeight: '420px',
          }}
        />
      </div>
    </section>
  )
}

export default Overview