// STARTER DATA. Everything here is unverified.
// Real schools: only the name, country, type, city and website are filled in.
// No cut-offs, fees or requirements are invented for real schools; unknown values stay null.
// Entries with demo: true are made-up placeholders so the eligibility engine can be shown working.
// Replace all of this by importing the client's spreadsheets in the Admin page.

export const seedSchools = [
  { id: 'ug', name: 'University of Ghana', country: 'Ghana', type: 'Public', category: '', city: 'Accra', website: 'https://www.ug.edu.gh', verified: false },
  { id: 'knust', name: 'Kwame Nkrumah University of Science and Technology', country: 'Ghana', type: 'Public', category: '', city: 'Kumasi', website: 'https://www.knust.edu.gh', verified: false },
  { id: 'ucc', name: 'University of Cape Coast', country: 'Ghana', type: 'Public', category: '', city: 'Cape Coast', website: 'https://ucc.edu.gh', verified: false },
  { id: 'ashesi', name: 'Ashesi University', country: 'Ghana', type: 'Private', category: '', city: 'Berekuso', website: 'https://www.ashesi.edu.gh', verified: false },
  { id: 'uoft', name: 'University of Toronto', country: 'Canada', type: 'Public', category: '', city: 'Toronto', website: 'https://www.utoronto.ca', verified: false },
  { id: 'manchester', name: 'University of Manchester', country: 'United Kingdom', type: 'Public', category: '', city: 'Manchester', website: 'https://www.manchester.ac.uk', verified: false },
  { id: 'uct', name: 'University of Cape Town', country: 'South Africa', type: 'Public', category: '', city: 'Cape Town', website: 'https://www.uct.ac.za', verified: false },
  // Demo placeholders
  { id: 'demo-gh', name: 'Sample University Ghana (demo)', country: 'Ghana', type: 'Public', category: '', city: 'Accra', website: '', verified: false, demo: true },
  { id: 'demo-intl', name: 'Sample International University (demo)', country: 'United Kingdom', type: 'Public', category: '', city: 'London', website: '', verified: false, demo: true },
]

const blank = {
  feesUsd: null, durationYears: null, requirements: [], cutoffAggregate: null, cutoffYear: null,
  satLow: null, satHigh: null, englishTestWaiver: false, foundationAvailable: false, verified: false,
}

const cs = (schoolId, schoolName, international) => ({
  ...blank, id: `${schoolId}-cs`, schoolId, schoolName, name: 'BSc Computer Science',
  level: 'Undergraduate', field: 'Computing', international,
})

export const seedPrograms = [
  cs('ug', 'University of Ghana', false),
  cs('knust', 'Kwame Nkrumah University of Science and Technology', false),
  cs('ashesi', 'Ashesi University', false),
  cs('uoft', 'University of Toronto', true),
  cs('manchester', 'University of Manchester', true),
  cs('uct', 'University of Cape Town', true),
  {
    ...blank, id: 'demo-eng', schoolId: 'demo-gh', schoolName: 'Sample University Ghana (demo)',
    name: 'Demo BSc Engineering', level: 'Undergraduate', field: 'Engineering', international: false, demo: true,
    requirements: [
      { subject: 'Core Mathematics', minGrade: 'C6' },
      { subject: 'English Language', minGrade: 'C6' },
      { subject: 'Physics', minGrade: null },
    ],
    cutoffAggregate: 12, cutoffYear: 2025,
  },
  {
    ...blank, id: 'demo-bus', schoolId: 'demo-gh', schoolName: 'Sample University Ghana (demo)',
    name: 'Demo BSc Business Administration', level: 'Undergraduate', field: 'Business', international: false, demo: true,
    requirements: [
      { subject: 'Core Mathematics', minGrade: 'C6' },
      { subject: 'English Language', minGrade: 'C6' },
    ],
    cutoffAggregate: 18, cutoffYear: 2025,
  },
  {
    ...blank, id: 'demo-intl-cs', schoolId: 'demo-intl', schoolName: 'Sample International University (demo)',
    name: 'Demo BSc Computer Science', level: 'Undergraduate', field: 'Computing', international: true, demo: true,
    requirements: [
      { subject: 'Core Mathematics', minGrade: 'B3' },
      { subject: 'English Language', minGrade: 'C6' },
    ],
    cutoffAggregate: 10, cutoffYear: 2025, satLow: 1100, satHigh: 1300,
    englishTestWaiver: true, foundationAvailable: true,
  },
]

export const seedScholarships = [
  { id: 'mcf', name: 'Mastercard Foundation Scholars Program', funder: 'Mastercard Foundation', country: 'Various', fundingType: 'Full', level: '', minAggregate: null, minSat: null, criteria: 'Details to be confirmed.', deadline: '', link: 'https://mastercardfdn.org', verified: false },
  { id: 'csc', name: 'Commonwealth Scholarships', funder: 'Commonwealth Scholarship Commission', country: 'United Kingdom', fundingType: 'Full', level: '', minAggregate: null, minSat: null, criteria: 'Details to be confirmed.', deadline: '', link: 'https://cscuk.fcdo.gov.uk', verified: false },
  { id: 'demo-sc', name: 'Sample Partial Scholarship (demo)', funder: 'Demo Foundation', country: 'Ghana', fundingType: 'Partial', level: 'Undergraduate', minAggregate: 10, minSat: null, criteria: 'Placeholder entry for the demo.', deadline: '', link: '', verified: false, demo: true },
]
