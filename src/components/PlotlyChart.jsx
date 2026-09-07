import Plot from 'react-plotly.js'

function PlotlyChart({
  data = [],
  layout = {},
  config = {},
  style = {},
  className = '',
}) {
  const defaultLayout = {
    paper_bgcolor: '#0b2138',
    plot_bgcolor: '#0b2138',

    font: {
      color: '#edf5ff',
      family: 'Arial, sans-serif',
    },

    margin: {
      l: 55,
      r: 25,
      t: 45,
      b: 55,
    },

    autosize: true,

    xaxis: {
      gridcolor: '#173a5d',
      zerolinecolor: '#214c73',
      color: '#c7d8e8',
    },

    yaxis: {
      gridcolor: '#173a5d',
      zerolinecolor: '#214c73',
      color: '#c7d8e8',
    },

    legend: {
      font: {
        color: '#c7d8e8',
      },
    },

    ...layout,
  }

  const defaultConfig = {
    responsive: true,
    displayModeBar: false,
    ...config,
  }

  return (
    <div
      className={`plotly-chart ${className}`}
      style={{
        width: '100%',
        minHeight: '320px',
        ...style,
      }}
    >
      <Plot
        data={data}
        layout={defaultLayout}
        config={defaultConfig}
        useResizeHandler
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}

export default PlotlyChart