namespace P0_ClassLibrary.Interfaces;

public interface ITokenService
{
    string CreateToken(Guid userId, string email, string username, int time);
    Guid VerifyTokenAndGetId(string token);
}
