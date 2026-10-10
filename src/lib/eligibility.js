import { gradeToNum, LABEL_RULES } from './constants'

// grades: { 'English Language': 'B3', 'Physics': 'C4', ... }
// electives: array of elective subject names the student entered
export function computeAggregate(grades, coreSubjects, electiveSubjects) {
  const pick = (subjects) =>
    subjects
      .map((s) => gradeToNum(grades[s]))
      .filter((n) => n !== null)
      .sort((a, b) => a - b)
      .slice(0, 3)

  const core = pick(coreSubjects)
  const elec = pick(electiveSubjects)
  if (core.length < 3 || elec.length < 3) {
    return { aggregate: null, reason: 'Enter at least 3 core and 3 elective grades to get an aggregate.' }
  }
  const aggregate = [...core, ...elec].reduce((a, b) => a + b, 0)
  return { aggregate, reason: null }
}

// Step 1: hard requirements. Returns list of failures.
export function checkRequirements(program, grades) {
  const failures = []
  for (const req of program.requirements || []) {
    const have = gradeToNum(grades[req.subject])
    if (have === null) {
      failures.push(`${req.subject}: no grade entered`)
      continue
    }
    if (req.minGrade) {
      const need = gradeToNum(req.minGrade)
      if (have > need) failures.push(`${req.subject}: needs ${req.minGrade} or better, you have ${grades[req.subject]}`)
    }
  }
  return failures
}

export function labelFor(diff) {
  const r = LABEL_RULES
  if (diff <= -r.strongMatchAtLeast) return 'Strong match'
  if (diff <= 0) return 'Good chance'
  if (diff <= r.worthATryUpTo) return 'Worth a try'
  return 'Long shot'
}

export function evaluateProgram(program, student) {
  // student: { grades, aggregate, mode, sat, isInternational }
  const notes = []
  const failures = checkRequirements(program, student.grades)

  const base = {
    programId: program.id,
    failures,
    notes,
    projection: student.mode === 'terminal',
    aggregate: student.aggregate,
    cutoff: program.cutoffAggregate ?? null,
  }

  if (failures.length) return { ...base, label: 'Not yet eligible', diff: null }

  // International extras
  if (program.international) {
    const eng = gradeToNum(student.grades['English Language'])
    if (program.englishTestWaiver && eng !== null && eng <= 6) {
      notes.push('English test waiver likely (English C6 or better). Confirm with the school.')
    } else if (eng !== null && eng > 6) {
      notes.push('IELTS or TOEFL will probably be needed.')
    } else if (!program.englishTestWaiver) {
      notes.push('Check whether an IELTS or TOEFL score is required.')
    }
    if (program.satLow != null && program.satHigh != null) {
      if (student.sat) {
        if (student.sat >= program.satLow) notes.push(`SAT ${student.sat} is inside or above the school range (${program.satLow} to ${program.satHigh}).`)
        else notes.push(`SAT ${student.sat} is below the school range (${program.satLow} to ${program.satHigh}).`)
      } else {
        notes.push(`School SAT range is ${program.satLow} to ${program.satHigh}. Add your SAT score to compare.`)
      }
    }
  }

  if (student.aggregate == null || program.cutoffAggregate == null) {
    // Without any requirement or cut-off data we must not imply the student qualifies.
    if (!(program.requirements || []).length && program.cutoffAggregate == null) {
      notes.push('No requirements or cut-off added for this program yet.')
      return { ...base, label: 'No data yet', diff: null }
    }
    notes.push(
      program.cutoffAggregate == null
        ? 'Requirements met. No cut-off data for this program yet, so no match label.'
        : 'Add your grades to get an aggregate.'
    )
    return { ...base, label: 'Requirements met', diff: null }
  }

  const diff = student.aggregate - program.cutoffAggregate
  const label = labelFor(diff)

  if (program.international && program.foundationAvailable && (label === 'Worth a try' || label === 'Long shot')) {
    notes.push('A foundation year may be an option if direct entry falls short.')
  }
  return { ...base, label, diff }
}

const ORDER = {
  'Strong match': 0,
  'Good chance': 1,
  'Worth a try': 2,
  'Requirements met': 3,
  'Long shot': 4,
  'No data yet': 5,
  'Not yet eligible': 6,
}

// Target first, then everything else ranked below it.
export function rankAll(programs, targetId, student) {
  const results = programs.map((p) => ({ program: p, result: evaluateProgram(p, student) }))
  const target = results.find((r) => r.program.id === targetId) || null
  const others = results
    .filter((r) => r.program.id !== targetId)
    .sort((a, b) => {
      const o = ORDER[a.result.label] - ORDER[b.result.label]
      if (o !== 0) return o
      return (a.result.diff ?? 99) - (b.result.diff ?? 99)
    })
  return { target, others }
}

const byLabel = (a, b) => {
  const o = ORDER[a.result.label] - ORDER[b.result.label]
  if (o !== 0) return o
  return (a.result.diff ?? 99) - (b.result.diff ?? 99)
}

// The student picks a program by name (for example "BSc Computer Science"). Every school that
// offers it is checked and ranked first, then everything else is ranked below.
export function rankByProgramName(programs, programName, student) {
  const all = programs.map((p) => ({ program: p, result: evaluateProgram(p, student) }))
  return {
    targets: all.filter((r) => r.program.name === programName).sort(byLabel),
    others: all.filter((r) => r.program.name !== programName).sort(byLabel),
  }
}
