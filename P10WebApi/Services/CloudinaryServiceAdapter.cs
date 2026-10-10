using Microsoft.AspNetCore.Http;
using P10_WebApi.Interfaces;

namespace P10_WebApi.Services;

// Placeholder until P0 cloudinary integration is implemented.
public sealed class CloudinaryServiceAdapter : ICloudinaryService
{
    public Task<string> UploadImageAsync(IFormFile image, string folderName)
        => Task.FromResult(string.Empty);

    public Task<string> UploadImageAsync(Stream stream, string fileName, string folderName)
        => Task.FromResult(string.Empty);

    public Task<string> UploadVideoAsync(IFormFile video, string folderName)
        => Task.FromResult(string.Empty);

    public Task<string> UploadVideoAsync(Stream stream, string fileName, string folderName)
        => Task.FromResult(string.Empty);
}

