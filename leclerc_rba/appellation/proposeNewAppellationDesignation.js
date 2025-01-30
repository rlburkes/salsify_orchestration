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
        "content": `Please provide an Appellation designation for the following product:\n${serializedContext}`
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
const debugMode = true;
const result = handleAocDetermination(context.entity, context, debugMode);
const logs = createLogger(true).getLogs();

const retVal = { result, logs };
retVal;
