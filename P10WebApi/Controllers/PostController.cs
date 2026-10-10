using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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



        [HttpPost("create")]
        public async Task<ActionResult> Create([FromForm] Post req, IFormFile? image)
        {
            if (image != null && image.Length > 0)
            {
                var secureUrl = await cloudinaryService.UploadImageAsync(image, "P10WebApi");
                req.PostpicURL = secureUrl;
            }

            await db.Posts.InsertOneAsync(req);

            return Ok(new { message = "Post created successfully", post = req });
        }



    }
}