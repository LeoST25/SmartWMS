# 1. Fase de Compilação (Build) usando a imagem oficial do .NET 10
FROM ://microsoft.com
WORKDIR /app

# Copia os arquivos do projeto e restaura as dependências
COPY *.csproj ./
RUN dotnet restore

# Copia o restante do código e compila a aplicação
COPY . ./
RUN dotnet publish -c Release -o out

# 2. Fase de Execução (Runtime)
FROM ://microsoft.com
WORKDIR /app
COPY --from=build-env /app/out .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "c#.dll"]
