# Auth screen artwork

Three assets on the sign-in / sign-up showcase panel are artwork rather than
layout, so they are exported from the Figma file instead of being reproduced in
CSS. Export them from `HireEvo_ Dashboard V.01`
(`F7Shp0bGkgW7mu8FZipja1`) at 2x and drop them in beside this file:

| File                  | Figma node             | Size (1x) | Notes                                           |
| --------------------- | ---------------------- | --------- | ----------------------------------------------- |
| `workspace.png`       | `132:1667` — `Girl 1`  | 574 x 861 | The photograph. Needs a transparent background. |
| `brand-motif.svg`     | `132:1659` — `Layer 3` | 417 x 367 | The stepped mark cut into the top-right corner. |
| `brand-motif-alt.svg` | `132:1550` — `Layer 2` | 262 x 432 | The same mark, bottom-left.                     |

`brand-motif*.svg` are decorative and carry an empty `alt`, so the panel still
renders correctly while they are missing — it simply loses the corner detail.

The wordmark in `../brand/` is exported the same way; see the README there.
