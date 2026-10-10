using P10_WebApi.Interfaces;

namespace P10_WebApi.Services;

public sealed class MailServiceAdapter : IMailService
{
    private readonly P0_ClassLibrary.Interfaces.IMailService _inner;

    public MailServiceAdapter(P0_ClassLibrary.Interfaces.IMailService inner)
    {
        _inner = inner;
    }

    public Task SendEmailAsync(string emailAddress, string subject, string body, bool isHtml = true)
        => _inner.SendEmailAsync(emailAddress, subject, body, isHtml);
}

