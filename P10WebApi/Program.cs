
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
app.MapControllers();

app.MapGet("/", () => Results.Content("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Media API Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0f19;
            --card-bg: rgba(23, 32, 54, 0.7);
            --border: rgba(255, 255, 255, 0.1);
            --primary: #6366f1;
            --success: #10b981;
            --text: #f3f4f6;
            --subtext: #9ca3af;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Outfit', sans-serif;
            background: radial-gradient(circle at top, #1e1b4b, var(--bg));
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .container {
            max-width: 800px;
            width: 100%;
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
        }
        .pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 12px var(--success); }
        h1 { font-size: 30px; font-weight: 700; margin-bottom: 8px; }
        p { color: var(--subtext); line-height: 1.6; }
        .endpoints { margin: 30px 0; display: flex; flex-direction: column; gap: 12px; }
        .item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            padding: 14px 18px;
            border-radius: 12px;
            font-family: monospace;
            font-size: 15px;
        }
        .method {
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
        }
        .method.post { background: #3b82f6; color: #fff; }
        .method.get { background: #10b981; color: #fff; }
        .links { display: flex; gap: 14px; margin-top: 24px; }
        .btn {
            flex: 1;
            text-align: center;
            padding: 14px 20px;
            border-radius: 12px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-primary { background: var(--primary); color: #fff; }
        .btn-primary:hover { background: #4f46e5; }
        .btn-secondary { background: rgba(255, 255, 255, 0.08); color: var(--text); border: 1px solid var(--border); }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Social Media Web API</h1>
                <p>.NET 9 Web API is running and operational.</p>
            </div>
            <div class="badge"><div class="pulse"></div> Live & Running</div>
        </div>

        <div class="endpoints">
            <div class="item"><span><span class="method post">POST</span> /api/User/Register</span><span style="color:var(--subtext)">Create new user</span></div>
            <div class="item"><span><span class="method post">POST</span> /api/User/Login</span><span style="color:var(--subtext)">Authenticate & JWT Cookie</span></div>
            <div class="item"><span><span class="method post">POST</span> /api/User/forgotpassword</span><span style="color:var(--subtext)">Send 6-digit OTP email</span></div>
            <div class="item"><span><span class="method post">POST</span> /api/User/updatepassword</span><span style="color:var(--subtext)">Verify OTP & reset password</span></div>
            <div class="item"><span><span class="method post">POST</span> /api/Post/create</span><span style="color:var(--subtext)">Create post with image</span></div>
            <div class="item"><span><span class="method get">GET</span> /openapi/v1.json</span><span style="color:var(--subtext)">OpenAPI 3.0 specification</span></div>
        </div>

        <div class="links">
            <a href="/scalar" class="btn btn-primary">📖 Interactive API Docs (Scalar)</a>
            <a href="/openapi/v1.json" target="_blank" class="btn btn-secondary">🔍 View OpenAPI JSON</a>
        </div>
    </div>
</body>
</html>
""", "text/html"));

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