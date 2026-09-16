# Brand icons

Official third-party brand assets used for the meeting / community buttons on the
mobile cohort card. Files are used unmodified, as required by both brand
guidelines.

| File | Brand | Source (official domain) | Retrieved |
| ---- | ----- | ------------------------ | --------- |
| `zoom.png` | Zoom | `https://st1.zoom.us/zoom-180x180.png` (Zoom CDN, also served as the zoom.us web-clip icon) | 2026-09-16 |
| `whatsapp.svg` | WhatsApp | `https://static.whatsapp.net/rsrc.php/y1/r/FJbTMJqMap7.svg` (WhatsApp official static CDN, standalone logomark, WhatsApp Green `#25D366`) | 2026-09-16 |
| `whatsapp.png` | WhatsApp | Rendered locally at 512x512 from `whatsapp.svg` via `rsvg-convert` (React Native `<Image>` cannot consume SVG directly) | 2026-09-16 |

Trademark notes:

- Zoom and the Zoom logo are trademarks of Zoom Communications, Inc.
  See <https://brand.zoom.com/> and <https://www.zoom.com/en/about/media-kit/>.
- WhatsApp and the WhatsApp mark are trademarks of Meta Platforms, Inc.
  See <https://www.meta.com/brand/resources/whatsapp/whatsapp-brand/>.
- Both marks are used here nominatively only: the Zoom icon labels a button
  that opens the cohort's actual Zoom meeting URL, and the WhatsApp icon labels
  a button that opens the cohort's actual WhatsApp group invite. Do not reuse
  these files for any other purpose without checking the brand guidelines above.
