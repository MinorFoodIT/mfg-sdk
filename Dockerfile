#FROM node:10-alpine
FROM minor/nodesdk

WORKDIR /home/node/app

#check file .dockerignore
COPY --chown=node:node . .
RUN pwd

EXPOSE 2020

CMD [ "npm","run","start" ]