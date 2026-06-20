# Pikafish WASM

Place the browser build output here:

- `pikafish.js`
- `pikafish.wasm`
- optional `pikafish.nnue`

Build from the local Pikafish source with:

```bash
npm run build:pikafish-wasm -- /Users/wangjun/Downloads/Pikafish-master
```

The web app loads `pikafish-wasm-worker.js`, which then loads the single-thread
`pikafish.js` build inside a Web Worker.
If the WASM build is missing, human-vs-computer falls back to the in-browser JS search.
