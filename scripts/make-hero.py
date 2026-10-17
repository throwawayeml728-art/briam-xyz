"""Generate public/hero/original.jpg (upscaled+sharpened) and painted.jpg (impressionist impasto painting).
Also generates pixelated.jpg (chunky pixel-art, palette-quantized, ordered dither).
Usage: python scripts/make-hero.py [--mode painted|pixelated|all] [--block 28] [--colors 40]
  painted    -> original.jpg + painted.jpg (slow)
  pixelated  -> original.jpg + pixelated.jpg (fast)   [default: all]
(needs opencv-contrib-python-headless, numpy)"""
import argparse, sys
import cv2, numpy as np
ap = argparse.ArgumentParser()
ap.add_argument('--mode', choices=['painted', 'pixelated', 'all'], default='all')
ap.add_argument('--block', type=int, default=28)
ap.add_argument('--colors', type=int, default=40)
args = ap.parse_args()
src = cv2.imread('public/hero/source.jpg')
W = 2048
h = round(src.shape[0] * W / src.shape[1])
up = cv2.resize(src, (W, h), interpolation=cv2.INTER_LANCZOS4)
blur = cv2.GaussianBlur(up, (0, 0), 1.6)
orig = cv2.addWeighted(up, 1.5, blur, -0.5, 0)
cv2.imwrite('public/hero/original.jpg', orig, [cv2.IMWRITE_JPEG_QUALITY, 88])

def make_pixelated(orig, block, ncolors):
    H, W = orig.shape[:2]
    sw, sh = round(W / block), round(H / block)
    small = cv2.resize(orig, (sw, sh), interpolation=cv2.INTER_AREA).astype(np.float32)
    # slight saturation boost to keep the sunset glow
    hsv = cv2.cvtColor(small.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.12, 0, 255)
    small = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    # light 4x4 Bayer ordered dither before quantization
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - 0.5
    tile = np.tile(bayer, (sh // 4 + 1, sw // 4 + 1))[:sh, :sw]
    small = np.clip(small + tile[..., None] * 14, 0, 255)
    # k-means palette
    cv2.setRNGSeed(3)
    data = small.reshape(-1, 3)
    _, lab, cen = cv2.kmeans(data, ncolors, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    q = cen[lab.flatten()].reshape(sh, sw, 3).astype(np.uint8)
    out = cv2.resize(q, (W, H), interpolation=cv2.INTER_NEAREST)
    cv2.imwrite('public/hero/pixelated.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print('pixelated', sw, sh, ncolors)

if args.mode in ('pixelated', 'all'):
    make_pixelated(orig, args.block, args.colors)
if args.mode == 'pixelated':
    sys.exit(0)

# --- Impressionist impasto painting: layered coarse-to-fine strokes + height-map relief lighting ---
rng = np.random.default_rng(11)
H, Wd_ = h, W
srcf = orig.astype(np.float32)
# soft reference: loss of fine detail
ref = cv2.GaussianBlur(srcf, (0, 0), 2.0)
gray = cv2.cvtColor(ref.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)

def flow_field(sigma):
    g = cv2.GaussianBlur(gray, (0, 0), 1.5)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    jxx = cv2.GaussianBlur(gx * gx, (0, 0), sigma); jyy = cv2.GaussianBlur(gy * gy, (0, 0), sigma)
    jxy = cv2.GaussianBlur(gx * gy, (0, 0), sigma)
    th = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2   # along edges
    coh = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (jxx + jyy + 1e-3)
    coh = np.clip(coh * 1.5, 0, 1)
    # fallback in flat areas: gently horizontal, wavy (sky)
    fb = np.full_like(th, -0.12)
    x = np.cos(th) * coh + np.cos(fb) * (1 - coh); y = np.sin(th) * coh + np.sin(fb) * (1 - coh)
    # consistent sign (orientation is mod pi): use doubled-angle blend
    c2 = np.cos(2 * th) * coh + np.cos(2 * fb) * (1 - coh); s2 = np.sin(2 * th) * coh + np.sin(2 * fb) * (1 - coh)
    return 0.5 * np.arctan2(s2, c2)

canvas = cv2.GaussianBlur(srcf, (0, 0), 6).copy()   # underpainting
height = np.zeros((H, Wd_), np.float32)
layers = [(120, 1.0, 5), (76, 1.4, 4), (50, 1.7, 3.2), (32, 1.4, 2.4), (20, 0.7, 1.8)]  # (stroke length, coverage, flow sigma scale)
for li, (L, cover, fs) in enumerate(layers):
    th_f = flow_field(max(3, L * 0.6))
    if li < 4:
        refl = cv2.GaussianBlur(srcf, (0, 0), 1.0 + L * 0.12)
    else:
        refl = ref
    wid = max(4.0, L * 0.30)
    n = int(cover * H * Wd_ / (L * wid * 1.6))
    xs = rng.integers(0, Wd_, n); ys = rng.integers(0, H, n)
    for i in range(n):
        cx, cy = int(xs[i]), int(ys[i])
        a = L * rng.uniform(0.7, 1.3) / 2; b = wid * rng.uniform(0.7, 1.3) / 2
        ang = th_f[cy, cx] + rng.normal(0, 0.18)
        ca, sa = np.cos(ang), np.sin(ang)
        r = int(a + b + 2)
        x0, x1 = max(0, cx - r), min(Wd_, cx + r + 1); y0, y1 = max(0, cy - r), min(H, cy + r + 1)
        gy_, gx_ = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        dx, dy = gx_ - cx, gy_ - cy
        u = dx * ca + dy * sa; v = -dx * sa + dy * ca
        # slightly curved stroke
        v = v - 0.05 * u * u / max(a, 1) * rng.choice([-1, 1])
        rr = (u / a) ** 2 + (v / b) ** 2
        m = rr < 1
        if not m.any(): continue
        alpha = np.clip((1 - rr) * 3.5, 0, 1)
        # bristle streaks: 1D noise across width, stretched along length
        nb = int(2 * b * 0.5) + 6
        bn = cv2.GaussianBlur(rng.standard_normal(nb).astype(np.float32)[None], (0, 0), 0.8)[0]
        bn = bn / (np.abs(bn).max() + 1e-6)
        idx = np.clip(((v / b + 1) * 0.5 * (nb - 1)), 0, nb - 1)
        bris = np.interp(idx, np.arange(nb), bn)
        bris = bris * (0.6 + 0.4 * np.cos(u / a * 1.2))   # bristles fade at stroke ends
        ridge = np.sqrt(np.clip(1 - rr, 0, 1))            # thick-middle profile
        hs = (0.5 * ridge + 0.5 * bris) * (L ** 0.6)
        # colour: sampled from source, jitter in hue/lightness, bristle lightness streaks
        col = refl[cy, cx].copy()
        hsv = cv2.cvtColor(col.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)[0, 0]
        hsv[0] = (hsv[0] + rng.normal(0, 4.5)) % 180
        hsv[1] = np.clip(hsv[1] * rng.uniform(0.82, 1.05) + rng.normal(0, 6), 0, 255)
        hsv[2] = np.clip(hsv[2] * 1.04 + rng.normal(0, 10) + 6, 0, 255)
        c = cv2.cvtColor(hsv.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)[0, 0]
        patch = np.empty((y1 - y0, x1 - x0, 3), np.float32); patch[:] = c
        patch += (bris * 12)[..., None]
        al = alpha[..., None] * 0.97
        canvas[y0:y1, x0:x1] = canvas[y0:y1, x0:x1] * (1 - al) + patch * al
        hp = height[y0:y1, x0:x1]
        height[y0:y1, x0:x1] = hp * (1 - alpha) + hs * alpha
    print('layer', li, n, flush=True)

canvas = np.clip(canvas, 0, 255)
# slight softening of colour (no sharp edges), keep height detail
canvas = cv2.GaussianBlur(canvas, (0, 0), 0.8)
# gentle luminous/desaturated palette, preserve warmth
hsv = cv2.cvtColor(canvas.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[..., 1] = np.clip(hsv[..., 1] * 0.95, 0, 255)
hsv[..., 2] = np.clip(hsv[..., 2] * 1.05 + 3, 0, 255)
canvas = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)

# canvas weave (also affects height)
yy, xx = np.mgrid[0:H, 0:Wd_].astype(np.float32)
weave = (np.sin(xx * 1.7) * np.sin(yy * 1.7)) * 0.6 + 0.4 * (np.sin(xx * 0.85 + 1.3 * np.sin(yy * 0.05)) + np.sin(yy * 0.85)) * 0.5
weave += cv2.GaussianBlur(rng.standard_normal((H, Wd_)).astype(np.float32), (0, 0), 1.0) * 0.12
hm = cv2.GaussianBlur(height, (0, 0), 0.7) + weave * 0.22
# relief lighting from top-left
gx = cv2.Sobel(hm, cv2.CV_32F, 1, 0, ksize=3) / 16; gy = cv2.Sobel(hm, cv2.CV_32F, 0, 1, ksize=3) / 16
lx, ly = -0.62, -0.78
diff = -(gx * lx + gy * ly)
lum = canvas.mean(axis=2, keepdims=True) / 255
shade = diff * 26
nrm = 1 / np.sqrt(1 + gx * gx + gy * gy)
spec = np.clip((nrm * 0.6 + (-(gx * lx + gy * ly)) * nrm * 0.9) , 0, 1) ** 8 * 40   # glossy ridge highlights
out = canvas * (1 + shade[..., None] / 255 * 3.2) + shade[..., None] * 0.6 + spec[..., None] * (0.4 + 0.6 * lum)
# ambient occlusion in valleys
out *= (1 + np.clip(hm - cv2.GaussianBlur(hm, (0, 0), 6), -3, 0) * 0.04)[..., None]
v = 1 - 0.12 * (((xx - Wd_/2) / (Wd_/2)) ** 2 + ((yy - H/2) / (H/2)) ** 2) / 2
out = np.clip(out * v[..., None], 0, 255).astype(np.uint8)
cv2.imwrite('public/hero/painted.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 90])
