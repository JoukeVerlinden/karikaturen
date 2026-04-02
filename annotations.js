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
  panoramaFile: "theroom1.jpg",  // default panorama loaded on startup
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
      <strong>Gilles Weyns</strong> — archivistisch onderzoek,
      transcripties en datering van de karikaturen.<br>
      <strong>Ulrike Müller</strong> — contextonderzoek Prix de Rome
      en academiegeschiedenis.
    </p>
    
    <h3>Digitale ontwikkeling</h3>
    <p>
      <strong>Yiaming Ye</strong> — 3D fotografie en 3D reconstructie.<br>
      <strong>Jouke Verlinden</strong>Ontwerp en programmering.
    </p>
    <h3>Met dank aan</h3>
    <p>
      Felixarchief Antwerpen · Stad Antwerpen Erfgoed ·
      Koninklijke Academie van Schone Kunsten Antwerpen.<br>
      bron historische fotos: Dossier betreffende de huldiging van laureaten van de Prix de Rome, Felixarchief Antwerpen, inv. 4414#104
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
    { file: "theroom1.jpg", year: 1908, label: "ca. 1908", mobileLabel: "1908" },
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
        id:    "hotspot-1774180683546",
        title: "A1 Louise Brohée",
        date:  "1904",
        pitch: -5.2, yaw: 252,
        zoom: 20,
        content: `11 mei 1875 in Strépy-Bracquegnies. Academie van Brussel. Deelnames: 1904 `,
      },
      {
        id:    "A2",
        title: "A2 Philippe Swyncop",
        date:  "1904",
        pitch: -4.5, yaw: 262.2,
        zoom: 30,
        content: `16 juni 1878 in Brussel. Academie Brussel, Woont in Brussel. Deelnames: 1898 - 1904 – 1907 (29) `,
        links: ["hotspot-1774181883281"],
      },
      {
        id:    "A3",
        title: "A3",
        date:  "1904",
        pitch: -6.1, yaw: 269.6,
        zoom: 20,
        content: ``,
      },
      {
        id:    "A4",
        title: "A4 Jozef Posenaer",
        date:  "1904",
        pitch: -3.4, yaw: 276.6,
        zoom: 20,
        content: `23 november 1876 in Borgerhout. Koninklijke Academie voor Schone Kunsten in Antwerpen, Deelnames: 1898 (22j)– 1901 (25j) – 1904 (28j) `,
        links: ["C2"],
      },
      {
        id:    "A5",
        title: "A5 Walter Vaes?",
        date:  "1904",
        pitch: -1.4, yaw: 286.2,
        zoom: 20,
        content: `12 februari 1882 in Borgerhout. Koninklijke Academie voor Schone Kunsten in Antwerpen. Deelnames: 1898 - 1901 - 1904 (22j), 1904: 1ste prijs `,
        links: ["B2","C1"],
      },
      {
        id:    "hotspot-1774181072377",
        title: "A6 Vloors of Gogo",
        date:  "1898",
        pitch: -1.8, yaw: 296.8,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181136312",
        title: "A7",
        date:  "1913",
        pitch: 25.1, yaw: 280.4,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181155649",
        title: "A8 Albert Claeys ",
        date:  "1913",
        pitch: 18.4, yaw: 283.6,
        zoom: 20,
        content: `‘Verloren zoon van Eecke’ (schildpad) 31 mei 1889 in Eke Academie Gent.Woont in Eke. Deelnames: 1913 `,
      },
      {
        id:    "hotspot-1774181184098",
        title: "A9",
        date:  "1913",
        pitch: 23.8, yaw: 287.8,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181221015",
        title: "A10",
        date:  "1913",
        pitch: 32.4, yaw: 288.8,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181251139",
        title: "A11 Willem Van Riet",
        date:  "1913",
        pitch: 26.4, yaw: 295.6,
        zoom: 20,
        content: `‘Antwerpse Duvel’ (bok)1 augustus 1887 in Antwerpen, Koninklijke academie Antwerpen + Hoger Instituut  Woont in Antwerpen. Deelnames: 1907 – 1910 – 1913 (26j) `,
      },
      {
        id:    "hotspot-1774181276113",
        title: "A12 Alfred Moitroux",
        date:  "1913",
        pitch: 29.6, yaw: 299.4,
        zoom: 20,
        content: `27 Maart 1886 in Binche, Academie Bergen, Brussel. Woont in La Louvière (1913).Deelnames: 1913 (26j) `,
      },
        {
        type: "inscription",
        id:    "inscription-1774182436495",
        title: "T1 Gelukkig zijn zij...",
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
        id:    "inscription-1774182579654",
        title: "T2 Adieu, veau, vache, cochon ..",
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
        id:    "inscription-1774182632829",
        title: "T4 Jury, morituri te salutant!",
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
        id:    "inscription-1774182685391",
        title: "T4 Vaincus d’un jour, vainqueurs de demain!",
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
        title: "B1 Joe English",
        date:  "",
        pitch: -6.1, yaw: 305.6,
        zoom: 20,
        content: ``,
         links: ["D3", "D14"],
      },
      {
        id:    "B2",
        title: "B2 Walter Vaes?",
        date:  "",
        image: "images/1910_Foto_Watteyne_Brugge.jpg",
        pitch: -8.5, yaw: 310.2,
        zoom: 20,
        content: ``,
      },
      {
        id:    "B3",
        title: "B3 Lambert?",
        date:  "",
        pitch: -7, yaw: 317,
        zoom: 20,
        content: ``,
      },
      {
        id:    "B4",
        title: "B4 Vaes-Lamber-Dom-Steel?",
        date:  "",
        image: "images/LeoSteel_zelfportret.jpg",
        pitch: 9.1, yaw: 310.2,
        zoom: 30,
        content: ``,
      },
      {
        id:    "C1",
        title: "C1 Walter Vaes",
        date:  "1904",
        pitch: -10.5, yaw: 14,
        zoom: 20,
        content: ``,
      },
      {
        id:    "C2",
        title: "C2 Jozef Posenaer",
        date:  "1904",
        pitch: -9, yaw: 21.2,
        zoom: 20,
        content: ``,
      },
      {
        id:    "C3",
        title: "C3 Emiel Jaques",
        date:  "1904",
        pitch: -8.3, yaw: 26,
        zoom: 20,
        content: ``,
      },
      {
        id:    "C4",
        title: "C4 Jules Van Biesbroeck",
        date:  "1904",
        pitch: -9.9, yaw: 31.8,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181621709",
        title: "C5 Camille Labert",
        date:  "1904",
        pitch: -5.5, yaw: 36,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181649218",
        title: "C6 Felix Gogo",
        date:  "1901",
        pitch: -5.5, yaw: 40,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181681242",
        title: "C7 Paul Artôt",
        date:  "1904",
        pitch: -6.7, yaw: 43.8,
        zoom: 20,
        content: ``,
      },
  {
        type: "inscription",
        id:    "T5",
        title: "T5 Vriendelijk verzocht",
        date:  "",
        corners: [[18.65, 1.54], [45.16, 1.54], [45.16, -0.26], [18.65, -0.26]],
        zoom: 25,
        content: ``,
        image: "images/Foto_en_loge_1901_deelnemers_Prix_de_Rome_privéarchief.jpg",
        transcription: [ "Vriendelijk verzocht deze ignobel menschensmoelen eewig te respecteeren"

        ],
        translation: ""
      },
      {
        id:    "hotspot-1774181741443",
        title: "D1 Victor De Budt",
        date:  "",
        pitch: -7.5, yaw: 49.6,
        zoom: 20,
        content: `17 februari 1886 in Gent, Academie Gent. Woont in Gent. Deelnames: 1907 (21j)-1910-1913. 1907: eervolle vermelding `,
      },
      {
        id:    "hotspot-1774181771118",
        title: "D2 Piet Gillis",
        date:  "",
        pitch: -7.6, yaw: 55.2,
        zoom: 20,
        content: `15 mei 1887 in Laken. Academie Antwerpen. Woont in Antwerpen (gestorven in Dendermonde). Deelnames: 1907 (20)-1910 – 1913 `,
      },
      {
        id:    "D3",
        title: "D3 Joe English",
        date:  "",
        pitch: -7.5, yaw: 61.8,
        zoom: 20,
        content: ``,
        links: ["B1", "D14"],
      },
      {
        id:    "hotspot-1774181825639",
        title: "D4 Oscar Coddron",
        date:  "",
        pitch: -9.4, yaw: 71.6,
        zoom: 35,
        content: ``,
      },
      {
        id:    "hotspot-1774181854226",
        title: "D5 Pol Dom",
        date:  "",
        pitch: -9.1, yaw: 82,
        zoom: 35,
        content: ``,
      },
      {
        id:    "hotspot-1774181883281",
        title: "D6 Philippe Swyncop",
        date:  "",
        pitch: -7.9, yaw: 90.8,
        zoom: 20,
        content: ``,
        links: ["A2"],
      },
      {
        id:    "hotspot-1774181906301",
        title: "D7 Arthur Navez ",
        date:  "",
        pitch: -3.4, yaw: 108,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181946871",
        title: "D8 Jean Colin?",
        date:  "1910",
        pitch: 13.3, yaw: 51,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774181992435",
        title: "D9 Arthur Navez?",
        date:  "1910",
        pitch: 20.1, yaw: 57.2,
        zoom: 35,
        content: ``,
      },
      {
        id:    "hotspot-1774182024041",
        title: "D10  Jan Van Puyenbroeck ? ",
        date:  "1910",
        pitch: 13.7, yaw: 65.4,
        zoom: 35,
        content: ``,
      },
      {
        id:    "hotspot-1774182075334",
        title: "D11  Jan Van Puyenbroeck of Jean Colin?",
        date:  "1910",
        pitch: 20.9, yaw: 74.8,
        zoom: 35,
        content: `Onze Jan die in de hemel zit `,
      },
      {
        id:    "hotspot-1774182101476",
        title: "D12 Louis Buisseret",
        date:  "1910",
        pitch: 8.5, yaw: 87.6,
        zoom: 20,
        content: ``,
      },
      {
        id:    "hotspot-1774182127538",
        title: "D13 Emiel Vermeersch",
        date:  "1910",
        pitch: 22.4, yaw: 89.4,
        zoom: 35,
        content: ``,
      },
      {
        id:    "D14",
        title: "D14 Joe English",
        date:  "1910",
        pitch: 20.2, yaw: 108.6,
        zoom: 20,
        content: ``,
        links: ["B1", "D3"],
      },
      {
        id:    "hotspot-1774182185642",
        title: "D15  Oscar Coddron of Victor Regnart ?",
        date:  "1910",
        pitch: 21.7, yaw: 117.2,
        zoom: 20,
        content: ``,
      },
      {
        type: "inscription",
        id:    "inscription-1774182291805",
        title: "T5 Da zal wel kunne zijn",
        date:  "1910",
        corners: [[53.34, 10.33], [61.08, 10.33], [61.08, 6.86], [53.34, 6.86]],
        zoom: 20,
        content: ``,
        transcription: [
          "Da zal wel kunne zijn"
        ],
        translation: "It could be like that"
      }

  

];

