FROM node:20-alpine
WORKDIR /workspace
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY apps/api ./apps/api
COPY packages ./packages
WORKDIR /workspace/apps/api
EXPOSE 4000
CMD ["npm", "run", "dev"]
