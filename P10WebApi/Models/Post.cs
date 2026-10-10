using System;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using P10_WebApi.Models.AbstractClasses;

namespace P10_WebApi.Models;

public class Post : BaseEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? PostId { get; set; }      // postId will used in the code instead of _id
    public string UserId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? UserProfilePic { get; set; }
    public string? PostpicURL { get; set; }
    public string? PostVideoURL { get; set; }
    public string PostCaption { get; set; } = string.Empty;
    public List<string> Likes { get; set; } = [];  // likes is an array of strings  i.e userIds
    public List<Comment> Comments { get; set; } = []; 
}