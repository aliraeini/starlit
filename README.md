## Usage

To use this repo for personal documentation, presentations or weblog, add your contents to
`content/docs` and `content/slides` folders. Then use this repo as a template or subtree.

### Using this repo as a template

The `src` folder is reserved for Astro/Starlight and should not be modified in typical usage.

```
git clone https://github.com/aliraeini/starlit.git <new-repo-name>
cd <new-repo-name>
git remote remove origin
git remote add origin <your-repo-url>
```

Then follow the normal procedure for Astro/Starlight, and the development commands below.


### Using this as a subtree:
The following command will add this repo as a subtree to your repo (using the `main` branch):
```
git subtree add --prefix starlit https://github.com/aliraeini/starlit.git main --squash
```
Alternatively, you can just clone it inside the main repo and add its path to the main repo's .gitignore list!

To build and serve on [local port 4321](http://localhost:4321/), run:

```
(cd starlit && pnpm dev)
```

Other relevant commands (from within the `starlit` directory):

```
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## Background

Created using the command:
```
pnpm create astro@latest -- --template starlight
```

and merged with reveal.js example.
