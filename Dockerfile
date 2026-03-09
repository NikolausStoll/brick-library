FROM node:20-alpine

WORKDIR /workspace

COPY package.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm install --prefix backend
RUN npm install --prefix frontend

COPY . .

EXPOSE 8097 5174

CMD ["./run-local.sh"]
