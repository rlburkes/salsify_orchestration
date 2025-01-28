// =========================================
// CONFIGURATION AND HELPER FUNCTIONS
// =========================================

// Configuration des en-têtes pour l'API OpenAI (authentification et type de contenu)
// Setting up headers for the OpenAI API (authentication and content type)
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${secret_value('open-ai-key')}`
};

// Logging utility that accumulates logs if debug mode is enabled
// Utilitaire de journalisation qui accumule les logs si le mode debug est activé
function createLogger(debug) {
  const logs = [];
  
  return {
    log: (message) => {
      if (debug) {
        logs.push(message);
      }
    },
    getLogs: () => logs
  };
}

/* 
  Expected Data Flow:
  entity.property_value_collections -> lookupPropertyValues() -> structureAOCProperties() -> serializeAOCContext() -> fetchAOCDeterminationSync() -> handleAOCDetermination()
*/

// Fonction pour formater et sérialiser les valeurs de manière lisible
// Function to format and serialize values in a human-readable way
function formatPropertyValue(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

// Fonction pour nettoyer les caractères non souhaités (par exemple, suppression des retours à la ligne)
// Function to clean up unwanted characters (e.g., removing newlines)
function sanitizeValue(value) {
  return typeof value === 'string' ? value.replace(/\\n/g, ' ').trim() : value;
}

// Attribution de champs / Métadonnées contextuelles
// Field attribution / Context metadata
const fieldAttribution = {
  "Appellation Viticole": "This field is critical for determining if the wine's appellation conforms to legal AOC definitions.",
  "Appellation Viticole (Computed)": "This field contains computed data about the wine's appellation, which may provide additional insight.",
  "Country of Origin": "Country of origin can influence AOC classification by regional standards.",
  "Wine Region": "The region directly impacts AOC status, as certain AOCs are specific to regions.",
  "Grape Variety (Cépage)": "Some AOCs only allow specific grape varieties.",
  "Alcohol Content (Degré d'alcool)": "Certain AOC rules stipulate alcohol content ranges.",
  "Aromas (Arômes)": "The aromas could align with regional flavor profiles required for specific AOCs.",
  "Tasting Characteristics": "Tasting characteristics help ensure the product aligns with the sensory expectations of a given AOC.",
  "Aging Potential (Potentiel de garde)": "Aging potential may be part of the requirements for particular AOCs.",
  "Excise Code (Code Produit Accise France)": "French excise codes can be linked to the legal classification of AOCs.",
  "Customs Classification Code": "Customs codes can be tied to how products are taxed or classified, potentially impacting AOC designation.",
  "Domain or Château Name": "A Château's name may have historical or legal significance tied to AOC regulations.",
  "Brand Name": "Marketing standards and branding rules may tie into specific AOC rules.",
  "Legal Sales Name": "The legal sales name is the officially recognized designation under local or national law. It reflects how the product is classified for sale, often including terms related to the wine’s geographic designation (AOC, IGP, etc.). This name must comply with the regulatory framework governing appellations, making it a direct indicator of the wine’s intended classification and helping to confirm if it aligns with the appropriate designation.",
  "Vineyard Region": "The vineyard region provides the geographical origin of the wine, which is fundamental to AOC and IGP designations. AOC classifications are tightly bound to specific regions, and only wines produced in those areas can claim the corresponding designation. Identifying the vineyard region ensures that the wine complies with the geographic boundaries necessary for the designation",
  "Producer Postal Code": "The postal code gives precise geographic information about the producer’s location, helping verify if the vineyard falls within the boundary of a legally protected appellation. Many AOCs and IGPs have stringent geographic limits, and the postal code allows for fine-grained validation of whether the product comes from an approved area."
};

// Mappage direct des clés de propriétés aux identifiants externes
// Direct mapping of property keys to external identifiers
const propertyKeyToExternalIdMap = {
  "Appellation Viticole": "Appellation viticole",
  "Appellation Viticole (Computed)": "Appellation viticole (computed)",
  "Country of Origin": "Pays d’origine",
  "Wine Region": "Région Viticole",
  "Grape Variety": "Cépage",
  "Alcohol Content": "Degré d'alcool",
  "Aromas": "Arômes",
  "Tasting Characteristics": "Caractéristiques de dégustation",
  "Aging Potential": "Potentiel de garde",
  "Excise Code": "Code Produit Accise France",
  "Customs Classification Code": "Code de nomenclature douanière",
  "Domain or Château Name": "Nom du domaine ou château",
  "Brand Name": "Marque commerciale",
  "Legal Sales Name": "Dénomination légale de vente",
  "Vineyard Region": "Région du vignoble",
  "Producer Postal Code": "Contacts - Adresse - Code postal"
};

// =========================================
// CORE PROCESSING FUNCTIONS
// =========================================

// Fonction pour rechercher les valeurs de propriété à l'aide du mappage d'identifiants externes
// Function to lookup property values using the external ID mapping
function lookupPropertyValues(entity, externalId, logger) {
  logger.log(`Looking up property values for: ${externalId}`);
  const collection = entity?.property_value_collections?.find(p => p.property.external_id === externalId);
  return collection ? collection.values : null;
}

// Fonction pour structurer les propriétés pertinentes pour l'évaluation de l'AOC
// Function to structure relevant properties for AOC determination
function structureAOCProperties(entity, logger) {
  if (!entity || !entity.property_value_collections) {
    logger.log("Entity or property collections are missing.");
    return {};
  }

  const relevantProperties = {};

  Object.keys(propertyKeyToExternalIdMap).forEach(key => {
    const externalId = propertyKeyToExternalIdMap[key];
    const values = lookupPropertyValues(entity, externalId, logger);

    if (values) {
      relevantProperties[key] = values.map(value => sanitizeValue(formatPropertyValue(value)));
      logger.log(`Structured property: ${key} -> ${relevantProperties[key]}`);
    }
  });

  return relevantProperties;
}

// Fonction pour sérialiser les propriétés pertinentes dans une chaîne de contexte lisible
// Function to serialize relevant properties into a human-readable context string
function serializeAOCContext(relevantProperties, logger) {
  logger.log("Serializing AOC context...");
  const contextString = Object.entries(relevantProperties)
    .filter(([_, value]) => value && value.length > 0)
    .map(([key, value]) => {
      const contextInfo = fieldAttribution[key] ? ` (${fieldAttribution[key]})` : '';
      return `${key}${contextInfo}: ${value.join(', ')}`;
    })
    .join('\n');
  logger.log(`Serialized context:\n${contextString}`);
  return contextString;
}

// =========================================
// API CALL FUNCTION
// =========================================

// Fonction pour obtenir la détermination AOC via l'API OpenAI
// Function to fetch AOC determination via the OpenAI API
function fetchAOCDeterminationSync(entity, context, debug = false) {
  const logger = createLogger(debug);

  const relevantProperties = structureAOCProperties(entity, logger);
  const serializedContext = serializeAOCContext(relevantProperties, logger);
  const currentClassification = context?.aocDeterminationValues?.['Appellation viticole'] || 'Unknown';

  const payload = {
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are tasked with evaluating whether the designated classification of a product matches the standards for its assigned Appellation d'Origine Contrôlée (AOC). Review the product details and determine if the classification is appropriate based on AOC regulations and guidelines. The current designation should be considered the 'current_aoc_designation' for response purposes. The reccomended designation sould be determined by you, and use the 'recommended_aoc_designation' key when responding. The 'message' key should include any context or reasoning you think is relevant to support your reccomendation. I'd like you to deeply consider any provided clues you can leverage from the provided product info, default to being over specific where evidence supports your designation"
      },
      {
        "role": "user",
        "content": `Current Designation: ${currentClassification}\nRelevant Product Data:\n${serializedContext}`
      }
    ],
   "response_format": {
      "type": "json_schema",
      "json_schema": {
        "strict": true,
        "name": "aocDetermination",
        "schema": {
          "type": "object",
          "required": [
            "recommendedAocDesignation",
            "message"
          ],
          "properties": {
            "message": {
              "type": "string"
            },
            "recommendedAocDesignation": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      }
    }
  };

  logger.log(`Payload prepared for OpenAI request.`);

  if (debug) {
    return { debug: true, payload, logs: logger.getLogs() };
  }

  try {
    const aocResponse = web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
    logger.log(`Received response from OpenAI.`);
    return aocResponse || "Unable to provide AOC Validation";
  } catch (error) {
    logger.log(`Error fetching AOC determination: ${error}`);
    return { error: `Error fetching AOC determination: ${error}`, logs: logger.getLogs() };
  }
}

// =========================================
// MAIN EXECUTION FLOW
// =========================================

// Fonction principale pour gérer la détermination AOC
// Main function to handle AOC determination
function handleAOCDetermination(entity, context, debug = false) {
  const result = fetchAOCDeterminationSync(entity, context, debug);

  if (result?.choices?.[0]?.message?.content) {
    const response = JSON.parse(result.choices[0].message.content);
    response["debug"] = debug;
    return { ...response, logs: debug ? result.logs : undefined };
  } else {
    return {
      "error": true,
      "debug": debug,
      "context": context,
      "logs": debug ? result.logs : undefined
    };
  }
}

/*
Expected AOC Response Data Flow:
handleAOCDetermination() ->
  fetchAOCDeterminationSync() ->
    OpenAI API ->
      {
        "recommendedAocDesignation": "Champagne",
        "currentAocDesignation": "Champagne",
        "message": "The current designation is correct."
      }
*/

// Exemple d'utilisation
// Example response format 

// - valid
// {
//   "recommendedAocDesignation": "Champagne AOC",
//   "currentAocDesignation": "Champagne",
//   "message": "The current designation is correct. No changes recommended.",
//   "debug": true,
//   "logs": [
//     "Looking up property values for: Appellation viticole",
//     "Structured property: Appellation Viticole -> Champagne ∣ LECLERC_WINE_APPELLATION_CHAMPAGNE",
//     "Serializing AOC context...",
//     "Serialized context:\nAppellation Viticole (Champ déterminant la conformité AOC du vin.): Champagne ∣ LECLERC_WINE_APPELLATION_CHAMPAGNE",
//     "Payload prepared for OpenAI request.",
//     "Received response from OpenAI."
//   ]
// }

// - invalid
// {
//   "recommendedAocDesignation": "Bordeaux AOC",
//   "currentAocDesignation": "Champagne",
//   "message": "The current designation may be incorrect. Bordeaux AOC is recommended.",
//   "debug": false
// }

// - error
// {
//   "error": true,
//   "debug": true,
//   "context": {
//     "aocDeterminationValues": {
//       "Appellation viticole": "Champagne"
//     }
//   },
//   "logs": [
//     "Looking up property values for: Appellation viticole",
//     "Entity or property collections are missing.",
//     "Payload prepared for OpenAI request.",
//     "Error fetching AOC determination: Network timeout"
//   ]
// }

const debugPrompt = false;
handleAOCDetermination(context.entity, context, debugPrompt);