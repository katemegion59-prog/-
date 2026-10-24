#!/usr/bin/env bash
# Ставит зависимости и скачивает модель распознавания русской речи (GigaAM v2) и VAD.
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
VENV="${VENV:-.venv}"
[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install -q sherpa-onnx numpy
B=https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models
M=sherpa-onnx-nemo-transducer-giga-am-v2-russian-2025-04-19
mkdir -p models
[ -d "models/$M" ] || curl -fSL "$B/$M.tar.bz2" | tar xj -C models
[ -f models/silero_vad.onnx ] || curl -fSL -o models/silero_vad.onnx "$B/silero_vad.onnx"
