// src/data/dataEngine.js

const PPM_MULTIPLIER = 1000000

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0
  }

  const number = Number(
    String(value).replace(/,/g, '').trim()
  )

  return Number.isFinite(number) ? number : 0
}

function clean(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  return String(value).trim()
}

function cleanUpper(value) {
  return clean(value).toUpperCase()
}

export function normalizeColumnName(column) {
  return String(column)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/*
 * Convert one raw CSV/Excel row into the
 * structure used by the dashboard.
 *
 * The uploaded CSV contains:
 *   rejection quantity
 *   production quantity
 *   PPM
 *
 * The Python dashboard works with:
 *   rejection quantity
 *   production quantity
 *   ppm_denominator
 *
 * For this dataset, production quantity is
 * the PPM denominator.
 */
export function normalizeRow(row) {
  const normalized = {}

  Object.entries(row).forEach(
    ([key, value]) => {
      normalized[
        normalizeColumnName(key)
      ] = value
    }
  )

  const rejectionQuantity = toNumber(
    normalized['rejection quantity']
  )

  const productionQuantity = toNumber(
    normalized['production quantity']
  )

  /*
   * PPM denominator:
   * production quantity from the source file.
   */
  const ppmDenominator =
    productionQuantity

  const ppm =
    ppmDenominator > 0
      ? (
          rejectionQuantity *
          PPM_MULTIPLIER
        ) / ppmDenominator
      : 0

  return {
    ...normalized,

    'rejection quantity':
      rejectionQuantity,

    'production quantity':
      productionQuantity,

    ppm_denominator:
      ppmDenominator,

    ppm:
      Number.isFinite(ppm)
        ? ppm
        : 0,

    'total cost': toNumber(
      normalized['total cost']
    ),

    location: cleanUpper(
      normalized.location
    ),

    process: cleanUpper(
      normalized.process
    ),

    machine: cleanUpper(
      normalized.machine
    ),

    defect: clean(
      normalized.defects ??
      normalized.defect
    ),

    part_no_clean: clean(
      normalized['part no.'] ??
      normalized['part no']
    ),

    part_name_clean: clean(
      normalized['part name']
    ),

    date:
      normalized.date ??
      normalized['date'],
  }
}

export function normalizeData(rows) {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows.map(normalizeRow)
}

export function getDateValue(row) {
  const value = row.date

  if (!value) {
    return null
  }

  /*
   * Handles the CSV format:
   * DD-MM-YYYY
   */
  if (
    typeof value === 'string' &&
    /^\d{2}-\d{2}-\d{4}$/.test(
      value.trim()
    )
  ) {
    const [
      day,
      month,
      year,
    ] = value
      .trim()
      .split('-')
      .map(Number)

    const date = new Date(
      year,
      month - 1,
      day
    )

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date
    }

    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

export function filterData(
  rows,
  {
    startDate = null,
    endDate = null,
    location = 'All Locations',
    process = 'All Processes',
    machine = 'All Machines',
    part = 'All Parts',
    defect = 'All Defects',
  } = {}
) {
  return rows.filter((row) => {
    const rowDate =
      getDateValue(row)

    if (startDate && rowDate) {
      const start =
        new Date(startDate)

      if (rowDate < start) {
        return false
      }
    }

    if (endDate && rowDate) {
      const end =
        new Date(endDate)

      /*
       * Inclusive end date.
       * Matches the Python implementation.
       */
      end.setDate(
        end.getDate() + 1
      )

      if (rowDate >= end) {
        return false
      }
    }

    if (
      location !== 'All Locations' &&
      row.location !==
        cleanUpper(location)
    ) {
      return false
    }

    if (
      process !== 'All Processes' &&
      row.process !==
        cleanUpper(process)
    ) {
      return false
    }

    if (
      machine !== 'All Machines' &&
      row.machine !==
        cleanUpper(machine)
    ) {
      return false
    }

    if (
      part !== 'All Parts' &&
      row.part_no_clean !==
        clean(part)
    ) {
      return false
    }

    if (
      defect !== 'All Defects' &&
      row.defect !==
        clean(defect)
    ) {
      return false
    }

    return true
  })
}

export function sumColumn(
  rows,
  column
) {
  return rows.reduce(
    (total, row) =>
      total +
      toNumber(row[column]),
    0
  )
}

export function calculatePPM(
  rows
) {
  const rejectionQuantity =
    sumColumn(
      rows,
      'rejection quantity'
    )

  const denominator =
    sumColumn(
      rows,
      'ppm_denominator'
    )

  if (denominator <= 0) {
    return 0
  }

  return (
    rejectionQuantity *
    PPM_MULTIPLIER
  ) / denominator
}

export function aggregatePPM(
  rows,
  groupColumns = []
) {
  if (!rows.length) {
    return []
  }

  const groups = new Map()

  rows.forEach((row) => {
    const key =
      groupColumns
        .map(
          (column) =>
            String(
              row[column] ?? ''
            )
        )
        .join('|||')

    if (!groups.has(key)) {
      groups.set(key, {
        values: {},
        'rejection quantity': 0,
        ppm_denominator: 0,
      })

      groupColumns.forEach(
        (column) => {
          groups.get(key).values[
            column
          ] = row[column] ?? ''
        }
      )
    }

    const group =
      groups.get(key)

    group[
      'rejection quantity'
    ] += toNumber(
      row['rejection quantity']
    )

    group.ppm_denominator +=
      toNumber(
        row.ppm_denominator
      )
  })

  return Array.from(
    groups.values()
  ).map((group) => {
    const ppm =
      group.ppm_denominator > 0
        ? (
            group[
              'rejection quantity'
            ] *
            PPM_MULTIPLIER
          ) /
          group.ppm_denominator
        : 0

    return {
      ...group.values,

      'rejection quantity':
        group[
          'rejection quantity'
        ],

      ppm_denominator:
        group.ppm_denominator,

      ppm:
        Number.isFinite(ppm)
          ? ppm
          : 0,
    }
  })
}

export function groupAndSum(
  rows,
  groupColumn,
  valueColumn
) {
  const groups = new Map()

  rows.forEach((row) => {
    const key =
      row[groupColumn] ?? ''

    if (!groups.has(key)) {
      groups.set(key, 0)
    }

    groups.set(
      key,
      groups.get(key) +
        toNumber(
          row[valueColumn]
        )
    )
  })

  return Array.from(
    groups.entries()
  )
    .map(
      ([name, value]) => ({
        name,
        value,
      })
    )
    .sort(
      (a, b) =>
        b.value - a.value
    )
}

export function getUniqueValues(
  rows,
  column
) {
  return [
    ...new Set(
      rows
        .map(
          (row) => row[column]
        )
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ''
        )
    ),
  ].sort()
}

export function getMonthStart(
  dateValue
) {
  const date =
    getDateValue({
      date: dateValue,
    })

  if (!date) {
    return null
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  )
}

export function addMonthStart(
  rows
) {
  return rows.map((row) => ({
    ...row,

    month_start:
      getMonthStart(row.date),
  }))
}

export function monthlySummary(
  rows
) {
  const data =
    addMonthStart(rows)

  const groups = new Map()

  data.forEach((row) => {
    if (!row.month_start) {
      return
    }

    const month =
      row.month_start
        .toISOString()
        .slice(0, 10)

    const location =
      row.location ?? ''

    const key =
      `${month}|||${location}`

    if (!groups.has(key)) {
      groups.set(key, {
        month_start:
          row.month_start,

        location,

        'rejection quantity': 0,

        'total cost': 0,

        'production quantity': 0,

        ppm_denominator: 0,
      })
    }

    const group =
      groups.get(key)

    group[
      'rejection quantity'
    ] += toNumber(
      row['rejection quantity']
    )

    group[
      'total cost'
    ] += toNumber(
      row['total cost']
    )

    group[
      'production quantity'
    ] += toNumber(
      row['production quantity']
    )

    group.ppm_denominator +=
      toNumber(
        row.ppm_denominator
      )
  })

  return Array.from(
    groups.values()
  ).sort(
    (a, b) =>
      a.month_start -
      b.month_start ||
      a.location.localeCompare(
        b.location
      )
  )
}

export function monthlyTotals(
  rows
) {
  const data =
    addMonthStart(rows)

  const groups = new Map()

  data.forEach((row) => {
    if (!row.month_start) {
      return
    }

    const month =
      row.month_start
        .toISOString()
        .slice(0, 10)

    if (!groups.has(month)) {
      groups.set(month, {
        month_start:
          row.month_start,

        'rejection quantity': 0,

        'total cost': 0,

        'production quantity': 0,

        ppm_denominator: 0,
      })
    }

    const group =
      groups.get(month)

    group[
      'rejection quantity'
    ] += toNumber(
      row['rejection quantity']
    )

    group[
      'total cost'
    ] += toNumber(
      row['total cost']
    )

    group[
      'production quantity'
    ] += toNumber(
      row['production quantity']
    )

    group.ppm_denominator +=
      toNumber(
        row.ppm_denominator
      )
  })

  return Array.from(
    groups.values()
  )
    .map((row) => ({
      ...row,

      ppm:
        row.ppm_denominator > 0
          ? (
              row[
                'rejection quantity'
              ] *
              PPM_MULTIPLIER
            ) /
            row.ppm_denominator
          : 0,
    }))
    .sort(
      (a, b) =>
        a.month_start -
        b.month_start
    )
}

export function topN(
  rows,
  valueColumn,
  n = 10
) {
  return [...rows]
    .sort(
      (a, b) =>
        toNumber(
          b[valueColumn]
        ) -
        toNumber(
          a[valueColumn]
        )
    )
    .slice(0, n)
}

export function validateData(
  rows
) {
  if (!rows.length) {
    return {
      valid: false,
      missingColumns: [
        'rejection quantity',
        'production quantity',
      ],
    }
  }

  const sample =
    rows[0]

  const requiredColumns = [
    'rejection quantity',
    'production quantity',
  ]

  const missingColumns =
    requiredColumns.filter(
      (column) =>
        !(column in sample)
    )

  return {
    valid:
      missingColumns.length === 0,

    missingColumns,
  }
}