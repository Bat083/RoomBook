import { PrismaClient, NotificationType } from '@prisma/client';
import { sendEmail } from '../config/email';

const prisma = new PrismaClient();

export class NotificationService {
  // Send booking confirmation notification (FR-015)
  async sendBookingConfirmation(booking: any): Promise<void> {
    const recipients = this.getRecipients(booking);

    // Create in-app notifications
    const notifications = recipients.map((recipient) => ({
      bookingId: booking.id,
      recipientId: recipient.id,
      notificationType: NotificationType.BOOKING_CONFIRMED,
      subject: 'Booking Confirmed',
      message: `Your booking for ${booking.room.name} on ${new Date(booking.startTime).toLocaleString()} has been confirmed.`,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    // Send emails asynchronously
    for (const recipient of recipients) {
      this.sendEmailNotification(
        recipient.email,
        'Booking Confirmed',
        this.formatBookingConfirmationEmail(booking, recipient)
      ).catch((error) => {
        console.error(`Failed to send email to ${recipient.email}:`, error);
      });
    }
  }

  // Send booking rejection notification (FR-016)
  async sendBookingRejection(
    userId: string,
    roomName: string,
    startTime: Date,
    endTime: Date,
    reason: string,
    alternatives?: any[]
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Create in-app notification
    await prisma.notification.create({
      data: {
        recipientId: userId,
        notificationType: NotificationType.BOOKING_REJECTED,
        subject: 'Booking Request Rejected',
        message: `Your booking request for ${roomName} was rejected: ${reason}. ${alternatives ? 'Alternative rooms are available.' : ''}`,
      },
    });

    // Send email
    await this.sendEmailNotification(
      user.email,
      'Booking Request Rejected',
      this.formatRejectionEmail(roomName, startTime, endTime, reason, alternatives)
    );
  }

  // Send booking cancellation notification (FR-023)
  async sendBookingCancellation(booking: any): Promise<void> {
    const recipients = this.getRecipients(booking);

    // Create in-app notifications
    const notifications = recipients.map((recipient) => ({
      bookingId: booking.id,
      recipientId: recipient.id,
      notificationType: NotificationType.BOOKING_CANCELLED,
      subject: 'Booking Cancelled',
      message: `The booking for ${booking.room.name} on ${new Date(booking.startTime).toLocaleString()} has been cancelled.`,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    // Send emails
    for (const recipient of recipients) {
      this.sendEmailNotification(
        recipient.email,
        'Booking Cancelled',
        this.formatCancellationEmail(booking, recipient)
      ).catch((error) => {
        console.error(`Failed to send email to ${recipient.email}:`, error);
      });
    }
  }

  // Send no-show penalty notification (FR-020)
  async sendNoShowPenalty(booking: any): Promise<void> {
    const organizer = booking.organizer;

    // Create in-app notification
    await prisma.notification.create({
      data: {
        bookingId: booking.id,
        recipientId: organizer.id,
        notificationType: NotificationType.NO_SHOW_PENALTY,
        subject: 'No-Show Penalty Applied',
        message: `You did not check in for your booking at ${booking.room.name}. Your ranking has been reduced by 2 points.`,
      },
    });

    // Send email
    await this.sendEmailNotification(
      organizer.email,
      'No-Show Penalty',
      this.formatNoShowEmail(booking)
    );
  }

  // Send check-in reminder
  async sendCheckInReminder(booking: any): Promise<void> {
    const organizer = booking.organizer;

    await prisma.notification.create({
      data: {
        bookingId: booking.id,
        recipientId: organizer.id,
        notificationType: NotificationType.CHECK_IN_REMINDER,
        subject: 'Check-In Reminder',
        message: `Reminder: Your booking at ${booking.room.name} starts soon. Please check in within 10 minutes of the start time.`,
      },
    });

    await this.sendEmailNotification(
      organizer.email,
      'Check-In Reminder',
      this.formatCheckInReminderEmail(booking)
    );
  }

  // Get user notifications with pagination (Phase 7)
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: any[]; total: number }> {
    const where: any = { recipientId: userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          booking: {
            include: {
              room: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  // Mark notification as read (Phase 7)
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new Error('Unauthorized: You can only mark your own notifications as read');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Helper: Get all recipients (organizer + participants)
  private getRecipients(booking: any): any[] {
    const recipients = [booking.organizer];

    if (booking.participants) {
      booking.participants.forEach((participant: any) => {
        if (participant.user && participant.user.id !== booking.organizer.id) {
          recipients.push(participant.user);
        }
      });
    }

    return recipients;
  }

  // Helper: Send email notification
  private async sendEmailNotification(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<void> {
    try {
      const success = await sendEmail({
        to,
        subject,
        html: htmlContent,
      });

      if (success) {
        // Update notification as sent
        await prisma.notification.updateMany({
          where: {
            recipient: { email: to },
            subject,
            emailSent: false,
          },
          data: {
            emailSent: true,
            emailSentAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Email send failed:', error);
    }
  }

  // Email templates
  private formatBookingConfirmationEmail(booking: any, recipient: any): string {
    return `
      <h2>Booking Confirmed</h2>
      <p>Dear ${recipient.fullName},</p>
      <p>Your booking has been confirmed:</p>
      <ul>
        <li><strong>Room:</strong> ${booking.room.name}</li>
        <li><strong>Start:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
        <li><strong>End:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
        <li><strong>Organizer:</strong> ${booking.organizer.fullName}</li>
        ${booking.title ? `<li><strong>Title:</strong> ${booking.title}</li>` : ''}
      </ul>
      <p><strong>Important:</strong> Please check in within 10 minutes of the start time to avoid a no-show penalty.</p>
    `;
  }

  private formatRejectionEmail(
    roomName: string,
    startTime: Date,
    endTime: Date,
    reason: string,
    alternatives?: any[]
  ): string {
    let html = `
      <h2>Booking Request Rejected</h2>
      <p>Your booking request was rejected:</p>
      <ul>
        <li><strong>Room:</strong> ${roomName}</li>
        <li><strong>Time:</strong> ${startTime.toLocaleString()} - ${endTime.toLocaleString()}</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>
    `;

    if (alternatives && alternatives.length > 0) {
      html += '<h3>Alternative Rooms:</h3><ul>';
      alternatives.forEach((alt) => {
        html += `<li>${alt.roomName}</li>`;
      });
      html += '</ul>';
    }

    return html;
  }

  private formatCancellationEmail(booking: any, recipient: any): string {
    return `
      <h2>Booking Cancelled</h2>
      <p>Dear ${recipient.fullName},</p>
      <p>The following booking has been cancelled:</p>
      <ul>
        <li><strong>Room:</strong> ${booking.room.name}</li>
        <li><strong>Time:</strong> ${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()}</li>
        <li><strong>Organizer:</strong> ${booking.organizer.fullName}</li>
      </ul>
    `;
  }

  private formatNoShowEmail(booking: any): string {
    return `
      <h2>No-Show Penalty</h2>
      <p>You did not check in for your booking:</p>
      <ul>
        <li><strong>Room:</strong> ${booking.room.name}</li>
        <li><strong>Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
      </ul>
      <p>As a result, your ranking score has been reduced by 2 points.</p>
      <p>Please remember to check in within 10 minutes of your booking start time.</p>
    `;
  }

  private formatCheckInReminderEmail(booking: any): string {
    return `
      <h2>Check-In Reminder</h2>
      <p>Your booking is starting soon:</p>
      <ul>
        <li><strong>Room:</strong> ${booking.room.name}</li>
        <li><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
      </ul>
      <p><strong>Please check in within 10 minutes of the start time to avoid a no-show penalty.</strong></p>
    `;
  }
}
