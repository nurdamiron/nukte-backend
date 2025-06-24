import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, name: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Сброс пароля - Nukte',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Восстановление пароля</h2>
          <p>Привет, ${name}!</p>
          <p>Вы запросили сброс пароля для вашего аккаунта в Nukte.</p>
          <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Восстановить пароль
            </a>
          </div>
          <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
          <p style="word-break: break-all; color: #7f8c8d;">${resetUrl}</p>
          <p><strong>Ссылка действительна в течение 1 час.</strong></p>
          <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">
            С уважением,<br>
            Команда Nukte
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendVerificationEmail(email: string, verificationCode: string, name: string) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Подтверждение email - Nukte',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Добро пожаловать в Nukte!</h2>
          <p>Привет, ${name}!</p>
          <p>Спасибо за регистрацию в Nukte. Для завершения регистрации подтвердите ваш email адрес.</p>
          <p>Ваш код подтверждения:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px dashed #3498db; padding: 20px; border-radius: 8px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: #2c3e50; letter-spacing: 8px;">${verificationCode}</span>
            </div>
          </div>
          <p>Введите этот код на странице подтверждения email.</p>
          <p><strong>Код действителен в течение 10 минут.</strong></p>
          <p>Если вы не создавали аккаунт, проигнорируйте это письмо.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">
            С уважением,<br>
            Команда Nukte
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email: string, name: string) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Добро пожаловать в Nukte!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Добро пожаловать в Nukte!</h2>
          <p>Привет, ${name}!</p>
          <p>Ваш email успешно подтвержден. Теперь вы можете в полной мере пользоваться всеми возможностями платформы Nukte.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Перейти к Nukte
            </a>
          </div>
          <p>Что можно делать в Nukte:</p>
          <ul>
            <li>🏠 Найти уникальные локации для съемок</li>
            <li>📸 Сдать свои локации в аренду</li>
            <li>💬 Общаться с арендодателями и съемщиками</li>
            <li>⭐ Оставлять отзывы и рейтинги</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">
            С уважением,<br>
            Команда Nukte
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;