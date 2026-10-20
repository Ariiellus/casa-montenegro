"""Pre-graba la voz del fantasma con Piper TTS (es_AR-daniela-high, CC BY-SA 4.0).

Uso: pip install piper-tts && python3 tools/gen_voice.py lines.json
lines.json = lista de textos (ver tools/README). Genera audio/voz/*.mp3 y js/voz.js.
"""
import hashlib, json, os, re, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = "es_AR-daniela-high"
URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_AR/daniela/high/" + VOICE
CACHE = os.path.expanduser("~/voices")
SAY = [
    ("24 de octubre", "veinticuatro de octubre"), ("1957", "mil novecientos cincuenta y siete"),
    ("22:47", "las diez y cuarenta y siete de la noche"), ("a las las", "a las"),
    ("28 días", "veintiocho días"), ("12 cm", "doce centímetros"), ("1 cm", "un centímetro"),
    ("5 minutos", "cinco minutos"),
]
FX = "aecho=0.8:0.5:60:0.14,lowpass=f=8000,volume=1.3"
OUIJA = {"SÍ": "Sí. Así es.", "NO": "No. No es así.", "QUIZÁS": "Quizás. Tal vez.",
         "NO LO SÉ": "No lo sé.", "PREGUNTA OTRA COSA": "Pregunta otra cosa."}

def spoken(t):
    if t in OUIJA:
        return OUIJA[t]
    for a, b in SAY:
        t = t.replace(a, b)
    return re.sub(r"[«»]", "", t)

def main(path):
    os.makedirs(CACHE, exist_ok=True)
    model = os.path.join(CACHE, VOICE + ".onnx")
    for ext in ("", ".json"):
        if not os.path.exists(model + ext):
            urllib.request.urlretrieve(URL + ".onnx" + ext, model + ext)
    lines = json.load(open(path, encoding="utf-8"))
    out = os.path.join(ROOT, "audio", "voz"); os.makedirs(out, exist_ok=True)
    manifest = {}
    for t in lines:
        name = hashlib.sha1(t.encode()).hexdigest()[:10] + ".mp3"
        manifest[t] = "audio/voz/" + name
        dest = os.path.join(out, name)
        if os.path.exists(dest):
            continue
        with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
            subprocess.run([sys.executable, "-m", "piper", "-m", model, "-f", wav.name,
                            "--length-scale", "1.05", "--sentence-silence", "0.35"],
                           input=spoken(t).encode(), check=True, capture_output=True)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name, "-af", FX,
                            "-ac", "1", "-b:a", "64k", dest], check=True)
    keep = set(os.path.basename(v) for v in manifest.values())
    for f in os.listdir(out):
        if f not in keep:
            os.remove(os.path.join(out, f))
    with open(os.path.join(ROOT, "js", "voz.js"), "w", encoding="utf-8") as f:
        f.write("// Generado por tools/gen_voice.py — voz Piper es_AR-daniela-high (CC BY-SA 4.0, datos OpenSLR 61)\n")
        f.write("window.VOZ = " + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n")
    print(len(manifest), "líneas")

if __name__ == "__main__":
    main(sys.argv[1])
