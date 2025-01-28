// Liste des propriétés nécessaires pour la détermination de l'AOC (Appellation d'Origine Contrôlée).
// List of properties required for AOC (Appellation d'Origine Contrôlée) determination.
const AOCDeterminationProperties = [
  "Appellation viticole",                          // Appellation viticole (Wine appellation)
  "Dénomination légale de vente",                  // Dénomination légale de vente (Legal denomination for sale)
  "Catégorie du produit",                          // Catégorie du produit (Product category)
  "Code Produit Accise France",                    // Code Produit Accise France (Excise product code for France)
  "Code Produit Accise Europe",                    // Code Produit Accise Europe (Excise product code for Europe)
  "Couleur des boissons alcoolisées",              // Couleur des boissons alcoolisées (Color of alcoholic beverages)
  "Contacts - Adresse - Code postal",              // Contacts - Adresse - Code postal (Contact address - Postal code)
  "Libellé commercial court",                      // Libellé commercial court (Short commercial label)
  "Libellé commercial long",                       // Libellé commercial long (Long commercial label)
  "Pays d’origine",                                // Pays d’origine (Country of origin)
  "Pays d'origine (Liste) - Pays d'origine (Liste)",// Pays d'origine (Liste) (Country of origin - List)
  "Pays d'origine (Liste) - Département/Région - Département/Région", // Département/Région (Department/Region)
  "GTIN-SUPPLIER"                                  // GTIN-SUPPLIER (Global Trade Item Number - Supplier)
];

// Initialisation d'un objet pour stocker les valeurs des propriétés sélectionnées.
// Initialize an object to store the selected property values.
var aocDeterminationValues = {};

// Remplissage de `aocDeterminationValues` en extrayant les valeurs des propriétés à partir de l'objet `entity`.
// Populate `aocDeterminationValues` by extracting property values from the `entity` object.
// Si une propriété n'est pas trouvée, elle est remplacée par une chaîne vide.
// If a property is not found, default to an empty string.
AOCDeterminationProperties.forEach(property => {
  aocDeterminationValues[property] = entity.property_values[property] || '';
});

// Exemple attendu de l'objet `aocDeterminationValues` généré à partir des données de l'entité.
// Expected example of the `aocDeterminationValues` object generated from entity data.
const exampleaocDeterminationValues = {
  "Appellation viticole": "Champagne ∣ LECLERC_WINE_APPELLATION_CHAMPAGNE",
  "Dénomination légale de vente": "Champagne PIPER-HEIDSIECK Vintage 2015 75cl en étui",
  "Catégorie du produit": "Vin & champagne, mousseux ∣ 82915",
  "Code Produit Accise France": "36 - Vins mousseux AOP et Champagnes ∣ 36",
  "Code Produit Accise Europe": "",
  "Couleur des boissons alcoolisées": "Blanc ∣ White",
  "Contacts - Adresse - Code postal": "51100",
  "Libellé commercial court": "PIPER-HEIDSIECK 2015 75cl étui",
  "Libellé commercial long": "Champagne PIPER-HEIDSIECK Vintage 2015 75cl en étui",
  "Pays d’origine": "France ∣ 250",
  "Pays d'origine (Liste) - Pays d'origine (Liste)": "France ∣ 250",
  "Pays d'origine (Liste) - Département/Région - Département/Région": "Champagne ∣ CHAMPAGNE",
  "GTIN-SUPPLIER": "03018333015483-PH-CH-203786"
};

// Retourne l'objet rempli contenant les propriétés liées à l'AOC.
// Return the populated object containing the selected AOC-related properties.
aocDeterminationValues;