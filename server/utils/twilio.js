import twilio from 'twilio'

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  ALLOW_DEV_MODE,
  OTP_CHANNEL,
} = process.env

const devModeAllowed = (ALLOW_DEV_MODE ?? 'true').toLowerCase() !== 'false'

const credentialsPresent =
  !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_VERIFY_SERVICE_SID

export const isDevMode = !credentialsPresent && devModeAllowed

// Which Twilio Verify channel to use for sending the OTP.
//   'sms'      — works on any Twilio account with a phone number, no business verification.
//   'whatsapp' — requires a Meta-verified WhatsApp Sender attached to your Verify Service.
//   'call'     — voice call that reads the code aloud.
//   'email'    — needs an email integration on the Verify Service.
export const channel = (OTP_CHANNEL || 'sms').toLowerCase()

if (!credentialsPresent && !devModeAllowed) {
  throw new Error(
    'Twilio credentials are missing and ALLOW_DEV_MODE is false. ' +
      'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID, ' +
      'or set ALLOW_DEV_MODE=true to run without Twilio.',
  )
}

const client = credentialsPresent
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null

const DEV_CODE = '123456'

/**
 * Send an OTP to the given E.164 phone number via the configured channel.
 * In dev mode this just logs to console — the user types 123456 to verify.
 */
export async function sendOtp(toE164) {
  if (isDevMode) {
    console.log(
      `[dev-mode] Would send ${channel.toUpperCase()} OTP to ${toE164}. ` +
        `Use code ${DEV_CODE} to verify.`,
    )
    return { status: 'pending', channel: 'dev' }
  }

  const verification = await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to: toE164, channel })

  return { status: verification.status, channel: verification.channel }
}

/**
 * Send a WhatsApp message from the Twilio number to any E.164 number.
 */
export async function sendWhatsApp(toE164, body) {
  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  if (!fromNumber) throw new Error('TWILIO_PHONE_NUMBER not set in .env')

  if (isDevMode) {
    console.log(`[dev-mode] Would send WhatsApp to ${toE164}:\n${body}`)
    return { sid: 'dev_whatsapp_sid' }
  }

  const msg = await client.messages.create({
    from: `whatsapp:${fromNumber}`,
    to:   `whatsapp:${toE164}`,
    body,
  })
  return { sid: msg.sid }
}

/**
 * Verify the code the user typed in. Returns true if approved.
 * Twilio matches the code to the most recent pending verification for the
 * phone regardless of which channel delivered it, so this doesn't need
 * to know the channel.
 */
export async function verifyOtp(toE164, code) {
  if (isDevMode) {
    return code === DEV_CODE
  }

  const check = await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: toE164, code })

  return check.status === 'approved'
}
