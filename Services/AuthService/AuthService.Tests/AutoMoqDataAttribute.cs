using AutoFixture;
using AutoFixture.AutoMoq;

namespace AuthService.Tests
{
    public class AutoMoqWithPepperAttribute : AutoDataAttribute
    {
        public AutoMoqWithPepperAttribute()
            : base(() =>
            {
                Environment.SetEnvironmentVariable("AUTH_PEPPER", "6h5nDgI5vV4kYbL0lmB6eJTTdD0w2w5d2NZJwX4xYYkB0QF7C1mV2xM7yQtJbRkS");
                return new Fixture().Customize(new AutoMoqCustomization());
            })
        {
        }
    }
}
