FROM resin/rpi-raspbian:latest

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN apt-get update -y
RUN apt-get upgrade -y

ENV LANG en_US.utf8

RUN apt-get install -y -y build-essential apt-utils iputils-ping
RUN apt-get install -y libcairo2-dev libgif-dev libjpeg-dev libgif7

RUN curl -sL https://deb.nodesource.com/setup_9.x | sudo bash -
RUN apt-get install nodejs -y

RUN cd /usr/src/app

# Bundle app source
COPY . .
RUN cd /usr/src/app
RUN mkdir /config

COPY bin /usr/src/app/bin
COPY lg-config.json /config

RUN npm install

CMD npm start

