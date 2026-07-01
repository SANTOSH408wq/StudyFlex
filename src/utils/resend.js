export const sendEmail = async ({ name, email, subject, message }) => {
  const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    throw new Error('Resend API key is missing.');
  }

  // Use the local proxy during development to bypass CORS
  const endpoint = import.meta.env.DEV ? '/api/resend/emails' : 'https://api.resend.com/emails';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Resend testing domain (only sends to verified emails)
        to: 'sraut7105@gmail.com',
        reply_to: email,
        subject: `StudyFlex Contact: ${subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>New Contact Request</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                <div style="background-color: #3b82f6; padding: 32px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">StudyFlex Contact Request</h1>
                </div>
                <div style="padding: 40px;">
                  <p style="margin: 0 0 16px; color: #475569; font-size: 16px;">You have received a new message from the StudyFlex landing page.</p>
                  
                  <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600; width: 80px;">Name:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 16px; font-weight: 500;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600; border-top: 1px solid #e2e8f0;">Email:</td>
                        <td style="padding: 8px 0; color: #3b82f6; font-size: 16px; font-weight: 500; border-top: 1px solid #e2e8f0;">
                          <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600; border-top: 1px solid #e2e8f0;">Subject:</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 16px; font-weight: 500; border-top: 1px solid #e2e8f0;">${subject}</td>
                      </tr>
                    </table>
                  </div>

                  <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 600;">Message</h3>
                  <div style="color: #475569; font-size: 16px; line-height: 1.6; white-space: pre-wrap; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px;">${message}</div>
                </div>
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
                  <p style="margin: 0; color: #94a3b8; font-size: 14px;">© ${new Date().getFullYear()} StudyFlex. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to send email.');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};
