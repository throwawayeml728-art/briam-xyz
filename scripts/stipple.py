"""Weighted-Voronoi stippling of Brian's landscape photos -> transparent orange-dot SVGs.

Run: /workspace/venv-cv/bin/python scripts/stipple.py [name ...]
Also stipples the cowboy ink drawings in scripts/sources (FIGURES).
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


def figure_density(path, gw, ink_lo=8, ink_hi=92, gamma=1.0, floor=0.0, outline=0.0, band=2, thresh=0.12, pad=0.03,
                   blur=0.0, edge=0.0):
    """black-ink-on-white illustration -> density cropped to its silhouette.
    dark ink = dense dots; `floor` keeps light-coloured bodies (a white horse) visible inside the
    silhouette; `outline` boosts a `band`-px rim so the shape reads at tiny sizes."""
    g = np.asarray(Image.open(path).convert("L")).astype(np.float32) / 255
    h0, w0 = g.shape
    gh = int(round(h0 * gw / w0))
    g = cv2.resize(g, (gw, gh), interpolation=cv2.INTER_AREA)
    a, b = np.percentile(g, ink_lo), np.percentile(g, ink_hi)
    ink = 1 - np.clip((g - a) / (b - a + 1e-6), 0, 1)
    if blur:  # merge fine hatching into tone so dots follow masses, not every line
        ink = cv2.GaussianBlur(ink, (0, 0), blur)
    # silhouette: anything inked, closed, holes filled (flood from the border)
    m = (cv2.GaussianBlur(ink, (0, 0), 1.0) > thresh).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    ff = m.copy(); msk = np.zeros((gh + 2, gw + 2), np.uint8)
    cv2.floodFill(ff, msk, (0, 0), 1)
    m = m | (1 - ff)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] > 0.002 * gw * gh
    m = keep[lab].astype(np.float32)
    rim = m - cv2.erode(m, np.ones((2 * band + 1, 2 * band + 1), np.uint8))
    d = m * (floor + (1 - floor) * ink ** gamma)
    d = np.clip(d + outline * rim, 0, 1)
    if edge:  # internal contours (rider vs horse, horse vs horse)
        e = np.abs(cv2.Laplacian(cv2.GaussianBlur(ink, (0, 0), 1.5), cv2.CV_32F, ksize=3))
        d = np.clip(d + edge * m * e / (np.percentile(e[m > 0], 99) + 1e-6), 0, 1)
    ys, xs = np.nonzero(m)
    p = int(pad * gw)
    y0, y1 = max(ys.min() - p, 0), min(ys.max() + p + 1, gh)
    x0, x1 = max(xs.min() - p, 0), min(xs.max() + p + 1, gw)
    return d[y0:y1, x0:x1]


# cowboys on horseback from black-ink illustrations (scripts/sources)
FIGURES = {
    # lone rider walking right: crosses the footer skyline
    "cowboy-rider": dict(src="scripts/sources/cowboy-rider.jpg", gw=300, n=1100, disp=56,
                         kw=dict(gamma=1.3, floor=0.12, outline=0.5, band=2, blur=1.0, edge=0.25), dot=(0.8, 1.5)),
    # two riders seen from behind: About page, under the hoodoo
    "cowboy-pair": dict(src="scripts/sources/cowboy-pair.jpg", gw=360, n=2600, disp=120,
                        kw=dict(gamma=1.8, floor=0.06, outline=0.55, band=2, blur=1.2, edge=0.35), dot=(0.75, 1.6)),
    # cowboy standing beside his (pale) horse: 404 roadside
    "cowboy-standing": dict(src="scripts/sources/cowboy-standing.jpg", gw=360, n=2600, disp=130,
                            kw=dict(gamma=1.5, floor=0.08, outline=0.6, band=2, blur=1.2, edge=0.4), dot=(0.75, 1.6)),
}

if __name__ == "__main__":
    import os, sys
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]
    for name, c in FIGURES.items():
        if only and name not in only:
            continue
        d = figure_density(c["src"], c["gw"], **c["kw"])
        d[d < c.get("cut", 0.03)] = 0
        pts, tone = stipple(d, c["n"])
        write_svg(name, pts, tone, d.shape, c["disp"], dmin=c["dot"][0], dmax=c["dot"][1])
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
