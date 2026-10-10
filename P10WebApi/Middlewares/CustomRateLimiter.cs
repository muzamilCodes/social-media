using Microsoft.Extensions.Caching.Memory;



namespace P10_WebApi.Middlewares
{
    public class CustomRateLimiter
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;

        private readonly int _maxRequests = 100                                                                                                                ;       
        private readonly TimeSpan _window = TimeSpan.FromSeconds(10);



        public CustomRateLimiter(RequestDelegate next, IMemoryCache cache)
        {
            _next = next;
            _cache = cache;
        }



        public async Task InvokeAsync(HttpContext context)
        {
            if (!context.Request.Path.StartsWithSegments("/api"))
            {
                await _next(context);
                return;
            }

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";


            //   {  key : value}

            // {"197.67.68.90" : {count : 4 , expiresAt :  0s}    }



            var counter = _cache.GetOrCreate(ip, entry =>
            {

                entry.AbsoluteExpirationRelativeToNow = _window;

                return new RequestCounter
                {
                    Count = 0,
                    ExpiresAt = DateTime.UtcNow.Add(_window)
                };
            });
            

            if (counter != null)
            {
                lock (counter)
                {
                    counter.Count++;
                }

                if (counter.Count > _maxRequests)
                {
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests; // 429
                    var retryAfterSeconds = Math.Max(0, (counter.ExpiresAt - DateTime.UtcNow).TotalSeconds);
                    context.Response.Headers["Retry-After"] = retryAfterSeconds.ToString("F0");

                    await context.Response.WriteAsync("Too many requests. Please try again later.");
                    return;
                }
            }

            await _next(context);
        }
        




        private class RequestCounter
        {
            public int Count { get; set; }
            public DateTime ExpiresAt { get; set; }
        }
    }
}