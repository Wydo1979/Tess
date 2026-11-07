// ============================================================
//  Taaltopper – oefenspelletjes voor taal (groep 6)
// ============================================================
"use strict";

// ---------------------------------------------------------------
//  Kleine hulpjes
// ---------------------------------------------------------------
const $app = document.getElementById("app");
const rnd = (n) => Math.floor(Math.random() * n);
const kies = (lijst) => lijst[rnd(lijst.length)];
function schud(lijst) {
  const a = lijst.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function maak(tag, eig = {}, ...kinderen) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(eig)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kinderen.flat()) if (k != null) e.append(k instanceof Node ? k : document.createTextNode(k));
  return e;
}
const schoon = (w) => w.replace(/[.,!?;:]/g, "").toLowerCase();
const hoofdletter = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------
//  Opslag (blijft bewaard in de browser)
// ---------------------------------------------------------------
const OPSLAG_SLEUTEL = "taaltopper-v1";
const standaard = {
  naam: "", sterren: 0, records: {}, medailles: {},
  niveau: 1,
  instellingen: { voorlezen: false, geluid: true, groot: false, verdana: false },
};
let opslag = laad();
function laad() {
  try {
    const o = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL));
    if (o) return { ...standaard, ...o, instellingen: { ...standaard.instellingen, ...(o.instellingen || {}) } };
  } catch (e) { /* niets */ }
  return JSON.parse(JSON.stringify(standaard));
}
function bewaar() {
  try { localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(opslag)); } catch (e) { /* niets */ }
  document.querySelector("#sterren-teller span").textContent = opslag.sterren;
}
function pasInstellingenToe() {
  document.body.classList.toggle("groot", opslag.instellingen.groot);
  document.body.classList.toggle("letters-verdana", opslag.instellingen.verdana);
}

// ---------------------------------------------------------------
//  Voorlezen en geluid
// ---------------------------------------------------------------
const kanVoorlezen = "speechSynthesis" in window;
let nlStem = null;
function zoekStem() {
  if (!kanVoorlezen) return;
  const stemmen = speechSynthesis.getVoices();
  nlStem = stemmen.find((s) => s.lang === "nl-NL") || stemmen.find((s) => s.lang && s.lang.startsWith("nl")) || null;
}
if (kanVoorlezen) { zoekStem(); speechSynthesis.onvoiceschanged = zoekStem; }
function lees(tekst) {
  if (!kanVoorlezen || !tekst) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(tekst.replace(/___/g, "puntje puntje puntje"));
  u.lang = "nl-NL";
  if (nlStem) u.voice = nlStem;
  u.rate = 0.85;
  speechSynthesis.speak(u);
}
function voorleesKnop(tekst) {
  if (!kanVoorlezen) return null;
  return maak("button", { class: "voorlees", "aria-label": "Lees voor", title: "Lees voor", onclick: () => lees(typeof tekst === "function" ? tekst() : tekst) }, "🔊");
}

let audio = null;
function toon(freq, start, duur, type = "sine", vol = 0.15) {
  const t = audio.currentTime + start;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duur);
  o.connect(g).connect(audio.destination);
  o.start(t); o.stop(t + duur);
}
function geluid(soort) {
  if (!opslag.instellingen.geluid) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (soort === "goed") { toon(660, 0, .15); toon(880, .1, .25); }
    else if (soort === "fout") { toon(300, 0, .2, "triangle", .12); }
    else if (soort === "feest") { [523, 659, 784, 1047].forEach((f, i) => toon(f, i * .12, .3, "triangle")); }
    else if (soort === "tik") { toon(500, 0, .05, "sine", .05); }
  } catch (e) { /* geen geluid */ }
}

function confetti(aantal = 70) {
  const doos = document.getElementById("confetti");
  const kleuren = ["#ff8a3d", "#ffc23d", "#2f6fd6", "#2e9a4a", "#8a3fc4", "#d6452f"];
  for (let i = 0; i < aantal; i++) {
    const s = maak("div", { class: "snipper" });
    s.style.left = Math.random() * 100 + "vw";
    s.style.background = kies(kleuren);
    s.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
    s.style.animationDelay = Math.random() * .4 + "s";
    doos.append(s);
    setTimeout(() => s.remove(), 4200);
  }
}

// ---------------------------------------------------------------
//  Rangen (hoe meer sterren, hoe hoger)
// ---------------------------------------------------------------
const RANGEN = [
  { vanaf: 0,    naam: "Taal-starter",       icoon: "🌱" },
  { vanaf: 30,   naam: "Woordwurm",          icoon: "🐛" },
  { vanaf: 80,   naam: "Zinnenspeurder",     icoon: "🔍" },
  { vanaf: 160,  naam: "Werkwoordwizard",    icoon: "🧙" },
  { vanaf: 280,  naam: "Taaltijger",         icoon: "🐯" },
  { vanaf: 450,  naam: "Grammaticaheld",     icoon: "🦸" },
  { vanaf: 700,  naam: "TAALTOPPER",         icoon: "🏆" },
];
function rangVan(sterren) {
  let r = RANGEN[0], volgende = null;
  for (let i = 0; i < RANGEN.length; i++) {
    if (sterren >= RANGEN[i].vanaf) { r = RANGEN[i]; volgende = RANGEN[i + 1] || null; }
  }
  return { r, volgende };
}

// ---------------------------------------------------------------
//  Werkwoord-hulpjes
// ---------------------------------------------------------------
const TIJDEN = {
  tt:  { naam: "tegenwoordige tijd", icoon: "⏩", wanneer: "Het gebeurt nu.",                  label: "nu",                woord: "Vandaag" },
  vt:  { naam: "verleden tijd",      icoon: "⏪", wanneer: "Het is vroeger gebeurd.",          label: "vroeger",           woord: "Gisteren" },
  vtt: { naam: "voltooide tijd",     icoon: "✅", wanneer: "Het is al klaar (voltooid).",      label: "al klaar",          woord: "Vorige week" },
};
function ttVorm(ww, p) {
  if (p.soort === "ik") return ww.stam;
  if (p.soort === "mv") return ww.inf;
  return ww.stam.endsWith("t") ? ww.stam : ww.stam + "t";
}
function vtVorm(ww, p) { return p.soort === "mv" ? ww.vtmv : ww.vt; }
function hulpVorm(ww, p) { return p[ww.hulp]; }
function isZwak(ww) { return ww.vt === ww.stam + "te" || ww.vt === ww.stam + "de"; }
function kofschipLetter(ww) {
  const romp = ww.inf.slice(0, -2);
  return romp.endsWith("ch") ? "ch" : romp.slice(-1);
}
const inKofschip = (l) => ["t", "k", "f", "s", "ch", "p"].includes(l);

// Bouwt een zin in een bepaalde tijd, en geeft ook de persoonsvorm terug
function bouwZin(ww, p, tijd, metTijdwoord = false) {
  const ow = p.ow;
  if (!metTijdwoord) {
    if (tijd === "tt")  return { zin: `${ow} ${ttVorm(ww, p)} ${ww.rest}.`, pv: ttVorm(ww, p), ow };
    if (tijd === "vt")  return { zin: `${ow} ${vtVorm(ww, p)} ${ww.rest}.`, pv: vtVorm(ww, p), ow };
    return { zin: `${ow} ${hulpVorm(ww, p)} ${ww.rest} ${ww.vd}.`, pv: hulpVorm(ww, p), ow };
  }
  // Met tijdwoord vooraan: dan komt de persoonsvorm vóór het onderwerp
  const owKlein = /^(Ik|Jij|Hij|Zij|Wij|De )/.test(ow) ? ow.charAt(0).toLowerCase() + ow.slice(1) : ow;
  const tw = TIJDEN[tijd].woord;
  if (tijd === "tt")  return { zin: `${tw} ${ttVorm(ww, p)} ${owKlein} ${ww.rest}.`, pv: ttVorm(ww, p), ow: owKlein };
  if (tijd === "vt")  return { zin: `${tw} ${vtVorm(ww, p)} ${owKlein} ${ww.rest}.`, pv: vtVorm(ww, p), ow: owKlein };
  return { zin: `${tw} ${hulpVorm(ww, p)} ${owKlein} ${ww.rest} ${ww.vd}.`, pv: hulpVorm(ww, p), ow: owKlein };
}

function uitlegTT(ww, p) {
  if (p.soort === "ik") return `Bij <b>ik</b> schrijf je alleen de stam: ik <b>${ww.stam}</b>.`;
  if (p.soort === "mv") return `Bij meer personen (wij, jullie, zij) schrijf je het hele werkwoord: <b>${ww.inf}</b>.`;
  if (ww.stam.endsWith("t")) return `Stam + t. Maar de stam <b>${ww.stam}</b> eindigt al op een t, dus geen extra t: <b>${ww.stam}</b>.`;
  if (ww.stam.endsWith("d")) return `Stam + t: <b>${ww.stam}</b> + t = <b>${ww.stam}t</b>. De d hoort bij de stam, de t komt erachter!`;
  return `Bij jij/hij/zij schrijf je stam + t: <b>${ww.stam}</b> + t = <b>${ww.stam}t</b>.`;
}
function uitlegVT(ww, p) {
  if (!isZwak(ww)) return `<b>${ww.inf}</b> is een sterk werkwoord: de klank verandert (<b>${vtVorm(ww, p)}</b>). Die moet je gewoon leren.`;
  const l = kofschipLetter(ww), uit = inKofschip(l) ? "te" : "de";
  let s = `Kijk naar de letter vóór <b>-en</b>: ${ww.inf} → <b>${l}</b>. `;
  s += inKofschip(l) ? `Die zit in <span class="kofschip">'t kofschip</span>, dus <b>-${uit}</b>.` : `Die zit niet in <span class="kofschip">'t kofschip</span>, dus <b>-${uit}</b>.`;
  if (p.soort === "mv") s += ` Meer personen? Dan <b>-${uit}n</b>: <b>${ww.vtmv}</b>.`;
  else s += ` Dus: <b>${ww.vt}</b>.`;
  return s;
}
function uitlegVD(ww) {
  if (!ww.vd.endsWith("t") && !ww.vd.endsWith("d")) return `<b>${ww.vd}</b> is een sterk werkwoord: het voltooid deelwoord eindigt op <b>-en</b>.`;
  const l = kofschipLetter(ww);
  return `Zit de letter vóór -en (<b>${l}</b>) in <span class="kofschip">'t kofschip</span>? Dan eindigt het op een <b>t</b>, anders op een <b>d</b>. ` +
    `Tip: maak het woord langer: ${inKofschip(l) ? "ge" + ww.stam + "te" : "ge" + ww.stam + "de"}… → <b>${ww.vd}</b>.`;
}

// Foute (maar logische) spellingvormen om uit te kiezen
function fouteVormen(goed, ww, p, soortVorm) {
  const s = ww.stam, kandidaten = [];
  if (soortVorm === "tt") {
    if (p.soort === "ik") { if (!s.endsWith("t")) kandidaten.push(s + "t"); if (s.endsWith("d")) kandidaten.push(s.slice(0, -1) + "t"); kandidaten.push(ww.inf); }
    else if (p.soort === "mv") { if (!s.endsWith("t")) kandidaten.push(s + "t"); kandidaten.push(s, s + "en"); }
    else {
      kandidaten.push(s);
      if (s.endsWith("d")) kandidaten.push(s.slice(0, -1) + "t");
      else if (s.endsWith("t")) kandidaten.push(s + "t");
      else kandidaten.push(s + "d");
    }
  } else if (soortVorm === "vt") {
    const mv = p.soort === "mv";
    kandidaten.push(s + (mv ? "ten" : "te"), s + (mv ? "den" : "de"), mv ? ww.vt : ww.vtmv);
  } else if (soortVorm === "vd") {
    const v = ww.vd;
    if (v.endsWith("t")) kandidaten.push(v.slice(0, -1) + "d", v + "d");
    else if (v.endsWith("d")) kandidaten.push(v.slice(0, -1) + "t", v + "t");
    else { kandidaten.push("ge" + s + (s.endsWith("t") ? "d" : "t"), v.slice(0, -1)); }
  }
  const reserve = [ww.inf, s + "d", s + "e", s + "t", s + "te"];
  const uit = [];
  for (const k of [...schud(kandidaten), ...reserve]) {
    if (k !== goed && !uit.includes(k) && !/(.)\1\1/.test(k)) uit.push(k);
    if (uit.length === 2) break;
  }
  return uit;
}

// Kies werkwoord + persoon waarbij tegenwoordige en verleden tijd echt verschillen
// (bij "wij zetten" is dat niet zo)
function kiesWwP() {
  for (;;) {
    const ww = kies(WERKWOORDEN), p = kies(PERSONEN);
    if (ttVorm(ww, p) !== vtVorm(ww, p)) return { ww, p };
  }
}

// ---------------------------------------------------------------
//  Woordsoort-zinnen inlezen
// ---------------------------------------------------------------
const ZINNEN_WS = ZINNEN_WOORDSOORT.map((regel) =>
  regel.split(" ").map((stuk) => {
    const m = stuk.match(/^(.+?)\/(\w+)([.,!?]*)$/);
    if (m) return { woord: m[1], soort: m[2], leesteken: m[3] };
    const m2 = stuk.match(/^(.+?)([.,!?]*)$/);
    return { woord: m2[1], soort: "x", leesteken: m2[2] };
  })
);
const zinTekst = (tokens) => tokens.map((t) => t.woord + t.leesteken).join(" ");
const MEERVOUD = {
  zn: "zelfstandige naamwoorden", ww: "werkwoorden", bn: "bijvoeglijke naamwoorden",
  lw: "lidwoorden", vnw: "voornaamwoorden", tw: "telwoorden", vz: "voorzetsels",
};

// ===============================================================
//  DE SPELLETJES
//  Elke vraag heeft: opdracht (tekst), en toon(doos, api)
//  api.fout(hint) -> true als je het nog een keer mag proberen
//  api.klaar(uitleg) -> vraag is af
// ===============================================================

// 1. Woordsoort-detective: welke woordsoort is het gekleurde woord?
function vraagWoordsoort() {
  const soorten = WOORDSOORT_NIVEAUS[opslag.niveau];
  const doelSoort = kies(soorten);
  const kandidaten = [];
  ZINNEN_WS.forEach((z, zi) => z.forEach((t, ti) => { if (t.soort === doelSoort) kandidaten.push([zi, ti]); }));
  const [zi, ti] = kies(kandidaten);
  const tokens = ZINNEN_WS[zi], doel = tokens[ti];
  const opdracht = `Welke woordsoort is het woord "${doel.woord}"?`;
  return {
    opdracht,
    voorlezen: `${opdracht} De zin is: ${zinTekst(tokens)}`,
    toon(doos, api) {
      const zin = maak("div", { class: "zin" });
      tokens.forEach((t, i) => {
        zin.append(maak("span", { class: "w" + (i === ti ? " aangewezen" : "") }, t.woord), t.leesteken, " ");
      });
      doos.append(zin);
      const raster = maak("div", { class: "antwoorden" });
      soorten.forEach((s) => {
        const info = WOORDSOORTEN[s];
        const knop = maak("button", { class: "antwoord", style: `border-left: 10px solid ${info.kleur}` },
          maak("span", { class: "ic" }, info.icoon), info.naam);
        knop.onclick = () => {
          if (s === doelSoort) {
            knop.classList.add("goed");
            raster.querySelectorAll("button").forEach((b) => (b.disabled = true));
            api.klaar(`"${doel.woord}" is een <b>${info.naam}</b>. ${info.tip}`);
          } else {
            knop.classList.add("mis"); knop.disabled = true;
            const nogEens = api.fout(`Een ${info.naam}? ${info.tip} Past dat bij "${doel.woord}"?`);
            if (!nogEens) {
              raster.querySelectorAll("button").forEach((b) => (b.disabled = true));
              [...raster.children][soorten.indexOf(doelSoort)].classList.add("goed");
              api.klaar(`"${doel.woord}" is een <b>${WOORDSOORTEN[doelSoort].naam}</b>. ${WOORDSOORTEN[doelSoort].tip}`);
            }
          }
        };
        raster.append(knop);
      });
      doos.append(raster);
    },
  };
}

// 2. Woordjager: tik alle woorden van één soort aan
function vraagJager() {
  const soorten = WOORDSOORT_NIVEAUS[opslag.niveau];
  const doelSoort = kies(soorten);
  const zinnen = ZINNEN_WS.filter((z) => z.some((t) => t.soort === doelSoort));
  const tokens = kies(zinnen);
  const info = WOORDSOORTEN[doelSoort];
  const opdracht = `Tik alle ${MEERVOUD[doelSoort]} aan. Tik daarna op Klaar.`;
  return {
    opdracht: maak("span", {}, "Tik alle ", maak("b", { style: `color:${info.kleur}` }, `${info.icoon} ${MEERVOUD[doelSoort]}`), " aan. Tik daarna op ", maak("b", {}, "Klaar"), "."),
    voorlezen: `${opdracht} De zin is: ${zinTekst(tokens)}`,
    toon(doos, api) {
      const zin = maak("div", { class: "zin" });
      const knoppen = tokens.map((t) => {
        const k = maak("button", { class: "woordknop" }, t.woord);
        k.onclick = () => { k.classList.toggle("gekozen"); geluid("tik"); };
        zin.append(k, t.leesteken || "", " ");
        return k;
      });
      doos.append(zin);
      const klaarKnop = maak("button", { class: "knop" }, "✔ Klaar");
      doos.append(maak("div", { class: "knoppenrij" }, klaarKnop, maak("span", { class: "inf" }, `Tip: ${info.tip}`)));
      const eindig = (gelukt) => {
        knoppen.forEach((k, i) => {
          k.disabled = true;
          const hoort = tokens[i].soort === doelSoort, gekozen = k.classList.contains("gekozen");
          k.classList.remove("gekozen");
          if (hoort && gekozen) k.classList.add("goed");
          else if (hoort) k.classList.add("vergeten");
          else if (gekozen) k.classList.add("mis");
        });
        klaarKnop.disabled = true;
        const lijst = tokens.filter((t) => t.soort === doelSoort).map((t) => `<b>${t.woord}</b>`).join(", ");
        api.klaar(`De ${MEERVOUD[doelSoort]} in deze zin: ${lijst}.`, gelukt);
      };
      klaarKnop.onclick = () => {
        let goed = 0, teVeel = 0, mist = 0;
        knoppen.forEach((k, i) => {
          const hoort = tokens[i].soort === doelSoort, gekozen = k.classList.contains("gekozen");
          if (hoort && gekozen) goed++; else if (hoort) mist++; else if (gekozen) teVeel++;
        });
        if (mist === 0 && teVeel === 0) return eindig(true);
        let hint = "";
        if (goed) hint += `Je hebt er al ${goed} goed. `;
        if (teVeel) hint += `Er ${teVeel === 1 ? "is 1 woord" : "zijn " + teVeel + " woorden"} gekozen dat er niet bij hoort. `;
        if (mist) hint += `Je mist er nog ${mist}. `;
        hint += info.tip;
        if (!api.fout(hint)) eindig(false);
      };
    },
  };
}

// 3. Tijdmachine: welke tijd is het? Of: zet de zin in een andere tijd.
function vraagTijden() {
  const { ww, p } = kiesWwP();
  const tijd = kies(["tt", "vt", "vtt"]);
  const z = bouwZin(ww, p, tijd);

  if (Math.random() < 0.55) {
    // --- herkennen ---
    const opdracht = "In welke tijd staat deze zin?";
    return {
      opdracht, voorlezen: `${opdracht} ${z.zin}`,
      toon(doos, api) {
        doos.append(maak("div", { class: "zin" }, z.zin));
        const raster = maak("div", { class: "antwoorden" });
        const uitleg = () => {
          if (tijd === "tt") return `<b>${z.pv}</b> is de tegenwoordige tijd: het gebeurt nu. (Vroeger zou het zijn: <i>${vtVorm(ww, p)}</i>.)`;
          if (tijd === "vt") return `<b>${z.pv}</b> is de verleden tijd: het is vroeger gebeurd. (Nu zou het zijn: <i>${ttVorm(ww, p)}</i>.)`;
          return `Voltooide tijd: hulpwerkwoord <b>${z.pv}</b> + voltooid deelwoord <b>${ww.vd}</b>. Het is al klaar!`;
        };
        ["tt", "vt", "vtt"].forEach((t) => {
          const k = maak("button", { class: "antwoord" }, maak("span", { class: "ic" }, TIJDEN[t].icoon), maak("span", {}, hoofdletter(TIJDEN[t].naam), maak("br"), maak("span", { class: "inf" }, TIJDEN[t].wanneer)));
          k.onclick = () => {
            if (t === tijd) {
              k.classList.add("goed"); raster.querySelectorAll("button").forEach((b) => (b.disabled = true));
              api.klaar(uitleg());
            } else {
              k.classList.add("mis"); k.disabled = true;
              const hint = tijd === "vtt" || t === "vtt"
                ? "Kijk goed: staat er een vorm van <b>hebben</b> of <b>zijn</b> én een woord als <b>ge…t</b>, <b>ge…d</b> of <b>ge…en</b>? Dan is het voltooide tijd."
                : "Probeer 'gisteren' of 'nu' voor de zin te zetten. Welke past het best?";
              if (!api.fout(hint)) {
                raster.querySelectorAll("button").forEach((b) => (b.disabled = true));
                [...raster.children][["tt", "vt", "vtt"].indexOf(tijd)].classList.add("goed");
                api.klaar(uitleg());
              }
            }
          };
          raster.append(k);
        });
        doos.append(raster);
      },
    };
  }

  // --- omzetten ---
  const bron = kies(["tt", "vt", "vtt"].filter((t) => t !== tijd));
  const bronZin = bouwZin(ww, p, bron).zin;
  const opdracht = `Zet deze zin in de ${TIJDEN[tijd].naam}.`;
  // foute opties: een spelfout in de goede tijd + de zin in de derde tijd
  const derde = ["tt", "vt", "vtt"].find((t) => t !== tijd && t !== bron);
  let fout1;
  if (tijd === "tt") fout1 = z.zin.replace(new RegExp(`\\b${z.pv}\\b`), fouteVormen(z.pv, ww, p, "tt")[0]);
  else if (tijd === "vt") fout1 = z.zin.replace(new RegExp(`\\b${z.pv}\\b`), fouteVormen(z.pv, ww, p, "vt")[0]);
  else fout1 = z.zin.replace(new RegExp(`\\b${ww.vd}\\b`), fouteVormen(ww.vd, ww, p, "vd")[0]);
  const opties = schud([
    { zin: z.zin, goed: true },
    { zin: fout1, goed: false },
    { zin: bouwZin(ww, p, derde).zin, goed: false },
  ]);
  return {
    opdracht: maak("span", {}, "Zet deze zin in de ", maak("span", { class: `tijdlabel tijd-${tijd}` }, `${TIJDEN[tijd].icoon} ${TIJDEN[tijd].naam}`), "."),
    voorlezen: `${opdracht} ${bronZin}`,
    toon(doos, api) {
      doos.append(maak("div", { class: "zin" }, bronZin));
      const raster = maak("div", { class: "antwoorden" });
      const uitleg = () => {
        if (tijd === "tt") return uitlegTT(ww, p);
        if (tijd === "vt") return uitlegVT(ww, p);
        return `Voltooide tijd = <b>${hulpVorm(ww, p)}</b> + voltooid deelwoord. ${uitlegVD(ww)}`;
      };
      opties.forEach((o) => {
        const k = maak("button", { class: "antwoord lang" }, o.zin);
        k.onclick = () => {
          if (o.goed) { k.classList.add("goed"); raster.querySelectorAll("button").forEach((b) => (b.disabled = true)); api.klaar(uitleg()); }
          else {
            k.classList.add("mis"); k.disabled = true;
            if (!api.fout(`Let goed op: staat de zin in de ${TIJDEN[tijd].naam}? En klopt de spelling van het werkwoord? Lees elk woord rustig.`)) {
              raster.querySelectorAll("button").forEach((b) => (b.disabled = true));
              [...raster.children][opties.findIndex((x) => x.goed)].classList.add("goed");
              api.klaar(uitleg());
            }
          }
        };
        raster.append(k);
      });
      doos.append(raster);
    },
  };
}

// 4. Werkwoord-werkplaats: kies de goed gespelde vorm
function vraagSpelling() {
  const ww = kies(WERKWOORDEN), p = kies(PERSONEN);
  const tijd = kies(["tt", "tt", "vt", "vt", "vtt"]);
  let goed, voor, na, uitleg;
  if (tijd === "tt") {
    goed = ttVorm(ww, p); voor = `${p.ow} `; na = ` ${ww.rest}.`; uitleg = uitlegTT(ww, p);
  } else if (tijd === "vt") {
    goed = vtVorm(ww, p); voor = `Gisteren `; na = ` ${p.ow === "Sanne" ? "Sanne" : p.ow.charAt(0).toLowerCase() + p.ow.slice(1)} ${ww.rest}.`; uitleg = uitlegVT(ww, p);
  } else {
    goed = ww.vd; voor = `${p.ow} ${hulpVorm(ww, p)} ${ww.rest} `; na = "."; uitleg = uitlegVD(ww);
  }
  const opties = schud([goed, ...fouteVormen(goed, ww, p, tijd === "vtt" ? "vd" : tijd)]);
  const opdracht = `Welk woord is goed geschreven? Het werkwoord is ${ww.inf}.`;
  return {
    opdracht: maak("span", {}, "Kies de goede vorm van ", maak("b", {}, ww.inf), ". ", maak("span", { class: `tijdlabel tijd-${tijd}` }, `${TIJDEN[tijd].icoon} ${TIJDEN[tijd].label}`)),
    voorlezen: `${opdracht} ${voor} puntje puntje puntje ${na}`,
    toon(doos, api) {
      const invul = maak("span", { class: "invul" }, "…");
      doos.append(maak("div", { class: "zin" }, voor, invul, na, " ", maak("span", { class: "inf" }, `(${ww.inf})`)));
      const raster = maak("div", { class: "antwoorden" });
      opties.forEach((o) => {
        const k = maak("button", { class: "antwoord" }, o);
        k.onclick = () => {
          if (o === goed) {
            k.classList.add("goed"); invul.textContent = goed;
            raster.querySelectorAll("button").forEach((b) => (b.disabled = true));
            api.klaar(uitleg);
          } else {
            k.classList.add("mis"); k.disabled = true;
            const hint = tijd === "tt" ? `Wie doet het? <b>${p.ow}</b>. Denk aan de regel: ik → stam, jij/hij → stam + t, wij → hele werkwoord.`
              : tijd === "vt" ? `Denk aan <span class="kofschip">'t kofschip</span> (t, k, f, s, ch, p). Is het één persoon of meer?`
              : `Voltooid deelwoord: denk aan <span class="kofschip">'t kofschip</span>. Maak het woord langer om te horen of het een t of d is.`;
            if (!api.fout(hint)) {
              invul.textContent = goed;
              raster.querySelectorAll("button").forEach((b) => (b.disabled = true));
              [...raster.children][opties.indexOf(goed)].classList.add("goed");
              api.klaar(uitleg);
            }
          }
        };
        raster.append(k);
      });
      doos.append(raster);
    },
  };
}

// 5. Zinnen-speurder: eerst de persoonsvorm, dan het onderwerp
function zinVoorPvOw() {
  if (Math.random() < 0.65) return kies(ZINNEN_PV_OW);
  // Soms een zelfgemaakte zin uit de werkwoordenlijst
  const { ww, p } = kiesWwP(), tijd = kies(["tt", "vt", "vtt"]);
  const omgekeerd = Math.random() < 0.5;
  const z = bouwZin(ww, p, tijd, omgekeerd);
  const ander = bouwZin(ww, p, tijd === "vt" ? "tt" : "vt", omgekeerd).zin;
  return { zin: z.zin, pv: z.pv, ow: z.ow, andereTijd: ander };
}
function vraagPvOw() {
  const item = zinVoorPvOw();
  const woorden = item.zin.split(" ");
  const kaal = woorden.map(schoon);
  const pvIndex = kaal.indexOf(item.pv.toLowerCase());
  const owWoorden = item.ow.split(" ").map((w) => w.toLowerCase());
  let owStart = -1;
  for (let i = 0; i <= kaal.length - owWoorden.length; i++) {
    if (i === pvIndex) continue;
    if (owWoorden.every((w, j) => kaal[i + j] === w)) { owStart = i; break; }
  }
  const owIndexen = owWoorden.map((_, j) => owStart + j);
  const opdracht1 = "Stap 1: Tik op de persoonsvorm.";
  return {
    opdracht: maak("span", { class: "stapopdracht" }, maak("span", { class: "label-pv" }, "PV"), " Stap 1: Tik op de ", maak("b", {}, "persoonsvorm"), "."),
    voorlezen: `${opdracht1} ${item.zin}`,
    toon(doos, api) {
      const zin = maak("div", { class: "zin" });
      const knoppen = woorden.map((w) => {
        const m = w.match(/^(.+?)([.,!?]*)$/);
        const k = maak("button", { class: "woordknop" }, m[1]);
        zin.append(k, m[2] || "", " ");
        return k;
      });
      doos.append(zin);
      const extra = maak("div", { class: "knoppenrij" });
      doos.append(extra);
      let stap = 1;

      const naarStap2 = () => {
        stap = 2;
        knoppen[pvIndex].classList.add("pv");
        knoppen[pvIndex].disabled = true;
        knoppen[pvIndex].append(" ", maak("span", { class: "label-pv" }, "PV"));
        const opdr = doos.closest(".kaart").querySelector(".opdracht .tekst");
        opdr.innerHTML = "";
        opdr.append(maak("span", { class: "label-ow" }, "OW"), " Stap 2: Tik op ", maak("b", {}, "alle woorden"), " van het ", maak("b", {}, "onderwerp"), ". Tik daarna op Klaar.");
        api.zetVoorlezen(`Stap 2: Tik op alle woorden van het onderwerp. Vraag: wie of wat ${item.pv.toLowerCase()}? ${item.zin}`);
        const klaar = maak("button", { class: "knop" }, "✔ Klaar");
        extra.append(klaar, maak("span", { class: "inf" }, `Vraag: Wie of wat ${item.pv.toLowerCase()} …?`));
        klaar.onclick = () => {
          const gekozen = knoppen.map((k, i) => k.classList.contains("gekozen") ? i : -1).filter((i) => i >= 0);
          const klopt = gekozen.length === owIndexen.length && owIndexen.every((i) => gekozen.includes(i));
          if (klopt) return eindig();
          let hint = `Stel de vraag: <b>Wie of wat ${item.pv.toLowerCase()}…?</b> Het antwoord is het onderwerp. `;
          const deels = gekozen.filter((i) => owIndexen.includes(i)).length;
          if (deels > 0 && deels < owIndexen.length) hint += "Je bent op de goede weg, maar het onderwerp heeft meer woorden!";
          else if (gekozen.length > owIndexen.length) hint += "Je hebt te veel woorden gekozen.";
          if (!api.fout(hint)) {
            knoppen.forEach((k, i) => { k.classList.remove("gekozen"); if (owIndexen.includes(i)) k.classList.add("ow"); });
            eindig(true);
          }
        };
      };
      const eindig = () => {
        knoppen.forEach((k, i) => {
          k.disabled = true;
          if (owIndexen.includes(i)) { k.classList.remove("gekozen"); k.classList.add("ow"); }
          else if (k.classList.contains("gekozen")) { k.classList.remove("gekozen"); }
        });
        extra.innerHTML = "";
        const owTekst = owIndexen.map((i) => woorden[i].replace(/[.,!?]/g, "")).join(" ");
        api.klaar(`Persoonsvorm: <b>${item.pv}</b>. Onderwerp: <b>${owTekst}</b>. ` +
          `(Wie of wat ${item.pv.toLowerCase()}? → ${owTekst}.)`);
      };

      knoppen.forEach((k, i) => {
        k.onclick = () => {
          if (stap === 1) {
            if (i === pvIndex) {
              geluid("goed");
              api.tussendoor(`Goed! <b>${item.pv}</b> is de persoonsvorm. Nu het onderwerp!`);
              naarStap2();
            } else {
              k.classList.add("mis"); setTimeout(() => k.classList.remove("mis"), 900);
              const ok = api.fout(`Tip: zet de zin in een andere tijd: <i>"${item.andereTijd}"</i>. Welk woord verandert? Dat is de persoonsvorm.`, true);
              if (!ok) { api.tussendoor(`De persoonsvorm is <b>${item.pv}</b>. Kijk maar: in een andere tijd verandert dit woord. Nu het onderwerp!`); naarStap2(); }
            }
          } else {
            k.classList.toggle("gekozen"); geluid("tik");
          }
        };
      });
    },
  };
}

// ---------------------------------------------------------------
//  Lijst met spelletjes
// ---------------------------------------------------------------
const SPELLEN = {
  woordsoort: { naam: "Woordsoort-detective", icoon: "🔎", maakVraag: vraagWoordsoort,
    uitleg: "Welke woordsoort is het gekleurde woord?", onderwerp: "Woordsoorten" },
  jager:      { naam: "Woordjager", icoon: "🎯", maakVraag: vraagJager,
    uitleg: "Vang alle woorden van één soort in de zin.", onderwerp: "Woordsoorten" },
  tijden:     { naam: "Tijdmachine", icoon: "⏰", maakVraag: vraagTijden,
    uitleg: "Nu, vroeger of al klaar? Herken en verander de tijd.", onderwerp: "Tijden" },
  spelling:   { naam: "Werkwoord-werkplaats", icoon: "🔧", maakVraag: vraagSpelling,
    uitleg: "Kies de goed gespelde vorm: stam + t, 't kofschip…", onderwerp: "Tijden" },
  pvow:       { naam: "Zinnen-speurder", icoon: "🕵️", maakVraag: vraagPvOw,
    uitleg: "Vind de persoonsvorm en het onderwerp.", onderwerp: "Persoonsvorm & onderwerp" },
  toets:      { naam: "Toppertoets", icoon: "🏆", maakVraag: () => SPELLEN[kies(["woordsoort", "jager", "tijden", "spelling", "pvow"])].maakVraag(),
    uitleg: "Alles door elkaar. Ben jij een echte taaltopper?", onderwerp: "Alles", speciaal: true },
};
const VRAGEN_PER_RONDE = 10;

// ---------------------------------------------------------------
//  Schermen
// ---------------------------------------------------------------
function zetTitel(t, metHome) {
  document.getElementById("titel").textContent = t;
  document.getElementById("knop-home").hidden = !metHome;
}
function leeg() { $app.innerHTML = ""; window.scrollTo(0, 0); if (kanVoorlezen) speechSynthesis.cancel(); }

function startScherm() {
  leeg(); zetTitel("Taaltopper", false);
  if (!opslag.naam) return naamScherm();
  const { r, volgende } = rangVan(opslag.sterren);
  const pct = volgende ? Math.round(((opslag.sterren - r.vanaf) / (volgende.vanaf - r.vanaf)) * 100) : 100;

  $app.append(maak("div", { class: "kaart welkom" },
    maak("div", { class: "titelgroot" }, `Hoi ${opslag.naam}! 👋`),
    maak("div", { class: "rang" }, `${r.icoon} ${r.naam}`),
    maak("div", { class: "voortgang-balk" }, (() => { const d = maak("div"); d.style.width = pct + "%"; return d; })()),
    maak("p", { class: "inf" }, volgende ? `Nog ${volgende.vanaf - opslag.sterren} ⭐ tot ${volgende.icoon} ${volgende.naam}` : "Je bent een echte TAALTOPPER! 🎉"),
  ));

  // niveau voor woordsoorten
  const niveauNamen = { 1: "Niveau 1: zelfst. nw., werkwoord, bijv. nw.", 2: "Niveau 2: + lidwoord, voornaamwoord", 3: "Niveau 3: + telwoord, voorzetsel" };
  const niveauDoos = maak("div", { class: "niveau-keuze" }, maak("span", {}, "Woordsoorten:"));
  [1, 2, 3].forEach((n) => {
    const b = maak("button", { class: opslag.niveau === n ? "actief" : "", title: niveauNamen[n] }, `${"⭐".repeat(n)}`);
    b.onclick = () => { opslag.niveau = n; bewaar(); startScherm(); };
    niveauDoos.append(b);
  });
  $app.append(maak("div", { class: "kaart" }, niveauDoos, maak("p", { class: "inf", style: "text-align:center" }, niveauNamen[opslag.niveau])));

  const tegels = maak("div", { class: "tegels" });
  for (const [sleutel, s] of Object.entries(SPELLEN)) {
    const rec = opslag.records[sleutel];
    const med = opslag.medailles[sleutel];
    tegels.append(maak("button", { class: "tegel" + (s.speciaal ? " speciaal" : ""), onclick: () => startRonde(sleutel) },
      maak("div", { class: "groot-icoon" }, s.icoon),
      maak("div", { class: "naam" }, s.naam),
      maak("div", { class: "uitleg" }, s.uitleg),
      maak("div", { class: "record" }, rec != null ? `Record: ${rec} / ${VRAGEN_PER_RONDE * 2} ⭐ ${med ? " " + med : ""}` : "Nog niet gespeeld"),
    ));
  }
  tegels.append(maak("button", { class: "tegel", onclick: spiekScherm },
    maak("div", { class: "groot-icoon" }, "📖"),
    maak("div", { class: "naam" }, "Spiekbriefje"),
    maak("div", { class: "uitleg" }, "Alle regels en trucjes op een rij."),
    maak("div", { class: "record" }, "Lees het rustig door"),
  ));
  $app.append(tegels);
}

function naamScherm() {
  leeg(); zetTitel("Taaltopper", false);
  const invoer = maak("input", { type: "text", placeholder: "Typ je naam", maxlength: "20", "aria-label": "Je naam" });
  const verder = () => { const n = invoer.value.trim(); if (!n) return invoer.focus(); opslag.naam = n; bewaar(); startScherm(); };
  invoer.addEventListener("keydown", (e) => { if (e.key === "Enter") verder(); });
  $app.append(maak("div", { class: "kaart welkom" },
    maak("div", { class: "titelgroot" }, "Welkom bij Taaltopper! 🏆"),
    maak("p", {}, "Met deze spelletjes word jij een topper in woordsoorten, tijden, persoonsvorm en onderwerp."),
    maak("p", {}, "Hoe heet jij?"),
    invoer,
    maak("div", { class: "knoppenrij", style: "justify-content:center" }, maak("button", { class: "knop groot", onclick: verder }, "Start ➜")),
  ));
  invoer.focus();
}

// ---------- Een ronde spelen ----------
function startRonde(sleutel) {
  const spel = SPELLEN[sleutel];
  const ronde = { sleutel, nr: 0, scores: [], reeks: 0 };
  zetTitel(`${spel.icoon} ${spel.naam}`, true);
  volgendeVraag(ronde);
}

function volgendeVraag(ronde) {
  leeg();
  const spel = SPELLEN[ronde.sleutel];
  if (ronde.nr >= VRAGEN_PER_RONDE) return eindScherm(ronde);

  const vraag = spel.maakVraag();
  let fouten = 0, stapFouten = 0, onthuld = false, voorleesTekst = vraag.voorlezen;

  // kop met voortgang
  const stippen = maak("div", { class: "stippen" });
  for (let i = 0; i < VRAGEN_PER_RONDE; i++) {
    const cls = i < ronde.nr ? "stip s" + ronde.scores[i] : i === ronde.nr ? "stip nu" : "stip";
    stippen.append(maak("div", { class: cls }));
  }
  const kop = maak("div", { class: "spelkop" }, stippen,
    ronde.reeks >= 2 ? maak("span", { class: "reeks" }, `🔥 ${ronde.reeks} op rij`) : null);

  const tekst = maak("div", { class: "tekst" }, vraag.opdracht);
  const opdracht = maak("div", { class: "opdracht" }, tekst, voorleesKnop(() => voorleesTekst));
  const doos = maak("div", { class: "vraagdoos" });
  const terug = maak("div", { class: "terugkoppeling", role: "status", "aria-live": "polite" });
  const kaart = maak("div", { class: "kaart" }, opdracht, doos, terug);
  $app.append(kop, kaart);

  function melding(soort, kopTekst, html, metVerder) {
    terug.className = "terugkoppeling zichtbaar " + soort;
    terug.innerHTML = "";
    terug.append(maak("div", { class: "kop" }, kopTekst), maak("div", { html }));
    if (metVerder) {
      const v = maak("button", { class: "knop verder" }, ronde.nr + 1 >= VRAGEN_PER_RONDE ? "Bekijk je score 🏁" : "Volgende ➜");
      v.onclick = () => { ronde.nr++; volgendeVraag(ronde); };
      terug.append(maak("div", { class: "knoppenrij" }, v, voorleesKnop(() => terug.innerText.replace(/Volgende ➜|Bekijk je score 🏁|🔊/g, ""))));
      setTimeout(() => terug.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      v.focus({ preventScroll: true });
    }
    if (opslag.instellingen.voorlezen) lees(terug.innerText.replace(/Volgende ➜|Bekijk je score 🏁|🔊/g, ""));
  }

  const api = {
    // geeft true terug als het kind het nog eens mag proberen
    fout(hint, stapIsApart = false) {
      fouten++; stapFouten++;
      geluid("fout");
      ronde.reeks = 0;
      if (stapFouten >= 2) { onthuld = true; stapFouten = 0; return false; }
      melding("tip", kies(["Bijna! Probeer het nog een keer. 💪", "Oei, net niet. Nog een kans! 🍀", "Goed geprobeerd! Kijk nog eens. 🔍"]), "💡 " + hint, false);
      return true;
    },
    tussendoor(html) { stapFouten = 0; melding("goed", "👍", html, false); },
    zetVoorlezen(t) { voorleesTekst = t; if (opslag.instellingen.voorlezen) lees(t); },
    klaar(uitleg, gelukt = true) {
      const sterren = onthuld || !gelukt ? 0 : fouten === 0 ? 2 : 1;
      ronde.scores.push(sterren);
      opslag.sterren += sterren; bewaar();
      if (sterren > 0) {
        ronde.reeks++;
        geluid("goed");
        const kopTekst = sterren === 2
          ? kies(["Super! ⭐⭐", "Top gedaan! ⭐⭐", "Yes, helemaal goed! ⭐⭐", "Knap hoor! ⭐⭐", "Wauw! ⭐⭐"])
          : kies(["Goed zo, gelukt! ⭐", "Het is je gelukt! ⭐", "Mooi doorgezet! ⭐"]);
        melding("goed", kopTekst, uitleg, true);
        if (ronde.reeks > 0 && ronde.reeks % 5 === 0) { confetti(50); geluid("feest"); }
      } else {
        melding("fout", "Zo zit het: 📘", uitleg + "<br>Volgende keer weet je het! 🌟", true);
      }
    },
  };

  vraag.toon(doos, api);
  if (opslag.instellingen.voorlezen) lees(voorleesTekst);
}

function eindScherm(ronde) {
  leeg();
  const spel = SPELLEN[ronde.sleutel];
  const totaal = ronde.scores.reduce((a, b) => a + b, 0), max = VRAGEN_PER_RONDE * 2;
  const vorigRecord = opslag.records[ronde.sleutel];
  const nieuwRecord = vorigRecord == null || totaal > vorigRecord;
  if (nieuwRecord) opslag.records[ronde.sleutel] = totaal;
  let medaille = null;
  if (totaal >= 19) medaille = "🥇"; else if (totaal >= 15) medaille = "🥈"; else if (totaal >= 10) medaille = "🥉";
  const volgorde = ["🥉", "🥈", "🥇"];
  if (medaille && volgorde.indexOf(medaille) > volgorde.indexOf(opslag.medailles[ronde.sleutel] || "")) opslag.medailles[ronde.sleutel] = medaille;
  // bonus voor een hele ronde
  const bonus = totaal >= 15 ? 5 : 2;
  opslag.sterren += bonus;
  bewaar();

  const zinnen = totaal === max ? "PERFECT! Alles in één keer goed! Jij bent een TAALTOPPER! 🏆"
    : totaal >= 15 ? "Wat goed! Je bent echt een topper! 🌟"
    : totaal >= 10 ? "Goed bezig! Nog een keer, dan word je nóg beter! 💪"
    : "Knap dat je hebt doorgezet! Lees het spiekbriefje en probeer het nog een keer. 📖";
  if (totaal >= 15) { confetti(110); geluid("feest"); }

  const goed = ronde.scores.filter((s) => s > 0).length;
  $app.append(maak("div", { class: "kaart einde" },
    maak("h1", {}, `${spel.icoon} ${spel.naam}`),
    maak("div", { class: "grote-sterren badge-pop" }, medaille || "⭐"),
    maak("h2", {}, `${totaal} van de ${max} sterren`),
    maak("p", {}, `${goed} van de ${VRAGEN_PER_RONDE} vragen goed.`),
    maak("p", {}, zinnen),
    nieuwRecord && vorigRecord != null ? maak("p", {}, maak("b", {}, "🎉 Nieuw record!")) : null,
    maak("p", { class: "inf" }, `+${bonus} bonussterren voor het uitspelen van de ronde`),
    maak("div", { class: "knoppenrij", style: "justify-content:center" },
      maak("button", { class: "knop groot", onclick: () => startRonde(ronde.sleutel) }, "🔁 Nog een keer"),
      maak("button", { class: "knop secundair groot", onclick: startScherm }, "🏠 Ander spel")),
  ));
}

// ---------- Spiekbriefje ----------
function spiekScherm() {
  leeg(); zetTitel("📖 Spiekbriefje", true);
  const s = maak("div", { class: "spiek" });
  const ws = Object.entries(WOORDSOORTEN).map(([k, w]) =>
    `<div class="soort" style="border-color:${w.kleur}"><b>${w.icoon} ${hoofdletter(w.naam)}</b><br>${w.tip}</div>`).join("");
  s.innerHTML = `
  <div class="kaart">
    <h2>🔎 Woordsoorten</h2>
    ${ws}
    <p><b>Zelfstandig naamwoord – trucje:</b> kun je er <span class="vb">de</span>, <span class="vb">het</span> of <span class="vb">een</span> voor zetten? → <span class="vb">de fiets</span>, <span class="vb">een boek</span></p>
    <p><b>Werkwoord – trucje:</b> kun je er <span class="vb">ik</span>, <span class="vb">jij</span> of <span class="vb">wij</span> voor zetten? → <span class="vb">ik fiets</span>, <span class="vb">wij lezen</span></p>
    <p><b>Bijvoeglijk naamwoord – trucje:</b> past het tussen <span class="vb">de</span> en een zelfstandig naamwoord? → <span class="vb">de <b>blauwe</b> fiets</span></p>
  </div>
  <div class="kaart">
    <h2>⏰ De tijden</h2>
    <table>
      <tr><th></th><th>Wanneer?</th><th>Voorbeeld</th></tr>
      <tr><td>⏩ Tegenwoordige tijd</td><td>nu</td><td>Ik <b>fiets</b>. Hij <b>fietst</b>.</td></tr>
      <tr><td>⏪ Verleden tijd</td><td>vroeger</td><td>Ik <b>fietste</b>. Wij <b>fietsten</b>.</td></tr>
      <tr><td>✅ Voltooide tijd</td><td>al klaar</td><td>Ik <b>ben</b> naar school <b>gefietst</b>.<br>Ik <b>heb</b> een tekening <b>gemaakt</b>.</td></tr>
    </table>
    <p><b>Voltooide tijd</b> herken je aan: een vorm van <b>hebben</b> of <b>zijn</b> + een <b>voltooid deelwoord</b> (meestal met <b>ge-</b>: gemaakt, gespeeld, gelopen).</p>
  </div>
  <div class="kaart">
    <h2>🔧 Werkwoorden spellen</h2>
    <p><b>Tegenwoordige tijd</b></p>
    <table>
      <tr><td>ik</td><td>stam</td><td>ik <b>werk</b>, ik <b>vind</b>, ik <b>word</b></td></tr>
      <tr><td>jij / hij / zij</td><td>stam + t</td><td>hij <b>werkt</b>, hij <b>vindt</b>, hij <b>wordt</b></td></tr>
      <tr><td>wij / jullie / zij</td><td>hele werkwoord</td><td>wij <b>werken</b></td></tr>
    </table>
    <p>⚠️ Staat <b>jij</b> achter het werkwoord? Dan géén t: <span class="vb">Werk jij?</span> <span class="vb">Word jij?</span></p>
    <p><b>Verleden tijd (zwakke werkwoorden)</b>: kijk naar de letter vóór <b>-en</b>. Zit die in <span class="kofschip">'t kofschip</span> (t, k, f, s, ch, p)?</p>
    <p>➜ Ja: <b>-te / -ten</b> (werkte, fietsten) &nbsp; ➜ Nee: <b>-de / -den</b> (speelde, verfden)</p>
    <p>⚠️ Let op: <b>verven</b> → de letter is een <b>v</b> (niet de f), dus <span class="vb">verfde</span>. <b>Verhuizen</b> → <b>z</b>, dus <span class="vb">verhuisde</span>.</p>
    <p><b>Sterke werkwoorden</b> veranderen van klank: lopen → <b>liep</b>, eten → <b>at</b>, lezen → <b>las</b>. Die leer je uit je hoofd.</p>
    <p><b>Voltooid deelwoord</b>: ge + stam + t of d (ook met <span class="kofschip">'t kofschip</span>). Twijfel je? Maak het woord langer: <span class="vb">de gefietste route</span> → t, <span class="vb">de gespeelde wedstrijd</span> → d.</p>
  </div>
  <div class="kaart">
    <h2>🕵️ Persoonsvorm en onderwerp</h2>
    <p><span class="label-pv">PV</span> <b>Persoonsvorm</b> – drie trucjes:</p>
    <p>1. <b>Tijdproef:</b> zet de zin in een andere tijd. Het woord dat verandert is de persoonsvorm. <span class="vb">Ik <b>loop</b> → Ik <b>liep</b></span></p>
    <p>2. <b>Vraagproef:</b> maak er een ja/nee-vraag van. Het woord dat vooraan komt is de persoonsvorm. <span class="vb"><b>Loop</b> ik naar huis?</span></p>
    <p>3. Er is altijd maar <b>één</b> persoonsvorm in een zin.</p>
    <p><span class="label-ow">OW</span> <b>Onderwerp</b>: vraag <b>"Wie of wat + persoonsvorm?"</b></p>
    <p><span class="vb">De grote hond <b>blaft</b>.</span> → Wie of wat blaft? → <b>De grote hond</b> (dat zijn 3 woorden!)</p>
    <p>Het onderwerp staat altijd vlak vóór of vlak ná de persoonsvorm.</p>
  </div>`;
  $app.append(s);
}

// ---------- Instellingen ----------
function instellingenScherm() {
  leeg(); zetTitel("⚙️ Instellingen", true);
  const rij = (tekst, sleutel, uitleg) => {
    const k = maak("button", { class: "schakel" + (opslag.instellingen[sleutel] ? " aan" : ""), role: "switch", "aria-checked": String(!!opslag.instellingen[sleutel]), "aria-label": tekst });
    k.onclick = () => {
      opslag.instellingen[sleutel] = !opslag.instellingen[sleutel];
      k.classList.toggle("aan"); k.setAttribute("aria-checked", String(opslag.instellingen[sleutel]));
      bewaar(); pasInstellingenToe();
    };
    return maak("div", { class: "instelling" }, maak("div", {}, maak("b", {}, tekst), uitleg ? maak("div", { class: "inf" }, uitleg) : null), k);
  };
  const naam = maak("input", { type: "text", value: opslag.naam, maxlength: "20", "aria-label": "Naam" });
  naam.addEventListener("change", () => { if (naam.value.trim()) { opslag.naam = naam.value.trim(); bewaar(); } });
  $app.append(maak("div", { class: "kaart" },
    maak("div", { class: "instelling" }, maak("b", {}, "Naam"), naam),
    kanVoorlezen ? rij("Automatisch voorlezen", "voorlezen", "Elke opdracht en uitleg wordt hardop voorgelezen. Op de 🔊-knop drukken kan altijd.") : maak("p", { class: "inf" }, "Voorlezen werkt niet in deze browser."),
    rij("Geluidjes", "geluid"),
    rij("Extra grote letters", "groot"),
    rij("Ander lettertype (Verdana)", "verdana", "Kies het lettertype dat het prettigst leest."),
    maak("div", { class: "knoppenrij" },
      maak("button", { class: "knop", onclick: startScherm }, "✔ Klaar"),
      (() => {
        // Eerst één keer tikken, daarna bevestigen (geen pop-up nodig)
        const k = maak("button", { class: "knop secundair" }, "🗑️ Alles wissen");
        let zeker = false;
        k.onclick = () => {
          if (!zeker) { zeker = true; k.textContent = "⚠️ Echt alles wissen? Tik nog een keer"; return; }
          opslag = JSON.parse(JSON.stringify(standaard)); bewaar(); pasInstellingenToe(); startScherm();
        };
        return k;
      })()),
  ));
}

// ---------------------------------------------------------------
//  Start!
// ---------------------------------------------------------------
document.getElementById("knop-home").onclick = startScherm;
document.getElementById("knop-instellingen").onclick = instellingenScherm;
pasInstellingenToe();
bewaar();
startScherm();
