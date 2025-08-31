const nodemailer = require('nodemailer');

/**
 * Email Service Module
 * Handles email notifications and communications for Skill Swap
 */

// Configure email transporter
const createTransporter = () => {
    if (process.env.NODE_ENV === 'production') {
        // Production email configuration (e.g., SendGrid, AWS SES)
        return nodemailer.createTransporter({
            service: 'SendGrid',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    } else {
        // Development/testing - use Ethereal for testing
        return nodemailer.createTransporter({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
                pass: process.env.EMAIL_PASSWORD || 'ethereal.pass'
            }
        });
    }
};

// Email templates
const emailTemplates = {
    welcome: (userName) => ({
        subject: 'Welcome to Skill Swap! 🎉',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Welcome to Skill Swap, ${userName}!</h2>
                <p>We're excited to have you join our community of skill sharers and learners.</p>
                <h3>What you can do now:</h3>
                <ul>
                    <li>Browse skills from talented individuals</li>
                    <li>Create your profile and showcase your expertise</li>
                    <li>Start conversations with other users</li>
                    <li>Book skill sessions and learn something new</li>
                </ul>
                <p>Ready to get started? <a href="${process.env.CLIENT_URL}" style="color: #2563eb;">Visit Skill Swap</a></p>
                <p>Happy learning!<br>The Skill Swap Team</p>
            </div>
        `
    }),
    
    passwordReset: (userName, resetToken) => ({
        subject: 'Reset Your Skill Swap Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>Hello ${userName},</p>
                <p>We received a request to reset your password. Click the link below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p><small>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</small></p>
                <p>Best regards,<br>The Skill Swap Team</p>
            </div>
        `
    }),
    
    bookingConfirmation: (userName, skillTitle, providerName, scheduledTime) => ({
        subject: `Booking Confirmed: ${skillTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Booking Confirmed! ✅</h2>
                <p>Hi ${userName},</p>
                <p>Your booking has been confirmed!</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Booking Details:</h3>
                    <p><strong>Skill:</strong> ${skillTitle}</p>
                    <p><strong>Provider:</strong> ${providerName}</p>
                    <p><strong>Scheduled Time:</strong> ${scheduledTime}</p>
                </div>
                <p>You'll receive the meeting link closer to the session time.</p>
                <p>Looking forward to your learning session!</p>
                <p>Best regards,<br>The Skill Swap Team</p>
            </div>
        `
    }),
    
    newMessage: (userName, senderName) => ({
        subject: `New message from ${senderName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Message 💬</h2>
                <p>Hi ${userName},</p>
                <p>You have a new message from <strong>${senderName}</strong> on Skill Swap.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL}/messages" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Read Message
                    </a>
                </div>
                <p>Best regards,<br>The Skill Swap Team</p>
            </div>
        `
    }),
    
    subscriptionUpgrade: (userName, newTier) => ({
        subject: `Welcome to ${newTier} Tier! 🎊`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Subscription Upgraded! 🎊</h2>
                <p>Hi ${userName},</p>
                <p>Congratulations! You've successfully upgraded to our <strong>${newTier}</strong> tier.</p>
                <p>You now have access to enhanced features and benefits. Explore your new capabilities in your dashboard.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL}/dashboard" 
                       style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Visit Dashboard
                    </a>
                </div>
                <p>Thank you for choosing Skill Swap!</p>
                <p>Best regards,<br>The Skill Swap Team</p>
            </div>
        `
    })
};

// Email service functions
const emailService = {
    /**
     * Send email using configured transporter
     */
    sendEmail: async (to, subject, html, text = null) => {
        try {
            const transporter = createTransporter();
            
            const mailOptions = {
                from: `"Skill Swap" <${process.env.EMAIL_FROM || 'noreply@skillswap.com'}>`,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
            };

            const result = await transporter.sendMail(mailOptions);
            
            console.log('📧 Email sent successfully:', {
                to,
                subject,
                messageId: result.messageId
            });
            
            // In development, log preview URL
            if (process.env.NODE_ENV !== 'production') {
                console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(result));
            }
            
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('📧 Email sending failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send welcome email to new users
     */
    sendWelcomeEmail: async (userEmail, userName) => {
        const template = emailTemplates.welcome(userName);
        return await emailService.sendEmail(userEmail, template.subject, template.html);
    },

    /**
     * Send password reset email
     */
    sendPasswordResetEmail: async (userEmail, userName, resetToken) => {
        const template = emailTemplates.passwordReset(userName, resetToken);
        return await emailService.sendEmail(userEmail, template.subject, template.html);
    },

    /**
     * Send booking confirmation email
     */
    sendBookingConfirmationEmail: async (userEmail, userName, skillTitle, providerName, scheduledTime) => {
        const template = emailTemplates.bookingConfirmation(userName, skillTitle, providerName, scheduledTime);
        return await emailService.sendEmail(userEmail, template.subject, template.html);
    },

    /**
     * Send new message notification email
     */
    sendNewMessageEmail: async (userEmail, userName, senderName) => {
        const template = emailTemplates.newMessage(userName, senderName);
        return await emailService.sendEmail(userEmail, template.subject, template.html);
    },

    /**
     * Send subscription upgrade confirmation
     */
    sendSubscriptionUpgradeEmail: async (userEmail, userName, newTier) => {
        const template = emailTemplates.subscriptionUpgrade(userName, newTier);
        return await emailService.sendEmail(userEmail, template.subject, template.html);
    },

    /**
     * Send bulk emails (for announcements, newsletters)
     */
    sendBulkEmail: async (recipients, subject, html) => {
        const results = [];
        
        for (const recipient of recipients) {
            try {
                const result = await emailService.sendEmail(recipient.email, subject, html);
                results.push({
                    email: recipient.email,
                    success: result.success,
                    messageId: result.messageId,
                    error: result.error
                });
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                results.push({
                    email: recipient.email,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    },

    /**
     * Verify email configuration
     */
    verifyEmailConfig: async () => {
        try {
            const transporter = createTransporter();
            await transporter.verify();
            console.log('📧 Email configuration verified successfully');
            return true;
        } catch (error) {
            console.error('📧 Email configuration verification failed:', error);
            return false;
        }
    }
};

module.exports = emailService;