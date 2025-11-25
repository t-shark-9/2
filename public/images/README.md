# Images Directory

This directory is for storing user-uploaded images from the Draft editor.

## How to Use Images in Draft

1. **In the editor, click the "+" button** to add a new block
2. **Select "Image"** from the menu
3. **Upload or drag & drop** your image file
4. Images are automatically embedded in your draft

## Supported Formats

- PNG
- JPG/JPEG
- GIF
- SVG
- WebP

## Current Implementation

Images are currently stored as base64 data URLs embedded in the draft content.

## Future Enhancement

For production use with larger images, consider uploading to Supabase Storage.
