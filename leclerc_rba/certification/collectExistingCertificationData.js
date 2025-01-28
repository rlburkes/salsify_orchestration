// Fonction pour créer un logger pour déboguer les étapes
// Function to create a logger for debugging steps
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

// Task function to extract properties from the product context
function extractCertificateData(productContext) {
  /*
    This function extracts the required properties from the provided product context object.
    It ensures all fields are accounted for and includes fallbacks for missing values.
    Cette fonction extrait les propriétés requises de l'objet contexte produit fourni.
    Elle garantit que tous les champs sont pris en compte et inclut des solutions de repli en cas de valeurs manquantes.
  */

  // Define the required fields
  const requiredFields = [
    "Informations sur le certificat biologique - Date de fin de validité",
    "Informations sur le certificat biologique - Date de début de validité",
    "Informations sur les certifications - Détails concernant le certificat - Date de fin de validité de la certification",
    "Informations sur les certifications - Description de l'agence de certification",
    "Informations sur les certifications - Agence de certification",
    "Informations sur le certificat biologique - Valeur du certificat",
    "Informations sur les certifications - Type de certificat",
    "Statut biologique du produit - Certification Biologique"
  ];

  // Extract values from the product context's property_value_collections
  const extractedData = {};
  const propertyCollections = productContext.entity.property_value_collections;

  for (let field of requiredFields) {
    const matchingProperty = propertyCollections.find(collection =>
      collection.property && collection.property.external_id === field
    );
    if (matchingProperty && matchingProperty.values.length > 0) {
      logger.log(`Field: ${field}, values: ${matchingProperty.values} extracted`);
      extractedData[field] = matchingProperty.values; // Assuming the first value is the relevant one
    } else {
      logger.log(`Missing field: ${field}`);
      extractedData[field] = null; // Set default value if field is missing
    }
  }

  // Return the extracted data
  return extractedData;
}

const debugMode = true;
const logger = createLogger(debugMode);

// Execute the extraction and log the result
const result = extractCertificateData(context);
const retVal = {
  result: result,
  logs: logger.getLogs()
}
