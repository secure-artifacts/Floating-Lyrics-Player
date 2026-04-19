# Floating Lyrics Player

A lightweight desktop lyrics player built with Electron. It supports always-on-top floating windows, automatic lyric synchronization, and one-click resource downloading.

---

## Features

- **Floating Lyrics**: Transparent background window with support for click-through and always-on-top display, delivering an immersive music experience.  
- **One-Click Fetch**: Enter a URL to automatically retrieve audio and corresponding LRC lyrics.  
- **Encoding Fix**: Built-in download logic converts LRC files to UTF-8 encoding, fully resolving character corruption issues.  
- **Theme Switching**: Multiple preset color schemes with lyrics dynamically adapting to the current player theme.  
- **Playback Management**: Supports sequential, shuffle, and loop modes; includes quick access to the local lyrics folder.  

---

## Technical Details

- **Runtime**: Electron  
- **Communication**: IPC (communication between Main and Renderer processes)  
- **Logic**:  
  - Uses `iconv-lite` and `chardet` for automatic lyric encoding detection and conversion.  
  - Leverages the `timeupdate` event of the `audio` element to achieve millisecond-level lyric synchronization.  

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development mode
npm start

# Build the application
npm run build
```
