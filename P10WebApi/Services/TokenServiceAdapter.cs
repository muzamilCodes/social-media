using P10_WebApi.Interfaces;

namespace P10_WebApi.Services;

// Adapter so WebApi can depend on its own interface without circular project refs.
public sealed class TokenServiceAdapter : ITokenService
{
    private readonly P0_ClassLibrary.Interfaces.ITokenService _inner;

    public TokenServiceAdapter(P0_ClassLibrary.Interfaces.ITokenService inner)
    {
        _inner = inner;
    }

    public string CreateToken(Guid userId, string email, string username, int time)
        => _inner.CreateToken(userId, email, username, time);

    public Guid VerifyTokenAndGetId(string token)
        => _inner.VerifyTokenAndGetId(token);
}

