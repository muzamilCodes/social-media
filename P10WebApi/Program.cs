
// ioc container
using P10_WebApi;
using P10_WebApi.Interfaces;
using P10_WebApi.Models;
using P10_WebApi.Middlewares;
using P10_WebApi.Services;
using Serilog;




// activates serilog which writes the logs in console and log.txt file 
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();


var builder = WebApplication.CreateBuilder(args);



// Replace default logging
builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();

builder.Services.AddCors(Options =>
{
    Options.AddPolicy("AllowFrontend", policy =>
policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

// register or configure the options needed by EmailService having type of EmailSettings present in P0 classlibarary   
builder.Services.Configure<P0_ClassLibrary.Models.EmailSettings>(builder.Configuration.GetSection("EmailSettings"));

var cloudinaryUri = builder.Configuration["Cloudinary:CloudinaryURL"] ?? builder.Configuration["Cloudinary:URI"] ?? "";
var SecretKey = builder.Configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("Secret Key not set !"); 

// Adapters (P10_WebApi depends only on its own interfaces)
builder.Services.AddTransient<ITokenService>(_ =>
    new TokenServiceAdapter(new P0_ClassLibrary.TokenService(SecretKey)));

builder.Services.AddSingleton<IMailService>(_ =>
{
    var settings = builder.Configuration.GetSection("EmailSettings").Get<P0_ClassLibrary.Models.EmailSettings>()
        ?? new P0_ClassLibrary.Models.EmailSettings();
    return new MailServiceAdapter(
        new P0_ClassLibrary.EmailService(
            Microsoft.Extensions.Options.Options.Create(settings)
        ));
});

// Cloudinary placeholder adapter (returns empty strings until real implementation exists)
builder.Services.AddTransient<ICloudinaryService, CloudinaryServiceAdapter>();

builder.Services.AddScoped<MongoDbService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Configure the HTTP request pipeline.
app.UseMiddleware<CustomRateLimiter>();
app.UseMiddleware<ErrorHandler>();

app.UseCors("AllowFrontend");

// Serve Social Media App frontend from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// Seed initial sample posts if database is empty
try
{
    using var scope = app.Services.CreateScope();
    var mongo = scope.ServiceProvider.GetRequiredService<MongoDbService>();
    var count = mongo.Posts.CountDocuments(MongoDB.Driver.Builders<Post>.Filter.Empty);
    if (count == 0)
    {
        mongo.Posts.InsertMany([
            new Post
            {
                UserId = "user_sarah",
                Username = "sarah_travels",
                UserProfilePic = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                PostCaption = "Sunset in the mountains! 🌄 Breathing in the fresh crisp alpine air. Nothing clears the mind like a weekend in nature. #Travel #Wanderlust #Nature",
                PostpicURL = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                Likes = ["user_1", "user_2", "user_3"],
                Comments =
                [
                    new Comment
                    {
                        PostId = "",
                        UserId = "user_alex",
                        Username = "alex_dev",
                        CommentText = "Incredible view! Which camera did you shoot this with?",
                        CreatedAt = DateTime.UtcNow.AddHours(-1)
                    }
                ]
            },
            new Post
            {
                UserId = "user_alex",
                Username = "alex_dev",
                UserProfilePic = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                PostCaption = "Just launched Nexus Social! 🚀 Built with high-performance .NET 9 Web API and MongoDB. Real-time updates, sleek dark UI, and seamless performance. Check it out! #WebDev #DotNet #Code",
                PostpicURL = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
                CreatedAt = DateTime.UtcNow.AddHours(-5),
                Likes = ["user_sarah", "user_emma", "user_david", "user_lisa"],
                Comments =
                [
                    new Comment
                    {
                        PostId = "",
                        UserId = "user_sarah",
                        Username = "sarah_travels",
                        CommentText = "Super clean UI! Loving the micro-animations 👏",
                        CreatedAt = DateTime.UtcNow.AddHours(-3)
                    }
                ]
            },
            new Post
            {
                UserId = "user_maya",
                Username = "maya_art",
                UserProfilePic = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                PostCaption = "Morning coffee & sketching sessions are the best way to kickstart creativity ☕🎨 What's your daily morning routine? Drop your tips below! #Art #CoffeeLovers #Creative",
                PostpicURL = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
                CreatedAt = DateTime.UtcNow.AddHours(-9),
                Likes = ["user_alex", "user_sarah"],
                Comments = []
            }
        ]);
    }
}
catch { /* Ignore seed failure if db is initially starting */ }

app.MapGet("/scalar", () => Results.Content("""
<!doctype html>
<html>
  <head>
    <title>Social Media API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi/v1.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
""", "text/html"));

app.MapGet("/swagger", () => Results.Redirect("/scalar"));

app.Run();