# Pikafish engine

The server looks for a Pikafish executable in this order:

1. `PIKAFISH_PATH`
2. `engines/pikafish/pikafish`
3. `engines/pikafish/pikafish-arm64`
4. `/Users/wangjun/Downloads/Pikafish-master/src/pikafish`
5. `engines/pikafish/pikafish.exe`

For the local source tree at `/Users/wangjun/Downloads/Pikafish-master`, build
the executable with:

```bash
cd /Users/wangjun/Downloads/Pikafish-master/src
make -j all ARCH=apple-silicon COMP=clang
```

Keep `pikafish.nnue` in the same folder as the executable. You can also download
a build from the official Pikafish releases, put the executable in this folder,
and make it executable:

```bash
chmod +x engines/pikafish/pikafish
```

Restart the server and check:

```bash
curl http://localhost:5178/api/health
```

This project now contains a bundled local macOS arm64 build:

```text
engines/pikafish/pikafish
engines/pikafish/pikafish.nnue
```

When `pikafish` is `true`, human-vs-computer play uses Pikafish first. The
browser client only falls back to its own Alpha-Beta search if the local service
or engine cannot answer.
