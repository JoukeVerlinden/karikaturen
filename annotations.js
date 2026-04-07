// ═══════════════════════════════════════════════════════
//  annotations.js — Heritage 360° Viewer · Content File
//
//  Edit this file to update all text, hotspot positions,
//  images, and panel content without touching the viewer.
//
//  SITE_CONFIG  → top-bar title, panel header, meta line
//  HOTSPOTS     → all point and inscription annotations
// ═══════════════════════════════════════════════════════

// ── Site identity ────────────────────────────────────────
const SITE_CONFIG = {
  siteTitle:    "Humor op de muren",
  siteSubtitle: "Karikaturen op de Antwerpse Academie van schone kunsten",
  panelLabel:   "Details",
  panelHeading: "Historische Karikaturen en graffiti",
  panelMeta:    "43 gegevens \u00b7 circa 1904 – 1910",
  panoramaFile: "theroom2.jpg",  // default panorama loaded on startup
  defaultYaw:   360,               // starting horizontal angle in degrees
  defaultPitch: 0,               // starting vertical angle in degrees
  defaultZoom:  90,              // starting FOV in degrees (20–120)
  
  // ── Welcome overlay ───────────────────────────────────
  // HTML allowed. Shown on startup before the user dismisses.
  introHTML: `Voor Erfgoeddag 2026 openen we digitaal de deuren van de
  <strong>Antwerpse Koninklijke Academie van Schone Kunsten </strong>en tonen we een voormalig 
  toilet met humoristische karikaturen van <a href="https://felixarchief.antwerpen.be/nieuwspagina/de-prix-de-rome-een-schatkamer-vol-kunstenaarsgeschiedenis"
       target="_blank">Prix de Rome-finalisten</a> (1898–1913), 
  als unieke inkijk in het Antwerpse kunstleven rond 1900.
  `,

  // ── Colophon / info panel ─────────────────────────────
  // Shown when the user clicks the ⓘ button. HTML allowed.
  colophonTitle: "Achtergrond",
  colophonHTML: `
    <p>In het historische gebouw van de Koninklijke Academie voor Schone Kunsten bevindt 
    zich een voormalige toiletruimte waar kunstenaars karikaturen en grappige bijschriften 
    achterlieten op de muren. Ze werden gemaakt tussen 1898 en 1914 door de finalisten van de 
    prestigieuze Prix de Rome, een nationale wedstrijd voor beloftevolle jonge kunstenaars. 
    De muurschilderingen bieden een ongebruikelijk inzicht in de dagelijkse cultuur van het 
    academisch kunstonderwijs rond 1900, met een flinke dosis humor. <br>
    Naar aanleiding van Erfgoeddag 2026 opent de Faculteit 
    Ontwerpwetenschappen van de Universiteit Antwerpen digitaal de deuren tot 
    dit bijzondere stuk campuserfgoed.
      Dit digitale panorama werd ontwikkeld in het kader van
      <strong>Erfgoeddag 2026</strong> door de
      <strong>Faculteit Ontwerpwetenschappen, Universiteit Antwerpen</strong>
      in samenwerking met het <strong>Felixarchief</strong>.
    </p>
    <h3>Archief- en dataonderzoek</h3>
    <p>
      <strong>Gilles Weyns</strong> — archiefonderzoek,
      transcripties en datering van de karikaturen.<br>
      <strong>Ulrike Müller</strong> — contextonderzoek Prix de Rome
      en academiegeschiedenis.
    </p>
    
    <h3>Digitale ontwikkeling</h3>
    <p>
      <strong>Jiaming Ye</strong> — 3D reconstructie.<br>
      <strong>Jouke Verlinden</strong> - Ontwerp en programmering.
    </p>
    <h3>Met dank aan</h3>
    <p>
      Felixarchief Antwerpen · Stad Antwerpen Erfgoed ·
      Koninklijke Academie van Schone Kunsten Antwerpen.<br>
      Bron historische fotos: Dossier betreffende de huldiging van laureaten van de Prix de Rome, Felixarchief Antwerpen, inv. 4414#104
    </p>
    <p class="colophon-copy">
      © 2026 UAntwerpen / Felixarchief. Beeldmateriaal en annotaties zijn
      beschermd door auteursrecht. Gebruik enkel mits schriftelijke
      toestemming.
    </p>
  `,
// ── Welcome overlay hints ─────────────────────────────
  // Each hint: { icon, html }  (icon is a single character, html may contain <strong>/<em>)
  // Shown in order on the Welkom tab. Keep them short.
  hints: [
    { icon: "↔", html: "<strong>Verkennen</strong> — sleep het beeld om rond te kijken" },
    { icon: "⊕", html: "<strong>Inzoomen</strong> — scroll of <kbd>&#43;</kbd>&thinsp;/&thinsp;<kbd>&#8722;</kbd>, op mobiel: knijp met twee vingers" },
    { icon: "◷", html: "<strong>Tijdvak</strong> — wissel bovenaan van fotodocumentatie" },
    { icon: "⌂", html: "<strong>Beginpositie</strong> — huis-icoon rechtsonder" },
    { icon: "⟳", html: "<strong>Rondleiding</strong> — automatische tour via knop bovenaan" },
    { icon: "☰", html: "<strong>Annotaties</strong> — informatie per markering in het paneel onderaan", mobileOnly: true }
  ],

  // ── Time-lapse scenes ─────────────────────────────────
  // Each entry: { file, year, label }
  // Hotspots with a numeric `date` field are shown only when
  // their date year <= the scene year. Undated hotspots always show.
  scenes: [
    { file: "theroom1.jpg", year: 1906, label: "ca. 1906", mobileLabel: "1906" },
    { file: "theroom2.jpg", year: 2025, label: "ca. 2025", mobileLabel: "2025" }
  /*  .{ file: "theroom3.jpg", year: 2026, label: "2026",     mobileLabel: "'26" } */
  ]
};

// ── Annotations ──────────────────────────────────────────
//
//  Point hotspot fields:
//    id       (string)   unique identifier
//    pitch    (number)   vertical angle in degrees (+up / -down)
//    yaw      (number)   horizontal angle in degrees
//    title    (string)   short label shown in panel + tooltip
//    date     (string)   date / location line
//    image    (string)   URL or relative path for the panel thumbnail
//    content  (string)   HTML body text (bold, em, etc. allowed)
//    links    (string[]) optional — IDs of related hotspots shown as
//                        clickable chips at the bottom of the panel entry
//    zoom     (number)   optional — FOV in degrees (20–120) applied when
//                        navigating to this hotspot; omit to use default 90°
//
//  Inscription hotspot — all of the above except pitch/yaw, plus:
//    type         "inscription"
//    corners      [[yaw,pitch], [yaw,pitch], [yaw,pitch], [yaw,pitch]]
//                 top-left → top-right → bottom-right → bottom-left
//                 (fly-to centre is derived automatically from corners[0] and corners[2])
//    transcription  (string[])  one entry per line of the inscription
//    translation    (string)    English rendering shown below transcription
// ─────────────────────────────────────────────────────────

const HOTSPOTS = [
      {
        id:    "A1",
        title: "Louise Brohée",
        date:  "1904",
        pitch: -5.2, yaw: 252,
        zoom: 20,
        content: `Geboren in 1875 in Strépy-Bracquegnies. Opleiding in Brussel. Deelname: 1904 (29j). Finalist in 1904. Eerste vrouwelijke finalist.`,
      },
      {
        id:    "A2",
        title: "Philippe Swyncop",
        date:  "1904",
        pitch: -4.5, yaw: 262.2,
        zoom: 30,
        content: `Geboren in 1878 in Brussel. Opleiding in Brussel. Deelnames: 1898 (20j) – 1904 (26j) – 1907 (29j). Finalist in 1904 en 1907.`,
        links: ["D6"],
      },
      {
        id:    "A3",
        title: "Pol Dom?",
        date:  "1904",
        pitch: -6.1, yaw: 269.6,
        zoom: 20,
        content: `Geboren in 1885 in Antwerpen. Opleiding in Antwerpen. Deelnames: 1904 (19j) – 1907 (22j) – 1910 (25j). Finalist in 1904 en 1907.`,
          links: ["D5"],
      },
      {
        id:    "A4",
        title: "Jozef Posenaer",
        date:  "1904",
        pitch: -3.4, yaw: 276.6,
        zoom: 20,
        content: `Geboren in 1876 in Borgerhout. Opleiding in Antwerpen. Deelnames: 1898 (22j) – 1901 (25j) – 1904 (28j). Finalist in 1898, 1901 en 1904. 1901: Eerste tweede prijs.`,
        links: ["C2"],
      },
      {
        id:    "A5",
        title: "Walter Vaes",
        date:  "1904",
        pitch: -1.4, yaw: 286.2,
        zoom: 20,
        content: `Geboren in 1882 in Borgerhout. Opleiding in Antwerpen. Deelnames: 1898 (16j) – 1901 (19j) – 1904 (22j). Finalist in 1901 en 1904. 1904: Eerste prijs.`,
        links: ["B2","C1"],
      },
      {
        id:    "A6",
        title: "Emiel Vloors?",
        date:  "1898",
        pitch: -1.8, yaw: 296.8,
        zoom: 20,
        content: `Geboren in 1871 in Borgerhout. Opleiding in Antwerpen. Deelnames: 1895 (24j) – 1898 (27j). Finalist in 1895 en 1898. 1895: Tweede prijs. 1898: Eerste prijs.`,
      },
      {
        id:    "A7",
        title: "Jan Van Malderen",
        date:  "1913",
        pitch: 25.1, yaw: 280.4,
        zoom: 20,
        content: `Geboren in 1883 in Aalst. Opleiding in Aalst en Brussel. Deelnames: 1910 (26j) – 1913 (29j). Finalist in 1913.`,
      },
      {
        id:    "A8",
        title: "Albert Claeys ",
        date:  "1913",
        pitch: 18.4, yaw: 283.6,
        zoom: 20,
        content: `‘Verloren zoon van Eecke’ (schildpad) Geboren in 1889 in Eke. Opleiding in Gent. Deelname: 1913 (24j). Finalist in 1913.`,
      },
      {
        id:    "A9",
        title: "Juliaan De Vriendt?",
        date:  "1913",
        pitch: 23.8, yaw: 287.8,
        zoom: 20,
        content: `Geboren in 1842 in Gent. Opleiding in Gent en Antwerpen. Bestuurder van de Koninklijke Academie voor Schone Kunsten van Antwerpen.`,
      },
      {
        id:    "A10",
        title: "Victor Regnart",
        date:  "1913",
        pitch: 32.4, yaw: 288.8,
        zoom: 20,
        content: `Geboren in 1886 in Elouges. Opleiding in Bergen, Brussel en Antwerpen. Deelnames: 1910 (24j) – 1913 (27j). Finalist in 1910 en 1913.`,
          links: ["A15"],
      },
      {
        id:    "A11",
        title: "Willem Van Riet",
        date:  "1913",
        pitch: 26.4, yaw: 295.6,
        zoom: 20,
        content: `‘Antwerpse Duvel’ (bok)Geboren in 1887 in Antwerpen. Opleiding in Antwerpen. Deelnames: 1907 (20j) – 1910 (23j) – 1913 (26j). Finalist in 1913.`,
      },
      {
        id:    "A12",
        title: "Karel Van Belle",
        date:  "1913",
        pitch: 29.6, yaw: 299.4,
        zoom: 20,
        content: `Geboren in 1884 in Gent. Opleiding in Gent. Deelnames: 1910 (26j) – 1913 (29j). Finalist in 1913. 1913: Eervolle vermelding.`,
      },
  {
        id:    "A13",
        title: "Alfred Moitroux",
        date:  "1913",
        pitch: 14.8, yaw: 293.5,
        zoom: 20,
        content: `Geboren in 1886 in Binche. Opleiding in Bergen en Brussel. Deelname: 1913 (26j). Finalist in 1913.`,
      },
        {
        type: "inscription",
        id:    "T1",
        title: "Gelukkig zijn zij...",
        date:  "1913",
        corners: [[246.22, 11.45], [269.90, 11.45], [269.90, 8.61], [246.22, 8.61]],
        zoom: 33,
        content: ``,
        transcription: [
          "Gelukkig zijn zij die een buis krijgen want zij zullen schitteren als de sterren aan het firmamentn"
        ],
        translation: ""
      },
      {
        type: "inscription",
        id:    "T3",
        title: "Adieu, veau, vache, cochon ..",
        date:  "1913",
        corners: [[246.83, 8.41], [270.58, 8.41], [270.58, 5.48], [246.83, 5.48]],
        zoom: 33,
        content: ``,
        transcription: ["Adieu, veau, vache, cochon .."

        ],
        translation: "Vaarwel, kalf, koe, varken"
      },
      {
        type: "inscription",
        id:    "T4A",
        title: "Jury, morituri te salutant!",
        date:  "1913",
        corners: [[276.69, 12.78], [296.04, 12.78], [296.04, 9.76], [276.69, 9.76]],
        zoom: 27,
        content: ``,
        transcription: [
          "Jury, morituri te salutant!"
        ],
        translation: "Jury, de stervenden brengen u een saluut!"
      },
      {
        type: "inscription",
        id:    "T4B",
        title: "Vaincus d’un jour, vainqueurs de demain!",
        date:  "1913",
        corners: [[284.25, 9.76], [302.22, 9.76], [302.22, 6.67], [284.25, 6.67]],
        zoom: 25,
        content: ``,
        transcription: [ "Vaincus d’un jour, vainqueurs de demain!"

        ],
        translation: "Vandaag verslagen, morgen zegevierend!"
      },
      {
        id:    "B1",
        title: "Joe English",
        date:  "1904",
        pitch: -6.1, yaw: 305.6,
        zoom: 20,
        content: `Geboren in 1882 in Brugge. Opleiding in Antwerpen. Deelnames: 1904 (22j) – 1907 (25j) – 1910 (28j). Finalist in 1904, 1907 en 1910. 1904: Tweede prijs. 1907: Tweede prijs.`,
         links: ["D3", "D14"],
      },
      {
        id:    "B2",
        title: "Walter Vaes",
        date:  "1904",
        /*image: "images/1910_Foto_Watteyne_Brugge.jpg",*/
        pitch: -8.5, yaw: 310.2,
        zoom: 20,
        content: `Geboren in 1882 in Borgerhout. Opleiding in Antwerpen. Deelnames: 1898 (16j) – 1901 (19j) – 1904 (22j). Finalist in 1901 en 1904. 1904: Eerste prijs.`,
        links: ["A5","C1"],
      },
      {
        id:    "B3",
        title: "Camille Lambert?",
        date:  "1904",
        pitch: -7, yaw: 317,
        zoom: 20,
        content: `Geboren in 1874 in Aarlen. Opleiding in Luik en Antwerpen. Deelnames: 1898 (24j) – 1901 (27j) – 1904 (29j). Finalist in 1898, 1901 en 1904. 1901: Eervolle vermelding. 1904: Eervolle vermelding.`,
          links: ["C5"],
      },
      {
        id:    "B4",
        title: "Leo Steel",
        date:  1904,
        /*image: "images/LeoSteel_zelfportret.jpg",*/
        pitch: 9.1, yaw: 310.2,
        zoom: 30,
        content: `Geboren in 1878 in Stekene. Opleiding in Antwerpen. Deelnames: 1901 (23j) – 1904 (26j) – 1907 (29j). Finalist in 1904.`,
      },
      {
        id:    "C1",
        title: "Walter Vaes",
        date:  "1901",
        pitch: -10.5, yaw: 14,
        zoom: 20,
        content: `Geboren in 1882 in Borgerhout. Opleiding in Antwerpen. Deelnames: 1898 (16j) – 1901 (19j) – 1904 (22j). Finalist in 1901 en 1904. 1904: Eerste prijs.`,
          links: ["B2","A5"],
      },
      {
        id:    "C2",
        title: "Jozef Posenaer",
        date:  "1901",
        pitch: -9, yaw: 21.2,
        zoom: 20,
        content: `Geboren in 1876 in Borgerhout. Opleiding in Antwerpen. Deelnames: 1898 (22j) – 1901 (25j) – 1904 (28j). Finalist in 1898, 1901 en 1904. 1901: Eerste tweede prijs.`,
          links: ["A4"],
      },
      {
        id:    "C3",
        title: "Emiel Jaques",
        date:  "1901",
        pitch: -8.3, yaw: 26,
        zoom: 20,
        content: `Geboren in 1874 in Moorslede. Opleiding in Roeselare en Antwerpen. Deelnames: 1898 (24j) – 1901 (27j). Finalist in 1901.`,
      },
      {
        id:    "C4",
        title: "Jules Van Biesbroeck",
        date:  "1901",
        pitch: -9.9, yaw: 31.8,
        zoom: 20,
        content: `Geboren in 1873 in Portici. Opleiding in Gent. Deelnames: 1892 (19j) – 1895 (22j) – 1898 (25j) – 1901 (28j). 1895: Tweede prijs. 1898: Tweede prijs. `,
      },
      {
        id:    "C5",
        title: "Camille Labert",
        date:  "1901",
        pitch: -5.5, yaw: 36,
        zoom: 20,
        content: `Geboren in 1874 in Aarlen. Opleiding in Luik en Antwerpen. Deelnames: 1898 (24j) – 1901 (27j) – 1904 (29j). Finalist in 1898, 1901 en 1904. 1901: Eervolle vermelding. 1904: Eervolle vermelding.`,
          links: ["B3"],
      },
      {
        id:    "C6",
        title: "Felix Gogo",
        date:  "1901",
        pitch: -5.5, yaw: 40,
        zoom: 20,
        content: `Geboren in 1872 in Antwerpen. Opleiding in Antwerpen. Deelnames: 1892 (20j) – 1895 (23j) – 1898 (26j) – 1901 (29j). Finalist in 1898 en 1901. 1898: Eervolle vermelding. 1901: Tweede tweede prijs.`,
      },
      {
        id:    "C7",
        title: "Paul Artôt",
        date:  "1901",
        pitch: -6.7, yaw: 43.8,
        zoom: 20,
        /*image: "images/paul_artot.jpg", */
        content: `Geboren in 1872 in Brussel. Opleiding in Brussel. Deelname: 1901. Finalist in 1901.`,
      },
  {
        type: "inscription",
        id:    "T5A",
        title: "Vriendelijk verzocht",
        date:  "1901",
        corners: [[18.65, 1.54], [45.16, 1.54], [45.16, -0.26], [18.65, -0.26]],
        zoom: 25,
        content: ``,
        /*image: "images/Foto_en_loge_1901_deelnemers_Prix_de_Rome_privéarchief.jpg",*/
        transcription: [ "Vriendelijk verzocht deze ignobel menschensmoelen eewig te respecteeren"

        ],
        translation: ""
      },
      {
        id:    "D1",
        title: "Victor De Budt",
        date:  "1907",
        pitch: -7.5, yaw: 49.6,
        zoom: 20,
        content: `1Geboren in 1886 in Gent. Opleiding in Gent. Deelnames: 1907 (21j) – 1910 (24j) – 1913 (27j). Finalist in 1907. 1907: Eervolle vermelding.`,
      },
      {
        id:    "D2",
        title: "Piet Gillis",
        date:  "1907",
        pitch: -7.6, yaw: 55.2,
        zoom: 20,
        content: `1Geboren in 1887 in Laken. Opleiding in Antwerpen. Deelnames: 1907 (20j) – 1910 (23j) – 1913 (26j). Finalist in 1907.`,
      },
      {
        id:    "D3",
        title: "Joe English",
        date:  "1907",
        pitch: -7.5, yaw: 61.8,
        zoom: 20,
        content: `Geboren in 1882 in Brugge. Opleiding in Antwerpen. Deelnames: 1904 (22j) – 1907 (25j) – 1910 (28j). Finalist in 1904, 1907 en 1910. 1904: Tweede prijs. 1907: Tweede prijs.`,
        links: ["B1", "D14"],
      },
      {
        id:    "D4",
        title: "Oscar Coddron",
        date:  "1907",
        pitch: -9.4, yaw: 71.6,
        zoom: 35,
        content: `Geboren in 1881 in Gent. Opleiding in Gent. Deelnames: 1901 (20j) – 1907 (26j) – 1910 (29j). Finalist in 1907 en 1910. 1907: Tweede prijs.`,
          links: ["D10"],
      },
      {
        id:    "D5",
        title: "Pol Dom",
        date:  "1907",
        pitch: -9.1, yaw: 82,
        zoom: 35,
        content: `Geboren in 1885 in Antwerpen. Opleiding in Antwerpen. Deelnames: 1904 (19j) – 1907 (22j) – 1910 (25j). Finalist in 1904 en 1907.`,
          links: ["A3"],
      },
      {
        id:    "D6",
        title: "Philippe Swyncop",
        date:  "1907",
        pitch: -7.9, yaw: 90.8,
        zoom: 20,
        content: `Geboren in 1878 in Brussel. Opleiding in Brussel. Deelnames: 1898 (20j) – 1904 (26j) – 1907 (29j). Finalist in 1904 en 1907.`,
        links: ["A2"],
      },
      {
        id:    "D7",
        title: "Arthur Navez ",
        date:  "1907",
        pitch: -3.4, yaw: 108,
        zoom: 20,
        content: `Geboren in 1881 in Antwerpen. Opleiding in Antwerpen en Brussel. Deelnames: 1901 (20j) – 1904 (23j) – 1907 (26j) – 1910 (29j). Finalist in 1907 en 1910.`,
          links: ["D9"],
      },
      {
        id:    "D8",
        title: "Jean Colin",
        date:  "1910",
        pitch: 13.3, yaw: 51,
        zoom: 20,
        content: `Geboren in 1881 in Brussel. Opleiding in Brussel. Deelnames: 1904 (23j) – 1907 (26j) – 1910 (29j). Finalist in 1910. 1910: Eerste prijs.`,
      },
      {
        id:    "D9",
        title: "Arthur Navez?",
        date:  "1910",
        pitch: 20.1, yaw: 57.2,
        zoom: 35,
        content: `Geboren in 1881 in Antwerpen. Opleiding in Antwerpen en Brussel. Deelnames: 1901 (20j) – 1904 (23j) – 1907 (26j) – 1910 (29j). Finalist in 1907 en 1910.`,
          links: ["D7"],
      },
      {
        id:    "D10",
        title: "Oscar Coddron? ",
        date:  "1910",
        pitch: 13.7, yaw: 65.4,
        zoom: 35,
        content: `Geboren in 1881 in Gent. Opleiding in Gent. Deelnames: 1901 (20j) – 1907 (26j) – 1910 (29j). Finalist in 1907 en 1910. 1907: Tweede prijs.`,
          links: ["D4"],
      },
      {
        id:    "D11",
        title: "Jan Van Puyenbroeck",
        date:  "1910",
        pitch: 20.9, yaw: 74.8,
        zoom: 35,
        content: `Onze Jan die in de hemel zit - Geboren in 1887 in Antwerpen. Opleiding in Antwerpen. Deelname: 1910 (23j) – 1913 (26j). Finalist in 1910.`,
      },
      {
        id:    "D12",
        title: "Louis Buisseret",
        date:  "1910",
        pitch: 8.5, yaw: 87.6,
        zoom: 20,
        content: `Geboren in 1888 in Binche. Opleiding Brussel. Deelname: 1910 (22j). 1910: Eervolle vermelding.`,
      },
      {
        id:    "D13",
        title: "Emiel Vermeersch",
        date:  "1910",
        pitch: 22.4, yaw: 89.4,
        zoom: 35,
        content: `Geboren in 1880 in Brugge. Opleiding in Brussel. Deelnames: 1904 (23j) – 1907 (26j) – 1910 (29j). Finalist in 1910. 1910: Eervolle vermelding.`,
      },
      {
        id:    "D14",
        title: "Joe English",
        date:  "1910",
        pitch: 20.2, yaw: 108.6,
        zoom: 20,
        content: `Geboren in 1882 in Brugge. Opleiding in Antwerpen. Deelnames: 1904 (22j) – 1907 (25j) – 1910 (28j). Finalist in 1904, 1907 en 1910. 1904: Tweede prijs. 1907: Tweede prijs.`,
        links: ["B1", "D3"],
      },
      {
        id:    "D15",links: ["B1", "D3"],
        title: "Victor Regnart?",
        date:  "1910",
        pitch: 21.7, yaw: 117.2,
        zoom: 20,
        content: `Geboren in 1886 in Elouges. Opleiding in Bergen, Brussel en Antwerpen. Deelnames: 1910 (24j) – 1913 (27j). Finalist in 1910 en 1913.`,
          links: ["A10"],
      },
      {
        type: "inscription",
        id:    "T5",
        title: "Da zal wel kunne zijn",
        date:  "1910",
        corners: [[53.34, 10.33], [61.08, 10.33], [61.08, 6.86], [53.34, 6.86]],
        zoom: 20,
        content: ``,
        transcription: [
          "Da zal wel kunne zijn"
        ],
        translation: ""
      }

  

];

