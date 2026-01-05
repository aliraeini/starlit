
build:
	podman build -f serve/Dockerfile -t nodejs
	podman run --rm  -v ${PWD}:/home/node/app  nodejs bash -c "pnpm i && npm run build"
	podman run --rm -p 47080:47080 -v ${PWD}:/home/node/app  nodejs bash -c "pwd && ls"

serve:
	podman run --rm -p 47080:47080 -v ${PWD}:/home/node/app  nodejs bash -c "npx tsx serve/server.ts 47080"

.PHONY: build serve
