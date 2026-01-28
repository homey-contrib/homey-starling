#!/usr/bin/env python3
"""
Generate device icons for Starling Home Hub Homey app.
Creates SVG icons and converts them to PNG at required sizes.
Icons have transparent backgrounds - Homey adds its own container.
"""

import os
import subprocess

# Brand colors
TEAL = "#44DBBD"
DARK_GRAY = "#2F2E2E"
WHITE = "#FFFFFF"

# Base SVG template with white background (required by Homey)
SVG_TEMPLATE = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
  <!-- White background required by Homey -->
  <rect width="1000" height="1000" fill="white"/>
  <g transform="translate(500, 500)">
    {icon_path}
  </g>
</svg>
'''

# Device icon paths (centered at origin, scale to fill ~800px)
# Using teal as primary color, dark gray for accents
DEVICE_ICONS = {
    "all-devices": '''
        <!-- Grid of devices -->
        <rect x="-350" y="-350" width="300" height="300" rx="40" fill="{teal}"/>
        <rect x="50" y="-350" width="300" height="300" rx="40" fill="{teal}"/>
        <rect x="-350" y="50" width="300" height="300" rx="40" fill="{teal}"/>
        <rect x="50" y="50" width="300" height="300" rx="40" fill="{teal}"/>
        <!-- Device symbols -->
        <circle cx="-200" cy="-200" r="60" fill="white"/>
        <rect x="100" y="-240" width="100" height="80" rx="10" fill="white"/>
        <polygon points="-200,-100 -280,50 -120,50" fill="white"/>
        <ellipse cx="200" cy="200" rx="80" ry="60" fill="white"/>
    ''',
    "blinds": '''
        <!-- Window frame -->
        <rect x="-350" y="-400" width="700" height="800" rx="40" fill="{teal}"/>
        <!-- Blind slats -->
        <rect x="-280" y="-300" width="560" height="60" rx="10" fill="white"/>
        <rect x="-280" y="-180" width="560" height="60" rx="10" fill="white"/>
        <rect x="-280" y="-60" width="560" height="60" rx="10" fill="white"/>
        <rect x="-280" y="60" width="560" height="60" rx="10" fill="white"/>
        <rect x="-280" y="180" width="560" height="60" rx="10" fill="white"/>
        <!-- Pull cord -->
        <circle cx="200" cy="320" r="40" fill="white"/>
        <rect x="190" y="260" width="20" height="60" fill="white"/>
    ''',
    "camera": '''
        <!-- Camera body -->
        <rect x="-350" y="-200" width="500" height="350" rx="50" fill="{teal}"/>
        <!-- Lens housing -->
        <circle cx="-100" cy="-25" r="130" fill="{dark}"/>
        <circle cx="-100" cy="-25" r="90" fill="white"/>
        <circle cx="-100" cy="-25" r="50" fill="{teal}"/>
        <!-- Side mount -->
        <rect x="150" y="-120" width="150" height="200" rx="30" fill="{teal}"/>
        <!-- Base/stand -->
        <rect x="-200" y="150" width="250" height="150" rx="20" fill="{dark}"/>
        <!-- LED indicator -->
        <circle cx="80" cy="-120" r="25" fill="#FF5555"/>
    ''',
    "diffuser": '''
        <!-- Diffuser body -->
        <path d="M -200,350 Q -280,0 0,-300 Q 280,0 200,350 Z" fill="{teal}"/>
        <!-- Base -->
        <ellipse cx="0" cy="350" rx="250" ry="100" fill="{dark}"/>
        <!-- Mist particles -->
        <circle cx="-80" cy="-350" r="40" fill="{teal}" opacity="0.7"/>
        <circle cx="60" cy="-400" r="50" fill="{teal}" opacity="0.5"/>
        <circle cx="-30" cy="-450" r="35" fill="{teal}" opacity="0.6"/>
        <circle cx="100" cy="-480" r="30" fill="{teal}" opacity="0.4"/>
        <!-- Opening -->
        <ellipse cx="0" cy="-280" rx="80" ry="40" fill="white"/>
    ''',
    "doorbell": '''
        <!-- Doorbell body -->
        <rect x="-180" y="-400" width="360" height="700" rx="60" fill="{teal}"/>
        <!-- Camera lens -->
        <circle cx="0" cy="-200" r="100" fill="{dark}"/>
        <circle cx="0" cy="-200" r="65" fill="white"/>
        <circle cx="0" cy="-200" r="35" fill="{dark}"/>
        <!-- Button -->
        <rect x="-80" y="80" width="160" height="160" rx="30" fill="white"/>
        <circle cx="0" cy="160" r="50" fill="{teal}"/>
        <!-- Speaker grille -->
        <rect x="-100" y="-50" width="200" height="10" rx="5" fill="{dark}"/>
        <rect x="-100" y="-25" width="200" height="10" rx="5" fill="{dark}"/>
        <rect x="-100" y="0" width="200" height="10" rx="5" fill="{dark}"/>
    ''',
    "fan": '''
        <!-- Fan blades -->
        <ellipse cx="0" cy="-250" rx="80" ry="200" fill="{teal}"/>
        <ellipse cx="0" cy="-250" rx="80" ry="200" fill="{teal}" transform="rotate(72)"/>
        <ellipse cx="0" cy="-250" rx="80" ry="200" fill="{teal}" transform="rotate(144)"/>
        <ellipse cx="0" cy="-250" rx="80" ry="200" fill="{teal}" transform="rotate(216)"/>
        <ellipse cx="0" cy="-250" rx="80" ry="200" fill="{teal}" transform="rotate(288)"/>
        <!-- Center hub -->
        <circle cx="0" cy="0" r="100" fill="{dark}"/>
        <circle cx="0" cy="0" r="60" fill="white"/>
    ''',
    "garage": '''
        <!-- Garage outline -->
        <path d="M -400,350 L -400,-150 L 0,-350 L 400,-150 L 400,350 Z" fill="{teal}"/>
        <!-- Door panels -->
        <rect x="-320" y="-50" width="640" height="100" rx="10" fill="white"/>
        <rect x="-320" y="80" width="640" height="100" rx="10" fill="white"/>
        <rect x="-320" y="210" width="640" height="100" rx="10" fill="white"/>
        <!-- Window -->
        <rect x="-100" y="-200" width="200" height="80" rx="10" fill="white"/>
        <!-- Handle -->
        <circle cx="280" cy="260" r="30" fill="{dark}"/>
    ''',
    "heater-cooler": '''
        <!-- Unit body -->
        <rect x="-350" y="-350" width="700" height="600" rx="50" fill="{teal}"/>
        <!-- Vents -->
        <rect x="-280" y="-250" width="560" height="40" rx="10" fill="white"/>
        <rect x="-280" y="-170" width="560" height="40" rx="10" fill="white"/>
        <rect x="-280" y="-90" width="560" height="40" rx="10" fill="white"/>
        <rect x="-280" y="-10" width="560" height="40" rx="10" fill="white"/>
        <rect x="-280" y="70" width="560" height="40" rx="10" fill="white"/>
        <!-- Control panel -->
        <rect x="-200" y="170" width="400" height="60" rx="15" fill="{dark}"/>
        <!-- Temperature display -->
        <circle cx="0" cy="350" r="80" fill="white"/>
        <text x="0" y="370" text-anchor="middle" font-size="80" font-family="Arial" font-weight="bold" fill="{teal}">72°</text>
    ''',
    "home-away": '''
        <!-- House shape -->
        <path d="M 0,-400 L -380,-50 L -380,380 L 380,380 L 380,-50 Z" fill="{teal}"/>
        <!-- Roof accent -->
        <path d="M 0,-400 L -420,-20 L -380,-50 L 0,-350 L 380,-50 L 420,-20 Z" fill="{dark}"/>
        <!-- Door -->
        <rect x="-100" y="50" width="200" height="330" rx="20" fill="white"/>
        <circle cx="60" cy="220" r="25" fill="{teal}"/>
        <!-- Window -->
        <rect x="-280" y="-20" width="140" height="140" rx="15" fill="white"/>
        <rect x="140" y="-20" width="140" height="140" rx="15" fill="white"/>
    ''',
    "humidifier": '''
        <!-- Tank/body -->
        <rect x="-250" y="-150" width="500" height="500" rx="60" fill="{teal}"/>
        <!-- Top cap -->
        <ellipse cx="0" cy="-200" rx="180" ry="80" fill="{dark}"/>
        <!-- Water droplets -->
        <path d="M -120,-300 Q -120,-400 -60,-450 Q 0,-400 0,-300 Q -60,-260 -120,-300 Z" fill="white"/>
        <path d="M 40,-330 Q 40,-430 100,-480 Q 160,-430 160,-330 Q 100,-290 40,-330 Z" fill="white"/>
        <!-- Water level indicator -->
        <rect x="-180" y="50" width="360" height="200" rx="20" fill="white" opacity="0.5"/>
        <rect x="-180" y="150" width="360" height="100" rx="20" fill="white"/>
        <!-- Mist output -->
        <ellipse cx="0" cy="-200" rx="60" ry="30" fill="white"/>
    ''',
    "kettle": '''
        <!-- Kettle body -->
        <path d="M -220,300 Q -280,0 0,-300 Q 280,0 220,300 Z" fill="{teal}"/>
        <!-- Base -->
        <ellipse cx="0" cy="300" rx="250" ry="80" fill="{dark}"/>
        <!-- Handle -->
        <path d="M 200,-100 Q 380,-100 380,100 Q 380,250 250,280"
              stroke="{dark}" stroke-width="50" fill="none" stroke-linecap="round"/>
        <!-- Lid -->
        <ellipse cx="0" cy="-280" rx="120" ry="50" fill="{dark}"/>
        <ellipse cx="0" cy="-300" rx="80" ry="35" fill="white"/>
        <!-- Steam -->
        <path d="M -50,-380 Q -80,-450 -40,-500" stroke="white" stroke-width="25" fill="none" stroke-linecap="round"/>
        <path d="M 30,-380 Q 60,-470 20,-530" stroke="white" stroke-width="25" fill="none" stroke-linecap="round"/>
    ''',
    "light": '''
        <!-- Bulb glass -->
        <circle cx="0" cy="-100" r="280" fill="{teal}"/>
        <!-- Light rays -->
        <rect x="-20" y="-450" width="40" height="80" rx="20" fill="white"/>
        <rect x="-20" y="-450" width="40" height="80" rx="20" fill="white" transform="rotate(45)"/>
        <rect x="-20" y="-450" width="40" height="80" rx="20" fill="white" transform="rotate(-45)"/>
        <rect x="-20" y="-450" width="40" height="80" rx="20" fill="white" transform="rotate(90)"/>
        <rect x="-20" y="-450" width="40" height="80" rx="20" fill="white" transform="rotate(-90)"/>
        <!-- Inner glow -->
        <circle cx="0" cy="-100" r="180" fill="white" opacity="0.6"/>
        <circle cx="0" cy="-100" r="100" fill="white"/>
        <!-- Base/screw -->
        <rect x="-120" y="180" width="240" height="50" rx="10" fill="{dark}"/>
        <rect x="-100" y="230" width="200" height="40" rx="8" fill="white"/>
        <rect x="-80" y="270" width="160" height="40" rx="8" fill="{dark}"/>
        <rect x="-60" y="310" width="120" height="50" rx="25" fill="white"/>
    ''',
    "lock": '''
        <!-- Lock body -->
        <rect x="-250" y="-100" width="500" height="450" rx="50" fill="{teal}"/>
        <!-- Shackle -->
        <path d="M -150,-100 L -150,-250 Q -150,-400 0,-400 Q 150,-400 150,-250 L 150,-100"
              stroke="{dark}" stroke-width="70" fill="none" stroke-linecap="round"/>
        <!-- Keyhole -->
        <circle cx="0" cy="80" r="80" fill="white"/>
        <rect x="-30" y="80" width="60" height="150" rx="15" fill="white"/>
        <!-- Keyhole detail -->
        <circle cx="0" cy="80" r="40" fill="{teal}"/>
    ''',
    "outlet": '''
        <!-- Outlet plate -->
        <rect x="-300" y="-380" width="600" height="760" rx="60" fill="{teal}"/>
        <!-- Outlet face -->
        <rect x="-220" y="-300" width="440" height="500" rx="40" fill="white"/>
        <!-- Plug holes -->
        <rect x="-120" y="-180" width="60" height="120" rx="15" fill="{dark}"/>
        <rect x="60" y="-180" width="60" height="120" rx="15" fill="{dark}"/>
        <!-- Ground hole -->
        <circle cx="0" cy="60" r="40" fill="{dark}"/>
        <!-- Screw holes -->
        <circle cx="0" cy="-250" r="20" fill="{teal}"/>
        <circle cx="0" cy="150" r="20" fill="{teal}"/>
    ''',
    "purifier": '''
        <!-- Purifier body -->
        <rect x="-280" y="-380" width="560" height="760" rx="50" fill="{teal}"/>
        <!-- Air intake vents -->
        <ellipse cx="0" cy="-220" rx="160" ry="60" fill="{dark}"/>
        <ellipse cx="0" cy="-100" rx="160" ry="60" fill="{dark}"/>
        <ellipse cx="0" cy="20" rx="160" ry="60" fill="{dark}"/>
        <!-- Control panel -->
        <rect x="-180" y="140" width="360" height="100" rx="20" fill="white"/>
        <!-- Air quality indicator -->
        <circle cx="0" cy="300" r="50" fill="white"/>
        <circle cx="0" cy="300" r="30" fill="#55CC55"/>
    ''',
    "robot": '''
        <!-- Robot body (top view) -->
        <circle cx="0" cy="0" r="380" fill="{teal}"/>
        <circle cx="0" cy="0" r="300" fill="{dark}"/>
        <circle cx="0" cy="0" r="220" fill="white"/>
        <!-- Buttons/display -->
        <circle cx="0" cy="-60" r="60" fill="{teal}"/>
        <rect x="-100" y="40" width="200" height="60" rx="15" fill="{teal}"/>
        <!-- Direction indicator (forward) -->
        <polygon points="0,-350 -50,-280 50,-280" fill="white"/>
        <!-- Bumper sensor -->
        <path d="M -300,-200 Q -380,0 -300,200" stroke="white" stroke-width="20" fill="none"/>
        <path d="M 300,-200 Q 380,0 300,200" stroke="white" stroke-width="20" fill="none"/>
    ''',
    "sensor": '''
        <!-- Sensor body -->
        <circle cx="0" cy="0" r="250" fill="{teal}"/>
        <circle cx="0" cy="0" r="160" fill="white"/>
        <circle cx="0" cy="0" r="80" fill="{teal}"/>
        <!-- Detection waves left -->
        <path d="M -300,-150 Q -420,-150 -420,0 Q -420,150 -300,150"
              stroke="{teal}" stroke-width="35" fill="none" stroke-linecap="round"/>
        <path d="M -350,-100 Q -450,-100 -450,0 Q -450,100 -350,100"
              stroke="{teal}" stroke-width="35" fill="none" stroke-linecap="round" opacity="0.6"/>
        <!-- Detection waves right -->
        <path d="M 300,-150 Q 420,-150 420,0 Q 420,150 300,150"
              stroke="{teal}" stroke-width="35" fill="none" stroke-linecap="round"/>
        <path d="M 350,-100 Q 450,-100 450,0 Q 450,100 350,100"
              stroke="{teal}" stroke-width="35" fill="none" stroke-linecap="round" opacity="0.6"/>
    ''',
    "smoke-co-detector": '''
        <!-- Detector body -->
        <circle cx="0" cy="0" r="380" fill="{teal}"/>
        <circle cx="0" cy="0" r="280" fill="white"/>
        <circle cx="0" cy="0" r="180" fill="{teal}"/>
        <!-- Center indicator -->
        <circle cx="0" cy="0" r="80" fill="white"/>
        <circle cx="0" cy="0" r="50" fill="#FF5555"/>
        <!-- Vent holes -->
        <circle cx="-200" cy="-200" r="35" fill="{dark}"/>
        <circle cx="200" cy="-200" r="35" fill="{dark}"/>
        <circle cx="-200" cy="200" r="35" fill="{dark}"/>
        <circle cx="200" cy="200" r="35" fill="{dark}"/>
        <circle cx="0" cy="-280" r="30" fill="{dark}"/>
        <circle cx="0" cy="280" r="30" fill="{dark}"/>
    ''',
    "switch": '''
        <!-- Switch plate -->
        <rect x="-220" y="-380" width="440" height="760" rx="50" fill="{teal}"/>
        <!-- Toggle area -->
        <rect x="-150" y="-280" width="300" height="400" rx="30" fill="white"/>
        <!-- Toggle switch (on position) -->
        <rect x="-100" y="-230" width="200" height="150" rx="20" fill="{teal}"/>
        <!-- Toggle indicator -->
        <circle cx="0" cy="-155" r="30" fill="white"/>
        <!-- Label area -->
        <rect x="-100" y="180" width="200" height="60" rx="15" fill="white"/>
        <!-- Screw holes -->
        <circle cx="0" cy="-330" r="25" fill="{dark}"/>
        <circle cx="0" cy="330" r="25" fill="{dark}"/>
    ''',
    "thermostat": '''
        <!-- Thermostat body -->
        <circle cx="0" cy="0" r="380" fill="{teal}"/>
        <circle cx="0" cy="0" r="320" fill="{dark}"/>
        <circle cx="0" cy="0" r="260" fill="white"/>
        <!-- Temperature display -->
        <text x="0" y="30" text-anchor="middle" font-size="200" font-family="Arial" font-weight="bold" fill="{dark}">72</text>
        <text x="120" y="-40" font-size="60" font-family="Arial" fill="{dark}">°F</text>
        <!-- Mode indicator -->
        <circle cx="0" cy="140" r="30" fill="{teal}"/>
        <!-- Outer ring markers -->
        <rect x="-10" y="-370" width="20" height="40" rx="5" fill="white"/>
        <rect x="-10" y="-370" width="20" height="40" rx="5" fill="white" transform="rotate(30)"/>
        <rect x="-10" y="-370" width="20" height="40" rx="5" fill="white" transform="rotate(60)"/>
        <rect x="-10" y="-370" width="20" height="40" rx="5" fill="white" transform="rotate(90)"/>
        <rect x="-10" y="-370" width="20" height="40" rx="5" fill="white" transform="rotate(-30)"/>
        <rect x="-10" y="-370" width="20" height="40" rx="5" fill="white" transform="rotate(-60)"/>
        <rect x="-10" y="-370" width="20" height="40" rx="5" fill="white" transform="rotate(-90)"/>
    ''',
    "valve": '''
        <!-- Pipes -->
        <rect x="-450" y="-80" width="350" height="160" rx="20" fill="{dark}"/>
        <rect x="100" y="-80" width="350" height="160" rx="20" fill="{dark}"/>
        <!-- Valve body -->
        <circle cx="0" cy="0" r="180" fill="{teal}"/>
        <circle cx="0" cy="0" r="120" fill="white"/>
        <!-- Handle stem -->
        <rect x="-30" y="-350" width="60" height="180" rx="15" fill="{dark}"/>
        <!-- Handle wheel -->
        <ellipse cx="0" cy="-350" rx="150" ry="60" fill="{teal}"/>
        <ellipse cx="0" cy="-350" rx="100" ry="40" fill="white"/>
        <!-- Flow indicator arrows -->
        <polygon points="-350,0 -280,-40 -280,40" fill="white"/>
        <polygon points="350,0 280,-40 280,40" fill="white"/>
    ''',
}


def generate_svg(device_name, icon_path):
    """Generate SVG content for a device icon."""
    # Replace color placeholders
    icon_with_colors = icon_path.format(teal=TEAL, dark=DARK_GRAY)
    return SVG_TEMPLATE.format(icon_path=icon_with_colors)


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    drivers_dir = os.path.join(base_dir, "drivers")

    for device_name, icon_path in DEVICE_ICONS.items():
        driver_path = os.path.join(drivers_dir, device_name)
        images_path = os.path.join(driver_path, "assets", "images")

        # Create images directory if it doesn't exist
        os.makedirs(images_path, exist_ok=True)

        # Generate SVG
        svg_content = generate_svg(device_name, icon_path)
        svg_file = os.path.join(images_path, "icon.svg")

        with open(svg_file, "w") as f:
            f.write(svg_content)

        print(f"Created SVG for {device_name}")

        # Convert to PNG at different sizes
        sizes = [("small", 75), ("large", 500), ("xlarge", 1000)]
        for size_name, size in sizes:
            png_file = os.path.join(images_path, f"{size_name}.png")
            try:
                subprocess.run([
                    "rsvg-convert",
                    "-w", str(size),
                    "-h", str(size),
                    svg_file,
                    "-o", png_file
                ], check=True, capture_output=True)
                print(f"  Created {size_name}.png ({size}x{size})")
            except subprocess.CalledProcessError as e:
                print(f"  ERROR creating {size_name}.png: {e}")

        # Remove the temporary SVG file
        os.remove(svg_file)


if __name__ == "__main__":
    main()
