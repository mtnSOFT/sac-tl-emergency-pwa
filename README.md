# SAC Notfallblatt PWA

Notfallblatt für SAC-Tourenleiter als Progressive Web App.

- **Offline-fähig** – einmal geladen, dann jederzeit ohne Netz nutzbar
- **Auto-Update** – neue Versionen werden via Banner angezeigt
- **Installierbar** – iOS / Android / Desktop
- **Inhalt via Markdown** im Repo gepflegt, `tel:`-Links für Direktanrufe

> Diese Version enthält **keine Authentifizierung** – sie ist öffentlich zugänglich.
> OIDC (Keycloak) ist im technischen Konzept beschrieben und kann später ergänzt werden.

---

## Inhalt pflegen

Alle Inhalte liegen als Markdown in `public/content/`:

```
public/content/
├── 01-verhalten.md     # Verhalten bei Unfall
├── 02-notruf.md        # Notrufnummern
└── 03-krisenstab.md    # Krisenstab-Kontakte
```

Jede Datei beginnt mit Frontmatter (Tab-Reihenfolge & Icon):

```markdown
---
title: Notruf
icon: 📞
order: 2
---

## Rettung
...
```

Nach einem Push auf `main` deployt GitHub Actions automatisch nach GitHub Pages.
Alle installierten PWAs sehen beim nächsten Start eine Update-Benachrichtigung.

### Telefonnummern als anrufbare Links

```markdown
| Rega | [1414](tel:1414) |
```

### Warnboxen

```markdown
> ⚠️ Keine Auskünfte an Medien
```

---

## Lokal entwickeln

```bash
npm run serve       # baut + öffnet http://localhost:8080
```

`npm run build` erzeugt `dist/`. Der Service Worker bekommt automatisch eine
neue Cache-Version-ID basierend auf Build-Zeitstempel + Git-SHA.

---

## Architektur

- Vanilla JS, kein Framework
- `marked.js` (CDN) als Markdown-Renderer
- Service Worker mit cache-first für App Shell, network-first für Inhalte
- Build-Script generiert `content/index.json` aus Frontmatter
- Deployment via GitHub Actions → GitHub Pages

Details siehe technisches Konzept (separat).

---

## Lizenz

AGPL-3.0-or-later. Kontaktdaten in diesem Repo sind **Beispieldaten**
basierend auf einem öffentlich verteilten Notfallblatt der Sektion Blüemlisalp.
