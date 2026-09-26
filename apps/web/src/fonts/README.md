# Plus Jakarta Sans

The family the design file uses, committed here rather than fetched from Google
at build time. `OFL.txt` is the licence it ships under; it has to travel with
the files.

## Why these files are in the repository

`next/font/google` self-hosts the font for the browser, but it downloads it
**during the build**. That made every build depend on `fonts.googleapis.com`
answering with CSS Turbopack can parse. On 25 September 2026 it answered with
something Turbopack could not — `next/font/google queries have exactly one
entry` — and failed a container build on a commit that touched no CSS. Re-running
the same commit passed. A build that can fail for a reason outside the
repository is a build that can fail during a release, so the fetch is gone.

Nothing a browser downloads changed. These are the same four files the loader
was fetching, and the build proves it: the content hashes Next puts in the
asset names (`p.18rizl4rsrl42` for latin, `35a5cae5tspm2` for latin-ext,
`10u7vx61f1ie7` for vietnamese, `0e__wj8580tc5` for cyrillic-ext) are identical
to the ones the Google loader produced.

## What each file is

Plus Jakarta Sans v12, as Google's CSS API serves it: one **variable** file per
subset, carrying the whole `wght` axis from 200 to 800. There is no file per
weight — the five weights the design uses (400, 500, 600, 700, 800) are
instances of the same file.

| File                                   | Subset       | Size   |
| -------------------------------------- | ------------ | ------ |
| `plus-jakarta-sans-latin.woff2`        | latin        | 27,272 |
| `plus-jakarta-sans-latin-ext.woff2`    | latin-ext    | 21,688 |
| `plus-jakarta-sans-vietnamese.woff2`   | vietnamese   | 8,292  |
| `plus-jakarta-sans-cyrillic-ext.woff2` | cyrillic-ext | 1,716  |

Only latin is preloaded. The other three are fetched the first time a page
renders a character in their range, which is what their `unicode-range` in
`src/app/layout.tsx` is for — most often a name someone typed into their
profile, such as Łukasz or Nguyễn. Dropping them would render those names in
Arial instead, so they stay.

## Refreshing them

Ask Google's CSS API for the family with a browser user agent, which is what
makes it answer with woff2:

```sh
curl -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
  (KHTML, like Gecko) Chrome/140.0 Safari/537.36' \
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap'
```

Each `@font-face` block in the answer carries one subset's URL and its
`unicode-range`. Download the four files over the ones here, and copy each
`unicode-range` into the matching `localFont` call in `src/app/layout.tsx` — the
range and the file have to agree, or the browser will download a face to render
a glyph it does not contain. Then build and check that the four asset hashes in
`.next/static/media` changed the way you expected.
