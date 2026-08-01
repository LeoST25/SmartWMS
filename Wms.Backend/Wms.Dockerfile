# 1. Fase de Compilação (Build) utilizando o SDK do .NET 10
FROM ://microsoft.com AS build-env
WORKDIR /src

# Copia os arquivos de projeto de todas as camadas para restaurar as dependências
COPY Wms.Solution.sln ./
COPY Wms.Domain/Wms.Domain.csproj Wms.Domain/
COPY Wms.Application/Wms.Application.csproj Wms.Application/
COPY Wms.Infrastructure/Wms.Infrastructure.csproj Wms.Infrastructure/
COPY Wms.API/Wms.API.csproj Wms.API/

# Executa o restore dos pacotes NuGet de toda a solução
RUN dotnet restore

# Copia todo o restante do código fonte e compila a API em modo Release
COPY . .
RUN dotnet publish Wms.API/Wms.API.csproj -c Release -o /app/out

# 2. Fase de Execução (Runtime) utilizando o ASP.NET 10 leve de produção
FROM ://microsoft.com
WORKDIR /app
COPY --from=build-env /app/out .

# Expõe e configura a porta dinâmica exigida pela nuvem
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "Wms.API.dll"]
