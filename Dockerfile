# Etapa 1: Build da aplicação
FROM node:20-alpine as build

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto dos arquivos do projeto
COPY . .

# Faz o build da aplicação para produção
RUN npm run build

# Etapa 2: Servidor Nginx para servir os arquivos estáticos
FROM nginx:alpine

# Remove a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia o template (o nginx:alpine aplica envsubst com EVOLUTION_API_URL/EVOLUTION_API_KEY ao iniciar)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Valida as variáveis (e aceita os nomes antigos VITE_*) antes do envsubst
COPY docker/05-evolution-env.envsh /docker-entrypoint.d/
RUN sed -i 's/\r$//' /docker-entrypoint.d/05-evolution-env.envsh \
    && chmod +x /docker-entrypoint.d/05-evolution-env.envsh

# Copia os arquivos buildados da etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]
