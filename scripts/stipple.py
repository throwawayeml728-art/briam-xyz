"""Weighted-Voronoi stippling of Brian's landscape photos -> transparent orange-dot SVGs.

Run: /workspace/venv-cv/bin/python scripts/stipple.py
Dot colour sampled from the reference icon's flat background (#DA6F4D).
"""
import numpy as np, cv2
from PIL import Image
from scipy.spatial import cKDTree

HEX = "#DA6F4D"
OUT = "public/art"
rng = np.random.default_rng(7)


def load(path, crop):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255
    h, w = im.shape[:2]
    x0, y0, x1, y1 = crop
    return im[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]


def density(rgb, gw, lo=2, hi=98, gamma=1.0, edge=0.6, clahe=2.0, floor=0.0, chan=None):
    g = (cv2.cvtColor((rgb * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY) if chan is None
         else (rgb[..., chan] * 255).astype(np.uint8))
    gh = int(round(g.shape[0] * gw / g.shape[1]))
    g = cv2.resize(g, (gw, gh), interpolation=cv2.INTER_AREA)
    if clahe:
        g = cv2.createCLAHE(clipLimit=clahe, tileGridSize=(8, 8)).apply(g)
    g = g.astype(np.float32) / 255
    a, b = np.percentile(g, lo), np.percentile(g, hi)
    d = 1 - np.clip((g - a) / (b - a + 1e-6), 0, 1)
    # engraving feel: emphasise contours / ridges
    e = cv2.Laplacian(cv2.GaussianBlur(g, (0, 0), 1.2), cv2.CV_32F, ksize=3)
    d = np.clip(d + edge * np.abs(e) * 6, 0, 1)
    d = d ** gamma
    d[d < floor] = 0
    return d


def stipple(d, n, iters=30):
    h, w = d.shape
    ys, xs = np.mgrid[0:h, 0:w]
    pix = np.c_[xs.ravel() + .5, ys.ravel() + .5]
    wts = d.ravel().astype(np.float64)
    p = wts / wts.sum()
    idx = rng.choice(len(pix), size=n, replace=False, p=p)
    pts = pix[idx] + rng.uniform(-.5, .5, (n, 2))
    keep = wts > 1e-4
    pk, wk = pix[keep], wts[keep]
    for _ in range(iters):
        _, lab = cKDTree(pts).query(pk, workers=-1)
        m = np.bincount(lab, wk, n)
        cx = np.bincount(lab, wk * pk[:, 0], n)
        cy = np.bincount(lab, wk * pk[:, 1], n)
        ok = m > 0
        pts[ok] = np.c_[cx[ok] / m[ok], cy[ok] / m[ok]]
    # local tone at each dot (drives dot size)
    tone = d[np.clip(pts[:, 1].astype(int), 0, h - 1), np.clip(pts[:, 0].astype(int), 0, w - 1)]
    return pts, tone


def fade(h, w, l=0, r=0, t=0, b=0, radial=False):
    """multiplicative edge fade baked into the density map (fractions of size)."""
    y = np.linspace(0, 1, h)[:, None]
    x = np.linspace(0, 1, w)[None, :]
    m = np.ones((h, w), np.float32)
    s = lambda v: np.clip(v, 0, 1) ** 1.5
    if l: m *= s(x / l)
    if r: m *= s((1 - x) / r)
    if t: m *= s(y / t)
    if b: m *= s((1 - y) / b)
    if radial:
        cx, cy, rr = radial
        dist = np.sqrt(((x - cx) / rr) ** 2 + ((y - cy) / rr * h / w) ** 2)
        m *= np.clip(1.4 - dist, 0, 1) ** 1.2
    return m


def write_svg(name, pts, tone, shape, disp, scale=2, dmin=1.0, dmax=2.1):
    """disp = typical on-page width in CSS px; dot diameters dmin..dmax are in those px."""
    h, w = shape
    W, H = w * scale, h * scale
    # 3 size buckets keyed on tone
    buckets = np.digitize(tone, [.45, .75])
    widths = np.round(np.linspace(dmin, dmax, 3) * (w * scale) / disp, 2)
    paths = []
    for k in range(3):
        q = pts[buckets == k] * scale
        if not len(q):
            continue
        q = np.round(q).astype(int)
        order = np.lexsort((q[:, 0], q[:, 1]))
        q = q[order]
        d = [f"M{q[0,0]} {q[0,1]}h0"]
        for (x0, y0), (x1, y1) in zip(q[:-1], q[1:]):
            dx, dy = x1 - x0, y1 - y0
            d.append(f"m{dx}{'' if dy < 0 else ' '}{dy}h0")
        paths.append(f'<path stroke-width="{widths[k]:g}" d="{"".join(d)}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
           f'fill="none" stroke="{HEX}" stroke-linecap="round">' + "".join(paths) + "</svg>")
    with open(f"{OUT}/{name}.svg", "w") as f:
        f.write(svg)
    print(name, len(pts), "dots", f"{len(svg)/1024:.1f}KB", f"{W}x{H}")


PIECES = {
    # wide horizon: the three Monument Valley buttes from the hero photo
    "horizon-mesas": dict(src="public/hero/original.jpg", crop=(0, .35, 1, .61), gw=1200, n=15000, disp=1004,
                          kw=dict(lo=4, hi=70, gamma=1.7, edge=.35, clahe=0),
                          fd=dict(l=.1, r=.1, t=.0, b=.5), hatch=(5, .45), cut=.05),
    # single butte vignette: West Mitten in haze (select-05)
    "butte-mitten": dict(src="public/photos/select-05.png", crop=(0, .4, .5, .82), gw=520, n=2400, disp=230,
                         kw=dict(lo=3, hi=85, gamma=1.5, edge=.5, clahe=0),
                         fd=dict(l=.12, r=.3, t=.0, b=.4), hatch=(5, .35), cut=.06),
    # hoodoo spire + canyon walls (select-23)
    "hoodoo-corner": dict(src="public/photos/select-23.png", crop=(.14, .24, .56, .9), gw=360, n=2600, disp=150,
                          kw=dict(lo=1, hi=70, gamma=1.5, edge=1.2, clahe=0),
                          fd=dict(l=.15, r=.15, t=.1, b=.3), cut=.05),
    # 404: Monument Valley, wider/lower crop of the hero photo (green channel so the red ground reads)
    "road-valley": dict(src="public/hero/original.jpg", crop=(0, .33, 1, .86), gw=720, n=9000, disp=720,
                        kw=dict(lo=2, hi=88, gamma=1.8, edge=.6, clahe=0, chan=1),
                        fd=dict(l=.1, r=.1, t=.0, b=.3), ground=(.25, .55), hatch=(5, .3), cut=.05),
    # Merrick Butte, cut from the second Monument Valley frame (select-52)
    "merrick-butte": dict(src="public/photos/select-52.png", crop=(.68, .36, 1, .62), gw=420, n=1700, disp=190,
                          kw=dict(lo=3, hi=75, gamma=1.6, edge=.8, clahe=0),
                          fd=dict(l=.1, r=.1, t=.0, b=.4), hatch=(5, .3), cut=.06),
}

if __name__ == "__main__":
    import os, sys
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]
    for name, c in PIECES.items():
        if only and name not in only:
            continue
        rgb = load(c["src"], c["crop"])
        d = density(rgb, c["gw"], **c["kw"])
        if c.get("skyline"):  # re-normalise the skyline band on its own so hazy buttes read
            yb, kw2 = c["skyline"]
            hb = int(rgb.shape[0] * yb)
            top = density(rgb[:hb], c["gw"], **kw2)
            n = min(top.shape[0], d.shape[0])
            w = np.clip((np.arange(n) / n - .85) / .15, 0, 1)[:, None]
            d[:n] = top[:n] * (1 - w) + d[:n] * w
        d *= fade(*d.shape, **c["fd"])
        if c.get("ground"):  # damp the foreground so the skyline reads first
            hz, mult = c["ground"]
            y = np.linspace(0, 1, d.shape[0])[:, None]
            t = np.clip((y - hz) / .08, 0, 1)
            d *= 1 - (1 - mult) * t
        if c.get("hatch"):
            period, amt = c["hatch"]
            y = np.arange(d.shape[0])[:, None]
            d *= (1 - amt) + amt * (0.5 + 0.5 * np.cos(2 * np.pi * y / period))
        d[d < c.get("cut", 0.04)] = 0
        pts, tone = stipple(d, c["n"])
        write_svg(name, pts, tone, d.shape, c["disp"])


def preview(name):
    """rasterise an output SVG onto sandstone for eyeballing (dev only)."""
    import re
    from PIL import ImageDraw
    s = open(f"{OUT}/{name}.svg").read()
    W, H = map(int, re.search(r'viewBox="0 0 (\d+) (\d+)"', s).groups())
    im = Image.new("RGB", (W, H), "#f3ead9"); dr = ImageDraw.Draw(im)
    for sw, d in re.findall(r'stroke-width="([\d.]+)" d="([^"]+)"', s):
        r = float(sw) / 2; x = y = 0
        for cmd, a, b in re.findall(r'([Mm])(-?\d+)\s?(-?\d+)h0', d):
            a, b = int(a), int(b)
            x, y = (a, b) if cmd == "M" else (x + a, y + b)
            dr.ellipse((x - r, y - r, x + r, y + r), fill=HEX)
    im.save(f"/tmp/contact/prev-{name}.png")
