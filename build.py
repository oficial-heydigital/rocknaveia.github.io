"""Gera a pasta _site/ para o GitHub Pages.
- fotos/<álbum>/*.jpg  -> miniaturas + versão grande otimizadas
- videos.txt           -> lista de vídeos
- posts/*.md           -> novidades
Roda sozinho pelo GitHub Actions a cada alteração."""
import json, re, shutil
from pathlib import Path
from PIL import Image, ImageOps

OUT = Path("_site")
shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir()
for item in ("index.html", "config.js", "assets", "admin"):
    p = Path(item)
    shutil.copytree(p, OUT / item) if p.is_dir() else shutil.copy(p, OUT / item)
(OUT / "data").mkdir()

def titulo(nome):
    m = re.match(r"(\d{4}-\d{2}-\d{2})-?(.*)", nome)
    data, resto = (m.group(1), m.group(2)) if m else ("", nome)
    return data, (resto or nome).replace("-", " ").replace("_", " ").strip().capitalize()

albums = []
for pasta in sorted(Path("fotos").glob("*/")):
    fotos = sorted(f for f in pasta.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))
    if not fotos:
        continue
    data, nome = titulo(pasta.name)
    dest = OUT / "fotos" / pasta.name
    dest.mkdir(parents=True)
    lista = []
    for i, f in enumerate(fotos):
        try:
            im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        except Exception as e:
            print("Ignorando", f, e); continue
        g = im.copy(); g.thumbnail((1600, 1600)); g.save(dest / f"{i}-g.jpg", quality=82, optimize=True)
        t = im.copy(); t.thumbnail((600, 600)); t.save(dest / f"{i}-t.jpg", quality=78, optimize=True)
        base = f"fotos/{pasta.name}/{i}"
        lista.append({"thumb": base + "-t.jpg", "full": base + "-g.jpg"})
    albums.append({"title": nome, "date": data, "cover": lista[0]["thumb"], "photos": lista})
albums.sort(key=lambda a: a["date"], reverse=True)

def yt(url):
    m = re.search(r"(?:youtu\.be/|v=|embed/|shorts/)([\w-]{11})", url)
    return m.group(1) if m else ""

videos = []
vf = Path("videos.txt")
if vf.exists():
    for linha in vf.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#"):
            continue
        partes = [p.strip() for p in linha.split("|")]
        url = partes[0]
        videos.append({"url": url, "youtube": yt(url),
                       "title": partes[1] if len(partes) > 1 and partes[1] else "Vídeo",
                       "date": partes[2] if len(partes) > 2 else ""})
videos.sort(key=lambda v: v["date"], reverse=True)

posts = []
for f in Path("posts").glob("*.md"):
    if f.name.startswith("_"):
        continue
    data, _ = titulo(f.stem)
    linhas = f.read_text(encoding="utf-8").strip().splitlines()
    if not linhas:
        continue
    tit = linhas[0].lstrip("# ").strip()
    posts.append({"date": data, "title": tit, "body": "\n".join(linhas[1:]).strip()})
posts.sort(key=lambda p: p["date"], reverse=True)

(OUT / "data" / "site.json").write_text(
    json.dumps({"albums": albums, "videos": videos, "posts": posts}, ensure_ascii=False), encoding="utf-8")
print(f"{len(albums)} álbuns, {len(videos)} vídeos, {len(posts)} posts")
