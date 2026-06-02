import { formatCOP, formatCOPFull } from '../format'

describe('Format Utilities', () => {
  describe('formatCOP', () => {
    it('should format numbers as COP string correctly', () => {
      expect(formatCOP(15000)).toBe('$ 15.000')
      expect(formatCOP(0)).toBe('$ 0')
      // Handling decimals based on implementation (Math.round)
      expect(formatCOP(15000.5)).toBe('$ 15.001')
      expect(formatCOP(15000.4)).toBe('$ 15.000')
    })
  })

  describe('formatCOPFull', () => {
    it('should format numbers with Intl formatter', () => {
      const formatted = formatCOPFull(15000)
      // The exact output of Intl.NumberFormat can vary by environment/Node version
      // but it should contain "15.000" and "COP" or "$" depending on locale resolving
      // In JS es-CO locale, it usually looks like "$ 15.000" or "COP 15.000" depending on Node version
      // We will check for the number part to ensure it formatted correctly
      expect(formatted).toMatch(/15\.000/)
    })
  })
})
