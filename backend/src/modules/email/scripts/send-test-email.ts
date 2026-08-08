import { sendRegistrationConfirmationEmail } from '@/modules/email/email.service';
import { env } from '@/shared/config/env';

async function main() {
  const to = process.argv[2] ?? env.SMTP_FROM_EMAIL;

  if (!to) {
    throw new Error('Usage: pnpm email:test -- recipient@example.com');
  }

  if (env.EMAIL_DRIVER !== 'smtp') {
    throw new Error('EMAIL_DRIVER must be smtp before running the email test.');
  }

  await sendRegistrationConfirmationEmail({
    to,
    participantName: 'Peserta Test',
    eventName: 'Virtual Run Beard',
    registrationCode: 'TEST-EMAIL',
    bibNumber: '0001',
    categories: ['5K'],
    eventPeriod: '1-7 Agustus 2026',
    participantAccessUrl: `${env.APP_URL}/events/test/participant`,
    bibStatus: 'Siap diproses',
    contact: 'Panitia Virtual Run Beard',
  });

  process.stdout.write(`Test email sent to ${to}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`Failed to send test email: ${message}\n`);
  process.exitCode = 1;
});
