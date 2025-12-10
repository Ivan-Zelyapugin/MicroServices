using AutoFixture;
using AutoFixture.AutoMoq;
using Minio;

namespace BlockService.Tests
{
    public class AutoMoqDataAttribute : AutoDataAttribute
    {
        public AutoMoqDataAttribute()
            : base(() =>
            {
                var fixture = new Fixture().Customize(new AutoMoqCustomization());

                fixture.Customize<IMinioClient>(c => c.FromFactory(() =>
                {
                    var mock = new Mock<IMinioClient>(MockBehavior.Loose);
                    return mock.Object;
                }).OmitAutoProperties());

                return fixture;
            })
        {
        }
    }
}
