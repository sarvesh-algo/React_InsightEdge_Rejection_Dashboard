import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { normalizeData } from './dataEngine'

export async function parseUploadedFile(file) {
  if (!file) {
    throw new Error('No file selected.')
  }

  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.csv')) {
    return parseCSV(file)
  }

  if (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls')
  ) {
    return parseExcel(file)
  }

  throw new Error(
    'Unsupported file type. Please upload CSV or Excel.'
  )
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        if (results.errors?.length) {
          reject(
            new Error(
              results.errors[0].message ||
                'Unable to parse CSV file.'
            )
          )
          return
        }

        try {
          const data = normalizeData(
            results.data
          )

          resolve(data)
        } catch (error) {
          reject(error)
        }
      },

      error: (error) => {
        reject(
          new Error(
            error.message ||
              'Unable to read CSV file.'
          )
        )
      },
    })
  })
}

async function parseExcel(file) {
  const buffer = await file.arrayBuffer()

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  })

  if (!workbook.SheetNames.length) {
    throw new Error(
      'The Excel file contains no worksheets.'
    )
  }

  const sheetName =
    workbook.SheetNames[0]

  const worksheet =
    workbook.Sheets[sheetName]

  const rows =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        defval: '',
        raw: true,
      }
    )

  if (!rows.length) {
    throw new Error(
      'The selected worksheet contains no data.'
    )
  }

  return normalizeData(rows)
}

export function getFileExtension(fileName) {
  const name = String(fileName || '')
    .toLowerCase()

  if (name.endsWith('.csv')) {
    return 'csv'
  }

  if (name.endsWith('.xlsx')) {
    return 'xlsx'
  }

  if (name.endsWith('.xls')) {
    return 'xls'
  }

  return ''
}