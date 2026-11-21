#!/usr/bin/env python3
"""Prijswachter: haalt prijzen op bij webshops, bewaart de geschiedenis en
maakt het overzicht prijswachter.html.

Gebruik:
  python3 prijswachter/check_prijzen.py                 # prijzen ophalen + pagina maken
  python3 prijswachter/check_prijzen.py --alleen-html   # alleen de pagina opnieuw maken
  python3 prijswachter/check_prijzen.py --melding pad.md  # schrijf een melding bij prijsdaling

Alleen de standaardbibliotheek van Python is nodig.
"""
import argparse
import gzip
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from datetime import datetime, timezone, timedelta
from pathlib import Path

MAP = Path(__file__).resolve().parent
CONFIG = MAP / "producten.json"
GESCHIEDENIS = MAP / "geschiedenis.json"
PAGINA = MAP.parent / "prijswachter.html"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.6",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
}

NL_TIJD = timezone(timedelta(hours=1))  # november/december = wintertijd


# ---------------------------------------------------------------- ophalen ---

def haal_op(url, pogingen=2):
    laatste_fout = None
    for poging in range(pogingen):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                enc = (resp.headers.get("Content-Encoding") or "").lower()
                if enc == "gzip":
                    data = gzip.decompress(data)
                elif enc == "deflate":
                    data = zlib.decompress(data)
                charset = resp.headers.get_content_charset() or "utf-8"
                return data.decode(charset, errors="replace")
        except urllib.error.HTTPError as e:
            laatste_fout = f"webshop weigert automatische check (HTTP {e.code})"
            if e.code in (403, 404, 410):
                break
        except Exception as e:  # timeouts, DNS, ...
            laatste_fout = f"niet bereikbaar ({type(e).__name__})"
        time.sleep(3 + poging * 5)
    raise RuntimeError(laatste_fout or "onbekende fout")


# ------------------------------------------------------------ uitlezen ---

def naar_getal(waarde):
    """'509,00', '€ 1.299,-', 509, '509.00' -> float"""
    if waarde is None:
        return None
    if isinstance(waarde, (int, float)):
        return float(waarde)
    s = str(waarde).strip().replace("€", "").replace("EUR", "").replace(" ", "")
    s = s.replace(",-", "").replace(".-", "")
    if not s:
        return None
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):   # 1.299,00
            s = s.replace(".", "").replace(",", ".")
        else:                             # 1,299.00
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(?:\.\d{3})+", s):  # 1.299 = duizendtal
        s = s.replace(".", "")
    m = re.search(r"\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else None


def _laatste_deel(waarde):
    if isinstance(waarde, dict):
        waarde = waarde.get("@id") or waarde.get("name") or ""
    return str(waarde or "").rstrip("/").split("/")[-1]


def _zoek_offers(obj, gevonden):
    if isinstance(obj, list):
        for o in obj:
            _zoek_offers(o, gevonden)
        return
    if not isinstance(obj, dict):
        return
    typ = obj.get("@type")
    typen = typ if isinstance(typ, list) else [typ]
    if any(t in ("Offer", "AggregateOffer") for t in typen):
        prijs = obj.get("price")
        if prijs in (None, "") and isinstance(obj.get("priceSpecification"), (dict, list)):
            spec = obj["priceSpecification"]
            spec = spec[0] if isinstance(spec, list) and spec else spec
            prijs = spec.get("price") if isinstance(spec, dict) else None
        if prijs in (None, ""):
            prijs = obj.get("lowPrice")
        verkoper = obj.get("seller")
        if isinstance(verkoper, dict):
            verkoper = verkoper.get("name")
        gevonden.append({
            "prijs": naar_getal(prijs),
            "voorraad": _laatste_deel(obj.get("availability")),
            "conditie": _laatste_deel(obj.get("itemCondition")),
            "verkoper": str(verkoper) if verkoper else "",
        })
    for k, v in obj.items():
        if k != "@context":
            _zoek_offers(v, gevonden)


# ------------------------------------------- zoeken bij bol en Amazon ---
# Voor deze winkels zoekt het script zelf de productpagina op. Het eerste
# zoekresultaat waarvan de naam alle 'moet'-woorden bevat en geen enkel
# 'niet'-woord (hoesjes, 5G-versie, refurbished, ...) wordt gebruikt.

ZOEKERS = {
    "bol": {
        "zoek": "https://www.bol.com/nl/nl/s/?searchtext={q}",
        "link": r'href="(?:https://www\.bol\.com)?(/nl/nl/p/([^/"?]+)/(\d+))',
        "url": lambda m: f"https://www.bol.com{m.group(1)}/",
    },
    "amazon": {
        "zoek": "https://www.amazon.nl/s?k={q}",
        "link": r'href="(?:https://www\.amazon\.nl)?/([^/"?]+)/dp/([A-Z0-9]{10})',
        "url": lambda m: f"https://www.amazon.nl/dp/{m.group(2)}",
    },
}


def zoeker(winkel):
    return ZOEKERS.get(winkel.split()[0].lower().replace(".nl", "").replace(".com", ""))


def zoek_url(aanbod):
    z = zoeker(aanbod["winkel"])
    return z["zoek"].format(q=urllib.parse.quote_plus(aanbod["zoek"])) if z else None


def past_bij(naam, moet, niet):
    woorden = re.findall(r"[a-z0-9]+", urllib.parse.unquote(naam).lower())
    for eis in moet:  # "a16|2025" = een van beide
        if not any(w.startswith(alt) for alt in eis.lower().split("|") for w in woorden):
            return False
    return not any(w in [x.lower() for x in niet] for w in woorden)


def zoek_product(aanbod):
    z = zoeker(aanbod["winkel"])
    pagina = haal_op(zoek_url(aanbod))
    controleer_blokkade(pagina)
    gezien = set()
    for m in re.finditer(z["link"], pagina):
        url = z["url"](m)
        naam = m.group(2) if "bol" in url else m.group(1)
        if url in gezien:
            continue
        gezien.add(url)
        if past_bij(naam, aanbod.get("moet", []), aanbod.get("niet", [])):
            return url
    raise RuntimeError("product niet gevonden in de zoekresultaten")


def controleer_blokkade(pagina):
    if ("validateCaptcha" in pagina or "Typ de tekens die je hieronder ziet" in pagina
            or "Enter the characters you see below" in pagina):
        raise RuntimeError("webshop toont een robot-check (captcha)")


def extra_kandidaten(pagina):
    """Amazon gebruikt geen JSON-LD: lees de 'te betalen' prijs."""
    uit = []
    for m in re.findall(r'priceToPay[^>]*>\s*<span class="a-offscreen">([^<]+)<', pagina):
        uit.append(m)
    if not uit:
        m = re.search(r'id="corePrice(?:Display_desktop)?_feature_div".{0,3000}?class="a-offscreen">([^<]+)<',
                      pagina, flags=re.S)
        if m:
            uit.append(m.group(1))
    if not uit:
        uit += re.findall(r'"priceAmount"\s*:\s*([0-9.]+)', pagina)[:1]
    return [{"prijs": naar_getal(x), "voorraad": "", "conditie": "", "verkoper": ""} for x in uit]


def verkoper_uit_pagina(pagina):
    m = re.search(r'id="sellerProfileTriggerId"[^>]*>\s*([^<]+?)\s*<', pagina)
    if m:
        return html.unescape(m.group(1))
    if re.search(r'(?:verkocht door|sold by)\s*(?:<[^>]+>\s*)*Amazon', pagina, flags=re.I):
        return "Amazon"
    m = re.search(r'Verkoop door\s*(?:<[^>]+>\s*)*([^<]{2,60}?)\s*<', pagina)
    if m:
        return html.unescape(m.group(1)).strip()
    return ""


def lees_prijs(pagina, min_prijs, max_prijs):
    """Zoek de prijs in de pagina. Eerst gestructureerde data (JSON-LD,
    gebruikt door bijna alle grote webshops), daarna meta-tags."""
    kandidaten = []
    for blok in re.findall(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            pagina, flags=re.S | re.I):
        try:
            _zoek_offers(json.loads(blok.strip()), kandidaten)
        except Exception:
            continue

    meta_patronen = [
        r'itemprop=["\']price["\'][^>]*content=["\']([^"\']+)',
        r'content=["\']([^"\']+)["\'][^>]*itemprop=["\']price["\']',
        r'property=["\'](?:product|og):price:amount["\'][^>]*content=["\']([^"\']+)',
        r'content=["\']([^"\']+)["\'][^>]*property=["\'](?:product|og):price:amount["\']',
    ]
    for patroon in meta_patronen:
        for m in re.findall(patroon, pagina, flags=re.I):
            kandidaten.append({"prijs": naar_getal(m), "voorraad": "", "conditie": "", "verkoper": ""})

    if not any(k["prijs"] for k in kandidaten):
        kandidaten += extra_kandidaten(pagina)
    verkoper = verkoper_uit_pagina(pagina)
    for k in kandidaten:
        if not k["verkoper"] and verkoper:
            k["verkoper"] = verkoper

    geldig = [k for k in kandidaten
              if k["prijs"] is not None and min_prijs <= k["prijs"] <= max_prijs]
    if not geldig:
        raise RuntimeError("geen prijs gevonden op de pagina")
    # Liefst een nieuw exemplaar dat op voorraad is.
    nieuw = [k for k in geldig if not k["conditie"] or "New" in k["conditie"]] or geldig
    op_voorraad = [k for k in nieuw if "OutOfStock" not in k["voorraad"]
                   and "SoldOut" not in k["voorraad"]] or nieuw
    return min(op_voorraad, key=lambda k: k["prijs"])


# ------------------------------------------------------------ hulpjes ---

def link(aanbod, gesch, k):
    return aanbod.get("url") or gesch.get("gevonden_urls", {}).get(k) or zoek_url(aanbod) or "#"


def sleutel(product, aanbod):
    return f'{product["id"]}|{aanbod["winkel"]}|{aanbod.get("variant", "")}'


def waarschuwingen(meting, winkel):
    w = []
    if not meting or "prijs" not in meting:
        return w
    if meting.get("conditie") and "New" not in meting["conditie"]:
        w.append("niet nieuw (refurbished/tweedehands)")
    if "OutOfStock" in meting.get("voorraad", "") or "SoldOut" in meting.get("voorraad", ""):
        w.append("uitverkocht")
    verkoper = meting.get("verkoper", "")
    eerste_woord = winkel.split()[0].lower()
    if verkoper and eerste_woord not in verkoper.lower().replace(" ", ""):
        w.append(f"verkoper: {verkoper} (partner, niet {winkel} zelf)")
    return w


def is_bruikbaar(meting, winkel):
    """Telt mee voor 'laagste prijs' en meldingen?"""
    if not meting or "prijs" not in meting:
        return False
    return not any(x.startswith(("niet nieuw", "uitverkocht"))
                   for x in waarschuwingen(meting, winkel))


def laatste_geslaagde(lijst):
    for m in reversed(lijst or []):
        if "prijs" in m:
            return m
    return None


def euro(x):
    if x is None:
        return "–"
    s = f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return "€ " + (s[:-3] + ",-" if s.endswith(",00") else s)


def nl_tijd(iso):
    try:
        t = datetime.fromisoformat(iso).astimezone(NL_TIJD)
    except Exception:
        return iso
    dagen = ["ma", "di", "wo", "do", "vr", "za", "zo"]
    return f"{dagen[t.weekday()]} {t.day}-{t.month} {t:%H:%M}"


# ----------------------------------------------------------- controleren ---

def controleer(config, gesch):
    nu = datetime.now(timezone.utc).isoformat(timespec="minutes")
    for product in config["producten"]:
        for aanbod in product["aanbiedingen"]:
            k = sleutel(product, aanbod)
            print(f"→ {k} ... ", end="", flush=True)
            cache = gesch.setdefault("gevonden_urls", {})
            try:
                url = aanbod.get("url") or cache.get(k)
                if not url:
                    url = cache[k] = zoek_product(aanbod)
                    time.sleep(2)
                pagina = haal_op(url)
                controleer_blokkade(pagina)
                gevonden = lees_prijs(pagina, product.get("min_prijs", 1), product.get("max_prijs", 1e9))
                meting = {"t": nu, **{a: b for a, b in gevonden.items() if b not in ("", None)}}
                print(euro(meting["prijs"]), url)
            except Exception as e:
                meting = {"t": nu, "fout": str(e)}
                cache.pop(k, None)  # volgende keer opnieuw zoeken
                print("✗", e)
            gesch["metingen"].setdefault(k, []).append(meting)
            time.sleep(2)


def maak_melding(config, gesch):
    """Melding als de laagste (nieuw, op voorraad, eigen verkoop) prijs
    onder de wensprijs zakt of 5% onder de startprijs, en lager is dan de
    vorige melding."""
    regels = []
    for product in config["producten"]:
        beste = None
        for aanbod in product["aanbiedingen"]:
            lijst = gesch["metingen"].get(sleutel(product, aanbod), [])
            m = laatste_geslaagde(lijst)
            if not (lijst and "prijs" in lijst[-1] and is_bruikbaar(m, aanbod["winkel"])):
                continue
            if beste is None or m["prijs"] < beste[0]:
                beste = (m["prijs"], aanbod)
        if beste is None:
            continue
        prijs, aanbod = beste
        start = start_prijs(product, gesch)
        vorige = gesch["gemeld"].get(product["id"])
        goed_genoeg = prijs <= product["wensprijs"] or (start and prijs <= start * 0.95)
        if goed_genoeg and (vorige is None or prijs < vorige - 0.009):
            gesch["gemeld"][product["id"]] = prijs
            regel = (f"- {product['emoji']} **{product['naam']}**: **{euro(prijs)}** bij "
                     f"[{(aanbod['winkel'] + ' ' + aanbod.get('variant', '')).strip()}]({link(aanbod, gesch, sleutel(product, aanbod))})"
                     f" (wensprijs {euro(product['wensprijs'])}")
            if start:
                regel += f", startprijs {euro(start)}"
            regels.append(regel + ")")
    return regels


def start_prijs(product, gesch):
    """Laagste prijs bij de allereerste geslaagde meting per aanbieding."""
    eerste = []
    for aanbod in product["aanbiedingen"]:
        for m in gesch["metingen"].get(sleutel(product, aanbod), []):
            if "prijs" in m:
                if is_bruikbaar(m, aanbod["winkel"]):
                    eerste.append(m["prijs"])
                break
    return min(eerste) if eerste else None


# ------------------------------------------------------------- pagina ---

def sparkline(lijst):
    punten = [m["prijs"] for m in lijst if "prijs" in m]
    if len(punten) < 2:
        return ""
    w, h = 120, 30
    lo, hi = min(punten), max(punten)
    bereik = (hi - lo) or 1
    xy = " ".join(f"{i * w / (len(punten) - 1):.1f},{h - 3 - (p - lo) / bereik * (h - 6):.1f}"
                  for i, p in enumerate(punten))
    kleur = "#2e9a4a" if punten[-1] < punten[0] else ("#c23b3b" if punten[-1] > punten[0] else "#8a8794")
    return (f'<svg class="lijn" viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true">'
            f'<polyline fill="none" stroke="{kleur}" stroke-width="2" points="{xy}"/></svg>')


def maak_pagina(config, gesch):
    e = html.escape
    kaarten = []
    laatste_check = None
    for product in config["producten"]:
        rijen = []
        beste = None
        ooit = None
        for aanbod in product["aanbiedingen"]:
            lijst = gesch["metingen"].get(sleutel(product, aanbod), [])
            if lijst:
                laatste_check = max(laatste_check or lijst[-1]["t"], lijst[-1]["t"])
            m = laatste_geslaagde(lijst)
            recent_fout = lijst and "fout" in lijst[-1]
            eerste = next((x for x in lijst if "prijs" in x), None)
            for x in lijst:
                if "prijs" in x and is_bruikbaar(x, aanbod["winkel"]):
                    if ooit is None or x["prijs"] < ooit[0]:
                        ooit = (x["prijs"], aanbod["winkel"], x["t"])
            if m and not recent_fout and is_bruikbaar(m, aanbod["winkel"]):
                if beste is None or m["prijs"] < beste[0]:
                    beste = (m["prijs"], aanbod)

            if m:
                verschil = m["prijs"] - eerste["prijs"]
                if abs(verschil) < 0.01:
                    verschil_html = '<span class="zacht">=</span>'
                elif verschil < 0:
                    verschil_html = f'<span class="omlaag">▼ {euro(-verschil)}</span>'
                else:
                    verschil_html = f'<span class="omhoog">▲ {euro(verschil)}</span>'
                prijs_html = f'<strong>{euro(m["prijs"])}</strong>'
                if m["prijs"] <= product["wensprijs"] and is_bruikbaar(m, aanbod["winkel"]):
                    prijs_html += ' <span class="badge">🎯 wensprijs!</span>'
            else:
                verschil_html, prijs_html = "", '<span class="zacht">nog onbekend</span>'

            status = []
            if recent_fout:
                status.append(f'⚠️ {e(lijst[-1]["fout"])} – klik en kijk zelf')
                if m:
                    status.append(f'laatst gelukt: {nl_tijd(m["t"])}')
            status += [f"⚠️ {e(w)}" for w in waarschuwingen(m, aanbod["winkel"])]
            if not lijst:
                status.append("nog niet gecontroleerd")
            rijen.append(f"""
          <tr>
            <td><a href="{e(link(aanbod, gesch, sleutel(product, aanbod)))}" target="_blank" rel="noopener">{e(aanbod['winkel'])}</a>
                <div class="zacht klein">{e(aanbod.get('variant', ''))}</div></td>
            <td>{prijs_html}<div class="klein">{'<br>'.join(status)}</div></td>
            <td>{verschil_html}</td>
            <td>{sparkline(lijst)}</td>
          </tr>""")

        zoek = urllib.parse.quote_plus(product.get("zoekterm", product["naam"]))
        zelf = " · ".join(
            f'<a href="{e(z["url"].replace("{zoekterm}", zoek))}" target="_blank" rel="noopener">{e(z["winkel"])}</a>'
            for z in config.get("zelf_kijken", []))
        beste_html = (f'{euro(beste[0])} <span class="zacht">bij {e(beste[1]["winkel"])}</span>'
                      if beste else '<span class="zacht">nog onbekend</span>')
        ooit_html = (f'{euro(ooit[0])} <span class="zacht">({e(ooit[1])}, {nl_tijd(ooit[2])})</span>'
                     if ooit else "–")
        kaarten.append(f"""
    <section class="kaart">
      <h2>{product['emoji']} {e(product['naam'])}</h2>
      <div class="cijfers">
        <div><div class="label">Laagste nu</div><div class="groot">{beste_html}</div></div>
        <div><div class="label">Laagste ooit gezien</div><div>{ooit_html}</div></div>
        <div><div class="label">Jouw wensprijs</div><div>{euro(product['wensprijs'])}</div></div>
      </div>
      <table>
        <thead><tr><th>Webshop</th><th>Prijs</th><th>Sinds start</th><th>Verloop</th></tr></thead>
        <tbody>{''.join(rijen)}</tbody>
      </table>
      <p class="klein">🔎 Zelf even kijken: {zelf}</p>
    </section>""")

    ab = config.get("abonnementen", {})
    links = lambda lijst: " · ".join(
        f'<a href="{e(x["url"])}" target="_blank" rel="noopener">{e(x["naam"])}</a>' for x in lijst)
    bijgewerkt = nl_tijd(laatste_check) if laatste_check else "nog niet"

    pagina = SJABLOON.replace("{{KAARTEN}}", "".join(kaarten)) \
        .replace("{{BIJGEWERKT}}", bijgewerkt) \
        .replace("{{VERGELIJKERS}}", links(ab.get("vergelijkers", []))) \
        .replace("{{PROVIDERS}}", links(ab.get("providers", [])))
    PAGINA.write_text(pagina, encoding="utf-8")


SJABLOON = """<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prijswachter – Black Friday</title>
<style>
  :root { --bg:#f6f4ef; --kaart:#fff; --tekst:#25242b; --zacht:#6d6a75; --rand:#e4ded0;
          --goed:#2e9a4a; --fout:#c23b3b; --accent:#111; }
  * { box-sizing:border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         background:var(--bg); color:var(--tekst); line-height:1.5; }
  header { background:#111; color:#fff; padding:1.2em 1em; }
  header h1 { margin:0; font-size:1.5em; }
  header p { margin:.2em 0 0; opacity:.8; }
  main { max-width:960px; margin:0 auto; padding:1em; }
  .kaart { background:var(--kaart); border:1px solid var(--rand); border-radius:14px;
           padding:1em 1.2em; margin:1em 0; box-shadow:0 2px 10px rgba(0,0,0,.04); }
  h2 { margin:.2em 0 .6em; font-size:1.25em; }
  .cijfers { display:flex; flex-wrap:wrap; gap:1.5em; margin-bottom:.8em; }
  .label { font-size:.8em; color:var(--zacht); text-transform:uppercase; letter-spacing:.04em; }
  .groot { font-size:1.4em; font-weight:700; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:.55em .4em; border-top:1px solid var(--rand); vertical-align:top; }
  th { font-size:.8em; color:var(--zacht); font-weight:600; }
  a { color:#0b5cad; }
  .zacht { color:var(--zacht); }
  .klein { font-size:.85em; }
  .omlaag { color:var(--goed); font-weight:600; }
  .omhoog { color:var(--fout); font-weight:600; }
  .badge { background:#ddf3e2; color:var(--goed); border-radius:99px; padding:.05em .5em; font-size:.8em; }
  .lijn { display:block; }
  .rekenen { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.6em; margin:.6em 0; }
  .rekenen label { font-size:.85em; color:var(--zacht); display:flex; flex-direction:column; gap:.2em; }
  input { font:inherit; padding:.45em .5em; border:1px solid var(--rand); border-radius:8px; width:100%; }
  button { font:inherit; padding:.5em 1em; border-radius:8px; border:0; background:#111; color:#fff; cursor:pointer; }
  button.klein-knop { background:none; color:var(--fout); padding:0 .3em; }
  ul.tips li { margin:.3em 0; }
  @media (max-width:600px) { th:nth-child(4), td:nth-child(4) { display:none; } }
</style>
</head>
<body>
<header>
  <h1>🛍️ Prijswachter Black Friday</h1>
  <p>Laatst automatisch gecontroleerd: {{BIJGEWERKT}} · elke 2 uur een nieuwe check</p>
</header>
<main>
{{KAARTEN}}

  <section class="kaart">
    <h2>📶 Telefoonabonnementen</h2>
    <p>Abonnementen zijn niet automatisch te volgen, omdat de prijs afhangt van je keuzes (data, looptijd, toestel).
       Vergelijk ze daarom met de rekenhulp hieronder. Die rekent de <strong>totale kosten over de hele looptijd</strong> uit,
       want "50% korting de eerste 6 maanden" klinkt vaak beter dan het is.</p>
    <p class="klein"><strong>Vergelijkers:</strong> {{VERGELIJKERS}}<br>
       <strong>Providers:</strong> {{PROVIDERS}}</p>

    <div class="rekenen">
      <label>Provider / naam <input id="r-naam" placeholder="bv. Simyo 20GB"></label>
      <label>Normale prijs p/m (€) <input id="r-prijs" type="number" step="0.01" min="0"></label>
      <label>Looptijd (maanden) <input id="r-looptijd" type="number" value="24" min="1"></label>
      <label>Korting p/m (€) <input id="r-korting" type="number" step="0.01" value="0" min="0"></label>
      <label>…gedurende (maanden) <input id="r-kortingmnd" type="number" value="0" min="0"></label>
      <label>Eenmalig: aansluitkosten − cashback (€) <input id="r-eenmalig" type="number" step="0.01" value="0"></label>
    </div>
    <button id="r-toevoegen">➕ Toevoegen aan vergelijking</button>
    <table id="r-tabel" style="margin-top:.8em">
      <thead><tr><th>Abonnement</th><th>Totaal</th><th>Gemiddeld p/m</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
  </section>

  <section class="kaart">
    <h2>💡 Tips voor slim shoppen</h2>
    <ul class="tips">
      <li><strong>"Van"-prijzen kloppen niet altijd.</strong> Kijk hierboven bij "Laagste ooit gezien" of in de
          prijsgeschiedenis op Tweakers Pricewatch of het echt een koopje is.</li>
      <li><strong>Betrouwbaar kopen:</strong> bij bol en Amazon kun je het beste <em>"verkoop door bol"</em> of
          <em>"verzonden en verkocht door Amazon"</em> kiezen. Bij MediaMarkt verkopen soms ook partners; die zie je hierboven met ⚠️.</li>
      <li><strong>Refurbished</strong> of tweedehands aanbiedingen tellen niet mee als "laagste prijs".</li>
      <li>Is het product na Black Friday toch goedkoper? Veel winkels hebben een <strong>bedenktijd van 14 dagen</strong>
          (of langer in december). Je kunt het dan terugsturen en opnieuw bestellen.</li>
      <li>Wil je de wensprijs aanpassen of een webshop toevoegen? Pas dan <code>prijswachter/producten.json</code> aan.</li>
    </ul>
  </section>
</main>
<script>
  const SLEUTEL = "prijswachter-abonnementen";
  const tbody = document.querySelector("#r-tabel tbody");
  const euro = x => "€ " + x.toFixed(2).replace(".", ",");
  let lijst = JSON.parse(localStorage.getItem(SLEUTEL) || "[]");
  function teken() {
    lijst.sort((a, b) => a.totaal - b.totaal);
    tbody.innerHTML = lijst.length ? "" : '<tr><td colspan="4" class="zacht">Nog niets toegevoegd.</td></tr>';
    lijst.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td></td><td><strong>${euro(r.totaal)}</strong>${i === 0 && lijst.length > 1 ? ' <span class="badge">goedkoopst</span>' : ''}</td>
                      <td>${euro(r.totaal / r.looptijd)}</td><td><button class="klein-knop" aria-label="Verwijderen">✕</button></td>`;
      tr.firstChild.textContent = r.naam + ` (${r.looptijd} mnd)`;
      tr.querySelector("button").onclick = () => { lijst.splice(i, 1); bewaar(); };
      tbody.appendChild(tr);
    });
  }
  function bewaar() { localStorage.setItem(SLEUTEL, JSON.stringify(lijst)); teken(); }
  document.getElementById("r-toevoegen").onclick = () => {
    const g = id => parseFloat(document.getElementById(id).value) || 0;
    const looptijd = Math.max(1, g("r-looptijd"));
    const prijs = g("r-prijs");
    if (!prijs) { document.getElementById("r-prijs").focus(); return; }
    const kortingMnd = Math.min(looptijd, g("r-kortingmnd"));
    const totaal = prijs * looptijd - g("r-korting") * kortingMnd + g("r-eenmalig");
    lijst.push({ naam: document.getElementById("r-naam").value || "Abonnement", looptijd, totaal });
    bewaar();
  };
  teken();
</script>
</body>
</html>
"""


# --------------------------------------------------------------- start ---

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--alleen-html", action="store_true")
    ap.add_argument("--melding", help="schrijf melding (markdown) naar dit bestand bij prijsdaling")
    args = ap.parse_args()

    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    gesch = json.loads(GESCHIEDENIS.read_text(encoding="utf-8"))
    gesch.setdefault("metingen", {})
    gesch.setdefault("gemeld", {})

    if not args.alleen_html:
        controleer(config, gesch)
        regels = maak_melding(config, gesch)
        if regels and args.melding:
            Path(args.melding).write_text(
                "Goed nieuws! De prijswachter heeft een mooie prijs gevonden:\n\n"
                + "\n".join(regels)
                + "\n\nControleer de prijs altijd even zelf op de site voordat je bestelt.\n",
                encoding="utf-8")
            print("\n🔔 Melding:\n" + "\n".join(regels))
        GESCHIEDENIS.write_text(json.dumps(gesch, ensure_ascii=False, indent=1), encoding="utf-8")

    maak_pagina(config, gesch)
    print(f"Pagina bijgewerkt: {PAGINA}")


if __name__ == "__main__":
    sys.exit(main())
