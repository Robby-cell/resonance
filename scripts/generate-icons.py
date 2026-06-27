#!/usr/bin/env python3
"""Generate PWA icons for Resonance."""
import struct
import zlib
import os
from pathlib import Path

def create_png(width, height, pixels):
    """Create a PNG file from RGBA pixel data."""
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(chunk) & 0xffffffff)
        return struct.pack('>I', len(data)) + chunk + crc

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            idx = (y * width + x) * 4
            raw += pixels[idx:idx+4]
    idat = zlib.compress(raw)
    return sig + make_chunk(b'IHDR', ihdr) + make_chunk(b'IDAT', idat) + make_chunk(b'IEND', b'')

def draw_icon(size):
    """Draw the Resonance icon: coral-to-amber gradient with a music note."""
    pixels = bytearray(size * size * 4)
    coral = (255, 107, 74)
    amber = (245, 158, 11)
    white = (255, 255, 255)

    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            margin = size // 10
            radius = size // 5
            rx = x - margin
            ry = y - margin
            rw = size - 2 * margin
            rh = size - 2 * margin

            if rx < 0 or ry < 0 or rx >= rw or ry >= rh:
                continue

            in_corner = False
            for cx, cy in [(radius, radius), (rw - radius, radius), (radius, rh - radius), (rw - radius, rh - radius)]:
                if (rx < radius or rx > rw - radius) and (ry < radius or ry > rh - radius):
                    dx = rx - cx
                    dy = ry - cy
                    if dx * dx + dy * dy > radius * radius:
                        in_corner = True
                        break

            if in_corner:
                continue

            t = (rx + ry) / (rw + rh)
            r = int(coral[0] * (1 - t) + amber[0] * t)
            g = int(coral[1] * (1 - t) + amber[1] * t)
            b = int(coral[2] * (1 - t) + amber[2] * t)

            cx = rw / 2
            cy = rh / 2
            stem_w = size // 12
            stem_h = size // 3
            stem_x = cx + size // 10
            stem_y = cy - stem_h // 2 - size // 20

            head_r = size // 7
            head_cx = cx - size // 12
            head_cy = cy + stem_h // 2 - size // 30

            in_stem = (abs(rx - stem_x) < stem_w / 2 and
                       ry > stem_y and ry < stem_y + stem_h)
            dx_head = rx - head_cx
            dy_head = ry - head_cy
            in_head = (dx_head * dx_head + dy_head * dy_head) < head_r * head_r

            flag_w = size // 6
            flag_h = size // 8
            in_flag = (rx > stem_x and rx < stem_x + flag_w and
                       ry > stem_y and ry < stem_y + flag_h)

            if in_stem or in_head or in_flag:
                pixels[idx:idx+4] = bytes(white) + b'\xff'
            else:
                pixels[idx:idx+4] = bytes([r, g, b]) + b'\xff'

    return bytes(pixels)

out_dir = Path(__file__).parent.resolve() / '..' / 'public'
for size in [192, 512]:
    print(f"Generating {size}x{size} icon...")
    pixels = draw_icon(size)
    png_data = create_png(size, size, pixels)
    path = os.path.join(out_dir, f'icon-{size}.png')
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f"  Saved {path} ({len(png_data)} bytes)")

print("Generating 512x512 maskable icon...")
pixels = draw_icon(512)
png_data = create_png(512, 512, pixels)
path = os.path.join(out_dir, 'icon-maskable-512.png')
with open(path, 'wb') as f:
    f.write(png_data)
print(f"  Saved {path}")

print("Generating 180x180 apple-touch-icon...")
pixels = draw_icon(180)
png_data = create_png(180, 180, pixels)
path = os.path.join(out_dir, 'apple-touch-icon.png')
with open(path, 'wb') as f:
    f.write(png_data)
print(f"  Saved {path}")

print("Generating 32x32 favicon...")
pixels = draw_icon(32)
png_data = create_png(32, 32, pixels)
path = os.path.join(out_dir, 'favicon-32.png')
with open(path, 'wb') as f:
    f.write(png_data)
print(f"  Saved {path}")

print("Done!")
