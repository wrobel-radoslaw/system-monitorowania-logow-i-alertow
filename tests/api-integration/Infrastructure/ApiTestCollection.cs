using Xunit;

namespace ApiIntegrationTests.Infrastructure;

[CollectionDefinition(Name)]
public sealed class ApiTestCollection : ICollectionFixture<ApiTestFactory>
{
    public const string Name = "ApiIntegration";
}
