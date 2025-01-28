// ==============================================
// FONCTIONS UTILITAIRES (UTILITY FUNCTIONS)
// ==============================================

// En-têtes pour la requête API OpenAI
// Headers for OpenAI API request
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${secret_value('open-ai-key')}`
};

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

// Fonction pour formater et sérialiser les valeurs dans une forme plus lisible
// Function to format and serialize values in a more human-readable form
function formatPropertyValue(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

// Fonction pour nettoyer les caractères indésirables (par exemple, \n) dans les valeurs
// Function to clean up unwanted characters (e.g., \n) from values
function sanitizeValue(value) {
  return typeof value === 'string' ? value.replace(/\n/g, ' ').trim() : value;
}

// Attribution des champs/métadonnées pour la proposition AOC
// Field attribution/context metadata for the AOC proposal
const fieldAttribution = {
  "appellationViticole": "This field is critical for determining if the wine's appellation conforms to legal AOC definitions.",
  "countryOfOrigin": "Country of origin can influence AOC classification by regional standards.",
  "wineRegion": "The region directly impacts AOC status, as certain AOCs are specific to regions.",
  "grapeVariety": "Some AOCs only allow specific grape varieties."
};

// Correspondance directe entre les clés de propriété et external_id
// Direct mapping from property keys to external_id
const propertyKeyToExternalIdMap = {
  "appellationViticole": "Appellation viticole",
  "countryOfOrigin": "Pays d’origine",
  "wineRegion": "Région Viticole",
  "grapeVariety": "Cépage"
};

// Fonction pour rechercher les valeurs de propriété à l'aide de la correspondance directe
// Function to lookup property values using the direct mapping
function lookupPropertyValues(entity, externalId) {
  const collection = entity?.propertyValueCollections?.find(p => p.property.externalId === externalId);
  return collection ? collection.values : null;
}

// Fonction pour structurer les propriétés pertinentes pour la génération AOC
// Function to structure the relevant properties for AOC generation
function structureAocProperties(entity, logger) {
  if (!entity || !entity.propertyValueCollections) {
    logger.log("Entity or propertyValueCollections is missing.");
    return {};
  }

  const relevantProperties = {};

  Object.keys(propertyKeyToExternalIdMap).forEach(key => {
    const externalId = propertyKeyToExternalIdMap[key];
    const values = lookupPropertyValues(entity, externalId);

    if (values) {
      relevantProperties[key] = values.map(value => sanitizeValue(formatPropertyValue(value)));
    }
  });

  logger.log("Structured AOC properties: " + JSON.stringify(relevantProperties));
  return relevantProperties;
}

// Fonction pour sérialiser les propriétés pertinentes en une chaîne de contexte pour la détermination AOC
// Function to serialize the relevant properties into a context string for AOC determination
function serializeAocContext(relevantProperties, logger) {
  const context = Object.entries(relevantProperties)
    .filter(([_, value]) => value && value.length > 0)
    .map(([key, value]) => {
      const contextInfo = fieldAttribution[key] ? ` (${fieldAttribution[key]})` : '';
      return `${key}${contextInfo}: ${value.join(', ')}`;
    })
    .join('\n');

  logger.log("Serialized AOC context: " + context);
  return context;
}

// Fonction pour récupérer la détermination AOC avec un format de réponse spécifié
// Function to fetch the AOC determination with specified response format
function fetchAocDeterminationSync(entity, context, debugPrompt, logger) {
  const relevantProperties = structureAocProperties(entity, logger);
  const serializedContext = serializeAocContext(relevantProperties, logger);

  const payload = {
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are tasked with proposing an appropriate Appellation d'Origine Contrôlée (AOC) for the supplied product. Analyze the product details and suggest a designation based on AOC regulations."
      },
      {
        "role": "user",
        "content": `Please provide a suggested AOC designation for the following product details:\n${serializedContext}`
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

  if (debugPrompt) {
    logger.log("Debug Prompt - Payload: " + JSON.stringify(payload));
    return { debug: true, payload };
  }

  try {
    logger.log("Sending AOC determination request with payload...");
    const aocResponse = webRequest('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
    logger.log("Received AOC response: " + JSON.stringify(aocResponse));
    return aocResponse || "Unable to provide AOC validation";
  } catch (error) {
    logger.log("Error fetching AOC determination: " + error.message);
    return `Error fetching AOC determination: ${error.message}`;
  }
}

// Fonction principale pour gérer les déterminations AOC
// Main function to handle AOC determinations
function handleAocDetermination(entity, context, debugPrompt = false) {
  const logger = createLogger(debugPrompt);
  const result = fetchAocDeterminationSync(entity, context, debugPrompt, logger);

  if (result?.choices?.[0]?.message?.content) {
    const response = JSON.parse(result.choices[0].message.content);
    response["debug"] = false;
    logger.log("Parsed AOC determination response: " + JSON.stringify(response));
    return response;
  } else {
    logger.log("Failed to parse AOC determination response.");
    return {
      "error": true,
      "debug": true,
      "context": context,
      "logs": logger.getLogs()
    };
  }
}

// Exemple d'utilisation avec un context.entity donné
// Example usage with a given context.entity
const debugMode = false;
const result = handleAocDetermination(context.entity, context, debugMode);
const logs = createLogger(true).getLogs();

const retVal = { result, logs };
retVal;
