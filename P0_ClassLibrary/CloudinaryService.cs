using Microsoft.AspNetCore.Http;

namespace P0_ClassLibrary;

// Minimal placeholder so the app compiles even if real Cloudinary integration isn't implemented yet.
// NOTE: not referencing P10_WebApi project interfaces from here to avoid circular references.
public class CloudinaryService
{
    
    public CloudinaryService(string uri)
    {
    }

    public Task<string> UploadImageAsync(IFormFile image, string folderName)
    {
        return Task.FromResult<string>(string.Empty);
    }

    public Task<string> UploadImageAsync(Stream stream, string fileName, string folderName)
    {
        return Task.FromResult<string>(string.Empty);
    }

    public Task<string> UploadVideoAsync(IFormFile video, string folderName)
    {
        return Task.FromResult<string>(string.Empty);
    }

    public Task<string> UploadVideoAsync(Stream stream, string fileName, string folderName)
    {
        return Task.FromResult<string>(string.Empty);
    }
}


