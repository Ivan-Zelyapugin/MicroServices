using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Document;
using DocumentService.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentService.Api.Controllers
{
    [Route("api/[controller]")]
    public class DocumentController(IDocumentService documentService, IUserRepository userRepository) : BaseController
    {

        [HttpGet("my")]
        public async Task<IActionResult> GetMyDocuments()
        {
            return Ok(await documentService.GetDocumentsByUserId(Id));
        }

        [HttpGet("me")]
        public IActionResult GetCurrentUser()
        {
            return Ok(new
            {
                id = Id,
                username = Username,
                email = Email,
                role = Role.ToString()
            });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetDocumentDetails(int id)
        {
            var details = await documentService.GetDocumentDetails(id);

            if (details == null)
                return NotFound();


            var result = new DocumentInfoDto
            {
                Id = details.Id,
                Name = details.Name,
                CreatorUsername = details.Creator?.Username,
                Users = details.Participants
            .Select(p => new DocumentUserDto
            {
                UserId = p.UserId,
                Username = p.Username,
                Role = p.Role.ToString()
            })
            .ToList()
            };


            return Ok(result);
        }
    }
}
