#!/bin/bash
# Generate CliDeck icons from an SVG using macOS native tools
set -e

ICONS_DIR="$(dirname "$0")/../src-tauri/icons"
mkdir -p "$ICONS_DIR"

# Create a simple SVG icon for CliDeck
cat > /tmp/clideck_icon.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5"/>
      <stop offset="100%" style="stop-color:#7C3AED"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#bg)"/>
  <text x="256" y="200" text-anchor="middle" font-family="Menlo,monospace" font-size="120" font-weight="bold" fill="white">CLI</text>
  <rect x="100" y="260" width="312" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
  <text x="120" y="340" font-family="Menlo,monospace" font-size="48" fill="#A5F3FC">$</text>
  <text x="170" y="340" font-family="Menlo,monospace" font-size="48" fill="rgba(255,255,255,0.9)">deck</text>
  <rect x="350" y="310" width="3" height="40" fill="white">
    <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
  </rect>
  <rect x="100" y="370" width="200" height="3" rx="1.5" fill="rgba(255,255,255,0.15)"/>
  <rect x="100" y="390" width="150" height="3" rx="1.5" fill="rgba(255,255,255,0.1)"/>
</svg>
SVGEOF

# Create a simple tray icon SVG (monochrome, template-compatible)
cat > /tmp/clideck_tray.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22">
  <rect x="2" y="3" width="18" height="16" rx="2" fill="none" stroke="black" stroke-width="1.5"/>
  <line x1="2" y1="7" x2="20" y2="7" stroke="black" stroke-width="1.5"/>
  <circle cx="5" cy="5" r="1" fill="black"/>
  <circle cx="8" cy="5" r="1" fill="black"/>
  <circle cx="11" cy="5" r="1" fill="black"/>
  <text x="5" y="14" font-family="Menlo,monospace" font-size="5" font-weight="bold" fill="black">$_</text>
</svg>
SVGEOF

# Use qlmanage (Quick Look) to render SVG to PNG at various sizes
# For the main app icon
qlmanage -t -s 512 -o /tmp /tmp/clideck_icon.svg 2>/dev/null || true

# If qlmanage didn't work, use a Python approach
if [ ! -f /tmp/clideck_icon.svg.png ]; then
  echo "Using Python to generate icons..."
  python3 << 'PYEOF'
import subprocess, struct, zlib, os

def create_png(width, height, color_rgb, output_path):
    """Create a simple solid-color PNG with rounded-rect look."""
    r, g, b = color_rgb
    
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            # Simple rounded rectangle with gradient
            margin = width * 0.15
            corner_r = width * 0.15
            
            # Check if inside rounded rect
            inside = True
            dx = 0
            dy = 0
            
            if x < margin + corner_r and y < margin + corner_r:
                dx = (margin + corner_r) - x
                dy = (margin + corner_r) - y
                if dx*dx + dy*dy > corner_r*corner_r:
                    inside = False
            elif x > width - margin - corner_r and y < margin + corner_r:
                dx = x - (width - margin - corner_r)
                dy = (margin + corner_r) - y
                if dx*dx + dy*dy > corner_r*corner_r:
                    inside = False
            elif x < margin + corner_r and y > height - margin - corner_r:
                dx = (margin + corner_r) - x
                dy = y - (height - margin - corner_r)
                if dx*dx + dy*dy > corner_r*corner_r:
                    inside = False
            elif x > width - margin - corner_r and y > height - margin - corner_r:
                dx = x - (width - margin - corner_r)
                dy = y - (height - margin - corner_r)
                if dx*dx + dy*dy > corner_r*corner_r:
                    inside = False
            elif x < margin or x >= width - margin or y < margin or y >= height - margin:
                inside = False
            
            if inside:
                # Gradient from top-left to bottom-right
                t = (x + y) / (width + height)
                pr = int(79 * (1-t) + 124 * t)
                pg = int(70 * (1-t) + 58 * t)
                pb = int(229 * (1-t) + 237 * t)
                raw_data += struct.pack('BBBB', pr, pg, pb, 255)
            else:
                raw_data += struct.pack('BBBB', 0, 0, 0, 0)
    
    def make_png(w, h, raw):
        def chunk(chunk_type, data):
            c = chunk_type + data
            crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
            return struct.pack('>I', len(data)) + c + crc
        
        sig = b'\x89PNG\r\n\x1a\n'
        ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
        compressed = zlib.compress(raw)
        
        return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
    
    png_data = make_png(width, height, raw_data)
    with open(output_path, 'wb') as f:
        f.write(png_data)

icons_dir = os.environ.get('ICONS_DIR', '/Users/carlgarcia/Documents/GitHub/cliDeck/src-tauri/icons')
os.makedirs(icons_dir, exist_ok=True)

# Generate all required sizes
sizes = {
    'icon.png': 512,
    '32x32.png': 32,
    '128x128.png': 128,
    '128x128@2x.png': 256,
}

for name, size in sizes.items():
    path = os.path.join(icons_dir, name)
    create_png(size, size, (79, 70, 229), path)
    print(f"Created {name} ({size}x{size})")

print("Done generating icons!")
PYEOF
fi

echo "Icons generated in $ICONS_DIR"
ls -la "$ICONS_DIR"
