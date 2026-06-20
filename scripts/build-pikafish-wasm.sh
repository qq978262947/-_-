#!/usr/bin/env bash
set -euo pipefail

PIKAFISH_ROOT="${1:-/Users/wangjun/Downloads/Pikafish-master}"
ORIGINAL_SRC_DIR="$PIKAFISH_ROOT/src"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/engines/pikafish-wasm"
BUILD_ROOT="$(cd "$(dirname "$0")/.." && pwd)/.build/pikafish-wasm-src"
SRC_DIR="$BUILD_ROOT/src"

if ! command -v emcc >/dev/null 2>&1; then
  echo "emcc not found. Install Emscripten first: https://emscripten.org/docs/getting_started/downloads.html" >&2
  exit 1
fi

if [ ! -f "$ORIGINAL_SRC_DIR/Makefile" ]; then
  echo "Pikafish source not found: $ORIGINAL_SRC_DIR" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -rf "$BUILD_ROOT"
mkdir -p "$BUILD_ROOT"
cp -R "$PIKAFISH_ROOT"/. "$BUILD_ROOT"/
rm -f "$SRC_DIR/external/decompress/huf_decompress_amd64.S"

# The upstream Makefile has wasm32 support, but on macOS it can still inject
# Darwin-only flags such as -arch, -mmacosx-version-min and -mdynamic-no-pic.
# The temporary copy keeps the downloaded source clean while making the wasm
# build deterministic.
perl -0pi -e 's/ifeq \(\$\(ARCH\),wasm32\)\n\tarch = wasm32\n\tsse = yes\n\tsse2 = yes\n\tssse3 = yes\n\tsse41 = yes\nendif/ifeq (\$(ARCH),wasm32)\n\tarch = wasm32\n\tsse = no\n\tsse2 = no\n\tssse3 = no\n\tsse41 = no\nendif/' "$SRC_DIR/Makefile"
perl -0pi -e 's/ifeq \(\$\(KERNEL\),Darwin\)\n\tmac_target_flags := -mmacosx-version-min=10\.15\n\tifneq \(\$\(arch\),any\)\n\t\tmac_target_flags \+= -arch \$\(arch\)\n\tendif\nendif/ifeq ($(KERNEL),Darwin)\nifneq ($(arch),wasm32)\n\tmac_target_flags := -mmacosx-version-min=10.15\n\tifneq ($(arch),any)\n\t\tmac_target_flags += -arch $(arch)\n\tendif\nendif\nendif/' "$SRC_DIR/Makefile"
perl -0pi -e 's/\$\(mac_target_flags\)//g; s/\s+-mdynamic-no-pic//g; s/\s+-DUSE_SLOPPY_ATOMICS//g; s/\s+-sINITIAL_MEMORY=64MB\s+-sALLOW_MEMORY_GROWTH\s+-sSTACK_SIZE=3MB//g; s/\s+-DUSE_SSE41\s+-msse4\.1//g; s/\s+-DUSE_SSSE3\s+-mssse3//g; s/\s+-DUSE_SSE2\s+-msse2//g' "$SRC_DIR/Makefile"
perl -0pi -e 's/void UCIEngine::loop\(\) \{\n    std::string token, cmd;\n\n    for \(int i = 1; i < cli.argc; \+\+i\)\n        cmd \+= std::string\(cli.argv\[i\]\) \+ " ";\n\n    do\n    \{\n        if \(cli.argc == 1\n            && !getline\(std::cin, cmd\)\)  \/\/ Wait for an input or an end-of-file \(EOF\) indication\n            cmd = "quit";/void UCIEngine::loop() {\n    std::string token, cmd, batch;\n\n    for (int i = 1; i < cli.argc; ++i)\n        batch += std::string(cli.argv[i]) + "\\n";\n\n    for (size_t pos = 0; (pos = batch.find("\\\\n", pos)) != std::string::npos;)\n        batch.replace(pos, 2, "\\n");\n\n    std::istringstream batchInput(batch);\n\n    do\n    {\n        if (cli.argc > 1) {\n            if (!getline(batchInput, cmd))\n                cmd = "quit";\n        }\n        else if (!getline(std::cin, cmd))  \/\/ Wait for an input or an end-of-file (EOF) indication\n            cmd = "quit";/' "$SRC_DIR/uci.cpp"
perl -0pi -e 's/(        else if \(token == "go"\)\n        \{\n            \/\/ send info strings after the go command is sent for old GUIs and python-chess\n            print_info_string\(engine\.numa_config_information_as_string\(\)\);\n            print_info_string\(engine\.thread_allocation_information_as_string\(\)\);\n            go\(is\);\n        \})/$1\n            if (cli.argc > 1)\n                engine.wait_for_search_finished();/s' "$SRC_DIR/uci.cpp"
perl -0pi -e 's/\} while \(token != "quit" && cli\.argc == 1\);  \/\/ The command-line arguments are one-shot/} while (token != "quit");  \/\/ The command-line arguments are one-shot/' "$SRC_DIR/uci.cpp"

make -C "$SRC_DIR" clean
EM_CXXFLAGS='-msimd128 -DUSE_POPCNT'
EM_LDFLAGS='-pthread -sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=8 -sASSERTIONS=1 -sINITIAL_MEMORY=512MB -sMAXIMUM_MEMORY=512MB -sSTACK_SIZE=8MB -sFORCE_FILESYSTEM=1 -sEXPORTED_RUNTIME_METHODS=["callMain","FS"] -sENVIRONMENT=worker'
emmake make -C "$SRC_DIR" build ARCH=wasm32 COMP=gcc CXX=em++ ENV_CXXFLAGS="$EM_CXXFLAGS" ENV_LDFLAGS="$EM_LDFLAGS" -j"$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)"

cp "$SRC_DIR/pikafish.js" "$OUT_DIR/pikafish.js"
perl -0pi -e 's/Module\["noInitialRun"\]\|\|true/Module["noInitialRun"]||false/g' "$OUT_DIR/pikafish.js"
if [ -f "$SRC_DIR/pikafish.wasm" ]; then
  cp "$SRC_DIR/pikafish.wasm" "$OUT_DIR/pikafish.wasm"
fi
find "$SRC_DIR" -maxdepth 1 -name 'pikafish*.worker.js' -exec cp {} "$OUT_DIR/" \;
if [ -f "$SRC_DIR/pikafish.nnue" ]; then
  cp "$SRC_DIR/pikafish.nnue" "$OUT_DIR/pikafish.nnue"
fi

echo "Pikafish WASM copied to $OUT_DIR"
