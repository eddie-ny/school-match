// Shared constants. Subject names here must match the names used in program requirements.

export const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']

export const gradeToNum = (g) => {
  const i = GRADES.indexOf(g)
  return i === -1 ? null : i + 1
}

export const CORE_SUBJECTS = [
  'English Language',
  'Core Mathematics',
  'Integrated Science',
  'Social Studies',
]

export const ELECTIVE_SUBJECTS = [
  'Elective Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Geography',
  'History',
  'Government',
  'Literature in English',
  'Financial Accounting',
  'Business Management',
  'French',
  'Information and Communication Technology',
]

export const SHS_PROGRAMS = [
  'General Science',
  'General Arts',
  'Business',
  'Visual Arts',
  'Home Economics',
  'Agriculture',
  'Technical',
]

export const PLANS = [
  { id: '1m', label: '1 month', months: 1, priceUsd: null },
  { id: '3m', label: '3 months', months: 3, priceUsd: null },
  { id: '6m', label: '6 months', months: 6, priceUsd: null },
  { id: '1y', label: '1 year', months: 12, priceUsd: null, note: 'Discounted' },
]

export const TRIAL_HOURS = 24

// Eligibility label thresholds (aggregate difference = student aggregate minus cut-off, lower is better).
// The spec gives the labels but not exact numbers, so these are assumptions the client should confirm.
export const LABEL_RULES = {
  strongMatchAtLeast: 3, // student is 3+ points better than the cut-off
  goodChanceWithin: 2, // from 2 points better up to equal
  worthATryUpTo: 3, // up to 3 points worse
}

export const DISCLAIMER =
  'This is guidance, not a guarantee of admission. Always confirm requirements with the school.'

// Fields of study shown on the home page and used as filters.
// Programs carry a free-text "field"; these are the groups students pick from.
export const FIELDS = [
  { id: 'Computing', blurb: 'Computer science, IT, data' },
  { id: 'Engineering', blurb: 'Civil, electrical, mechanical' },
  { id: 'Business', blurb: 'Management, finance, marketing' },
  { id: 'Health', blurb: 'Medicine, nursing, pharmacy' },
  { id: 'Science', blurb: 'Physics, chemistry, biology' },
  { id: 'Arts', blurb: 'Humanities, languages, design' },
  { id: 'Law', blurb: 'Law and public policy' },
  { id: 'Education', blurb: 'Teaching and development' },
]
