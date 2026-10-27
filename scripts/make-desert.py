"""Procedural hero: Monument Valley-style desert rendered like a vintage USGS
geologic shaded-relief print (strata colour bands, hillshade + cast shadows,
paper grain, thin graticule, relief shadow on the paper).

No photos, no AI imagery: a numpy heightfield (noise + hand-shaped mesa/butte
profiles), lit and coloured by elevation strata, then voxel-space rendered.

Usage: /workspace/venv-cv/bin/python scripts/make-desert.py [--preview]
Writes public/hero/desert-{desktop,mobile}.{webp,avif} (needs numpy, scipy, pillow).
"""
import argparse, os
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--preview', action='store_true', help='half-res, png only')
args = ap.parse_args()
rng = np.random.default_rng(1931)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'hero')
PAPER = np.array([243, 234, 217], np.float32) / 255  # --bg #f3ead9
INK = np.array([43, 29, 20], np.float32) / 255       # --fg

# ─── world heightfield ─────────────────────────────────────────────────────
XMIN, XMAX, YMAX = -3.0, 3.0, 2.6        # X across, Y = depth from the near edge
CELL = 0.0016 if not args.preview else 0.0024
NX, NY = int((XMAX - XMIN) / CELL), int(YMAX / CELL)
X = np.linspace(XMIN, XMAX, NX, dtype=np.float32)[None, :]
Y = np.linspace(0, YMAX, NY, dtype=np.float32)[:, None]

def noise(scale_world, shape=(NY, NX), aniso=(1, 1)):
    """smooth value noise ~N(0,1) with feature size scale_world (world units)."""
    s = scale_world / CELL
    sy, sx = max(1, int(shape[0] / (s * aniso[0]))) + 3, max(1, int(shape[1] / (s * aniso[1]))) + 3
    g = rng.standard_normal((sy, sx)).astype(np.float32)
    z = ndi.zoom(g, (shape[0] / (sy - 3), shape[1] / (sx - 3)), order=3)[:shape[0], :shape[1]]
    return (z - z.mean()) / (z.std() + 1e-6)

def fbm(scale, octaves=4, gain=0.5, aniso=(1, 1)):
    t, a, s, n = 0, 1, scale, 0
    for _ in range(octaves):
        t = t + a * noise(s, aniso=aniso); n += a; a *= gain; s /= 2.1
    return t / n

def smooth(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# desert floor: low swells, eroded badland hummocks, dune ripples, a dry wash
ridged = (1 - np.abs(fbm(0.30, 3))) ** 4
bad = smooth(0.35, 1.1, fbm(0.7, 3))                 # where badlands crop out
amp = 0.35 + 0.65 * smooth(0.15, 0.9, Y)             # calmer right under the viewer
ground = 0.009 * fbm(0.7, 3) + amp * (0.011 * ridged * bad + 0.0007 * fbm(0.03, 3)) + 0.004 * Y
ripple = np.sin((X * 0.8 + Y) * 260 + 6 * fbm(0.08, 2)) * smooth(-0.2, 0.6, -fbm(0.4, 2))
ground = ground + 0.00012 * ripple
# dendritic drainage scored into the floor (thin valleys of a ridged field)
rills = (1 - np.abs(fbm(0.16, 3))) ** 10
ground = ground - amp * 0.0035 * rills
wash_x = 0.30 + 0.22 * np.sin(Y * 2.3 + 0.6) + 0.06 * np.sin(Y * 6.1)
wd = np.abs(X - wash_x - 0.03 * fbm(0.1, 2))
wash = np.exp(-(wd / 0.03) ** 2) * (1 - smooth(1.4, 1.9, Y))
ground = ground * (1 - 0.8 * wash) - 0.008 * wash
H = ground.copy()

edge_n = fbm(0.06, 4)                               # ragged cliff lines
wx, wy = fbm(0.10, 3), fbm(0.10, 3)                 # domain warp for footprints
flute = noise(0.010, aniso=(0.2, 1))                # vertical fluting on cliff walls
gully = np.abs(noise(0.018))                        # gullies in the talus aprons

def butte(cx, cy, rx, ry, h, cliff=0.55, talus=1.1, rough=0.10, warp=0.02):
    """flat cap, sheer sandstone cliff (top `cliff` of the height), concave shale talus."""
    r = np.sqrt(((X + warp * wx - cx) / rx) ** 2 + ((Y + warp * wy - cy) / ry) ** 2)
    r = r * (1 + rough * edge_n + 0.03 * flute)
    top = h * (1 + 0.015 * edge_n)
    base = h * (1 - cliff)
    wall = 0.035
    z = np.where(r < 1, top, 0)
    t = smooth(1, 1 + wall, r)
    z = np.where((r >= 1) & (r < 1 + wall), top + (base - top) * t, z)
    u = np.clip((r - 1 - wall) / talus, 0, 1)
    tal = base * (1 - u) ** 2.0 * (1 - 0.22 * gully * smooth(0, 0.3, u))
    z = np.where(r >= 1 + wall, tal, z)
    return z

def plateau_edge(y0, amp, h):
    """long escarpment on the horizon: land beyond y0(X) is a plateau of height h."""
    ye = y0 + amp * np.sin(X * 1.7) + 0.08 * fbm(0.25, 4)[:1, :] + 0.015 * edge_n
    d = Y - ye
    tal = np.clip(1 + d / 0.22, 0, 1) ** 2.2 * (1 - 0.2 * gully)
    top = h * (1 + 0.03 * fbm(0.2, 3))
    s = smooth(0, 0.008, d)
    return np.where(d > 0, top * s + h * 0.45 * (1 - s), h * 0.45 * tal)

features = [
    plateau_edge(2.25, 0.06, 0.15),
    # West Mitten + thumb, East Mitten + thumb, Merrick, Elephant-ish mesas, spires
    butte(-0.62, 1.30, 0.13, 0.075, 0.300, cliff=0.55, warp=0.025),
    butte(-0.455, 1.29, 0.020, 0.018, 0.255, cliff=0.70, talus=3.5, rough=0.06, warp=0.004),
    butte(0.20, 1.58, 0.12, 0.07, 0.290, cliff=0.55, warp=0.025),
    butte(0.355, 1.565, 0.019, 0.017, 0.250, cliff=0.70, talus=3.6, rough=0.06, warp=0.004),
    butte(0.68, 1.10, 0.085, 0.045, 0.250, cliff=0.50, warp=0.02),
    butte(0.64, 1.115, 0.16, 0.075, 0.125, cliff=0.45, talus=0.9, rough=0.14, warp=0.03),  # Merrick's bench
    butte(0.24, 1.585, 0.17, 0.09, 0.115, cliff=0.4, talus=0.8, rough=0.14, warp=0.03),
    butte(-0.63, 1.31, 0.18, 0.095, 0.120, cliff=0.4, talus=0.8, rough=0.14, warp=0.03),
    butte(-1.55, 1.75, 0.55, 0.22, 0.250, cliff=0.48, talus=0.8, rough=0.07, warp=0.05),
    butte(1.60, 1.88, 0.50, 0.22, 0.265, cliff=0.48, talus=0.7, rough=0.07, warp=0.05),
    butte(1.10, 1.40, 0.06, 0.045, 0.175, cliff=0.58, talus=1.6),
    butte(-1.05, 1.00, 0.020, 0.017, 0.170, cliff=0.76, talus=4.0, rough=0.05, warp=0.004),
    butte(-0.985, 1.03, 0.012, 0.011, 0.130, cliff=0.78, talus=5.0, rough=0.05, warp=0.003),
    butte(1.00, 0.86, 0.017, 0.015, 0.120, cliff=0.74, talus=4.0, rough=0.05, warp=0.004),
    butte(-0.12, 1.02, 0.055, 0.03, 0.095, cliff=0.5, talus=1.5),
    butte(2.25, 1.25, 0.32, 0.12, 0.19, cliff=0.5, talus=0.8, warp=0.04),
    butte(-2.35, 1.20, 0.36, 0.14, 0.17, cliff=0.5, talus=0.8, warp=0.04),
]
for f in features:
    H = np.where(f > 0.0005, np.maximum(H, f + 0.5 * ground), H)
relief = np.clip((H - ground) / 0.01, 0, 1)            # 0 on the open floor, 1 on landforms
H = H + 0.0012 * fbm(0.02, 3) * relief
H = ndi.gaussian_filter(H, 0.6).astype(np.float32)

# ─── lighting: hillshade, cast shadows, ambient occlusion ──────────────────
gy, gx = np.gradient(H, CELL)
VE = 2.2  # vertical exaggeration for the hillshade, like a relief print
nrm = np.stack([-gx * VE, -gy * VE, np.ones_like(H)])
nrm /= np.linalg.norm(nrm, axis=0)
L = np.array([-0.70, -0.42, 0.50]); L /= np.linalg.norm(L)    # low sun, front-left
lam = np.clip(np.tensordot(L, nrm, 1), 0, 1)
steep = 1 - nrm[2]                                              # 0 flat .. 1 vertical

lh = np.hypot(L[0], L[1]); tanE = L[2] / lh
dx, dy = L[0] / lh, L[1] / lh
shadow = np.ones_like(H)
step = 2
for s in range(step, int(0.32 / tanE / CELL), step):
    ox, oy = int(round(dx * s)), int(round(dy * s))
    src = np.full_like(H, -1)
    ys0, ys1 = max(0, oy), NY + min(0, oy)
    xs0, xs1 = max(0, ox), NX + min(0, ox)
    src[ys0 - oy:ys1 - oy, xs0 - ox:xs1 - ox] = H[ys0:ys1, xs0:xs1]
    shadow = np.minimum(shadow, np.where(src > H + s * CELL * tanE + 0.002, 0, 1))
shadow = ndi.gaussian_filter(shadow, 1.6)
ao = np.clip(1 - 18 * np.maximum(ndi.gaussian_filter(H, 18) - H, 0), 0.55, 1)
light = (0.30 + 0.95 * lam * (0.25 + 0.75 * shadow)) * (0.78 + 0.22 * ao)

# ─── geologic map units (plan-view colour, used on flats) ──────────────────
def hexc(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255

# elevation strata, bottom → top: (top-of-band elevation, colour)
STRATA = [
    (0.016, '#dcc07f'),  # alluvium / dune sand (ochre)
    (0.034, '#cd9a82'),  # dusty-pink shale
    (0.060, '#b9694e'),  # Organ Rock: red-brown slope former
    (0.074, '#cc8a6c'),
    (0.110, '#ad5a40'),
    (0.128, '#c4704c'),
    (0.205, '#cc6b44'),  # De Chelly sandstone: orange cliff (≈ #DA6F4D)
    (0.222, '#c4643e'),
    (0.262, '#d0744a'),
    (0.278, '#bb8a40'),  # Moenkopi: mustard ledges
    (0.292, '#caa44c'),
    (9.000, '#8b8a50'),  # Shinarump cap: olive
]
SB = np.array([b for b, _ in STRATA], np.float32)
SC = np.stack([hexc(c) for _, c in STRATA])

unit, unit2 = fbm(0.18, 4), fbm(0.09, 3)
UNITS = np.stack([hexc(c) for c in ('#dcc07f', '#cfa66a', '#d4a089', '#a6a467', '#c9b391', '#e0c98f')])
uid = np.zeros((NY, NX), np.uint8)                       # 0 dune sand
uid[unit > 0.45] = 1                                     # older alluvium (darker ochre)
uid[unit2 > 0.95] = 5                                    # pale sand sheet
uid[unit < -0.85] = 2                                    # pink siltstone
uid[(unit2 > 0.70) & (unit < 0.15) & (unit2 <= 0.95)] = 3  # olive (Chinle-ish)
uid[unit2 < -1.55] = 4                                   # grey-buff alluvium
edge = np.zeros((NY, NX), bool)                          # map-unit contact lines
edge[1:] |= uid[1:] != uid[:-1]
edge[:, 1:] |= uid[:, 1:] != uid[:, :-1]
unit_line = np.clip(ndi.gaussian_filter(edge.astype(np.float32), 0.9) * 2.2, 0, 1)

def plan_colour(ui, wsh, line):
    """colour of the open floor: geologic map units, inked contacts, the teal wash."""
    c = UNITS[ui]
    w = np.clip(wsh, 0, 1)[..., None]
    c = c * (1 - 0.7 * w) + hexc('#6f9690') * 0.7 * w
    return c * (1 - 0.28 * line[..., None])

# ─── renderer (voxel space, front to back) ─────────────────────────────────
def sample(F, yi, xi, order=1):
    return ndi.map_coordinates(F, [yi, xi], order=order, mode='nearest')

def render(W, Hh, f, cam_x, cam_h, hor, d0, ss=1.5):
    W2, H2 = int(W * ss), int(Hh * ss)
    f2, hor2 = f * ss, hor * ss
    cx = W2 / 2
    # depth samples: ~1px screen spacing at ground level
    ds = [d0]
    while ds[-1] < d0 + YMAX - CELL:
        d = ds[-1]
        ds.append(d + min(max(d * d / (f2 * 0.06) * 0.35, CELL * 0.4), CELL * 2))
    ds = np.array(ds[:-1], np.float32)
    N = len(ds)
    sx = np.arange(W2, dtype=np.float32) + 0.5
    YB = np.empty((N, W2), np.float32)
    ybuf = np.full(W2, np.float32(H2 + 4))
    for k, d in enumerate(ds):
        xw = cam_x + (sx - cx) * d / f2
        hk = sample(H, np.full(W2, (d - d0) / CELL), (xw - XMIN) / CELL)
        ytop = hor2 + (cam_h - hk) * f2 / d
        ybuf = np.minimum(ybuf, ytop)
        YB[k] = ybuf
    py = np.arange(H2, dtype=np.float32) + 0.5
    K = np.empty((H2, W2), np.int32)
    for x in range(W2):
        K[:, x] = np.searchsorted(-YB[:, x], -py, side='left')
    sky = K >= N
    Kc = np.minimum(K, N - 1)
    D = ds[Kc]
    XX = cam_x + (sx[None, :] - cx) * D / f2
    yi = (D - d0) / CELL
    xi = (XX - XMIN) / CELL
    hpix = cam_h - (py[:, None] - hor2) * D / f2               # elevation of each pixel
    hsurf = sample(H, yi, xi)
    lt = sample(light, yi, xi)
    st = sample(steep, yi, xi)
    ui = sample(uid, yi, xi, order=0); ln = sample(unit_line, yi, xi); ws = sample(wash, yi, xi)
    ew = sample(edge_n, yi, xi)
    # strata colour by (warped) elevation; flats get map-unit colour instead
    he = hpix + 0.0035 * ew + 0.004 * np.sin(XX * 1.3)
    bi = np.searchsorted(SB, he)
    col = SC[np.clip(bi, 0, len(SB) - 1)]
    # thin dark contact line at each stratum boundary (engraved look)
    lo = np.concatenate([[0], SB])[np.clip(bi, 0, len(SB))]
    dist = np.minimum(np.abs(he - lo), np.abs(SB[np.clip(bi, 0, len(SB) - 1)] - he))
    pxh = D / f2                                            # elevation per screen px
    contact = np.exp(-(dist / (pxh * 0.9 + 1e-6)) ** 2) * (bi > 0) * smooth(0.25, 0.6, st)
    flat = (sample(relief, yi, xi) < 0.35) & (st < 0.6)
    col = np.where(flat[..., None], plan_colour(ui, ws, ln), col)
    # desert varnish streaks down the cliff faces
    varn = sample(flute, yi, xi)
    col = col * (1 - (0.06 * np.clip(varn, 0, 2) * smooth(0.45, 0.85, st))[..., None])
    col = col * (1 - 0.14 * contact[..., None])
    # light, with cool shadows
    shade = lt[..., None]
    cool = np.array([0.86, 0.85, 0.92], np.float32)  # warm-umber shadows, like ink
    col = col * shade * (cool + (1 - cool) * np.clip(shade, 0, 1))
    col = col * 1.08
    # fine contour lines on the ground (every 6 m-ish), very faint
    cont = np.abs(((hsurf * 220) % 1) - 0.5)
    col = col * (1 - (0.10 * np.exp(-((0.5 - cont) / 0.06) ** 2) * (st < 0.3))[..., None])
    # atmospheric haze into the paper
    haze = smooth(d0 + 0.4, d0 + YMAX, D) * 0.42
    col = col * (1 - haze[..., None]) + PAPER * haze[..., None]
    col = np.clip(col, 0, 1)

    # paper: mottled cream, graticule, relief shadow of the land on the paper
    paper = paper_tex(H2, W2, ss)
    land = (~sky).astype(np.float32)
    off = int(round(10 * ss))
    sh = ndi.gaussian_filter(np.roll(np.roll(land, off, 0), int(off * 0.9), 1), 7 * ss)
    sh2 = ndi.gaussian_filter(np.roll(np.roll(land, off * 3, 0), off * 3, 1), 30 * ss)
    paper = paper * (1 - (0.20 * sh + 0.07 * sh2))[..., None]
    grat = graticule(H2, W2, ss, hor2)
    paper = paper * (1 - grat[..., None]) + INK * grat[..., None] * 0.55 + paper * grat[..., None] * 0.45
    a = ndi.gaussian_filter(land, 0.5)[..., None]
    img = col * a + paper * (1 - a)
    # land picks up the paper grain too (it is a print)
    img = img * (0.93 + 0.07 * paper / PAPER)
    # fade into the page at the bottom
    fade = smooth(0.84, 0.99, py / H2)[:, None, None]
    img = img * (1 - fade) + PAPER * fade
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
    return im.resize((W, Hh), Image.LANCZOS)

def paper_tex(Hh, W, ss):
    r = np.random.default_rng(7)
    def n(s):
        g = r.standard_normal((Hh // s + 3, W // s + 3)).astype(np.float32)
        return ndi.zoom(g, s, order=3)[:Hh, :W]
    mott = n(int(160 * ss)) * 0.012 + n(int(40 * ss)) * 0.008
    grain = ndi.gaussian_filter(r.standard_normal((Hh, W)).astype(np.float32), 0.6 * ss) * 0.022
    fib = ndi.gaussian_filter(r.standard_normal((Hh, W)).astype(np.float32), (0.5 * ss, 6 * ss)) * 0.04
    t = 1 + mott + grain + fib
    # aged edge: a touch darker toward the top corners
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    vig = ((xx / W - 0.5) ** 2 * 1.2 + (yy / Hh) ** 2 * 0.0) * 0.06
    return PAPER[None, None, :] * (t - vig)[..., None]

def graticule(Hh, W, ss, hor):
    """hairline lat/long lines, slightly curved like a conic projection."""
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    u = (xx - W / 2) / W
    g = np.zeros((Hh, W), np.float32)
    lw = 0.55 * ss
    step = W / 9
    for i in range(-6, 7):                            # meridians, converging upward
        x0 = W / 2 + i * step
        xl = x0 - (x0 - W / 2) * 0.10 * (1 - yy / Hh)
        g = np.maximum(g, np.exp(-((xx - xl) / lw) ** 2))
    for j in range(1, 6):                             # parallels: gentle arcs
        y0 = j * hor / 5.2
        yl = y0 + 0.10 * W * u ** 2
        g = np.maximum(g, np.exp(-((yy - yl) / lw) ** 2))
    # tick marks along the top border
    return g * 0.16

os.makedirs(OUT, exist_ok=True)
jobs = {
    # name: (W, H, f, cam_x, cam_h, horizon_y, d0)
    'desert-desktop': (2560, 1440, 1500, 0.0, 0.17, 560, 0.20),
    'desert-mobile': (1080, 2160, 1400, -0.22, 0.16, 1000, 0.15),
}
for name, (W, Hh, f, cx, ch, hor, d0) in jobs.items():
    if args.preview:
        W, Hh, f, hor = W // 2, Hh // 2, f / 2, hor / 2
    im = render(W, Hh, f, cx, ch, hor, d0, ss=1.0 if args.preview else 1.5)
    if args.preview:
        im.save(f'/tmp/{name}.png'); print('wrote', f'/tmp/{name}.png'); continue
    im.save(os.path.join(OUT, f'{name}.webp'), quality=78, method=6)
    im.save(os.path.join(OUT, f'{name}.avif'), quality=58, speed=4)
    print(name, *(f'{e}:{os.path.getsize(os.path.join(OUT, f"{name}.{e}")) // 1024}KB' for e in ('webp', 'avif')))
