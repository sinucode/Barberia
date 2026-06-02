'use client'

import { useState, useEffect } from 'react'

export function useDateTime() {
  const [dateTime, setDateTime] = useState<Date | null>(null)

  useEffect(() => {
    setDateTime(new Date())
    const timer = setInterval(() => setDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return dateTime
}
