// Small CSV parser (handles quoted fields). Used by the admin spreadsheet import.
export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cell += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  if (!rows.length) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}

const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
const yes = (v) => String(v).toLowerCase() === 'yes'

export function rowsToSchools(rows) {
  return rows.map((r, i) => ({
    id: `imp-s-${r.school_name}-${i}`.toLowerCase().replace(/\s+/g, '-'),
    name: r.school_name,
    country: r.country,
    type: r.type,
    category: r.category,
    city: r.city,
    website: r.website,
    verified: yes(r.verified),
  }))
}

export function rowsToPrograms(rows, schools) {
  return rows.map((r, i) => {
    const school = schools.find((s) => s.name.toLowerCase() === r.school_name.toLowerCase())
    const requirements = []
    if (r.min_core_maths) requirements.push({ subject: 'Core Mathematics', minGrade: r.min_core_maths })
    if (r.min_core_english) requirements.push({ subject: 'English Language', minGrade: r.min_core_english })
    if (r.min_core_science) requirements.push({ subject: 'Integrated Science', minGrade: r.min_core_science })
    // The sheet gives required electives without a grade, so only "must have taken it" is checked.
    if (r.required_electives) {
      r.required_electives.split(',').map((x) => x.trim()).filter(Boolean).forEach((subject) => {
        requirements.push({ subject: normalizeElective(subject), minGrade: null })
      })
    }
    return {
      id: `imp-p-${i}-${r.program_name}`.toLowerCase().replace(/\s+/g, '-'),
      schoolId: school?.id ?? null,
      schoolName: r.school_name,
      name: r.program_name,
      level: r.level,
      field: r.field,
      feesUsd: num(r.fees_usd),
      durationYears: num(r.duration_years),
      requirements,
      cutoffAggregate: num(r.cutoff_aggregate),
      cutoffYear: num(r.cutoff_year),
      satLow: num(r.sat_low),
      satHigh: num(r.sat_high),
      englishTestWaiver: yes(r.english_test_waiver),
      foundationAvailable: yes(r.foundation_available),
      international: school ? school.country.toLowerCase() !== 'ghana' : false,
      verified: yes(r.verified),
    }
  })
}

export function rowsToScholarships(rows) {
  return rows.map((r, i) => ({
    id: `imp-sc-${i}-${r.name}`.toLowerCase().replace(/\s+/g, '-'),
    name: r.name,
    funder: r.funder,
    country: r.country,
    fundingType: r.funding_type?.includes('Full') ? 'Full' : 'Partial',
    level: r.level,
    minAggregate: num(r.min_aggregate),
    minSat: num(r.min_sat),
    criteria: r.criteria,
    deadline: r.deadline,
    link: r.link,
    verified: yes(r.verified),
  }))
}

function normalizeElective(s) {
  const t = s.toLowerCase()
  if (t === 'elective maths' || t === 'elective mathematics') return 'Elective Mathematics'
  if (t === 'ict') return 'Information and Communication Technology'
  return s
}
