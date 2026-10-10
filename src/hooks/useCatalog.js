import { useEffect, useState } from 'react'
import { listSchools, listPrograms, listScholarships } from '../lib/api'

export function useCatalog() {
  const [data, setData] = useState({ schools: [], programs: [], scholarships: [], loading: true })
  useEffect(() => {
    Promise.all([listSchools(), listPrograms(), listScholarships()]).then(([schools, programs, scholarships]) =>
      setData({ schools, programs, scholarships, loading: false })
    )
  }, [])
  return data
}

export const isLocal = (country) => (country || '').toLowerCase() === 'ghana'
