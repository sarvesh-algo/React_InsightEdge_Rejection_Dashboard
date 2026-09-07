import PlotlyChart from '../components/PlotlyChart'
import {
  monthlyTotals,
  aggregatePPM,
  groupAndSum,
  sumColumn,
} from '../data/dataEngine'

function Overview({ data = [] }) {
  const monthly = monthlyTotals(data)
  const monthlyPPM = aggregatePPM(
    data,
    ['month_start']
  )

  const processData = groupAndSum(
    data,
    'process',
    'rejection quantity'
  ).slice(0, 5)

  const machineData = groupAndSum(
    data,
    'machine',
    'rejection quantity'
  ).slice(0, 5)

  const locationData = groupAndSum(
    data,
    'location',
    'rejection quantity'
  )

  const defectData = groupAndSum(
    data,
    'defect',
    'rejection quantity'
  )
    .filter((item) => item.name)
    .slice(0, 5)

  const totalRejection = sumColumn(
    data,
    'rejection quantity'
  )

  const chartLayout = {
    height: 380,
    margin: {
      l: 65,
      r: 25,
      t: 55,
      b: 55,
    },
  }

  const lineChart = [
    {
      x: monthly.map(
        (row) => row.month_start
      ),
      y: monthly.map(
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

  const defectChart = [
    {
      x: defectData.map(
        (item) => item.name
      ),
      y: defectData.map(
        (item) => item.value
      ),
      type: 'bar',
      hovertemplate:
        '<b>%{x}</b>' +
        '<br>Rejections: %{y:,.0f}' +
        '<extra></extra>',
    },
  ]

  const processChart = [
    {
      x: processData.map(
        (item) => item.value
      ),
      y: processData.map(
        (item) => item.name
      ),
      type: 'bar',
      orientation: 'h',
      hovertemplate:
        '<b>%{y}</b>' +
        '<br>Rejections: %{x:,.0f}' +
        '<extra></extra>',
    },
  ]

  const machineChart = [
    {
      x: machineData.map(
        (item) => item.value
      ),
      y: machineData.map(
        (item) => item.name
      ),
      type: 'bar',
      orientation: 'h',
      hovertemplate:
        '<b>%{y}</b>' +
        '<br>Rejections: %{x:,.0f}' +
        '<extra></extra>',
    },
  ]

  const locationChart = [
    {
      x: locationData.map(
        (item) => item.name
      ),
      y: locationData.map(
        (item) => item.value
      ),
      type: 'bar',
      hovertemplate:
        '<b>%{x}</b>' +
        '<br>Rejections: %{y:,.0f}' +
        '<extra></extra>',
    },
  ]

  const ppmValues = monthlyPPM
    .map((row) => row.ppm)
    .filter(
      (value) =>
        Number.isFinite(value)
    )

  const ppmMean =
    ppmValues.length
      ? ppmValues.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / ppmValues.length
      : 0

  const variance =
    ppmValues.length
      ? ppmValues.reduce(
          (sum, value) =>
            sum +
            Math.pow(
              value - ppmMean,
              2
            ),
          0
        ) / ppmValues.length
      : 0

  const ppmStd =
    Math.sqrt(variance)

  const upperLimit =
    ppmMean + 3 * ppmStd

  const lowerLimit =
    Math.max(
      0,
      ppmMean - 3 * ppmStd
    )

  const controlChart = [
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
      line: {
        width: 2,
      },
      marker: {
        size: 6,
      },
    },
    {
      x: monthlyPPM.map(
        (row) => row.month_start
      ),
      y: monthlyPPM.map(
        () => ppmMean
      ),
      type: 'scatter',
      mode: 'lines',
      name: 'Mean',
      line: {
        dash: 'dash',
        width: 1.5,
      },
    },
    {
      x: monthlyPPM.map(
        (row) => row.month_start
      ),
      y: monthlyPPM.map(
        () => upperLimit
      ),
      type: 'scatter',
      mode: 'lines',
      name: 'Upper 3σ',
      line: {
        dash: 'dot',
        width: 1,
      },
    },
    {
      x: monthlyPPM.map(
        (row) => row.month_start
      ),
      y: monthlyPPM.map(
        () => lowerLimit
      ),
      type: 'scatter',
      mode: 'lines',
      name: 'Lower 3σ',
      line: {
        dash: 'dot',
        width: 1,
      },
    },
  ]

  return (
    <section className="overview-page">
      <div className="page-section-title">
        <h2>Overview</h2>
        <p>
          Quality performance overview
        </p>
      </div>

      <div className="chart-grid overview-top">
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>
                Monthly Rejection Trend
              </h3>
              <p>
                Monthly rejection quantity
              </p>
            </div>
          </div>

          <PlotlyChart
            data={lineChart}
            layout={{
              ...chartLayout,
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
            <div>
              <h3>
                Top Defects (Pareto)
              </h3>
              <p>
                Highest rejection defect types
              </p>
            </div>
          </div>

          <PlotlyChart
            data={defectChart}
            layout={{
              ...chartLayout,
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
      </div>

      <div className="chart-grid overview-three">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Rejections by Process</h3>
          </div>

          <PlotlyChart
            data={processChart}
            layout={{
              ...chartLayout,
              height: 330,
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
            <h3>Rejections by Machine</h3>
          </div>

          <PlotlyChart
            data={machineChart}
            layout={{
              ...chartLayout,
              height: 330,
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

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Rejections by Location</h3>
          </div>

          <PlotlyChart
            data={locationChart}
            layout={{
              ...chartLayout,
              height: 330,
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
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <div>
            <h3>
              PPM Control Chart · 3σ Limits
            </h3>
            <p>
              Mean and three-sigma control limits
            </p>
          </div>

          <div className="metric-badge">
            Total Rejections:{' '}
            {totalRejection.toLocaleString()}
          </div>
        </div>

        <PlotlyChart
          data={controlChart}
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
    </section>
  )
}

export default Overview