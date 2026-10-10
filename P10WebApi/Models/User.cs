using System;
using System.Collections;
using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using P10_WebApi.Models.AbstractClasses;

namespace P10_WebApi.Models;

public class User : BaseEntity
{

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? UserId { get; set; } 
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? ProfilePic { get; set; }
    public string? Bio { get; set; }

    public string? OTP { get; set; }
    
    public DateTime? OTPExpiry { get; set; } 
    public List<string> Posts { get; set; } = [];
    public List<string> Comments { get; set; } = [];
    public List<string> LikesGiven { get; set; } = [];
        
}   