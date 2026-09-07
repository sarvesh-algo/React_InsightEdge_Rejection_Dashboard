import {
  normalizeData,
  calculatePPM,
  aggregatePPM,
  monthlyTotals,
} from './dataEngine'

export function runPPMValidation(rawRows) {
  const rows = normalizeData(rawRows)

  const totalRejection = rows.reduce(
    (sum, row) =>
      sum + Number(row['rejection quantity'] || 0),
    0
  )

  const totalProduction = rows.reduce(
    (sum, row) =>
      sum + Number(row.ppm_denominator || 0),
    0
  )

  const calculatedPPM =
    calculatePPM(rows)

  const expectedPPM =
    totalProduction > 0
      ? (totalRejection * 1000000) /
        totalProduction
      : 0

  const locationPPM =
    aggregatePPM(rows, ['location'])

  const monthlyPPM =
    monthlyTotals(rows)

  return {
    rowCount: rows.length,
    totalRejection,
    totalProduction,
    calculatedPPM,
    expectedPPM,
    difference:
      calculatedPPM - expectedPPM,
    locationPPM,
    monthlyPPM,
  }
}