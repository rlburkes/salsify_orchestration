// =========================================
// CONFIGURATION AND HELPER FUNCTIONS
// =========================================

// Headers for OpenAI API request
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${secret_value('open-ai-key')}`,
};

// Salsify logger for debugging
const logger = {
  logs: [],
  log(message) {
    this.logs.push(message);
  },
  getLogs() {
    return this.logs.join('\n');
  },
};

function levenshteinDistance(a, b) {
  const matrix = Array.from({
    length: a.length + 1,
  }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), // Substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

function findBestFuzzyMatch(input, enumList) {
  let bestMatch = null;
  let lowestDistance = Infinity;

  enumList.forEach((entry) => {
    const distance = levenshteinDistance(input.toLowerCase().replace(/[^a-z]/g, ''), entry.name.toLowerCase().replace(/[^a-z]/g, ''));
    if (distance < lowestDistance) {
      lowestDistance = distance;
      bestMatch = {
        id: entry.id,
        name: sanitizeString(entry.name)
      };
    }
  });

  return bestMatch;
}

const characterReplacements = {
  "√¥": "ô",
  "√®": "ê",
  "√©": "é",
  "√™": "’",
  "√µ": "µ",
  "√±": "ñ",
  "√§": "ç",
  "√´": "í",
  "√¶": "¶",
  "√∏": "π",
  "√≤": "≤",
  "√≥": "≥",
  "√∞": "∞",
  "√¢": "¢",
  "√£": "£",
  "√¨": "ë",
  "√•": "•",
  "√ª": "º",
  "√†": "†",
  "√ß": "ß"
};

/**
 * Function to sanitize a string by replacing corrupted characters
 * @param {string} inputString - The string to be sanitized
 * @returns {string} - The sanitized string with replaced characters
 */
function sanitizeString(inputString) {
  let sanitizedString = inputString;
  for (const [corrupted, correct] of Object.entries(characterReplacements)) {
    sanitizedString = sanitizedString.replace(new RegExp(corrupted, 'g'), correct);
  }
  return sanitizedString;
}

// Function to handle the web request with logging
function fetchBestFitDesignation(prompt, debugPrompt = false) {
  logger.log('Preparing to send request to OpenAI...');

  const payload = {
    model: 'gpt-4o',
    messages: [{
      role: 'system',
      content: "You are assisting with matching an Appellation d'Origine Contrôlée (AOC) value that the user will provide to find the best fit within a list of domain-specific enums. Assume the provided AOC is accurate for the product, but consider the provided reason for the recommendation. Prefer trending more specific to optimize for the best conceptual match given the provided details. Return ONLY the ID for the optimal designation.",
    },
    {
      role: 'user',
      content: prompt,
    },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        strict: true,
        name: 'aocDetermination',
        schema: {
          type: 'object',
          required: [
            'recommendedAocDesignation',
            'currentAocDesignation',
            'proposedAction',
            'message',
          ],
          properties: {
            message: {
              type: 'string',
            },
            proposedAction: {
              type: 'string',
            },
            currentAocDesignation: {
              type: 'string',
            },
            recommendedAocDesignation: {
              type: 'string',
            },
          },
          additionalProperties: false,
        },
      },
    },
  };

  if (debugPrompt) {
    logger.log('Debug mode enabled. Returning payload without sending request.');
    return {
      debug: true,
      payload,
      logs: logger.getLogs(),
    };
  }

  // Make the request to GPT and return the result
  try {
    logger.log('Sending request to OpenAI...');
    const response = web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
    logger.log('Received response from OpenAI.');
    return response;
  } catch (error) {
    logger.log(`Error fetching best fit designation: ${error}`);
    return {
      error: `Error fetching best fit designation: ${error}`,
      logs: logger.getLogs(),
    };
  }
}

// Function to generate a prompt and get the best-fit designation
function getBestFitDesignation(enumList, debugPrompt = false) {
  logger.log('Generating prompt for AOC best-fit designation...');

  const recommendedDesignation = context.aocDesignationResult.recommendedAocDesignation;
  const recommendationReason = context.aocDesignationResult.message;

  logger.log(`Recommended Designation: ${recommendedDesignation}`);
  logger.log(`Recommendation Reason: ${recommendationReason}`);
  logger.log(`Enum List: ${JSON.stringify(enumList)}`);

  // Create the prompt for the GPT completion
  const prompt = `Given the following recommended AOC/IGP designation: "${recommendedDesignation}" 
  suggested for the following reason: "${recommendationReason}", 
  find the best fit from this list: ${JSON.stringify(enumList)}`;

  logger.log('Fetching best fit designation from OpenAI...');
  const result = fetchBestFitDesignation(prompt, debugPrompt);

  if (result?.choices?.[0]?.message?.content) {
    const response = JSON.parse(result.choices[0].message.content);
    response.debug = false;
    logger.log(`Best Fit Designation Found: ${response.recommendedAocDesignation}`);
    return response;
  }
  logger.log('Error: No valid response received from OpenAI.');
  return {
    error: true,
    debug: true,
    context,
    logs: logger.getLogs(),
  };
}

// Example usage: Retrieve values from Salsify or provide fallback enum list
logger.log('Fetching enumeration list from Salsify...');
let enumList = value_from_salsify('/content_flow/data_sources/s-1cd9a600-7a5b-47bb-8f2f-c902702dada4/values', 'data', 'enums') || [{
  id: 'FAIL',
}];

let flatEnumList = JSON.parse(JSON.stringify(enumList))

logger.log('Normalizing enumeration list...');
let flateEnumList = flatEnumList.map((obj) => {
  const idWithPrefix = obj.id;
  obj.id = idWithPrefix.replace('LECLERC_WINE_APPELLATION_', '');
  return `${obj.id}`;
});

logger.log(`Processed flat enum list: ${JSON.stringify(flateEnumList)}`);

// Get the best-fit designation
const debugPrompt = context.aocDesignationResult.debug || false;
const bestFitDesignation = getBestFitDesignation(flateEnumList, debugPrompt);

const enumMatch = findBestFuzzyMatch(bestFitDesignation["recommendedAocDesignation"], enumList);
// Log final results
logger.log(`Best Fit Designation Result: ${JSON.stringify(bestFitDesignation)}`);

logger.log(`Best Enum Match Designation Result: ${JSON.stringify(enumMatch)}`);

// If debugging is enabled, include logs in the result
if (debugPrompt) {
  bestFitDesignation.logs = logger.getLogs();
}

const retVal = {
  conceptMatch: bestFitDesignation,
  enumMatch: enumMatch,
};

retVal;