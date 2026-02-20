## Usage

To use this repo for your own documentation, presentations or weblog, add your contents to
`content/docs` and `content/slides` folders. Then use this repo as a template or subtree.

### Using this repo as a template

The `src` folder is reserved for Astro/Starlight and should not be modified in typical usage.

```
git clone https://github.com/aliraeini/starlit.git <new-repo-name>
cd <new-repo-name>
git remote remove origin
git remote add origin <your-repo-url>
```

Then follow the normal procedure for Astro/Starlight, and [pnpm development].


### Using this as a subtree:
The following command will add this repo as a subtree to your repo:
```
git subtree add --prefix starlit  https://github.com/aliraeini/starlit.git  subtree  --squash
```

To build and deploy:

```
(cd starlit && pnpm build)
```

## Background

Created using the command:
```
pnpm create astro@latest -- --template starlight
```

and merged with reveal.js example.


## pnpm development

Typical commands:

```
pnpm install
pnpm dev
pnpm build
pnpm preview
```