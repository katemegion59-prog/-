"""Транскрибирует русскую речь из видео в public/captions.json (формат Caption из @remotion/captions).

Модель: GigaAM v2 (sherpa-onnx), сегментация: Silero VAD. Время — по символам, собирается в слова.
Запуск: python scripts/transcribe.py public/input.mp4
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "models" / "sherpa-onnx-nemo-transducer-giga-am-v2-russian-2025-04-19"
VAD = ROOT / "models" / "silero_vad.onnx"
SR = 16000
# Паддинг вокруг сегмента VAD, чтобы не обрезать первые/последние звуки
PAD = int(0.25 * SR)


def load_audio(path: str) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def speech_segments(samples: np.ndarray):
    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = str(VAD)
    cfg.silero_vad.min_silence_duration = 0.3
    cfg.silero_vad.min_speech_duration = 0.2
    cfg.silero_vad.max_speech_duration = 20
    cfg.sample_rate = SR
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=600)
    win = cfg.silero_vad.window_size
    segs = []
    for i in range(0, len(samples), win):
        vad.accept_waveform(samples[i:i + win])
        while not vad.empty():
            segs.append((vad.front.start, vad.front.start + len(vad.front.samples)))
            vad.pop()
    vad.flush()
    while not vad.empty():
        segs.append((vad.front.start, vad.front.start + len(vad.front.samples)))
        vad.pop()
    return segs


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "public" / "input.mp4")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "public" / "captions.json"
    samples = load_audio(src)
    rec = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=str(MODEL / "encoder.int8.onnx"),
        decoder=str(MODEL / "decoder.onnx"),
        joiner=str(MODEL / "joiner.onnx"),
        tokens=str(MODEL / "tokens.txt"),
        model_type="nemo_transducer",
        num_threads=4,
    )

    words = []  # [text, start_s, last_char_s]
    for start, end in speech_segments(samples):
        a, b = max(0, start - PAD), min(len(samples), end + PAD)
        stream = rec.create_stream()
        stream.accept_waveform(SR, samples[a:b])
        rec.decode_stream(stream)
        r = stream.result
        offset = a / SR
        cur = None
        for tok, ts in zip(r.tokens, r.timestamps):
            t = offset + ts
            if tok.strip() == "" or tok == "▁":
                cur = None
                continue
            if cur is None:
                cur = [tok, t, t]
                words.append(cur)
            else:
                cur[0] += tok
                cur[2] = t
        print(f"[{offset:7.2f}s] {r.text}", file=sys.stderr)

    captions = []
    for i, (text, s, last) in enumerate(words):
        nxt = words[i + 1][1] if i + 1 < len(words) else None
        e = last + 0.25
        if nxt is not None:
            e = min(e, nxt)
        captions.append({
            # Пробел в начале — так createTikTokStyleCaptions разделяет слова
            "text": (" " if i else "") + text,
            "startMs": round(s * 1000),
            "endMs": round(max(e, s + 0.12) * 1000),
            "timestampMs": round(s * 1000),
            "confidence": None,
        })
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(captions, ensure_ascii=False, indent=1))
    print(f"{len(captions)} слов -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
