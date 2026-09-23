# QuickPrint Desktop Counter OS — Assets

This directory should contain the following icon files for production builds:

- `icon.png` — 512×512 PNG (used for Linux and as source)
- `icon.ico` — Windows ICO (multi-resolution: 16, 32, 48, 128, 256)
- `icon.icns` — macOS ICNS bundle

## How to generate icons

1. Start with `icon.png` (512×512 transparent background)
2. **Windows ICO**: Use `electron-icon-builder` or https://icoconvert.com
3. **macOS ICNS**: Use `iconutil` on macOS or https://cloudconvert.com/png-to-icns

## Brand Colors
- Background: #1C1B1F (dark ink)
- Accent: #FF5A1F (QuickPrint orange)
- Icon concept: Printer with orange spark/bolt
