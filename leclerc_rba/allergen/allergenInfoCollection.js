// ===========================================
// CONFIGURATION ET FONCTIONS D'AIDE 
// CONFIGURATION AND HELPER FUNCTIONS
// ===========================================

// Fonction pour aplatir les tableaux à valeur unique dans un objet ou un tableau
// Function to flatten single-value arrays in an object or array
function flattenSingleValueArrays(input) {
    if (Array.isArray(input)) {
        return input.map(flattenSingleValueArrays);
    } else if (typeof input === "object" && input !== null) {
        const result = {};
        for (const [key, value] of Object.entries(input)) {
            if (Array.isArray(value) && value.length === 1) {
                result[key] = flattenSingleValueArrays(value[0]);
            } else {
                result[key] = flattenSingleValueArrays(value);
            }
        }
        return result;
    }
    return input; // Retourne la valeur telle quelle si elle n'est ni un tableau ni un objet
}

// Fonction de journalisation pour le débogage
// Logging utility for debugging purposes
function createLogger(debugMode) {
    const logs = [];
    return {
        log: (message) => {
            if (debugMode) {
                logs.push(message);
            }
        },
        getLogs: () => logs
    };
}

// Définition du mode de débogage basé sur le contexte ou par défaut sur false
// Debug mode based on context or default to false
const debugMode = context?.debug || false;
const logger = createLogger(debugMode);

// ===========================================
// EXTRACTION DES DONNÉES D'INGRÉDIENTS 
// INGREDIENT DATA EXTRACTION
// ===========================================

// Liste des propriétés des ingrédients à récupérer
// List of ingredient properties to be extracted
const IngredientProperties = [
    "Ingrédients",
    "L'emballage contient-il des renseignements sur les ingrédients du produit?",
    "Type d'allergène - Niveau de contenance",
    "Type d'allergène - Type d'allergène"
];

let selectedValues = {};

// Extraire les valeurs de l'entité
// Extract values from the entity
IngredientProperties.forEach(property => {
    selectedValues[property] = entity.property_values[property] || '';
    logger.log(`Valeur extraite pour ${property}: ${selectedValues[property]}`);
});

logger.log("Collecte des données d'ingrédients terminée.");
// Collected ingredient property data.

// ===========================================
// RÉCUPÉRATION DE LA LISTE DES ALLERGÈNES 
// FETCHING ALLERGEN LIST
// ===========================================

// URL de la liste des allergènes stockée en secret
// Allergen list URL stored in a secret value
const allergenCsvUrl = secret_value('allergen-csv-url');
logger.log(`Récupération de la liste des allergènes depuis l'URL: ${allergenCsvUrl}`);

let csvString;
try {
    // Effectuer une requête pour récupérer le fichier CSV
    // Perform web request to fetch the allergen CSV file
    csvString = web_request(allergenCsvUrl, "get", {}, { 'Content-Type': 'text/csv; charset=utf-8' });
    logger.log("Le fichier CSV des allergènes a été récupéré avec succès.");
} catch (error) {
    logger.log(`Erreur lors de la récupération de la liste des allergènes: ${error.message}`);
}

// Fonction pour analyser le CSV et extraire les allergènes
// Function to parse CSV and extract allergens
function parseAllergenCsv(csvString) {
    const lines = csvString.split("\n");
    if (lines.length < 2) {
        return [];
    }
    
    // Remove first element as it is a header row.
    lines.shift()

    // Extraction de la première ligne (noms des allergènes)
    // Extract first row headers (allergen names)
    const values = lines.map(val => val.split(',')[0].trim());
    logger.log(`Allergènes extraits: ${values.join(', ')}`);

    return values;
}

// Analyse de la liste des allergènes à partir du CSV
// Parse allergen list from CSV
const allergensList = parseAllergenCsv(csvString);

if (allergensList.length === 0) {
    logger.log("Aucun allergène trouvé dans le fichier CSV.");
}

logger.log(`Chargement réussi de ${allergensList.length} allergènes.`);
// Successfully loaded allergens

// ===========================================
// STOCKAGE DES DONNÉES DANS LE CONTEXTE
// STORING DATA IN CONTEXT
// ===========================================

// Stocker les données des ingrédients et des allergènes dans le contexte pour les étapes suivantes
// Store ingredient and allergen data in context for future steps
const contextData = {
    "ingredients": selectedValues,
    "allergens_list": allergensList,
    "logs": logger.getLogs()
};

logger.log("Données extraites stockées dans le contexte.");
// Stored extracted data in context

// Retourner les données collectées
// Return collected data
contextData;