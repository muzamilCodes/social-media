using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using P10_WebApi.Interfaces;
using P10_WebApi.Models;
using P10_WebApi.Models.Dtos;
using P10_WebApi.Services;
using BCrypt.Net;


namespace P10_WebApi.Controllers
{
    [Route("api/[controller]")] 
    [ApiController]
    public class UserController : ControllerBase
    {

        private readonly MongoDbService db;
        private readonly ICloudinaryService cloudinaryService;

        private readonly ITokenService tokenService;

private readonly IMailService mailService;

        public UserController(MongoDbService mongoDb, ICloudinaryService cloudinaryService, ITokenService tokenService, IMailService mailService)
        {
            db = mongoDb;
            this.cloudinaryService = cloudinaryService;
            this.tokenService = tokenService;
            this.mailService = mailService;

        }

        [HttpPost("Register")]
        public async Task<ActionResult> Register([FromBody] RegisterRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            {
                return BadRequest(new { message = "Username, email, and password are all required." });
            }

            if (req.Password.Length < 6)
            {
                return BadRequest(new { message = "Password must be at least 6 characters long." });
            }

            var cleanUsername = req.Username.Trim();
            var cleanEmail = req.Email.Trim().ToLowerInvariant();

            // Check if user already exists with email or username
            var existingUser = await db.Users.Find(u => 
                (u.Email != null && u.Email.ToLower() == cleanEmail) || 
                (u.Username != null && u.Username.ToLower() == cleanUsername.ToLower())
            ).FirstOrDefaultAsync();

            if (existingUser != null)
            {
                if (string.Equals(existingUser.Email, cleanEmail, StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = "An account with this email already exists." });
                }
                return BadRequest(new { message = "This username is already taken. Please choose another." });
            }

            var defaultAvatar = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(cleanUsername)}";
            var user = new User
            {
                Username = cleanUsername,
                Email = cleanEmail,
                Password = BCrypt.Net.BCrypt.HashPassword(req.Password),
                ProfilePic = !string.IsNullOrWhiteSpace(req.ProfilePic) ? req.ProfilePic : defaultAvatar,
                Bio = !string.IsNullOrWhiteSpace(req.Bio) ? req.Bio : "Hello! Excited to connect on Nexus.",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await db.Users.InsertOneAsync(user);

            var userIdGuid = Guid.TryParse(user.UserId, out var parsedGuid) ? parsedGuid : Guid.NewGuid();
            var token = tokenService.CreateToken(userIdGuid, user.Email, user.Username, 7 * 24 * 60);

            HttpContext.Response.Cookies.Append("authToken", token, new CookieOptions
            {
                Secure = false,
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(7)
            });

            return Ok(new
            {
                message = "User registered successfully!",
                token,
                user = new
                {
                    userId = user.UserId,
                    username = user.Username,
                    email = user.Email,
                    profilePic = user.ProfilePic,
                    bio = user.Bio
                }
            });
        }

        [HttpPost("Login")]
        public async Task<ActionResult> Login([FromBody] LoginRequest req)
        {
            var identifier = (req?.Email ?? req?.Username ?? "").Trim();
            if (string.IsNullOrEmpty(identifier) || string.IsNullOrEmpty(req?.Password))
            {
                return BadRequest(new { message = "Email/Username and Password are required!" });
            }

            var lowerId = identifier.ToLowerInvariant();
            var existingUser = await db.Users
                .Find(u => (u.Email != null && u.Email.ToLower() == lowerId) ||
                           (u.Username != null && u.Username.ToLower() == lowerId))
                .FirstOrDefaultAsync();

            if (existingUser == null)
            {
                return BadRequest(new { message = "No account found with this email or username." });
            }

            bool passVerify = false;
            try
            {
                passVerify = BCrypt.Net.BCrypt.Verify(req.Password, existingUser.Password);
            }
            catch
            {
                passVerify = false;
            }

            if (!passVerify)
            {
                return BadRequest(new { message = "Incorrect password. Please try again." });
            }

            var userIdGuid = Guid.TryParse(existingUser.UserId, out var parsedGuid) ? parsedGuid : Guid.NewGuid();
            var token = tokenService.CreateToken(userIdGuid, existingUser.Email, existingUser.Username, 7 * 24 * 60);

            HttpContext.Response.Cookies.Append("authToken", token, new CookieOptions
            {
                Secure = false,
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(7)
            });

            return Ok(new
            {
                message = "User login successful",
                token,
                user = new
                {
                    userId = existingUser.UserId,
                    username = existingUser.Username,
                    email = existingUser.Email,
                    profilePic = existingUser.ProfilePic ?? $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(existingUser.Username)}",
                    bio = existingUser.Bio ?? ""
                }
            });
        }



        [HttpPost("forgotpassword")]
        public async Task<ActionResult> ForgotPassword(string email)
        {
            // email per otp send kerna hai ager user hoga 

            var filter = Builders<User>.Filter.Eq(u => u.Email, email);
            var user = await db.Users.Find(filter).FirstOrDefaultAsync();
            if (user == null)
            {
                return BadRequest(new { message = "user not Found !" });
            }

            var random = new Random();

            var otp = random.Next(100000, 999999);

            var encryptOtp = BCrypt.Net.BCrypt.HashPassword(otp.ToString());
        
            var update = Builders<User>.Update
            .Set(u => u.OTP, encryptOtp )
            .Set(u => u.OTPExpiry , DateTime.UtcNow.AddMinutes(5));

            await db.Users.UpdateOneAsync(filter, update);

            await mailService.SendEmailAsync(email, "Password Reset Otp ",
             $"We have accepted your request for password update ,kindly find the OTP  below  , Remember only valid for 5 minutes: {otp}", false);

            return Ok(new { message = "Email  with OTP  sent to you address successfully !" });
        }


        [HttpPost("updatepassword")]
        public async Task<ActionResult> UpdatePassword(UpdatePass req)
        {
            if (string.IsNullOrEmpty(req.Password) || string.IsNullOrEmpty(req.ConfirmPassword))
            {
                return BadRequest(new { message = "password & confirmPassword both are required" });
            }

            if (req.Password != req.ConfirmPassword)
            {
                return BadRequest(new { message = "Passwords Does not match" });
            }

            var filter = Builders<User>.Filter.Eq(u => u.Email , req.Email);
            var user = await db.Users.Find(filter).FirstOrDefaultAsync();

            if (user == null)
            {
                return BadRequest(new { message = "User not found!" });
            }

            if (string.IsNullOrEmpty(user.OTP) || user.OTPExpiry == null || user.OTPExpiry <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "OTP is expired or not requested!" });
            }

            var verifyOtp = BCrypt.Net.BCrypt.Verify(req.OTP, user.OTP);

            if (verifyOtp)
            {
                var encryptPass = BCrypt.Net.BCrypt.HashPassword(req.Password);

                var update = Builders<User>.Update
                    .Set(u => u.Password, encryptPass)
                    .Set(u => u.OTP , null)
                    .Set(u => u.OTPExpiry , null);

                await db.Users.UpdateOneAsync(filter, update);

                return Ok(new { message = "Password Changed Successfully !" });
            }
            else
            {
                return BadRequest(new { message = "Incorrect otp or otp is Expired !" });
            }
        }

        [HttpGet("profile/{identifier}")]
        public async Task<ActionResult> GetProfile(string identifier)
        {
            var user = await db.Users
                .Find(u => u.UserId == identifier || u.Username == identifier)
                .Project(u => new
                {
                    u.UserId,
                    u.Username,
                    u.Email,
                    u.ProfilePic,
                    u.Bio,
                    u.Posts,
                    u.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(user);
        }

        [HttpGet("suggestions")]
        public async Task<ActionResult> GetSuggestions()
        {
            var users = await db.Users
                .Find(_ => true)
                .Limit(5)
                .Project(u => new
                {
                    u.UserId,
                    u.Username,
                    u.ProfilePic,
                    u.Bio
                })
                .ToListAsync();

            return Ok(users);
        }
        // public async Task<ActionResult> UploadProfile(IFormFile image)
        // {
        //     // actual upload 

        //     if (image == null || image.Length == 0)
        //     {
        //         TempData["ErrorMessage"] = "Image is missing !";
        //         return RedirectToAction("dashboard");
        //     }

        //     if (HttpContext.Items["user"] is User user)
        //     {

        //         var SecureUrl = await cloudinaryService.UploadImageAsync(image , "profilePic");

        //         user.ProfilePic = SecureUrl;

        //         await dbContext.SaveChangesAsync();

        //         TempData["SuccessMessage"] = "Profile Pic uploaded Successfully !";
        //         return RedirectToAction("Dashboard");

        //     }
        //     else
        //     {
        //         TempData["ErrorMessage"] = "Some Error Kindly try again after sometime !!";

        //         return RedirectToAction("Dashboard");
        //     }

        // }



    }
}