"""Generate public/hero/original.jpg (upscaled+sharpened) and painted.jpg (oil painting).
Usage: python scripts/make-hero.py   (needs opencv-contrib-python-headless, numpy)"""
import cv2, numpy as np
src = cv2.imread('public/hero/source.jpg')
W = 2048
h = round(src.shape[0] * W / src.shape[1])
up = cv2.resize(src, (W, h), interpolation=cv2.INTER_LANCZOS4)
blur = cv2.GaussianBlur(up, (0, 0), 1.6)
orig = cv2.addWeighted(up, 1.5, blur, -0.5, 0)
cv2.imwrite('public/hero/original.jpg', orig, [cv2.IMWRITE_JPEG_QUALITY, 88])

base = cv2.bilateralFilter(orig, 7, 30, 7)
oil = cv2.xphoto.oilPainting(base, 5, 2, cv2.COLOR_BGR2Lab)
oil = cv2.xphoto.oilPainting(oil, 3, 2, cv2.COLOR_BGR2Lab)
oil = cv2.addWeighted(oil, 0.82, orig, 0.18, 0)  # keep a little structure
hsv = cv2.cvtColor(oil, cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[..., 1] = np.clip(hsv[..., 1] * 1.05, 0, 255)
hsv[..., 2] = np.clip(hsv[..., 2] * 1.10 + 4, 0, 255)
oil = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
# brush-stroke relief: directional noise lighting
rng = np.random.default_rng(7)
n = rng.standard_normal((h, W)).astype(np.float32)
k = np.zeros((25, 25), np.float32); k[12, :] = 1; k /= k.sum()
M = cv2.getRotationMatrix2D((12, 12), 35, 1); k = cv2.warpAffine(k, M, (25, 25)); k /= k.sum()
def dirk(a):
    kk = np.zeros((25, 25), np.float32); kk[12, :] = 1
    kk = cv2.warpAffine(kk, cv2.getRotationMatrix2D((12, 12), a, 1), (25, 25)); return kk / kk.sum()
f1 = cv2.filter2D(n, -1, dirk(35)); f2 = cv2.filter2D(n, -1, dirk(-20))
lo = cv2.GaussianBlur(rng.standard_normal((h, W)).astype(np.float32), (0, 0), 90)
lo = (lo - lo.min()) / (lo.max() - lo.min())
streak = f1 * lo + f2 * (1 - lo)
streak = cv2.GaussianBlur(streak, (0, 0), 1.0)
streak /= np.abs(streak).max()
# canvas weave
yy, xx = np.mgrid[0:h, 0:W].astype(np.float32)
weave = (np.sin(xx * 1.9) * np.sin(yy * 1.9)) * 0.5 + cv2.GaussianBlur(rng.standard_normal((h, W)).astype(np.float32), (0, 0), 1.2) * 0.5
tex = streak * 7 + weave * 3
# luminance-weighted relief via gradient shading
gx = cv2.Sobel(streak, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(streak, cv2.CV_32F, 0, 1, ksize=3)
shade = (gx * 0.7 + gy * 0.7) * 11
out = np.clip(oil + (tex + shade)[..., None], 0, 255).astype(np.uint8)
# soft vignette
v = 1 - 0.12 * (((xx - W/2) / (W/2)) ** 2 + ((yy - h/2) / (h/2)) ** 2) / 2
out = np.clip(out * v[..., None], 0, 255).astype(np.uint8)
cv2.imwrite('public/hero/painted.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 88])
