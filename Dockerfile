# 1. Fase de compilação (Build) utilizando o SDK do .NET 10
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-env
WORKDIR /src

# Copia primeiro os projetos para aproveitar o cache do restore
COPY Wms.Backend/Wms.Domain/Wms.Domain.csproj Wms.Backend/Wms.Domain/
COPY Wms.Backend/Wms.Application/Wms.Application.csproj Wms.Backend/Wms.Application/
COPY Wms.Backend/Wms.Infrastructure/Wms.Infrastructure.csproj Wms.Backend/Wms.Infrastructure/
COPY Wms.Backend/Wms.API/Wms.API.csproj Wms.Backend/Wms.API/

# Restaura pelo projeto da API; as referências restauram os demais projetos
RUN dotnet restore Wms.Backend/Wms.API/Wms.API.csproj

# Copia o código-fonte e publica a aplicação
COPY Wms.Backend/ Wms.Backend/
RUN dotnet publish Wms.Backend/Wms.API/Wms.API.csproj \
    -c Release \
    -o /app/out \
    --no-restore

# 2. Fase de execução (Runtime) utilizando o ASP.NET Core 10
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build-env /app/out .

# O Render fornece PORT em produção; localmente utiliza 5000
EXPOSE 5000
ENTRYPOINT ["sh", "-c", "exec dotnet Wms.API.dll --urls http://0.0.0.0:${PORT:-5000}"]
