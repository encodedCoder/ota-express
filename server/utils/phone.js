// Normalize and validate phone numbers for the countries we support today:
//   Canada — +1 followed by 10 digits
//   India  — +91 followed by 10 digits (testing only, will be removed)
//
// Inputs may arrive as "+15551234567", "1-555-123-4567", "(555) 123 4567" etc.
// We strip everything except digits and a leading "+", then validate.

const SUPPORTED = {
  CA: { code: '1', length: 10 },
  IN: { code: '91', length: 10 },
}

export function normalizePhone(raw, countryHint) {
  if (!raw || typeof raw !== 'string') return null

  // Keep digits and a leading "+"
  const cleaned = raw.replace(/[^\d+]/g, '')
  const digitsOnly = cleaned.replace(/\+/g, '')

  // Try each supported country until one matches
  const candidates = countryHint && SUPPORTED[countryHint]
    ? [countryHint]
    : Object.keys(SUPPORTED)

  for (const country of candidates) {
    const { code, length } = SUPPORTED[country]
    // Strip the country code if it was provided, then check length
    let local = digitsOnly
    if (local.startsWith(code)) local = local.slice(code.length)
    if (local.length === length) {
      return { e164: `+${code}${local}`, country }
    }
  }

  return null
}
