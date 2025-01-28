// Headers for OpenAI API request
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${secret_value('open-ai-key')}`
};

// Function to format and serialize values in a more human-readable form
function formatPropertyValue(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

// Function to clean up unwanted characters (e.g., \n) from values
function sanitizeValue(value) {
  return typeof value === 'string' ? value.replace(/\\n/g, ' ').trim() : value;
}

// Field attribution/context metadata for the AOC proposal
const fieldAttribution = {
  "appellationViticole": "This field is critical for determining if the wine's appellation conforms to legal AOC definitions.",
  "countryOfOrigin": "Country of origin can influence AOC classification by regional standards.",
  "wineRegion": "The region directly impacts AOC status, as certain AOCs are specific to regions.",
  "grapeVariety": "Some AOCs only allow specific grape varieties."
};

// Direct mapping from property keys to external_id
const propertyKeyToExternalIdMap = {
  "appellationViticole": "Appellation viticole",
  "countryOfOrigin": "Pays d’origine",
  "wineRegion": "Région Viticole",
  "grapeVariety": "Cépage"
};

// Function to lookup property values using the direct mapping
function lookupPropertyValues(entity, externalId) {
  const collection = entity?.propertyValueCollections?.find(p => p.property.externalId === externalId);
  return collection ? collection.values : null;
}

// Function to structure the relevant properties for AOC generation
function structureAocProperties(entity) {
  if (!entity || !entity.propertyValueCollections) {
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

  return relevantProperties;
}

// Function to serialize the relevant properties into a context string for AOC determination
function serializeAocContext(relevantProperties) {
  return Object.entries(relevantProperties)
    .filter(([_, value]) => value && value.length > 0)
    .map(([key, value]) => {
      const contextInfo = fieldAttribution[key] ? ` (${fieldAttribution[key]})` : '';
      return `${key}${contextInfo}: ${value.join(', ')}`;
    })
    .join('\n');
}

// Function to fetch the AOC determination with specified response format
function fetchAocDeterminationSync(entity, context, debugPrompt = false) {
  const relevantProperties = structureAocProperties(entity);
  const serializedContext = serializeAocContext(relevantProperties);

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
    return { debug: true, payload };
  }

  try {
    const aocResponse = webRequest('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
    return aocResponse || "Unable to provide AOC validation";
  } catch (error) {
    return `Error fetching AOC determination: ${error}`;
  }
}

// Main function to handle AOC determinations
function handleAocDetermination(entity, context, debugPrompt = false) {
  const result = fetchAocDeterminationSync(entity, context, debugPrompt);

  if (result?.choices?.[0]?.message?.content) {
    const response = JSON.parse(result.choices[0].message.content);
    response["debug"] = false;
    return response;
  } else {
    return {
      "error": true,
      "debug": true,
      "context": context
    };
  }
}

// Example usage with a given context.entity
const debugMode = false;
handleAocDetermination(context.entity, context, debugMode);
