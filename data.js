// ============================================================
//  Oefenstof voor de Taaltopper-spelletjes
//  Je kunt hier gemakkelijk zinnen en werkwoorden toevoegen.
// ============================================================

// ---------- Woordsoorten ----------
const WOORDSOORTEN = {
  zn:  { naam: "zelfstandig naamwoord", kort: "zelfst. nw.", icoon: "🏠", kleur: "#2f6fd6",
         tip: "Kun je er 'de', 'het' of 'een' voor zetten? Het is een mens, dier, ding of plek." },
  ww:  { naam: "werkwoord", kort: "werkwoord", icoon: "🏃", kleur: "#d6452f",
         tip: "Kun je er 'ik', 'jij' of 'wij' voor zetten? Het zegt wat iemand doet (of is/heeft)." },
  bn:  { naam: "bijvoeglijk naamwoord", kort: "bijv. nw.", icoon: "🎨", kleur: "#2e9a4a",
         tip: "Het zegt hoe iets is. Past het tussen 'de' en een zelfstandig naamwoord? (de grote hond)" },
  lw:  { naam: "lidwoord", kort: "lidwoord", icoon: "🔤", kleur: "#6b6b6b",
         tip: "Er zijn maar drie lidwoorden: de, het en een." },
  vnw: { naam: "voornaamwoord", kort: "voornaamw.", icoon: "👤", kleur: "#8a3fc4",
         tip: "Het staat in de plaats van een naam (ik, jij, hij, wij) of zegt van wie iets is (mijn, jouw, ons)." },
  tw:  { naam: "telwoord", kort: "telwoord", icoon: "🔢", kleur: "#c98a00",
         tip: "Het zegt hoeveel (drie, tien) of welke plek in de rij (eerste, tweede)." },
  vz:  { naam: "voorzetsel", kort: "voorzetsel", icoon: "📍", kleur: "#108a8a",
         tip: "Het zegt vaak waar iets is: in, op, onder, naast, achter, naar, met, bij." },
};

// Niveaus voor de woordsoort-spelletjes
const WOORDSOORT_NIVEAUS = {
  1: ["zn", "ww", "bn"],
  2: ["zn", "ww", "bn", "lw", "vnw"],
  3: ["zn", "ww", "bn", "lw", "vnw", "tw", "vz"],
};

// Zinnen met woordsoort-labels: woord/label.  Woorden zonder label tellen niet mee.
const ZINNEN_WOORDSOORT = [
  "De/lw grote/bn hond/zn rent/ww naar/vz het/lw park/zn.",
  "Mijn/vnw zus/zn eet/ww een/lw rode/bn appel/zn.",
  "Wij/vnw zwemmen/ww in/vz het/lw koude/bn meer/zn.",
  "Drie/tw kleine/bn katten/zn slapen/ww op/vz de/lw bank/zn.",
  "Hij/vnw fietst/ww met/vz zijn/vnw vader/zn naar/vz school/zn.",
  "De/lw juf/zn leest/ww een/lw spannend/bn verhaal/zn.",
  "Opa/zn bakt/ww twee/tw lekkere/bn taarten/zn.",
  "Jij/vnw hebt/ww een/lw mooie/bn tekening/zn gemaakt/ww.",
  "Het/lw paard/zn springt/ww over/vz het/lw hoge/bn hek/zn.",
  "Wij/vnw hebben/ww vijf/tw vissen/zn in/vz ons/vnw aquarium/zn.",
  "Zij/vnw zingt/ww een/lw vrolijk/bn lied/zn.",
  "De/lw gele/bn zon/zn schijnt/ww boven/vz de/lw zee/zn.",
  "Ik/vnw heb/ww tien/tw snoepjes/zn gekregen/ww.",
  "De/lw boze/bn reus/zn stampt/ww door/vz het/lw bos/zn.",
  "Jullie/vnw lopen/ww met/vz de/lw hond/zn naar/vz het/lw strand/zn.",
  "Een/lw slimme/bn uil/zn zit/ww in/vz de/lw oude/bn boom/zn.",
  "Papa/zn heeft/ww de/lw blauwe/bn auto/zn gewassen/ww.",
  "Zij/vnw kochten/ww acht/tw ijsjes/zn bij/vz de/lw kraam/zn.",
  "Onze/vnw kat/zn vangt/ww een/lw grijze/bn muis/zn.",
  "Het/lw eerste/tw meisje/zn wint/ww een/lw gouden/bn beker/zn.",
  "De/lw kinderen/zn bouwen/ww een/lw groot/bn zandkasteel/zn.",
  "Ik/vnw drink/ww warme/bn chocolademelk/zn met/vz slagroom/zn.",
  "Hij/vnw is/ww naar/vz de/lw bakker/zn gefietst/ww.",
  "De/lw zieke/bn olifant/zn ligt/ww in/vz het/lw zachte/bn stro/zn.",
  "Wij/vnw vieren/ww het/lw feest/zn met/vz twaalf/tw vrienden/zn.",
  "Jouw/vnw nieuwe/bn schoenen/zn staan/ww bij/vz de/lw deur/zn.",
  "De/lw bange/bn muis/zn rende/ww achter/vz de/lw kast/zn.",
  "Mijn/vnw oma/zn breit/ww een/lw warme/bn sjaal/zn voor/vz mij/vnw.",
  "Twee/tw piraten/zn zoeken/ww een/lw geheime/bn schat/zn.",
  "De/lw meester/zn schrijft/ww een/lw lange/bn som/zn op/vz het/lw bord/zn.",
  "Wij/vnw hebben/ww in/vz de/lw tuin/zn gespeeld/ww.",
  "Het/lw kleine/bn meisje/zn lacht/ww om/vz de/lw grappige/bn clown/zn.",
  "Hij/vnw gooit/ww de/lw rode/bn bal/zn naar/vz haar/vnw.",
  "De/lw tweede/tw trein/zn stopt/ww bij/vz het/lw drukke/bn station/zn.",
  "Mijn/vnw moeder/zn plant/ww zes/tw paarse/bn bloemen/zn.",
  "De/lw dappere/bn ridder/zn vecht/ww tegen/vz een/lw draak/zn.",
  "Jij/vnw zit/ww naast/vz mij/vnw in/vz de/lw klas/zn.",
  "Het/lw natte/bn hondje/zn schudt/ww onder/vz de/lw boom/zn.",
];

// ---------- Werkwoorden (voor tijden en werkwoordspelling) ----------
// stam, verleden tijd enkelvoud (vt) en meervoud (vtmv), voltooid deelwoord (vd),
// hulpwerkwoord (hebben/zijn) en een stukje zin (rest).
const WERKWOORDEN = [
  { inf: "fietsen",    stam: "fiets",    vt: "fietste",    vtmv: "fietsten",    vd: "gefietst",    hulp: "zijn",   rest: "naar school" },
  { inf: "maken",      stam: "maak",     vt: "maakte",     vtmv: "maakten",     vd: "gemaakt",     hulp: "hebben", rest: "een tekening" },
  { inf: "spelen",     stam: "speel",    vt: "speelde",    vtmv: "speelden",    vd: "gespeeld",    hulp: "hebben", rest: "met de bal" },
  { inf: "wonen",      stam: "woon",     vt: "woonde",     vtmv: "woonden",     vd: "gewoond",     hulp: "hebben", rest: "in een groot huis" },
  { inf: "dansen",     stam: "dans",     vt: "danste",     vtmv: "dansten",     vd: "gedanst",     hulp: "hebben", rest: "op het podium" },
  { inf: "werken",     stam: "werk",     vt: "werkte",     vtmv: "werkten",     vd: "gewerkt",     hulp: "hebben", rest: "in de tuin" },
  { inf: "verhuizen",  stam: "verhuis",  vt: "verhuisde",  vtmv: "verhuisden",  vd: "verhuisd",    hulp: "zijn",   rest: "naar Utrecht" },
  { inf: "poetsen",    stam: "poets",    vt: "poetste",    vtmv: "poetsten",    vd: "gepoetst",    hulp: "hebben", rest: "de schoenen" },
  { inf: "bakken",     stam: "bak",      vt: "bakte",      vtmv: "bakten",      vd: "gebakken",    hulp: "hebben", rest: "een taart" },
  { inf: "antwoorden", stam: "antwoord", vt: "antwoordde", vtmv: "antwoordden", vd: "geantwoord",  hulp: "hebben", rest: "op de vraag" },
  { inf: "worden",     stam: "word",     vt: "werd",       vtmv: "werden",      vd: "geworden",    hulp: "zijn",   rest: "boos" },
  { inf: "vinden",     stam: "vind",     vt: "vond",       vtmv: "vonden",      vd: "gevonden",    hulp: "hebben", rest: "een munt" },
  { inf: "zetten",     stam: "zet",      vt: "zette",      vtmv: "zetten",      vd: "gezet",       hulp: "hebben", rest: "de borden op tafel" },
  { inf: "praten",     stam: "praat",    vt: "praatte",    vtmv: "praatten",    vd: "gepraat",     hulp: "hebben", rest: "met de juf" },
  { inf: "lopen",      stam: "loop",     vt: "liep",       vtmv: "liepen",      vd: "gelopen",     hulp: "zijn",   rest: "naar huis" },
  { inf: "zwemmen",    stam: "zwem",     vt: "zwom",       vtmv: "zwommen",     vd: "gezwommen",   hulp: "hebben", rest: "in het zwembad" },
  { inf: "lezen",      stam: "lees",     vt: "las",        vtmv: "lazen",       vd: "gelezen",     hulp: "hebben", rest: "een boek" },
  { inf: "leren",      stam: "leer",     vt: "leerde",     vtmv: "leerden",     vd: "geleerd",     hulp: "hebben", rest: "voor de toets" },
  { inf: "verven",     stam: "verf",     vt: "verfde",     vtmv: "verfden",     vd: "geverfd",     hulp: "hebben", rest: "de muur" },
  { inf: "kloppen",    stam: "klop",     vt: "klopte",     vtmv: "klopten",     vd: "geklopt",     hulp: "hebben", rest: "op de deur" },
  { inf: "wachten",    stam: "wacht",    vt: "wachtte",    vtmv: "wachtten",    vd: "gewacht",     hulp: "hebben", rest: "op de bus" },
  { inf: "tekenen",    stam: "teken",    vt: "tekende",    vtmv: "tekenden",    vd: "getekend",    hulp: "hebben", rest: "een paard" },
  { inf: "schrijven",  stam: "schrijf",  vt: "schreef",    vtmv: "schreven",    vd: "geschreven",  hulp: "hebben", rest: "een brief" },
  { inf: "eten",       stam: "eet",      vt: "at",         vtmv: "aten",        vd: "gegeten",     hulp: "hebben", rest: "een appel" },
  { inf: "drinken",    stam: "drink",    vt: "dronk",      vtmv: "dronken",     vd: "gedronken",   hulp: "hebben", rest: "een glas melk" },
  { inf: "plakken",    stam: "plak",     vt: "plakte",     vtmv: "plakten",     vd: "geplakt",     hulp: "hebben", rest: "een sticker" },
  { inf: "bellen",     stam: "bel",      vt: "belde",      vtmv: "belden",      vd: "gebeld",      hulp: "hebben", rest: "met opa" },
  { inf: "huilen",     stam: "huil",     vt: "huilde",     vtmv: "huilden",     vd: "gehuild",     hulp: "hebben", rest: "om de film" },
];

// Onderwerpen: persoon, enkelvoud/meervoud en vormen van hebben/zijn
const PERSONEN = [
  { ow: "Ik",     soort: "ik",  hebben: "heb",    zijn: "ben"  },
  { ow: "Jij",    soort: "jij", hebben: "hebt",   zijn: "bent" },
  { ow: "Hij",    soort: "hij", hebben: "heeft",  zijn: "is"   },
  { ow: "Zij",    soort: "hij", hebben: "heeft",  zijn: "is", uitleg: "zij (één meisje)" },
  { ow: "Sanne",  soort: "hij", hebben: "heeft",  zijn: "is"   },
  { ow: "Wij",    soort: "mv",  hebben: "hebben", zijn: "zijn" },
  { ow: "De kinderen", soort: "mv", hebben: "hebben", zijn: "zijn" },
];

// ---------- Persoonsvorm en onderwerp ----------
// zin, persoonsvorm (pv) en onderwerp (ow). Onderwerp kan meerdere woorden zijn.
// 'andereTijd' laat zien hoe de zin in een andere tijd klinkt (voor de tijdproef).
const ZINNEN_PV_OW = [
  { zin: "Mijn zus speelt op het plein.", pv: "speelt", ow: "Mijn zus", andereTijd: "Mijn zus speelde op het plein." },
  { zin: "Morgen gaan wij naar de dierentuin.", pv: "gaan", ow: "wij", andereTijd: "Morgen gingen wij naar de dierentuin." },
  { zin: "De grote hond blaft naar de postbode.", pv: "blaft", ow: "De grote hond", andereTijd: "De grote hond blafte naar de postbode." },
  { zin: "Heb jij mijn gum gezien?", pv: "Heb", ow: "jij", andereTijd: "Had jij mijn gum gezien?" },
  { zin: "In de zomer zwemmen de kinderen in het meer.", pv: "zwemmen", ow: "de kinderen", andereTijd: "In de zomer zwommen de kinderen in het meer." },
  { zin: "Opa en oma komen vanavond eten.", pv: "komen", ow: "Opa en oma", andereTijd: "Opa en oma kwamen vanavond eten." },
  { zin: "Gisteren regende het de hele dag.", pv: "regende", ow: "het", andereTijd: "Vandaag regent het de hele dag." },
  { zin: "Waarom lach jij zo hard?", pv: "lach", ow: "jij", andereTijd: "Waarom lachte jij zo hard?" },
  { zin: "De juf heeft een spannend boek voorgelezen.", pv: "heeft", ow: "De juf", andereTijd: "De juf had een spannend boek voorgelezen." },
  { zin: "Na school fietst Daan naar huis.", pv: "fietst", ow: "Daan", andereTijd: "Na school fietste Daan naar huis." },
  { zin: "Mijn vader en ik bouwen een hut.", pv: "bouwen", ow: "Mijn vader en ik", andereTijd: "Mijn vader en ik bouwden een hut." },
  { zin: "Vanochtend at ik een boterham met kaas.", pv: "at", ow: "ik", andereTijd: "Vanochtend eet ik een boterham met kaas." },
  { zin: "De kleine poes ligt in de zon.", pv: "ligt", ow: "De kleine poes", andereTijd: "De kleine poes lag in de zon." },
  { zin: "Wanneer begint de film?", pv: "begint", ow: "de film", andereTijd: "Wanneer begon de film?" },
  { zin: "Op het dak zit een zwarte kraai.", pv: "zit", ow: "een zwarte kraai", andereTijd: "Op het dak zat een zwarte kraai." },
  { zin: "Wij hebben het hele weekend gespeeld.", pv: "hebben", ow: "Wij", andereTijd: "Wij hadden het hele weekend gespeeld." },
  { zin: "Lisa kan heel hard rennen.", pv: "kan", ow: "Lisa", andereTijd: "Lisa kon heel hard rennen." },
  { zin: "Door het raam keek de nieuwsgierige kat naar binnen.", pv: "keek", ow: "de nieuwsgierige kat", andereTijd: "Door het raam kijkt de nieuwsgierige kat naar binnen." },
  { zin: "Zijn jullie al klaar met het werk?", pv: "Zijn", ow: "jullie", andereTijd: "Waren jullie al klaar met het werk?" },
  { zin: "De bal rolde onder de auto.", pv: "rolde", ow: "De bal", andereTijd: "De bal rolt onder de auto." },
  { zin: "Elke ochtend drinkt papa koffie.", pv: "drinkt", ow: "papa", andereTijd: "Elke ochtend dronk papa koffie." },
  { zin: "Ik word later dierenarts.", pv: "word", ow: "Ik", andereTijd: "Ik werd later dierenarts." },
  { zin: "Hij vindt spinnen eng.", pv: "vindt", ow: "Hij", andereTijd: "Hij vond spinnen eng." },
  { zin: "Vorige week zijn wij naar Parijs gereisd.", pv: "zijn", ow: "wij", andereTijd: "Vorige week waren wij naar Parijs gereisd." },
  { zin: "Speel jij morgen bij mij?", pv: "Speel", ow: "jij", andereTijd: "Speelde jij morgen bij mij?" },
  { zin: "De drie biggetjes bouwden een huis.", pv: "bouwden", ow: "De drie biggetjes", andereTijd: "De drie biggetjes bouwen een huis." },
  { zin: "Onder het bed slaapt mijn hamster.", pv: "slaapt", ow: "mijn hamster", andereTijd: "Onder het bed sliep mijn hamster." },
  { zin: "De meester en de juf drinken thee.", pv: "drinken", ow: "De meester en de juf", andereTijd: "De meester en de juf dronken thee." },
  { zin: "Daarna gingen we pannenkoeken eten.", pv: "gingen", ow: "we", andereTijd: "Daarna gaan we pannenkoeken eten." },
  { zin: "Ben jij ook bang in het donker?", pv: "Ben", ow: "jij", andereTijd: "Was jij ook bang in het donker?" },
];
