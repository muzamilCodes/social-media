
using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using P0_ClassLibrary.Interfaces;
using P0_ClassLibrary.Models;

namespace P0_ClassLibrary;

public class EmailService : IMailService
{
    private readonly EmailSettings _settings;

    public EmailService(IOptions<EmailSettings> settings)
    {
        _settings = settings?.Value ?? new EmailSettings();

        if (string.IsNullOrEmpty(_settings.SmtpHost))
            _settings.SmtpHost = "smtp.gmail.com";
            
        if (string.IsNullOrEmpty(_settings.SmtpUsername))
            _settings.SmtpUsername = "noreply@example.com";
            
        if (string.IsNullOrEmpty(_settings.SmtpPassword))
            _settings.SmtpPassword = "password";
    }

    public async Task SendEmailAsync(string emailAddress, string subject, string body, bool isHtml = false)
    {
        if (string.IsNullOrEmpty(emailAddress))
            throw new ArgumentNullException(nameof(emailAddress));

        try
        {
            using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
            {
                Credentials = new NetworkCredential(_settings.SmtpUsername, _settings.SmtpPassword),
                EnableSsl = true
            };

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(_settings.SmtpUsername),
                Subject = subject,
                Body = body,
                IsBodyHtml = isHtml,
            };
            
            mailMessage.To.Add(emailAddress);

            await client.SendMailAsync(mailMessage);
        }
        catch (Exception ex)
        {
            throw new MailServiceException($"Failed to send email to {emailAddress}", ex);
        }
    }
}

public class MailServiceException : Exception
{
    public MailServiceException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
