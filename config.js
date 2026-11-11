/*
 * Zentrale Konfiguration der Website.
 * Eine Datei steuert Verkaufsmodus, Preise, Checkout-Links und Domain.
 *
 * VERKAUF_AKTIV = false  ->  keine Preise, keine Kaufbuttons (nur kostenloses Werkzeug).
 *                           Rechtlich unkritisch: kostenloses Informationsangebot ohne
 *                           geschäftsmäßigen Verkauf, daher kein Impressum erforderlich.
 * VERKAUF_AKTIV = true   ->  Preise und Kaufbuttons werden sichtbar. Voraussetzung:
 *                           vollständiges Impressum (§ 5 DDG), AGB mit Widerrufsbestätigung
 *                           (§ 356 Abs. 6, § 312f BGB) und gesetzte Checkout-Links.
 *                           Prüfung: python3 scripts/check_release.py
 */
var CONFIG = {
  VERKAUF_AKTIV: false,

  /* Wird nach der Veröffentlichung mit der echten Domain gefüllt. */
  DOMAENE: "https://p-l-a-t-o-n.github.io/selbststaendigen-werkzeugkasten/",

  PREISE: {
    'werkzeug-set': { name: 'Werkzeug-Set', preis: '19 €' },
    'komplett-kit': { name: 'Komplett-Kit', preis: '39 €' }
  },

  /* Checkout-Links der Verkaufsplattform (z. B. Lemon Squeezy, Gumroad). */
  CHECKOUT: {
    'werkzeug-set': '',
    'komplett-kit': ''
  },

  /* Aufschaltung des Verkaufsmodus in der Oberfläche. */
  setzeVerkaufsmodus: function () {
    var kaufzeile = document.getElementById('kaufzeile');
    var preise = document.getElementById('preise');
    if (kaufzeile) kaufzeile.style.display = this.VERKAUF_AKTIV ? '' : 'none';
    if (preise) preise.style.display = this.VERKAUF_AKTIV ? '' : 'none';
    document.querySelectorAll('[data-buy]').forEach(function (a) {
      var key = a.getAttribute('data-buy');
      if (this.CHECKOUT[key]) {
        a.setAttribute('href', this.CHECKOUT[key]);
        a.classList.remove('btn-inaktiv');
      } else if (this.VERKAUF_AKTIV) {
        a.setAttribute('href', '#kauf-hinweis');
        a.classList.add('btn-inaktiv');
      }
    }.bind(this));
    var hinweis = document.getElementById('kauf-hinweis');
    if (hinweis) {
      hinweis.textContent = this.VERKAUF_AKTIV
        ? 'Der Verkauf läuft über die Verkaufsplattform — der Preis inklusive aller Gebühren steht dort.'
        : '';
    }
    var canonical = document.getElementById('canonical');
    if (canonical && this.DOMAENE) canonical.setAttribute('href', this.DOMAENE);
  }
};

document.addEventListener('DOMContentLoaded', function () {
  CONFIG.setzeVerkaufsmodus();
});
