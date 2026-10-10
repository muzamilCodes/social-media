using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using P10_WebApi.Interfaces;
using P10_WebApi.Models;
using P10_WebApi.Services;

namespace P10_WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PostController : ControllerBase
    {

        private readonly MongoDbService db;
        private readonly ICloudinaryService cloudinaryService;

        public PostController(MongoDbService mongoDb , ICloudinaryService cloudinaryService)
        {
            db = mongoDb;
            this.cloudinaryService = cloudinaryService;

        }



        [HttpGet("feed")]
        public async Task<ActionResult> GetFeed()
        {
            var posts = await db.Posts
                .Find(_ => true)
                .SortByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(posts);
        }

        [HttpPost("create")]
        public async Task<ActionResult> Create([FromForm] Post req, IFormFile? image)
        {
            if (string.IsNullOrWhiteSpace(req.PostCaption))
            {
                return BadRequest(new { message = "Caption cannot be empty" });
            }

            if (image != null && image.Length > 0)
            {
                var secureUrl = await cloudinaryService.UploadImageAsync(image, "P10WebApi");
                if (!string.IsNullOrEmpty(secureUrl))
                {
                    req.PostpicURL = secureUrl;
                }
            }

            if (string.IsNullOrWhiteSpace(req.UserId))
            {
                req.UserId = "guest_user";
            }
            if (string.IsNullOrWhiteSpace(req.Username))
            {
                req.Username = "Community User";
            }

            req.CreatedAt = DateTime.UtcNow;
            req.UpdatedAt = DateTime.UtcNow;
            req.Likes = [];
            req.Comments = [];

            await db.Posts.InsertOneAsync(req);

            return Ok(new { message = "Post created successfully", post = req });
        }

        [HttpPost("{postId}/like")]
        public async Task<ActionResult> ToggleLike(string postId, [FromBody] LikeRequest req)
        {
            var filter = Builders<Post>.Filter.Eq(p => p.PostId, postId);
            var post = await db.Posts.Find(filter).FirstOrDefaultAsync();

            if (post == null)
            {
                return NotFound(new { message = "Post not found" });
            }

            var userId = string.IsNullOrWhiteSpace(req?.UserId) ? "guest" : req.UserId;
            bool isLiked;

            if (post.Likes.Contains(userId))
            {
                post.Likes.Remove(userId);
                isLiked = false;
            }
            else
            {
                post.Likes.Add(userId);
                isLiked = true;
            }

            var update = Builders<Post>.Update.Set(p => p.Likes, post.Likes);
            await db.Posts.UpdateOneAsync(filter, update);

            return Ok(new { isLiked, totalLikes = post.Likes.Count });
        }

        [HttpPost("{postId}/comment")]
        public async Task<ActionResult> AddComment(string postId, [FromBody] CommentRequest req)
        {
            if (string.IsNullOrWhiteSpace(req?.CommentText))
            {
                return BadRequest(new { message = "Comment text is required" });
            }

            var filter = Builders<Post>.Filter.Eq(p => p.PostId, postId);
            var post = await db.Posts.Find(filter).FirstOrDefaultAsync();

            if (post == null)
            {
                return NotFound(new { message = "Post not found" });
            }

            var newComment = new Comment
            {
                CommentId = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
                PostId = postId,
                UserId = string.IsNullOrWhiteSpace(req.UserId) ? "guest" : req.UserId,
                Username = string.IsNullOrWhiteSpace(req.Username) ? "User" : req.Username,
                CommentText = req.CommentText,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            post.Comments.Add(newComment);

            var update = Builders<Post>.Update.Set(p => p.Comments, post.Comments);
            await db.Posts.UpdateOneAsync(filter, update);

            return Ok(new { message = "Comment added", comment = newComment });
        }

        [HttpDelete("{postId}")]
        public async Task<ActionResult> Delete(string postId)
        {
            var filter = Builders<Post>.Filter.Eq(p => p.PostId, postId);
            var result = await db.Posts.DeleteOneAsync(filter);

            if (result.DeletedCount == 0)
            {
                return NotFound(new { message = "Post not found" });
            }

            return Ok(new { message = "Post deleted successfully" });
        }

        [HttpPost("seed")]
        public async Task<ActionResult> SeedSamplePosts()
        {
            var count = await db.Posts.CountDocumentsAsync(Builders<Post>.Filter.Empty);
            if (count > 0)
            {
                return Ok(new { message = "Database already has posts", count });
            }

            var samplePosts = new List<Post>
            {
                new Post
                {
                    UserId = "user_sarah",
                    Username = "sarah_travels",
                    UserProfilePic = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                    PostCaption = "Sunset in the mountains! 🌄 Breathing in the fresh crisp alpine air. Nothing clears the mind like a weekend in nature.",
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
                    PostCaption = "Just deployed our new modern full-stack social media application on .NET 9 and MongoDB! 🚀 Loving how clean and responsive the architecture turned out.",
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
                            CommentText = "Super clean UI! Congrats on the launch 👏",
                            CreatedAt = DateTime.UtcNow.AddHours(-3)
                        }
                    ]
                },
                new Post
                {
                    UserId = "user_maya",
                    Username = "maya_art",
                    UserProfilePic = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                    PostCaption = "Morning coffee & sketching sessions are the best way to kickstart creativity ☕🎨 What's your daily morning routine?",
                    PostpicURL = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
                    CreatedAt = DateTime.UtcNow.AddHours(-9),
                    Likes = ["user_alex", "user_sarah"],
                    Comments = []
                }
            };

            await db.Posts.InsertManyAsync(samplePosts);
            return Ok(new { message = "Sample posts seeded successfully", count = samplePosts.Count });
        }
    }

    public class LikeRequest
    {
        public string? UserId { get; set; }
    }

    public class CommentRequest
    {
        public string? UserId { get; set; }
        public string? Username { get; set; }
        public string CommentText { get; set; } = string.Empty;
    }
}