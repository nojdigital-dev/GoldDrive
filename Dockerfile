# Estágio de Build
FROM node:20-slim AS build

WORKDIR /app

# Copia APENAS o package.json (ignoramos o lockfile de propósito para evitar conflito de SO)
COPY package.json ./

# Instala as dependências do zero baseadas no package.json
# Isso garante que o pacote @rollup/rollup-linux-x64-gnu seja baixado corretamente
RUN npm install

# Copia o restante do código
COPY . .

# Executa o build
RUN npm run build

# Estágio de Produção (Servidor Web)
FROM nginx:alpine

# Limpa configuração padrão
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia nossa configuração personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build final
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]