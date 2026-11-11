/*
 * Kernrechnungen für das Selbstständigen-Kit.
 * Wird sowohl von der Browser-Oberfläche (site/tool.html) als auch von den
 * Tests (scripts/test_calc.mjs) genutzt — identische Logik, keine Doppelung.
 *
 * Rechtsstand der eingebauten Grenzwerte: 10.11.2026 (Beleg: docs/belege.md).
 * KEINE STEUERBERATUNG — Werkzeug zur Orientierung, keine Rechts- oder
 * Steuerberatung im Einzelfall.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KitCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* § 19 Abs. 1 S. 1 UStG: Kleinunternehmer, Stand 10.11.2026 */
  var GRENZEN = {
    kleinunternehmerVorjahr: 25000,
    kleinunternehmerLaufjahr: 100000,
    ustSatzStandard: 19,
    ustSatzErmaessigt: 7,
    ustSatzNull: 0
  };

  function r2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function num(v, fallback) {
    var x = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(x) ? x : (fallback === undefined ? 0 : fallback);
  }

  /**
   * § 19 Abs. 1 UStG: Kleinunternehmer-Status für ein Jahr.
   * frei = true, solange beide Schwellen eingehalten werden.
   */
  function kleinunternehmerStatus(vorjahrUmsatz, laufjahrUmsatz) {
    var v = num(vorjahrUmsatz);
    var l = num(laufjahrUmsatz);
    var freiVorjahr = v <= GRENZEN.kleinunternehmerVorjahr;
    var freiLaufjahr = l <= GRENZEN.kleinunternehmerLaufjahr;
    return {
      frei: freiVorjahr && freiLaufjahr,
      vorjahrUmsatz: v,
      laufjahrUmsatz: l,
      grenzeVorjahr: GRENZEN.kleinunternehmerVorjahr,
      grenzeLaufjahr: GRENZEN.kleinunternehmerLaufjahr,
      freiVorjahr: freiVorjahr,
      freiLaufjahr: freiLaufjahr,
      restVorjahr: r2(GRENZEN.kleinunternehmerVorjahr - v),
      restLaufjahr: r2(GRENZEN.kleinunternehmerLaufjahr - l)
    };
  }

  /** USt-Betrag auf einen Nettobetrag. */
  function ustBetrag(netto, satz) {
    return r2(num(netto) * num(satz) / 100);
  }

  /** Bruttobetrag -> Netto + USt (z. B. wenn mit 19 % kalkuliert wird). */
  function bruttoZuNetto(brutto, satz) {
    var b = num(brutto);
    var s = num(satz);
    if (!s) return { netto: r2(b), ust: 0, brutto: r2(b), satz: 0 };
    var netto = r2(b / (1 + s / 100));
    return { netto: netto, ust: r2(b - netto), brutto: r2(b), satz: s };
  }

  /**
   * Rechnungspositionen: [{ bezeichnung, menge, einzelpreis, satz }]
   * einzelpreis ist der NETTO-Preis je Einheit (wie in § 14 UStG üblich).
   */
  function positionen(liste, standardSatz) {
    var satzDefault = standardSatz === undefined ? GRENZEN.ustSatzStandard : num(standardSatz);
    var out = [];
    var summeNetto = 0;
    var summeUst = 0;
    (liste || []).forEach(function (p) {
      if (!p) return;
      var menge = num(p.menge, 1);
      var einzel = num(p.einzelpreis);
      var satz = p.satz === undefined || p.satz === null || p.satz === '' ? satzDefault : num(p.satz);
      var netto = r2(menge * einzel);
      var ust = ustBetrag(netto, satz);
      summeNetto += netto;
      summeUst += ust;
      out.push({
        bezeichnung: String(p.bezeichnung || ''),
        menge: menge,
        einzelpreis: r2(einzel),
        satz: satz,
        netto: netto,
        ust: ust,
        brutto: r2(netto + ust)
      });
    });
    return {
      positionen: out,
      summeNetto: r2(summeNetto),
      summeUst: r2(summeUst),
      summeBrutto: r2(summeNetto + summeUst)
    };
  }

  /** Kosten je Stunde: Jahreskosten / nutzbare Arbeitsstunden. */
  function stundensatz(jahreskosten, arbeitsstunden) {
    var k = num(jahreskosten);
    var h = num(arbeitsstunden);
    if (h <= 0) return { stundensatz: 0, hinweis: 'Arbeitsstunden > 0 erforderlich' };
    return { stundensatz: r2(k / h), hinweis: '' };
  }

  /**
   * Angebotspreis aus Kostenbasis.
   * variante 'marge'    -> Marge = (Preis - Kosten) / Preis  -> Preis = Kosten / (1 - Marge)
   * variante 'aufschlag'-> Preis = Kosten * (1 + Aufschlag)
   * Der Unterschied ist der häufigste Kalkulationsfehler und deshalb explizit.
   */
  function angebotspreis(kosten, stunden, parameter, variante) {
    var k = num(kosten);
    var h = num(stunden);
    var p = num(parameter) / 100;
    var varI = variante === 'aufschlag' ? 'aufschlag' : 'marge';
    if (varI === 'aufschlag') {
      var preis = r2(k * (1 + p));
      return {
        variante: varI, preis: preis, kosten: k,
        margeProzent: preis > 0 ? r2(((preis - k) / preis) * 100) : 0,
        hinweis: 'Aufschlag: Preis = Kosten x (1 + Aufschlag). Der Aufschlag ist kein Deckungsbeitrag.'
      };
    }
    if (p >= 1) {
      return { variante: varI, preis: 0, kosten: k, margeProzent: 0, hinweis: 'Marge muss kleiner als 100 % sein.' };
    }
    var preisM = r2(k / (1 - p));
    return {
      variante: varI, preis: preisM, kosten: k,
      margeProzent: r2(p * 100),
      hinweis: 'Marge: Preis = Kosten / (1 - Marge).'
    };
  }

  /**
   * Effektiv anzuwendender Umsatzsteuersatz.
   * Kleinunternehmer nach § 19 UStG: es wird keine Umsatzsteuer berechnet und
   * ausgewiesen — die Rechnungssumme entspricht dann der Nettosumme.
   */
  function effektiverSatz(kleinunternehmerFrei, satz) {
    return kleinunternehmerFrei ? GRENZEN.ustSatzNull : num(satz, GRENZEN.ustSatzStandard);
  }

  /**
   * Prüfliste für die Pflichtangaben einer Rechnung (§ 14 Abs. 4 UStG)
   * und Hinweis auf § 19 UStG (kein USt-Ausweis als Kleinunternehmer).
   * Ergebnis je Feld: 'ok' | 'fehlt' | 'hinweis'
   */
  function rechnungsCheck(f) {
    f = f || {};
    var kl = kleinunternehmerStatus(f.vorjahrUmsatz, f.laufjahrUmsatz);
    var ustAusweis = !kl.frei;
    var felder = [
      { id: 'name', label: 'Vollständiger Name des Ausbilders', wert: f.name, pflicht: true },
      { id: 'anschrift', label: 'Anschrift des Ausbilders', wert: f.anschrift, pflicht: true },
      { id: 'kunde', label: 'Vollständiger Name des Leistungsempfängers', wert: f.kunde, pflicht: true },
      { id: 'kundeAnschrift', label: 'Anschrift des Leistungsempfängers', wert: f.kundeAnschrift, pflicht: true },
      { id: 'datum', label: 'Ausstellungsdatum', wert: f.datum, pflicht: true },
      { id: 'leistung', label: ' ' + 'Art und Umfang der Leistung / Menge und Bezeichnung', wert: f.leistung, pflicht: true },
      { id: 'preis', label: 'Nettobetrag bzw. Gesamtpreis', wert: f.preis, pflicht: true },
      { id: 'steuernummer', label: 'Steuernummer oder USt-IdNr. (falls vorhanden)', wert: f.steuernummer, pflicht: true, hinweis: 'Ist keine USt-IdNr. vorhanden, genügt die Steuernummer.' },
      { id: 'datumLeistung', label: 'Zeitpunkt der Leistung / Lieferdatum', wert: f.datumLeistung, pflicht: true },
      { id: 'ust', label: 'USt-Betrag und Steuersatz', wert: ustAusweis ? f.ust : 'entfällt (Kleinunternehmer nach § 19 UStG)', pflicht: ustAusweis }
    ];
    var geprueft = felder.map(function (x) {
      var v = x.wert === undefined || x.wert === null ? '' : String(x.wert).trim();
      var status = v.length > 0 ? 'ok' : (x.pflicht ? 'fehlt' : 'optional');
      return { id: x.id, label: x.label, status: status, hinweis: x.hinweis || '' };
    });
    var fehlend = geprueft.filter(function (x) { return x.status === 'fehlt'; }).length;
    return {
      kleinunternehmer: kl,
      ustAusweisPflichtig: ustAusweis,
      felder: geprueft,
      fehlend: fehlend,
      vollstaendig: fehlend === 0,
      hinweis: ustAusweis
        ? 'Als Kleinunternehmer nach § 19 UStG wird keine Umsatzsteuer ausgewiesen. Die Steuer wird vom Kunden nicht geschuldet.'
        : 'Kleinunternehmer-Status nach § 19 UStG: Grenzen eingehalten — keine Umsatzsteuer ausweisen, Rechnung ohne USt-Betrag.'
    };
  }

  /**
   * Impressum-Pflichtangaben nach § 5 Abs. 1 DDG für geschäftsmäßige,
   * in der Regel gegen Entgelt angebotene digitale Dienste.
   */
  function impressumCheck(f) {
    f = f || {};
    var felder = [
      { id: 'name', label: 'Name und Anschrift des Anbieters', wert: f.name, pflicht: true },
      { id: 'kontakt', label: 'Adresse für elektronische Post + schnelle Kontaktaufnahme (E-Mail/Telefon)', wert: f.kontakt, pflicht: true },
      { id: 'ustId', label: 'USt-IdNr. bzw. W-IdNr., falls vorhanden', wert: f.ustId, pflicht: false },
      { id: 'register', label: 'Handelsregister/Register und Registernummer (falls vorhanden)', wert: f.register, pflicht: false },
      { id: 'berufsrecht', label: 'Berufsrechtliche Angaben (nur bei reglementierten Berufen)', wert: f.berufsrecht, pflicht: false }
    ];
    var geprueft = felder.map(function (x) {
      var v = x.wert === undefined || x.wert === null ? '' : String(x.wert).trim();
      return { id: x.id, label: x.label, status: v.length > 0 ? 'ok' : (x.pflicht ? 'fehlt' : 'nicht vorhanden'), hinweis: '' };
    });
    var fehlend = geprueft.filter(function (x) { return x.status === 'fehlt'; }).length;
    return { felder: geprueft, fehlend: fehlend, vollstaendig: fehlend === 0 };
  }

  return {
    GRENZEN: GRENZEN,
    kleinunternehmerStatus: kleinunternehmerStatus,
    ustBetrag: ustBetrag,
    bruttoZuNetto: bruttoZuNetto,
    positionen: positionen,
    effektiverSatz: effektiverSatz,
    stundensatz: stundensatz,
    angebotspreis: angebotspreis,
    rechnungsCheck: rechnungsCheck,
    impressumCheck: impressumCheck,
    r2: r2
  };
});
