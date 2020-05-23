FROM arm32v6/alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN apk update
RUN apk upgrade

ENV LANG en_US.utf8

RUN apk add build-base iputils
RUN apk add cairo-dev giflib-dev jpeg-dev
RUN apk add sudo curl bash

#RUN curl -sL https://deb.nodesource.com/setup_9.x | sudo bash -
RUN apk add nodejs nodejs-npm

RUN cd /usr/src/app

# Bundle app source
COPY . .
RUN cd /usr/src/app
RUN mkdir /config

COPY bin /usr/src/app/bin
COPY lg-config.json /config

RUN npm install

CMD NODE_ARGS=--tls-min-v1.0 npm start

