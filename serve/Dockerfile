FROM docker.io/node:24-trixie

# USER root
RUN npm install -g npm # update

RUN npm i -g pnpm
RUN npm i -g playwright
RUN npm exec playwright install-deps
RUN npm i -g tsx

RUN ls -lha /home/node
RUN npm --version

# ARG USER_ID=1000
# ARG GROUP_ID=1000


WORKDIR /home/node/app



# set ENTRYPOINT for reloading nvm-environment
# ENTRYPOINT ["bash", "-c", "source $NVM_DIR/nvm.sh && exec \"$@\"", "--"]
# CMD ["/bin/bash"]
CMD npx tsx serve/server.ts 47080

# podman build -f Dockerfile -t nodeas

# podman run  -v $PWD:$PWD:U -w $PWD --userns=keep-id:uid=1000,gid=1000 -it nodeas:latest  bash
