FROM ://microsoft.com AS build-env
WORKDIR /src

# Copia os arquivos de projeto mapeando os caminhos corretos da subpasta
COPY Wms.Backend/Wms.Solution.sln ./
COPY Wms.Backend/Wms.Domain/Wms.Domain.csproj Wms.Backend/Wms.Domain/
COPY Wms.Backend/Wms.Application/Wms.Application.csproj Wms.Backend/Wms.Application/
COPY Wms.Backend/Wms.Infrastructure/Wms.Infrastructure.csproj Wms.Backend/Wms.Infrastructure/
COPY Wms.Backend/Wms.API/Wms.API.csproj Wms.Backend/Wms.API/

# Executa o restore dos pacotes NuGet
RUN dotnet restore Wms.Backend/Wms.Solution.sln

# Copia todo o restante do código fonte do backend e compila
COPY Wms.Backend/ ./Wms.Backend/
RUN dotnet publish Wms.Backend/Wms.API/Wms.API.csproj -c Release -o /app/out

# 2. Fase de Execução (Runtime) utilizando o ASP.NET 10 leve de produção
FROM ://microsoft.com
WORKDIR /app
COPY --from=build-env /app/out .

# Expõe e configura a porta dinâmica exigida pela nuvem
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "Wms.API.dll"]
