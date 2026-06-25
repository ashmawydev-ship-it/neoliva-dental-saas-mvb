import { BrevoClient } from '@getbrevo/brevo';

const apiKey = process.env.BREVO_API_KEY;
console.log('BREVO KEY EXISTS:', !!apiKey);

let brevo: BrevoClient | null = null;

if (apiKey) {
  brevo = new BrevoClient({
    apiKey: apiKey
  });
}

export class EmailService {
  static instance?: EmailService;

  constructor(
    private readonly brevoClient: BrevoClient | null = brevo
  ) {}

  static async sendStaffInvitation(args: {
    email: string;
    fullName: string;
    clinicName: string;
    inviteUrl: string;
  }) {
    return (EmailService.instance || new EmailService()).sendStaffInvitation(args);
  }

  async sendStaffInvitation({
    email,
    fullName,
    clinicName,
    inviteUrl,
  }: {
    email: string;
    fullName: string;
    clinicName: string;
    inviteUrl: string;
  }) {
    console.log('[EMAIL_SERVICE] sendStaffInvitation called for:', email);
    console.log('[EmailService] Start sending staff invitation to:', email);
    if (!this.brevoClient) {
      console.warn('[EmailService] BREVO_API_KEY not configured. Skipping email send.');
      return { success: false, error: new Error('Email service not configured (missing BREVO_API_KEY)') };
    }

    try {
      console.log('[EmailService] Before calling Brevo API...');
      const result = await this.brevoClient.transactionalEmails.sendTransacEmail({
        sender: { name: 'Neoliva', email: 'ashmawyalaa@gmail.com' }, // Default sender email
        to: [{ email: email, name: fullName }],
        subject: `Invitation to join ${clinicName} on Neoliva`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Welcome to Neoliva, ${fullName}!</h2>
            <p style="color: #666; font-size: 16px;">
              You have been invited to join the staff at <strong>${clinicName}</strong>.
            </p>
            <p style="color: #666; font-size: 16px;">
              Click the button below to accept your invitation and set up your account:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #999; font-size: 12px;">
              If you didn't expect this invitation, you can safely ignore this email.
              The link will expire in 7 days.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #ccc; font-size: 10px; text-align: center;">
              Powered by Neoliva Enterprise Security
            </p>
          </div>
        `,
      });

      console.log('[EmailService] After Brevo API call. Result:', JSON.stringify(result, null, 2));
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[EmailService] Exception caught:', error);
      console.error('[EmailService] Exception details:', error?.rawResponse || error?.message || error);
      return { success: false, error };
    }
  }
}

