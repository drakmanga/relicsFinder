# Third-party notices

This project is MIT licensed (see [`LICENSE`](LICENSE)), but that grant covers
only the source code written here. The material below arrives from elsewhere and
keeps its own terms.

## Fonts — SIL Open Font License 1.1

Two font families are bundled as WOFF2 binaries and served to every visitor:

| Family | Files                                                        | Copyright                                                                         |
| ------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Inter  | `inter-400-700-latin.woff2`, `inter-400-700-latin-ext.woff2` | Copyright (c) 2016 The Inter Project Authors — <https://github.com/rsms/inter>    |
| Cinzel | `cinzel-400-700-latin.woff2`                                 | Copyright 2020 The Cinzel Project Authors — <https://github.com/NDISCOVER/Cinzel> |

Both are licensed under the **SIL Open Font License, Version 1.1** — not MIT.
The full licence text ships alongside the binaries at
[`packages/ui/src/styles/fonts/OFL.txt`](packages/ui/src/styles/fonts/OFL.txt),
is copied into `packages/ui/dist/fonts/OFL.txt` by the build, and is served from
the deployed site at `/OFL.txt`. OFL clause 2 requires that notice to travel with
the font files, which is why it exists in all three places.

The bundled files are Modified Versions: subsets restricted to the Latin and
Latin Extended unicode ranges and to the 400–700 weight axis, converted to WOFF2.
Neither upstream declares a Reserved Font Name, so the families keep their
original names.

Note that these fonts are self-hosted rather than loaded from Google's CDN. That
is deliberate: requesting them from `fonts.googleapis.com` would disclose every
visitor's IP address to Google, which is the arrangement a German court found
unlawful under the GDPR in _LG München I, 3 O 17493/20_ (20 January 2022).

## Game data — Digital Extremes

`src/main/resources/relics.json` and the mission reward tables fetched at runtime
originate from Digital Extremes' official Warframe drop tables, by way of
[WFCD/warframe-drop-data](https://github.com/WFCD/warframe-drop-data) (MIT
licensed for the parsing and JSON formatting; the underlying data is Digital
Extremes').

Warframe, the Warframe logo, Prime, Orokin, Void Relic and all related names,
marks and game content are the property of **Digital Extremes Ltd.**

This project is an unofficial fan tool. It is not affiliated with, endorsed by,
or sponsored by Digital Extremes. It is distributed free of charge and carries no
advertising, in line with the non-commercial requirement of the
[Warframe Content Policy](https://www.warframe.com/en/contentpolicy). That policy
also forbids use of the Warframe or Digital Extremes logos without written
consent, so none are reproduced here.

## Market data — warframe.market

Prices, orders and item metadata come from the public
[warframe.market](https://warframe.market/) API. That data belongs to
warframe.market and to the users who post the listings. This project is not
affiliated with warframe.market.

Use of the API follows the published
[warframe.market rules](https://docs.warframe.market/docs/rules/overview/):

- Every outbound request carries a dedicated, descriptive `User-Agent`
  identifying this project and linking to its repository. See
  `relics.reliceApi.service.ApiIdentity`.
- No request impersonates a browser.
- Every service that calls the host shares one throttle
  (`relics.reliceApi.service.MarketRateLimiter`), so the client stays under the
  documented ceiling of three requests per second in total — not three per
  service — regardless of how many workers are in flight.
- Responses are cached on disk and reused, so a warm client makes no calls at
  all. The rules ask integrations to minimise unnecessary traffic.

## Dependencies

Runtime and build dependencies are declared in [`pom.xml`](pom.xml) and
[`package.json`](package.json) and remain under their own licences — chiefly
Apache-2.0 (Spring Boot, Jackson), MIT (React, Vite, TanStack) and MIT (Lombok).
Resolve the current set with `./mvnw license:add-third-party` and
`npx license-checker` if a full manifest is needed.
