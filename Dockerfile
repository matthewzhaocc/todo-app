FROM node:alpine

COPY . .
RUN npm ci
RUN npm run build

CMD npm run start