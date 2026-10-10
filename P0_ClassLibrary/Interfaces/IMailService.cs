namespace P0_ClassLibrary.Interfaces;

public interface IMailService
{
    Task SendEmailAsync(string emailAddress, string subject, string body, bool isHtml = true);
}
