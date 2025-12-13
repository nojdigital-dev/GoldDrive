# Estágio de Build
# Usamos 'slim' (Debian) em vez de 'alpine' para evitar erros de binários do Rollup/Vite
FROM node:20-slim AS build

WORKDIR /app

# Copia apenas os arquivos de dependência primeiro para aproveitar o cache do Docker
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm install

# Copia o restante do código fonte
COPY . .

# Executa o build (cria a pasta dist)
RUN npm run build

# Estágio de Produção (Servidor Web Leve)
FROM nginx:alpine

# Remove a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia nossa configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos gerados no build anterior para a pasta do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]