export type Language = "en" | "de";

export const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.overview": "Overview",
    "nav.materials": "Materials",
    "nav.products": "Products",
    "nav.orders": "Orders",
    "nav.suppliers": "Suppliers",
    "nav.reports": "Reports",
    "nav.settings": "Settings",

    // Page titles
    "page.overview": "Overview",
    "page.materials": "Materials",
    "page.products": "Products",
    "page.orders": "Orders",
    "page.suppliers": "Suppliers",
    "page.reports": "Reports",
    "page.settings": "Settings",

    // Page subtitles
    "subtitle.overview": "Factory operations at a glance",
    "subtitle.materials": "Raw material inventory and stock management",
    "subtitle.products": "Product catalog, dimensions, and specifications",
    "subtitle.orders": "Customer orders and production fulfillment",
    "subtitle.suppliers": "Supplier directory and performance tracking",
    "subtitle.reports": "Analytics, exports, and operational reports",
    "subtitle.settings": "System configuration and preferences",

    // KPI Cards
    "kpi.total_materials": "Total Materials",
    "kpi.open_orders": "Open Orders",
    "kpi.low_stock": "Low Stock Items",
    "kpi.production_capacity": "Production Capacity",

    // Common buttons & actions
    "btn.add": "Add",
    "btn.edit": "Edit",
    "btn.delete": "Delete",
    "btn.save": "Save",
    "btn.cancel": "Cancel",
    "btn.preview": "Preview",
    "btn.download": "Download",
    "btn.export": "Export",
    "btn.import": "Import",
    "btn.search": "Search",

    // Status values
    "status.pending": "Pending",
    "status.in_production": "In Production",
    "status.completed": "Completed",
    "status.delayed": "Delayed",
    "status.cancelled": "Cancelled",

    // Language
    "lang.english": "English",
    "lang.german": "German",
  },
  de: {
    // Navigation
    "nav.overview": "Übersicht",
    "nav.materials": "Materialien",
    "nav.products": "Produkte",
    "nav.orders": "Bestellungen",
    "nav.suppliers": "Lieferanten",
    "nav.reports": "Berichte",
    "nav.settings": "Einstellungen",

    // Page titles
    "page.overview": "Übersicht",
    "page.materials": "Materialien",
    "page.products": "Produkte",
    "page.orders": "Bestellungen",
    "page.suppliers": "Lieferanten",
    "page.reports": "Berichte",
    "page.settings": "Einstellungen",

    // Page subtitles
    "subtitle.overview": "Fabrikbetrieb auf einen Blick",
    "subtitle.materials": "Rohstoffinventar und Bestandsverwaltung",
    "subtitle.products": "Produktkatalog, Abmessungen und Spezifikationen",
    "subtitle.orders": "Kundenbestellungen und Produktionserfüllung",
    "subtitle.suppliers": "Lieferantenverzeichnis und Leistungsverfolgung",
    "subtitle.reports": "Analysen, Exporte und Betriebsberichte",
    "subtitle.settings": "Systemkonfiguration und Einstellungen",

    // KPI Cards
    "kpi.total_materials": "Gesamtmaterialien",
    "kpi.open_orders": "Offene Bestellungen",
    "kpi.low_stock": "Artikel mit niedrigem Bestand",
    "kpi.production_capacity": "Produktionskapazität",

    // Common buttons & actions
    "btn.add": "Hinzufügen",
    "btn.edit": "Bearbeiten",
    "btn.delete": "Löschen",
    "btn.save": "Speichern",
    "btn.cancel": "Abbrechen",
    "btn.preview": "Vorschau",
    "btn.download": "Herunterladen",
    "btn.export": "Exportieren",
    "btn.import": "Importieren",
    "btn.search": "Suchen",

    // Status values
    "status.pending": "Ausstehend",
    "status.in_production": "In Produktion",
    "status.completed": "Abgeschlossen",
    "status.delayed": "Verspätet",
    "status.cancelled": "Abgebrochen",

    // Language
    "lang.english": "English",
    "lang.german": "Deutsch",
  },
};

export function t(key: string, lang: Language): string {
  return dictionaries[lang][key] || key;
}
