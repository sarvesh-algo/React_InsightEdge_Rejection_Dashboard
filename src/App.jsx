import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import "./App.css";

const TARGET_PPM = 20000;

const COLORS = {
  BG: "#07182c",
  CARD: "#0d2540",
  GRID: "rgba(151, 180, 210, 0.12)",
  TEXT: "#dce8f6",
  MUTED: "#8fa9c4",
  BLUE: "#2f8cff",
  CYAN: "#24c8d8",
  GREEN: "#34d399",
  LIME: "#70e36f",
  PURPLE: "#b05cff",
  ORANGE: "#f5a524",
  RED: "#ff5c72",
  YELLOW: "#f7c948",
};

const LOCATION_COLORS = {
  PUN: COLORS.CYAN,
  LKN: COLORS.ORANGE,
  JSR: COLORS.GREEN,
};

const PALETTE = [
  COLORS.BLUE,
  COLORS.CYAN,
  COLORS.GREEN,
  COLORS.PURPLE,
  COLORS.ORANGE,
  COLORS.RED,
  COLORS.YELLOW,
  "#6ea8fe",
  "#c084fc",
  "#2dd4bf",
];

const PAGES = [
  ["🏠", "Overview"],
  ["📊", "PPM Dashboard"],
  ["📍", "Location Analysis"],
  ["📦", "Part Analysis"],
  ["❌", "Defect Analysis"],
  ["⚙️", "Process Analysis"],
  ["🏭", "Machine Analysis"],
  ["💰", "Cost Analysis"],
  ["📈", "Trend Analysis"],
];

/* =========================================================
   CSV / DATA PREPARATION
========================================================= */

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' && quoted && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (c === '"') {
      quoted = !quoted;
      continue;
    }

    if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && next === "\n") i++;

      row.push(cell);
      if (row.some((v) => v.trim() !== "")) rows.push(row);

      row = [];
      cell = "";
      continue;
    }

    cell += c;
  }

  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());

  return rows.slice(1).map((r) => {
    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });

    return obj;
  });
}

function number(v) {
  if (v === null || v === undefined || v === "") return 0;

  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(v) {
  if (!v) return null;

  const s = String(v).trim();

  // DD-MM-YYYY
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (m) {
    const [, d, mo, y] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(key) {
  const d = new Date(`${key}-01`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function clean(v) {
  return String(v ?? "")
    .trim()
    .replace(/^'/, "");
}

function normalizeRows(rawRows) {
  return rawRows
    .map((r) => {
      const sale =
        "sale quantity" in r
          ? number(r["sale quantity"])
          : "Sale Qty" in r
          ? number(r["Sale Qty"])
          : "Sale Quantity" in r
          ? number(r["Sale Quantity"])
          : null;

      const rejection =
        "rejection quantity" in r
          ? number(r["rejection quantity"])
          : "Rejection Qty" in r
          ? number(r["Rejection Qty"])
          : number(r["Rejection Quantity"]);

      const production =
        "production quantity" in r
          ? number(r["production quantity"])
          : "Production Qty" in r
          ? number(r["Production Qty"])
          : number(r["Production Quantity"]);

      const date = normalizeDate(r.Date);

      const location = clean(r.location).toUpperCase();
      const process = clean(r.process).toUpperCase();
      const machine = clean(r.machine).toUpperCase();

      const partNo = clean(
        r["part no."] ??
          r["Part No."] ??
          r["part no"] ??
          r["Part Number"]
      );

      const partName = clean(r["part name"] ?? r["Part Name"]);

      const defect = clean(
        r.defects ??
          r.Defect ??
          r["Defect Description"] ??
          r["defect"]
      );

      const rsd = number(r.RSD);

      const denominator = sale !== null ? sale : production;

      return {
        ...r,

        Date: date,
        location,
        process,
        machine,
        defect,
        part_no_clean: partNo,
        part_name_clean: partName,

        "rejection quantity": rejection,
        "production quantity": production,

        ...(sale !== null ? { "sale quantity": sale } : {}),

        RSD: rsd,
        total_cost: rejection * rsd,

        ppm_denominator: denominator,
        ppm_denominator_label:
          sale !== null ? "Sale Qty" : "Production Qty (Sale Qty unavailable)",

        safe_ppm:
          denominator > 0
            ? (rejection * 1000000) / denominator
            : 0,

        month_start: date ? dateKey(date) : null,
      };
    })
    .filter((r) => r.Date);
}

/* =========================================================
   DATA HELPERS
========================================================= */

function sum(rows, field) {
  return rows.reduce((a, r) => a + number(r[field]), 0);
}

function ppmValue(rows) {
  const rejection = sum(rows, "rejection quantity");
  const denominator = sum(rows, "ppm_denominator");

  return denominator > 0
    ? (rejection * 1000000) / denominator
    : 0;
}

function uniqueValues(rows, field) {
  return [
    ...new Set(
      rows
        .map((r) => String(r[field] ?? "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function groupSum(rows, field, valueField = "rejection quantity") {
  const map = new Map();

  rows.forEach((r) => {
    const key = String(r[field] ?? "").trim();

    if (!key) return;

    map.set(key, (map.get(key) || 0) + number(r[valueField]));
  });

  return [...map.entries()]
    .map(([key, value]) => ({
      [field]: key,
      [valueField]: value,
    }))
    .sort((a, b) => b[valueField] - a[valueField]);
}

function aggregatePPM(rows, groupFields) {
  const groups = new Map();

  rows.forEach((r) => {
    const key = groupFields
      .map((f) => String(r[f] ?? ""))
      .join("|||");

    if (!groups.has(key)) {
      groups.set(
        key,
        Object.fromEntries(groupFields.map((f) => [f, r[f]]))
      );

      groups.get(key).rejection_quantity = 0;
      groups.get(key).ppm_denominator = 0;
    }

    groups.get(key).rejection_quantity += number(
      r["rejection quantity"]
    );

    groups.get(key).ppm_denominator += number(r.ppm_denominator);
  });

  return [...groups.values()]
    .map((r) => ({
      ...r,
      ppm:
        r.ppm_denominator > 0
          ? (r.rejection_quantity * 1000000) /
            r.ppm_denominator
          : 0,
    }))
    .sort((a, b) => b.ppm - a.ppm);
}

function monthlyTotals(rows) {
  const grouped = new Map();

  rows.forEach((r) => {
    if (!r.month_start) return;

    if (!grouped.has(r.month_start)) {
      grouped.set(r.month_start, {
        month_start: r.month_start,
        rejection_quantity: 0,
        production_quantity: 0,
        ppm_denominator: 0,
        total_cost: 0,
      });
    }

    const x = grouped.get(r.month_start);

    x.rejection_quantity += number(r["rejection quantity"]);
    x.production_quantity += number(r["production quantity"]);
    x.ppm_denominator += number(r.ppm_denominator);
    x.total_cost += number(r.total_cost);
  });

  return [...grouped.values()]
    .sort((a, b) =>
      a.month_start.localeCompare(b.month_start)
    )
    .map((r) => ({
      ...r,
      ppm:
        r.ppm_denominator > 0
          ? (r.rejection_quantity * 1000000) /
            r.ppm_denominator
          : 0,
    }));
}

function monthlySummary(rows) {
  const grouped = new Map();

  rows.forEach((r) => {
    if (!r.month_start || !r.location) return;

    const key = `${r.month_start}|||${r.location}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        month_start: r.month_start,
        location: r.location,
        rejection_quantity: 0,
        production_quantity: 0,
        ppm_denominator: 0,
        total_cost: 0,
      });
    }

    const x = grouped.get(key);

    x.rejection_quantity += number(r["rejection quantity"]);
    x.production_quantity += number(r["production quantity"]);
    x.ppm_denominator += number(r.ppm_denominator);
    x.total_cost += number(r.total_cost);
  });

  return [...grouped.values()].sort((a, b) =>
    `${a.month_start}${a.location}`.localeCompare(
      `${b.month_start}${b.location}`
    )
  );
}

function topN(rows, field, n = 5) {
  return groupSum(rows, field).slice(0, n);
}

function topNByGroup(rows, groupField, categoryField, n = 5) {
  const map = new Map();

  rows.forEach((r) => {
    const group = String(r[groupField] ?? "").trim();
    const category = String(r[categoryField] ?? "").trim();

    if (!group || !category) return;

    const key = `${group}|||${category}`;

    map.set(key, {
      [groupField]: group,
      [categoryField]: category,
      "rejection quantity":
        (map.get(key)?.["rejection quantity"] || 0) +
        number(r["rejection quantity"]),
    });
  });

  const all = [...map.values()];
  const groups = uniqueValues(all, groupField);

  return groups.flatMap((group) =>
    all
      .filter((x) => x[groupField] === group)
      .sort(
        (a, b) =>
          b["rejection quantity"] -
          a["rejection quantity"]
      )
      .slice(0, n)
  );
}

/* =========================================================
   PLOTLY STYLE
========================================================= */

function plotLayout(title, xTitle = "", yTitle = "", height = 280) {
  return {
    title: {
      text: title,
      x: 0.02,
      xanchor: "left",
      font: {
        size: 14,
        color: COLORS.TEXT,
      },
    },

    paper_bgcolor: COLORS.CARD,
    plot_bgcolor: COLORS.CARD,

    font: {
      family: "Inter, Arial, sans-serif",
      size: 10,
      color: COLORS.TEXT,
    },

    margin: {
      l: 48,
      r: 18,
      t: 44,
      b: 46,
    },

    height,

    hoverlabel: {
      bgcolor: "#102d4d",
      font: {
        color: "white",
      },
    },

    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.01,
      xanchor: "right",
      x: 1,
      font: {
        size: 9,
        color: COLORS.MUTED,
      },
    },

    hovermode: "x unified",

    xaxis: {
      title: {
        text: xTitle,
        font: {
          size: 9,
          color: COLORS.MUTED,
        },
      },
      tickfont: {
        size: 9,
        color: COLORS.MUTED,
      },
      showgrid: false,
      zeroline: false,
      linecolor: COLORS.GRID,
    },

    yaxis: {
      title: {
        text: yTitle,
        font: {
          size: 9,
          color: COLORS.MUTED,
        },
      },
      tickfont: {
        size: 9,
        color: COLORS.MUTED,
      },
      showgrid: true,
      gridcolor: COLORS.GRID,
      zeroline: false,
    },
  };
}

function PlotCard({ data, layout }) {
  return (
    <div className="plot-card">
      <Plot
        data={data}
        layout={layout}
        config={{
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: [
            "lasso2d",
            "select2d",
          ],
        }}
        style={{
          width: "100%",
        }}
        useResizeHandler
      />
    </div>
  );
}

/* =========================================================
   CHARTS
========================================================= */

function EmptyChart({ title }) {
  return (
    <PlotCard
      data={[
        {
          type: "scatter",
          x: [0],
          y: [0],
          mode: "markers",
          marker: { opacity: 0 },
          hoverinfo: "skip",
        },
      ]}
      layout={{
        ...plotLayout(title),
        annotations: [
          {
            text: "No data",
            x: 0.5,
            y: 0.5,
            xref: "paper",
            yref: "paper",
            showarrow: false,
            font: {
              color: COLORS.MUTED,
              size: 14,
            },
          },
        ],
        xaxis: { visible: false },
        yaxis: { visible: false },
      }}
    />
  );
}

function LocationBar({ rows, title = "Rejections by Location" }) {
  const data = groupSum(rows, "location");

  if (!data.length) return <EmptyChart title={title} />;

  const total = sum(data, "rejection quantity") || 1;

  return (
    <PlotCard
      data={[
        {
          type: "bar",
          x: data.map((x) => x.location),
          y: data.map((x) => x["rejection quantity"]),
          marker: {
            color: data.map(
              (x) =>
                LOCATION_COLORS[x.location] ||
                COLORS.BLUE
            ),
          },
          text: data.map(
            (x) =>
              `${x["rejection quantity"].toLocaleString()}<br>${(
                x["rejection quantity"] / total
              ).toLocaleString("en-US", {
                style: "percent",
                maximumFractionDigits: 0,
              })}`
          ),
          textposition: "outside",
          hovertemplate:
            "%{x}<br>Rejections: %{y:,.0f}<extra></extra>",
        },
      ]}
      layout={plotLayout(
        title,
        "Location",
        "Rejection Qty"
      )}
    />
  );
}

function HorizontalBar({
  rows,
  field,
  title,
  n = null,
  valueField = "rejection quantity",
}) {
  let data = groupSum(rows, field, valueField);

  if (n) data = data.slice(0, n);

  data = [...data].reverse();

  if (!data.length) return <EmptyChart title={title} />;

  return (
    <PlotCard
      data={[
        {
          type: "bar",
          orientation: "h",
          x: data.map((x) => x[valueField]),
          y: data.map((x) => x[field]),
          marker: {
            color: data.map(
              (_, i) => PALETTE[i % PALETTE.length]
            ),
          },
          text: data.map((x) =>
            x[valueField].toLocaleString()
          ),
          textposition: "outside",
          cliponaxis: false,
          hovertemplate:
            "%{y}<br>%{x:,.0f}<extra></extra>",
        },
      ]}
      layout={plotLayout(
        title,
        valueField === "total_cost"
          ? "₹ Cost"
          : "Rejection Qty",
        ""
      )}
    />
  );
}

function LineChart({
  rows,
  xField,
  yField,
  groupField = null,
  title,
  annotate = false,
}) {
  if (!rows.length) return <EmptyChart title={title} />;

  const groups = groupField
    ? uniqueValues(rows, groupField)
    : ["Rejections"];

  const traces = groups.map((group, i) => {
    const subset = groupField
      ? rows.filter((r) => r[groupField] === group)
      : rows;

    const sorted = [...subset].sort((a, b) =>
      String(a[xField]).localeCompare(String(b[xField]))
    );

    const color =
      groupField && LOCATION_COLORS[group]
        ? LOCATION_COLORS[group]
        : PALETTE[i % PALETTE.length];

    return {
      type: "scatter",
      mode: annotate
        ? "lines+markers+text"
        : "lines+markers",
      name: group,
      x: sorted.map((x) => x[xField]),
      y: sorted.map((x) => x[yField]),
      line: {
        color,
        width: 2,
      },
      marker: {
        size: 5,
      },
      text: annotate
        ? sorted.map((x) =>
            number(x[yField]).toLocaleString()
          )
        : undefined,
      textposition: "top center",
      textfont: {
        size: 8,
      },
      hovertemplate:
        "%{x}<br>%{y:,.0f}<extra></extra>",
    };
  });

  return (
    <PlotCard
      data={traces}
      layout={plotLayout(
        title,
        "Month",
        "Rejection Qty"
      )}
    />
  );
}

function ParetoChart({
  rows,
  field,
  title,
  n = 10,
  valueField = "rejection quantity",
}) {
  let data = groupSum(rows, field, valueField).slice(0, n);

  if (!data.length) return <EmptyChart title={title} />;

  const total =
    data.reduce((a, x) => a + x[valueField], 0) || 1;

  let cumulative = 0;

  const cum = data.map((x) => {
    cumulative += x[valueField];
    return (cumulative / total) * 100;
  });

  const quantityName =
    valueField === "rejection quantity"
      ? "Rejection Qty"
      : "Rejection Cost";

  return (
    <PlotCard
      data={[
        {
          type: "bar",
          x: data.map((x) => x[field]),
          y: data.map((x) => x[valueField]),
          name: quantityName,
          marker: {
            color: COLORS.BLUE,
          },
          hovertemplate:
            "%{x}<br>%{y:,.0f}<extra></extra>",
        },
        {
          type: "scatter",
          x: data.map((x) => x[field]),
          y: cum,
          name: "Cumulative %",
          mode: "lines+markers",
          line: {
            color: COLORS.LIME,
            width: 2,
          },
          yaxis: "y2",
          hovertemplate:
            "%{x}<br>%{y:.1f}%<extra></extra>",
        },
      ]}
      layout={{
        ...plotLayout(title, "", ""),
        yaxis: {
          ...plotLayout(title).yaxis,
          title: {
            text:
              valueField === "rejection quantity"
                ? "Qty"
                : "₹ Cost",
            font: {
              size: 9,
              color: COLORS.MUTED,
            },
          },
        },
        yaxis2: {
          title: {
            text: "Cumulative %",
            font: {
              size: 9,
              color: COLORS.MUTED,
            },
          },
          overlaying: "y",
          side: "right",
          range: [0, 105],
          ticksuffix: "%",
          showgrid: false,
          tickfont: {
            size: 9,
            color: COLORS.MUTED,
          },
        },
        xaxis: {
          ...plotLayout(title).xaxis,
          tickangle: -45,
        },
        shapes: [
          {
            type: "line",
            xref: "paper",
            x0: 0,
            x1: 1,
            yref: "y2",
            y0: 80,
            y1: 80,
            line: {
              color: COLORS.MUTED,
              dash: "dot",
            },
          },
        ],
      }}
    />
  );
}

function ControlChart({ rows }) {
  if (!rows.length)
    return <EmptyChart title="PPM Control Chart · 3σ Limits" />;

  const sorted = [...rows].sort((a, b) =>
    a.month_start.localeCompare(b.month_start)
  );

  const values = sorted.map((x) => number(x.ppm));

  const mean =
    values.reduce((a, b) => a + b, 0) / values.length;

  const std = Math.sqrt(
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) /
      values.length
  );

  const ucl = mean + 3 * std;
  const lcl = Math.max(0, mean - 3 * std);

  const out = sorted.filter(
    (x) => x.ppm > ucl || x.ppm < lcl
  );

  return (
    <PlotCard
      data={[
        {
          type: "scatter",
          mode: "lines+markers",
          name: "PPM",
          x: sorted.map((x) => x.month_start),
          y: sorted.map((x) => x.ppm),
          line: {
            color: COLORS.BLUE,
            width: 2,
          },
        },
        {
          type: "scatter",
          mode: "lines",
          name: "Mean",
          x: sorted.map((x) => x.month_start),
          y: sorted.map(() => mean),
          line: {
            color: COLORS.GREEN,
            dash: "dash",
          },
        },
        {
          type: "scatter",
          mode: "lines",
          name: "UCL",
          x: sorted.map((x) => x.month_start),
          y: sorted.map(() => ucl),
          line: {
            color: COLORS.RED,
            dash: "dash",
          },
        },
        {
          type: "scatter",
          mode: "lines",
          name: "LCL",
          x: sorted.map((x) => x.month_start),
          y: sorted.map(() => lcl),
          line: {
            color: COLORS.CYAN,
            dash: "dash",
          },
        },
        ...(out.length
          ? [
              {
                type: "scatter",
                mode: "markers",
                name: "Out of Control",
                x: out.map((x) => x.month_start),
                y: out.map((x) => x.ppm),
                marker: {
                  color: COLORS.ORANGE,
                  size: 10,
                  symbol: "circle-open",
                },
              },
            ]
          : []),
      ]}
      layout={plotLayout(
        "PPM Control Chart · 3σ Limits",
        "Month",
        "PPM",
        300
      )}
    />
  );
}

function PPMTrend({ rows, title }) {
  const monthly = [...rows].sort((a, b) =>
    a.month_start.localeCompare(b.month_start)
  );

  if (!monthly.length) return <EmptyChart title={title} />;

  return (
    <PlotCard
      data={[
        {
          type: "scatter",
          mode: "lines+markers+text",
          name: "PPM",
          x: monthly.map((x) => x.month_start),
          y: monthly.map((x) => x.ppm),
          line: {
            color: COLORS.BLUE,
            width: 2.5,
          },
          marker: {
            size: 6,
          },
          text: monthly.map((x) =>
            number(x.ppm).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          ),
          textposition: "top center",
          textfont: {
            size: 8,
          },
          hovertemplate:
            "%{x}<br>PPM: %{y:,.0f}<extra></extra>",
        },
      ]}
      layout={{
        ...plotLayout(title, "Month", "PPM", 330),
        shapes: [
          {
            type: "line",
            xref: "paper",
            x0: 0,
            x1: 1,
            yref: "y",
            y0: TARGET_PPM,
            y1: TARGET_PPM,
            line: {
              color: COLORS.RED,
              dash: "dot",
            },
          },
        ],
        annotations: [
          {
            x: 1,
            xref: "paper",
            y: TARGET_PPM,
            yref: "y",
            text: `Target ${TARGET_PPM.toLocaleString()} PPM`,
            showarrow: false,
            xanchor: "right",
            yanchor: "bottom",
            font: {
              size: 9,
              color: COLORS.RED,
            },
          },
        ],
      }}
    />
  );
}

function PPMByLocation({ rows }) {
  const data = aggregatePPM(rows, ["location"])
    .filter((x) => x.location)
    .sort((a, b) => a.ppm - b.ppm);

  if (!data.length)
    return <EmptyChart title="PPM by Location" />;

  return (
    <PlotCard
      data={[
        {
          type: "bar",
          x: data.map((x) => x.location),
          y: data.map((x) => x.ppm),
          marker: {
            color: data.map(
              (x) =>
                LOCATION_COLORS[x.location] ||
                COLORS.BLUE
            ),
          },
          text: data.map((x) =>
            x.ppm.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          ),
          textposition: "outside",
          cliponaxis: false,
        },
      ]}
      layout={{
        ...plotLayout(
          "PPM by Location",
          "Location",
          "PPM"
        ),
        shapes: [
          {
            type: "line",
            xref: "paper",
            x0: 0,
            x1: 1,
            yref: "y",
            y0: TARGET_PPM,
            y1: TARGET_PPM,
            line: {
              color: COLORS.RED,
              dash: "dot",
            },
          },
        ],
      }}
    />
  );
}

function PPMBar({ rows, title }) {
  const data = aggregatePPM(rows, ["part_no_clean"])
    .filter((x) => x.part_no_clean)
    .slice(0, 10)
    .sort((a, b) => a.ppm - b.ppm);

  if (!data.length) return <EmptyChart title={title} />;

  return (
    <PlotCard
      data={[
        {
          type: "bar",
          orientation: "h",
          x: data.map((x) => x.ppm),
          y: data.map((x) => x.part_no_clean),
          marker: {
            color: COLORS.PURPLE,
          },
          text: data.map((x) =>
            x.ppm.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          ),
          textposition: "outside",
          cliponaxis: false,
          hovertemplate:
            "%{y}<br>PPM: %{x:,.0f}<extra></extra>",
        },
      ]}
      layout={plotLayout(title, "PPM", "", 310)}
    />
  );
}

function PPMPartLines({ rows }) {
  const agg = aggregatePPM(rows, [
    "month_start",
    "part_no_clean",
  ])
    .filter((x) => x.part_no_clean)
    .sort((a, b) => a.month_start.localeCompare(b.month_start));

  const parts = [
    ...new Set(
      [...agg]
        .sort(
          (a, b) =>
            b.rejection_quantity -
            a.rejection_quantity
        )
        .map((x) => x.part_no_clean)
    ),
  ].slice(0, 6);

  const traces = parts.map((part, i) => {
    const data = agg.filter(
      (x) => x.part_no_clean === part
    );

    return {
      type: "scatter",
      mode: "lines+markers",
      name: part,
      x: data.map((x) => x.month_start),
      y: data.map((x) => x.ppm),
      line: {
        color: PALETTE[i % PALETTE.length],
        width: 1.8,
      },
      marker: {
        size: 4,
      },
    };
  });

  if (!traces.length)
    return (
      <EmptyChart title="Top Parts · Monthly PPM Trend" />
    );

  return (
    <PlotCard
      data={traces}
      layout={plotLayout(
        "Top Parts · Monthly PPM Trend",
        "Month",
        "PPM",
        320
      )}
    />
  );
}

function ProductionVsPPM({ rows }) {
  const monthly = monthlyTotals(rows);

  if (!monthly.length)
    return (
      <EmptyChart title="Production Quantity vs PPM" />
    );

  return (
    <PlotCard
      data={[
        {
          type: "bar",
          name: "Production Qty",
          x: monthly.map((x) => x.month_start),
          y: monthly.map((x) => x.production_quantity),
          marker: {
            color: COLORS.GREEN,
          },
          opacity: 0.65,
          yaxis: "y",
        },
        {
          type: "scatter",
          name: "PPM",
          mode: "lines+markers",
          x: monthly.map((x) => x.month_start),
          y: monthly.map((x) => x.ppm),
          line: {
            color: COLORS.BLUE,
            width: 2.5,
          },
          yaxis: "y2",
        },
      ]}
      layout={{
        ...plotLayout(
          "Production Quantity vs PPM",
          "Month",
          "",
          300
        ),
        yaxis: {
          ...plotLayout().yaxis,
          title: {
            text: "Production Qty",
            font: {
              size: 9,
              color: COLORS.MUTED,
            },
          },
        },
        yaxis2: {
          title: {
            text: "PPM",
            font: {
              size: 9,
              color: COLORS.MUTED,
            },
          },
          overlaying: "y",
          side: "right",
          tickfont: {
            size: 9,
            color: COLORS.MUTED,
          },
        },
      }}
    />
  );
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function Sidebar({
  page,
  setPage,
  rows,
  location,
  setLocation,
  processFilter,
  setProcessFilter,
  machineFilter,
  setMachineFilter,
  partFilter,
  setPartFilter,
  defectFilter,
  setDefectFilter,
  compareParts,
  setCompareParts,
  ppmSingle,
  setPpmSingle,
  onUpload,
}) {
  const processes = uniqueValues(rows, "process");
  const machines = uniqueValues(rows, "machine");
  const parts = uniqueValues(rows, "part_no_clean");
  const defects = uniqueValues(rows, "defect");
  const locations = uniqueValues(rows, "location");

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">◇</div>

        <div>
          <div className="brand-title">InsightEdge</div>
          <div className="brand-sub">
            Quality Intelligence
          </div>
        </div>
      </div>

      <div className="nav-label">Data Source</div>

      <label className="upload-button">
        Upload CSV
        <input
          type="file"
          accept=".csv"
          onChange={onUpload}
          hidden
        />
      </label>

      <div className="nav-label">Navigation</div>

      <div className="navigation">
        {PAGES.map(([icon, name]) => (
          <button
            key={name}
            className={`nav-item ${
              page === name ? "active" : ""
            }`}
            onClick={() => setPage(name)}
          >
            <span>{icon}</span>
            {name}
          </button>
        ))}
      </div>

      <div className="sidebar-divider" />

      <div className="nav-label">Dashboard Filters</div>

      <FilterMulti
        label="Process"
        values={processes}
        selected={processFilter}
        setSelected={setProcessFilter}
      />

      <FilterMulti
        label="Machine"
        values={machines}
        selected={machineFilter}
        setSelected={setMachineFilter}
      />

      <FilterMulti
        label="Part"
        values={parts}
        selected={partFilter}
        setSelected={(v) =>
          setPartFilter(v.slice(0, 20))
        }
      />

      <FilterMulti
        label="Defect"
        values={defects}
        selected={defectFilter}
        setSelected={(v) =>
          setDefectFilter(v.slice(0, 20))
        }
      />

      {page === "PPM Dashboard" && (
        <>
          <div className="sidebar-divider" />

          <div className="nav-label">
            PPM Part Analysis
          </div>

          <FilterMulti
            label="Compare Parts"
            values={parts}
            selected={compareParts}
            setSelected={(v) =>
              setCompareParts(v.slice(0, 6))
            }
          />

          <SelectControl
            label="PPM Over Time · Part"
            value={ppmSingle}
            options={["All", ...parts]}
            onChange={setPpmSingle}
          />
        </>
      )}

      <div className="sidebar-divider" />

      <div className="nav-label">Dataset</div>

      <div className="dataset-info">
        <div>Date coverage</div>
        <strong>
          {rows.length
            ? `${formatDate(
                rows.reduce(
                  (a, b) =>
                    a.Date < b.Date ? a : b
                ).Date
              )} – ${formatDate(
                rows.reduce(
                  (a, b) =>
                    a.Date > b.Date ? a : b
                ).Date
              )}`
            : "—"}
        </strong>

        <div>Total records</div>
        <strong>{rows.length.toLocaleString()}</strong>

        <div>Locations</div>
        <strong>{locations.length}</strong>
      </div>

      <div className="sidebar-divider" />

      <div className="target-caption">
        PPM target: ≤ 20,000
      </div>
    </aside>
  );
}

function FilterMulti({
  label,
  values,
  selected,
  setSelected,
}) {
  return (
    <div className="filter-block">
      <label>{label}</label>

      <select
        multiple
        value={selected}
        onChange={(e) =>
          setSelected(
            [...e.target.selectedOptions].map(
              (o) => o.value
            )
          )
        }
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      {selected.length > 0 && (
        <div className="selected-count">
          {selected.length} selected
        </div>
      )}
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div className="filter-block">
      <label>{label}</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}

function Header({
  rows,
  location,
  setLocation,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}) {
  const locations = uniqueValues(rows, "location");

  const minDate = rows.length
    ? new Date(
        Math.min(...rows.map((r) => r.Date.getTime()))
      )
    : new Date();

  const maxDate = rows.length
    ? new Date(
        Math.max(...rows.map((r) => r.Date.getTime()))
      )
    : new Date();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">
            InsightEdge Quality Intelligence
          </div>

          <div className="page-sub">
            Real-time quality, rejection and PPM
            performance
          </div>
        </div>

        <div className="page-sub">
          Executive Quality Dashboard
        </div>
      </div>

      <div className="top-controls">
        <SelectControl
          label="Location"
          value={location}
          options={["All", ...locations]}
          onChange={setLocation}
        />

        <div className="date-control">
          <label>Date Range</label>

          <div className="date-pair">
            <input
              type="date"
              min={toInputDate(minDate)}
              max={toInputDate(maxDate)}
              value={startDate}
              onChange={(e) =>
                setStartDate(e.target.value)
              }
            />

            <span>–</span>

            <input
              type="date"
              min={toInputDate(minDate)}
              max={toInputDate(maxDate)}
              value={endDate}
              onChange={(e) =>
                setEndDate(e.target.value)
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}

function KPI({ label, value, delta }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>

      {delta !== undefined && delta !== null && (
        <div
          className={`kpi-delta ${
            delta.startsWith("-")
              ? "good"
              : "bad"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function KPIStrip({ rows, baseline }) {
  const rejection = sum(rows, "rejection quantity");
  const production = sum(rows, "production quantity");
  const cost = sum(rows, "total_cost");
  const ppm = ppmValue(rows);

  const rate =
    production > 0
      ? (rejection / production) * 100
      : 0;

  const affectedParts = new Set(
    rows
      .filter((r) => r["rejection quantity"] > 0)
      .map((r) => r.part_no_clean)
      .filter(Boolean)
  ).size;

  const bRejection = baseline
    ? sum(baseline, "rejection quantity")
    : 0;

  const bPPM = baseline ? ppmValue(baseline) : 0;

  const bCost = baseline
    ? sum(baseline, "total_cost")
    : 0;

  const delta = (current, previous) =>
    previous
      ? `${(((current - previous) / previous) * 100).toFixed(
          1
        )}%`
      : null;

  return (
    <div className="kpi-grid">
      <KPI
        label="Total Rejections"
        value={rejection.toLocaleString()}
        delta={delta(rejection, bRejection)}
      />

      <KPI
        label="PPM"
        value={ppm.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}
        delta={delta(ppm, bPPM)}
      />

      <KPI
        label="Rejection Cost"
        value={`₹ ${(cost / 100000).toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )} L`}
        delta={delta(cost, bCost)}
      />

      <KPI
        label="Production Qty"
        value={production.toLocaleString()}
      />

      <KPI
        label="Rejection Rate"
        value={`${rate.toFixed(3)}%`}
      />

      <KPI
        label="Affected Parts"
        value={affectedParts.toLocaleString()}
      />
    </div>
  );
}

/* =========================================================
   PAGES
========================================================= */

function Overview({ rows, internal }) {
  const monthly = monthlyTotals(rows);

  return (
    <>
      <h2>Overview</h2>

      <div className="two-col wide-left">
        <LineChart
          rows={monthly}
          xField="month_start"
          yField="rejection_quantity"
          title="Monthly Rejection Trend"
        />

        <ParetoChart
          rows={rows}
          field="defect"
          title="Top Defects (Pareto)"
          n={5}
        />
      </div>

      <div className="three-col">
        <HorizontalBar
          rows={rows}
          field="process"
          title="Rejections by Process"
          n={5}
        />

        <HorizontalBar
          rows={rows}
          field="machine"
          title="Rejections by Machine"
          n={5}
        />

        <LocationBar rows={rows} />
      </div>

      {internal && (
        <div className="dashboard-card">
          <div className="section-title">
            Internal Rejection Summary
          </div>
          <div className="muted">
            Internal Rejection source selected.
          </div>
        </div>
      )}

      <ControlChart rows={monthly} />
    </>
  );
}

function PPMDashboard({
  rows,
  compareParts,
  ppmSingle,
}) {
  const monthly = monthlyTotals(rows);
  const process = aggregatePPM(rows, ["process"]);
  const machine = aggregatePPM(rows, ["machine"]);
  const parts = aggregatePPM(rows, [
    "part_no_clean",
  ]);

  const overall = ppmValue(rows);

  const latest =
    monthly.length > 0
      ? monthly[monthly.length - 1].ppm
      : 0;

  const valid = monthly.filter(
    (x) => x.ppm_denominator > 0
  );

  const best = valid.length
    ? Math.min(...valid.map((x) => x.ppm))
    : 0;

  const worst = valid.length
    ? Math.max(...valid.map((x) => x.ppm))
    : 0;

  const ytd =
    monthly.length > 0
      ? monthly.reduce((a, x) => a + x.ppm, 0) /
        monthly.length
      : 0;

  const status =
    overall <= TARGET_PPM
      ? "Within target"
      : "Above target";

  const denominatorLabel =
    rows.length && "sale quantity" in rows[0]
      ? "Sale Qty"
      : "Production Qty";

  const highProcess = [...process].sort(
    (a, b) => b.ppm - a.ppm
  )[0];

  const highMachine = [...machine].sort(
    (a, b) => b.ppm - a.ppm
  )[0];

  const highPart = parts
    .filter((x) => x.part_no_clean)
    .sort((a, b) => b.ppm - a.ppm)[0];

  const topParts = parts
    .filter((x) => x.part_no_clean)
    .slice(0, 10);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">
            PPM Dashboard
          </div>

          <div className="page-sub">
            Parts Per Million performance · PPM =
            (Rejection Qty × 1,000,000) / Sale Qty
          </div>
        </div>

        <div className="page-sub">
          Target ≤ 20,000 PPM
        </div>
      </div>

      {!rows.some(
        (r) => "sale quantity" in r
      ) && (
        <div className="info-card">
          The uploaded CSV does not contain a Sale
          Qty column. The dashboard therefore uses
          Production Qty as the denominator available
          in the dataset. Once Sale Qty is supplied,
          the same formula will automatically use it.
        </div>
      )}

      <div className="kpi-grid">
        <KPI
          label="PPM (Overall)"
          value={Math.round(overall).toLocaleString()}
        />
        <KPI
          label="PPM (Latest Month)"
          value={Math.round(latest).toLocaleString()}
        />
        <KPI
          label="PPM (YTD Avg)"
          value={Math.round(ytd).toLocaleString()}
        />
        <KPI
          label="Best Month PPM"
          value={Math.round(best).toLocaleString()}
        />
        <KPI
          label="Worst Month PPM"
          value={Math.round(worst).toLocaleString()}
        />
        <KPI
          label="PPM Target"
          value="≤ 20,000"
        />
      </div>

      <div className="small-muted status-line">
        Denominator used: <b>{denominatorLabel}</b>{" "}
        · Current status:{" "}
        <b
          className={
            overall <= TARGET_PPM
              ? "status-good"
              : "status-bad"
          }
        >
          {status}
        </b>
      </div>

      <div className="two-col">
        <PPMByLocation rows={rows} />
        <PPMTrend
          rows={monthly}
          title="PPM Trend (Overall)"
        />
      </div>

      <div className="ppm-gauge-alerts">
        <PPMGauge value={overall} />

        <div className="dashboard-card">
          <div className="section-title">
            PPM Alerts
          </div>

          {overall > TARGET_PPM && (
            <AlertItem
              icon="🔴"
              text={`Overall PPM is ${Math.round(
                overall
              ).toLocaleString()}, above target`}
            />
          )}

          {highProcess &&
            highProcess.ppm > TARGET_PPM && (
              <AlertItem
                icon="🟠"
                text={`${highProcess.process} process PPM is ${Math.round(
                  highProcess.ppm
                ).toLocaleString()}`}
              />
            )}

          {highMachine &&
            highMachine.ppm > TARGET_PPM && (
              <AlertItem
                icon="🟡"
                text={`${highMachine.machine} machine PPM is ${Math.round(
                  highMachine.ppm
                ).toLocaleString()}`}
              />
            )}

          {highPart && highPart.ppm > TARGET_PPM && (
            <AlertItem
              icon="🔴"
              text={`Part ${highPart.part_no_clean} has PPM ${Math.round(
                highPart.ppm
              ).toLocaleString()}`}
            />
          )}

          {overall <= TARGET_PPM &&
            (!highProcess ||
              highProcess.ppm <= TARGET_PPM) &&
            (!highMachine ||
              highMachine.ppm <= TARGET_PPM) &&
            (!highPart ||
              highPart.ppm <= TARGET_PPM) && (
              <>
                <AlertItem
                  icon="🟢"
                  text="No PPM threshold breaches in the selected period"
                />
                <AlertItem
                  icon="🔵"
                  text="Continue monitoring monthly movement"
                />
                <AlertItem
                  icon="🟢"
                  text="Target performance is currently stable"
                />
              </>
            )}
        </div>
      </div>

      <div className="section-title">
        Top 10 Parts by PPM
      </div>

      <DataTable
        rows={topParts.map((x) => ({
          "Part No.": x.part_no_clean,
          PPM: Math.round(x.ppm),
          "Rejection Qty": Math.round(
            x.rejection_quantity
          ),
          Denominator: Math.round(
            x.ppm_denominator
          ),
        }))}
      />

      <div className="two-col">
        <PPMPartLines rows={rows} />
        <ProductionVsPPM rows={rows} />
      </div>

      {compareParts.length > 0 && (
        <div className="dashboard-card">
          <div className="section-title">
            Selected Part Comparison
          </div>

          <div className="compare-pills">
            {compareParts.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {ppmSingle !== "All" && (
        <div className="small-muted">
          Selected PPM part: <b>{ppmSingle}</b>
        </div>
      )}
    </>
  );
}

function PPMGauge({ value }) {
  const max = Math.max(
    TARGET_PPM * 2,
    value * 1.15,
    40000
  );

  const percent = Math.min(
    100,
    (value / max) * 100
  );

  return (
    <div className="gauge-card">
      <div className="section-title">
        PPM Performance vs Target
      </div>

      <div className="gauge">
        <div
          className="gauge-fill"
          style={{
            width: `${percent}%`,
          }}
        />

        <div
          className="gauge-target"
          style={{
            left: `${(TARGET_PPM / max) * 100}%`,
          }}
        />
      </div>

      <div className="gauge-number">
        {Math.round(value).toLocaleString()}
      </div>

      <div className="small-muted">
        Target ≤ {TARGET_PPM.toLocaleString()} PPM
      </div>
    </div>
  );
}

function AlertItem({ icon, text }) {
  return (
    <div className="alert-item">
      <span>{icon}</span>
      {text}
    </div>
  );
}

function PartAnalysis({ rows }) {
  return (
    <>
      <h2>Part Analysis</h2>

      <div className="two-col">
        <HorizontalBar
          rows={rows}
          field="part_name_clean"
          title="Top 10 Rejection Parts"
          n={10}
        />

        <PPMBar
          rows={rows}
          title="Top 10 Parts by PPM"
        />
      </div>

      <LineChart
        rows={monthlyPartTrend(rows)}
        xField="month_start"
        yField="rejection_quantity"
        groupField="part_name_clean"
        title="Top Rejection Parts · 6M Trend"
      />

      <div className="section-title">
        Customer Complaints · Top 50 Parts
      </div>

      <div className="small-muted">
        Tables update with the selected date range
        and active filters.
      </div>

      <div className="section-title">
        1. Top 50 Parts with Highest Rejection
        Occurrences
      </div>

      <DataTable
        rows={customerComplaintTable(rows, "occurrence")}
        height={520}
      />

      <div className="section-title">
        2. Top 50 Parts with Highest Rejection
        Quantities
      </div>

      <DataTable
        rows={customerComplaintTable(rows, "quantity")}
        height={520}
      />
    </>
  );
}

function monthlyPartTrend(rows) {
  const grouped = new Map();

  rows.forEach((r) => {
    const key = `${r.month_start}|||${r.part_name_clean}`;

    if (!r.month_start || !r.part_name_clean)
      return;

    grouped.set(key, {
      month_start: r.month_start,
      part_name_clean: r.part_name_clean,
      rejection_quantity:
        (grouped.get(key)?.rejection_quantity || 0) +
        r["rejection quantity"],
    });
  });

  return [...grouped.values()];
}

function customerComplaintTable(rows, ranking) {
  const grouped = new Map();

  rows.forEach((r) => {
    if (!r.part_no_clean) return;
    if (r["rejection quantity"] <= 0) return;

    if (!grouped.has(r.part_no_clean)) {
      grouped.set(r.part_no_clean, {
        "Part No.": r.part_no_clean,
        "Total rejection occurrences": 0,
        "Total rejection quantity": 0,
        "Total rejection cost": 0,
        Defects: new Set(),
        Processes: new Set(),
        "Location(s)": new Set(),
      });
    }

    const x = grouped.get(r.part_no_clean);

    x["Total rejection occurrences"] += 1;
    x["Total rejection quantity"] +=
      r["rejection quantity"];
    x["Total rejection cost"] += r.total_cost;

    if (r.defect) x.Defects.add(r.defect);
    if (r.process) x.Processes.add(r.process);
    if (r.location) x["Location(s)"].add(r.location);
  });

  let data = [...grouped.values()].map((x) => ({
    ...x,
    Defects: [...x.Defects].join(", "),
    Processes: [...x.Processes].join(", "),
    "Location(s)": [...x["Location(s)"]].join(
      ", "
    ),
  }));

  data.sort((a, b) =>
    ranking === "occurrence"
      ? b["Total rejection occurrences"] -
          a["Total rejection occurrences"] ||
        b["Total rejection quantity"] -
          a["Total rejection quantity"]
      : b["Total rejection quantity"] -
          a["Total rejection quantity"] ||
        b["Total rejection occurrences"] -
          a["Total rejection occurrences"]
  );

  return data.slice(0, 50);
}

function DefectAnalysis({ rows }) {
  return (
    <>
      <h2>Defect Analysis</h2>

      <div className="two-col">
        <ParetoChart
          rows={rows}
          field="defect"
          title="Pareto · Defect Types"
          n={10}
        />

        <HorizontalBar
          rows={rows}
          field="defect"
          title="Most Impactful Root Causes"
          n={10}
        />
      </div>
    </>
  );
}

function ProcessAnalysis({ rows }) {
  const grouped = topNByGroup(
    rows,
    "location",
    "process",
    5
  );

  return (
    <>
      <h2>Process Analysis</h2>

      <HorizontalBar
        rows={rows}
        field="process"
        title="Rejections by Process"
        n={15}
      />

      <GroupedBar
        rows={grouped}
        categoryField="process"
        groupField="location"
        title="Top Processes by Location"
      />
    </>
  );
}

function GroupedBar({
  rows,
  categoryField,
  groupField,
  title,
}) {
  const categories = [
    ...new Set(rows.map((x) => x[categoryField])),
  ];

  const groups = [
    ...new Set(rows.map((x) => x[groupField])),
  ];

  return (
    <PlotCard
      data={groups.map((group, i) => ({
        type: "bar",
        name: group,
        x: categories,
        y: categories.map(
          (cat) =>
            rows.find(
              (x) =>
                x[groupField] === group &&
                x[categoryField] === cat
            )?.["rejection quantity"] || 0
        ),
        marker: {
          color:
            LOCATION_COLORS[group] ||
            PALETTE[i % PALETTE.length],
        },
        text: categories.map((cat) => {
          const v =
            rows.find(
              (x) =>
                x[groupField] === group &&
                x[categoryField] === cat
            )?.["rejection quantity"] || 0;

          return v ? v.toLocaleString() : "";
        }),
        textposition: "outside",
      }))}
      layout={{
        ...plotLayout(
          title,
          "",
          "Rejection Qty"
        ),
        barmode: "group",
        xaxis: {
          ...plotLayout().xaxis,
          tickangle: -35,
        },
      }}
    />
  );
}

function MachineAnalysis({ rows }) {
  return (
    <>
      <h2>Machine Analysis</h2>

      <HorizontalBar
        rows={rows}
        field="machine"
        title="Rejections by Machine"
        n={15}
      />
    </>
  );
}

function LocationAnalysis({ rows }) {
  return (
    <>
      <h2>Location Analysis</h2>

      <div className="two-col">
        <LocationBar rows={rows} />

        <LineChart
          rows={monthlySummary(rows)}
          xField="month_start"
          yField="rejection_quantity"
          groupField="location"
          title="Location-wise Trend"
        />
      </div>
    </>
  );
}

function CostAnalysis({ rows }) {
  return (
    <>
      <h2>Cost Analysis</h2>

      <ParetoChart
        rows={rows}
        field="part_no_clean"
        valueField="total_cost"
        n={15}
        title="Pareto · Rejection Cost"
      />
    </>
  );
}

function TrendAnalysis({ rows }) {
  const monthly = monthlyTotals(rows);

  const locationMonthly = monthlySummary(rows);

  return (
    <>
      <h2>Trend Analysis</h2>

      <div className="two-col">
        <LineChart
          rows={monthly}
          xField="month_start"
          yField="rejection_quantity"
          title="Monthly Rejection Trend"
        />

        <PPMTrend
          rows={monthly}
          title="Monthly PPM Trend"
        />
      </div>

      <SegmentedShare rows={locationMonthly} />
    </>
  );
}

function SegmentedShare({ rows }) {
  const months = [
    ...new Set(rows.map((x) => x.month_start)),
  ].sort();

  const locations = [
    ...new Set(rows.map((x) => x.location)),
  ];

  return (
    <PlotCard
      data={locations.map((location, i) => ({
        type: "bar",
        name: location,
        x: months,
        y: months.map((month) => {
          const total = rows
            .filter((x) => x.month_start === month)
            .reduce(
              (a, x) =>
                a + x.rejection_quantity,
              0
            );

          const value = rows
            .filter(
              (x) =>
                x.month_start === month &&
                x.location === location
            )
            .reduce(
              (a, x) =>
                a + x.rejection_quantity,
              0
            );

          return total ? (value / total) * 100 : 0;
        }),
        marker: {
          color:
            LOCATION_COLORS[location] ||
            PALETTE[i % PALETTE.length],
        },
        text: months.map((month) => {
          const total = rows
            .filter((x) => x.month_start === month)
            .reduce(
              (a, x) =>
                a + x.rejection_quantity,
              0
            );

          const value = rows
            .filter(
              (x) =>
                x.month_start === month &&
                x.location === location
            )
            .reduce(
              (a, x) =>
                a + x.rejection_quantity,
              0
            );

          const share = total
            ? (value / total) * 100
            : 0;

          return share >= 8
            ? `${Math.round(share)}%`
            : "";
        }),
        textposition: "inside",
      }))}
      layout={{
        ...plotLayout(
          "Monthly Location Contribution %",
          "Month",
          "Share"
        ),
        barmode: "stack",
        yaxis: {
          ...plotLayout().yaxis,
          range: [0, 100],
          ticksuffix: "%",
        },
      }}
    />
  );
}

/* =========================================================
   TABLE
========================================================= */

function DataTable({ rows, height = 360 }) {
  if (!rows.length) {
    return (
      <div className="empty-table">
        No data available for the selected filters.
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div
      className="table-wrapper"
      style={{ maxHeight: height }}
    >
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>
                  {typeof row[c] === "number"
                    ? row[c].toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )
                    : String(row[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailTable({ rows }) {
  const fields = [
    "Date",
    "location",
    "process",
    "machine",
    "part_no_clean",
    "part_name_clean",
    "defect",
    "rejection quantity",
    "production quantity",
    "ppm_denominator",
    "total_cost",
    "safe_ppm",
  ];

  const available = fields.filter((x) =>
    rows.some((r) => x in r)
  );

  const sorted = [...rows].sort(
    (a, b) => b.Date - a.Date
  );

  return (
    <DataTable
      rows={sorted.map((r) => {
        const x = {};

        available.forEach((f) => {
          x[f] =
            f === "Date"
              ? formatDate(r[f])
              : r[f];
        });

        return x;
      })}
      height={280}
    />
  );
}

/* =========================================================
   UTILITIES
========================================================= */

function formatDate(d) {
  if (!d) return "";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(d) {
  if (!d) return "";

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState("Overview");

  const [location, setLocation] = useState("All");

  const [processFilter, setProcessFilter] =
    useState([]);

  const [machineFilter, setMachineFilter] =
    useState([]);

  const [partFilter, setPartFilter] = useState([]);

  const [defectFilter, setDefectFilter] =
    useState([]);

  const [compareParts, setCompareParts] =
    useState([]);

  const [ppmSingle, setPpmSingle] =
    useState("All");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [uploaded, setUploaded] = useState(false);

  const onUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const text = await file.text();
    const parsed = normalizeRows(
      parseCSV(text)
    );

    setRows(parsed);
    setUploaded(true);

    if (parsed.length) {
      const min = new Date(
        Math.min(
          ...parsed.map((r) => r.Date.getTime())
        )
      );

      const max = new Date(
        Math.max(
          ...parsed.map((r) => r.Date.getTime())
        )
      );

      setStartDate(toInputDate(min));
      setEndDate(toInputDate(max));
    }

    setLocation("All");
    setProcessFilter([]);
    setMachineFilter([]);
    setPartFilter([]);
    setDefectFilter([]);
    setCompareParts([]);
    setPpmSingle("All");
  };

  const filteredRows = useMemo(() => {
    if (!rows.length) return [];

    return rows.filter((r) => {
      if (
        startDate &&
        toInputDate(r.Date) < startDate
      )
        return false;

      if (
        endDate &&
        toInputDate(r.Date) > endDate
      )
        return false;

      if (
        location !== "All" &&
        r.location !== location
      )
        return false;

      if (
        processFilter.length &&
        !processFilter.includes(r.process)
      )
        return false;

      if (
        machineFilter.length &&
        !machineFilter.includes(r.machine)
      )
        return false;

      if (
        partFilter.length &&
        !partFilter.includes(r.part_no_clean)
      )
        return false;

      if (
        defectFilter.length &&
        !defectFilter.includes(r.defect)
      )
        return false;

      return true;
    });
  }, [
    rows,
    startDate,
    endDate,
    location,
    processFilter,
    machineFilter,
    partFilter,
    defectFilter,
  ]);

  const baseline = useMemo(() => {
    if (!startDate || !endDate || !rows.length)
      return [];

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    const days =
      Math.round(
        (end.getTime() - start.getTime()) /
          86400000
      ) + 1;

    const previousEnd = new Date(
      start.getTime() - 86400000
    );

    const previousStart = new Date(
      previousEnd.getTime() -
        (days - 1) * 86400000
    );

    return rows.filter(
      (r) =>
        r.Date >= previousStart &&
        r.Date <= previousEnd
    );
  }, [rows, startDate, endDate]);

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        rows={rows}
        location={location}
        setLocation={setLocation}
        processFilter={processFilter}
        setProcessFilter={setProcessFilter}
        machineFilter={machineFilter}
        setMachineFilter={setMachineFilter}
        partFilter={partFilter}
        setPartFilter={setPartFilter}
        defectFilter={defectFilter}
        setDefectFilter={setDefectFilter}
        compareParts={compareParts}
        setCompareParts={setCompareParts}
        ppmSingle={ppmSingle}
        setPpmSingle={setPpmSingle}
        onUpload={onUpload}
      />

      <main className="main">
        {!rows.length ? (
          <div className="welcome">
            <div className="welcome-mark">◇</div>

            <h1>
              InsightEdge Quality Intelligence
            </h1>

            <p>
              Upload your CSV dataset from the
              sidebar to begin.
            </p>

            <label className="primary-upload">
              Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={onUpload}
                hidden
              />
            </label>
          </div>
        ) : (
          <>
            <Header
              rows={rows}
              location={location}
              setLocation={setLocation}
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />

            {filteredRows.length === 0 ? (
              <div className="warning">
                No rows match the current filters.
                Expand the date range or clear one
                or more filters.
              </div>
            ) : (
              <>
                {page !== "PPM Dashboard" && (
                  <KPIStrip
                    rows={filteredRows}
                    baseline={baseline}
                  />
                )}

                {page === "Overview" && (
                  <Overview
                    rows={filteredRows}
                    internal={uploaded}
                  />
                )}

                {page === "PPM Dashboard" && (
                  <PPMDashboard
                    rows={filteredRows}
                    compareParts={compareParts}
                    ppmSingle={ppmSingle}
                  />
                )}

                {page === "Part Analysis" && (
                  <PartAnalysis
                    rows={filteredRows}
                  />
                )}

                {page === "Defect Analysis" && (
                  <DefectAnalysis
                    rows={filteredRows}
                  />
                )}

                {page === "Process Analysis" && (
                  <ProcessAnalysis
                    rows={filteredRows}
                  />
                )}

                {page === "Machine Analysis" && (
                  <MachineAnalysis
                    rows={filteredRows}
                  />
                )}

                {page === "Location Analysis" && (
                  <LocationAnalysis
                    rows={filteredRows}
                  />
                )}

                {page === "Cost Analysis" && (
                  <CostAnalysis
                    rows={filteredRows}
                  />
                )}

                {page === "Trend Analysis" && (
                  <TrendAnalysis
                    rows={filteredRows}
                  />
                )}

                <details className="records-expander">
                  <summary>
                    View filtered complaint records
                  </summary>

                  <DetailTable
                    rows={filteredRows}
                  />
                </details>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}