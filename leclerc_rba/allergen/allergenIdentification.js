// ==============================================
// FONCTIONS UTILITAIRES (UTILITY FUNCTIONS)
// ==============================================

// Fonction pour aplatir les tableaux à une seule valeur dans un objet ou un tableau
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
    return input;
}

// Fonction de journalisation pour activer les logs si le mode débogage est activé
// Logging utility to accumulate logs if debug mode is enabled
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

// Fonction pour sérialiser les objets de manière lisible pour le débogage ou l'interpolation de chaînes
// Function to serialize objects cleanly for debugging or string interpolation
function serializeObject(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return String(obj); // Fallback for circular references or non-serializable objects
    }
}

// ==============================================
// ANALYSE DES ALLERGÈNES (ALLERGEN ANALYSIS)
// ==============================================

// Fonction pour identifier les allergènes en utilisant l'IA
// Function to identify allergens using AI inference
function excecuteAllergenInference(contextData, aiEndpoint, apiKey, debugPrompt = false, debugResponse = false, logger = {}) {
    logger.log("Preparing inference request payload for allergen analysis...");

    const ingredients = serializeObject(contextData.ingredients["Ingrédients"]).split(',') || ["Unknown ingredients"];
    const knownAllergens = contextData.allergens_list.join(', ');

    // Préparer la charge utile (payload) pour GPT
    // Prepare the payload for GPT request
    const payload = {
    "model": "gpt-4o",
    "messages": [
        {
            "role": "system",
            "content": `You are a food allergen analysis assistant. Your task is to analyze each ingredient provided and determine if it contains or is associated with any of the following known allergens: ${knownAllergens}. Additionally, identify if any ingredient is likely to contain an allergen not part of the known list and provide a summary if allergens are likely mislabeled or missing.`
        },
        {
            "role": "user",
            "content": `Analyze the following product ingredients:\n\n(${ingredients.join(', ')})\n\nFor each ingredient, indicate whether it contains or is associated with any known allergens and if any potential unknown allergens should be considered.`
        }
    ],
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "strict": true,
            "name": "allergen_analysis",
            "schema": {
                "type": "object",
                "required": ["status", "ingredient_analysis", "summary"],
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["success", "error"],
                        "description": "Status of the analysis."
                    },
                    "ingredient_analysis": {
                        "type": "array",
                        "description": "Analysis of each ingredient and its association with known allergens.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "ingredient": {
                                    "type": "string",
                                    "description": "Name of the ingredient."
                                },
                                "associated_allergens": {
                                    "type": "array",
                                    "description": "List of known allergens associated with the ingredient.",
                                    "items": {
                                        "type": "string"
                                    }
                                },
                                "potential_unknown_allergens": {
                                    "type": "boolean",
                                    "description": "Indicates if the ingredient is likely to contain allergens not listed in the known allergens list."
                                }
                            },
                            "required": [
                                "ingredient",
                                "associated_allergens",
                                "potential_unknown_allergens"
                            ],
                            "additionalProperties": false
                        }
                    },
                    "summary": {
                        "type": "object",
                        "description": "Summarized response indicating if allergens are likely mislabeled or missing.",
                        "properties": {
                            "likely_mislabeled": {
                                "type": "boolean",
                                "description": "Indicates if the product likely has mislabeled or missing allergens."
                            },
                            "message": {
                                "type": "string",
                                "description": "Summary message with recommendations."
                            }
                        },
                        "required": ["likely_mislabeled", "message"],
                        "additionalProperties": false
                    }
                },
                "additionalProperties": false
            }
        }
    }
};

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };

    if (debugPrompt) {
        logger.log("Debug Prompt Enabled - Returning payload.");
        return { payload, logs: logger.getLogs() };
    }

    try {
        logger.log("Sending AI request...");
        
        const response =  web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
        
        if (debugResponse) {
            logger.log("Debug Response Enabled - Returning raw response.");
            return { response, logs: logger.getLogs() };
        }

        const analysis = JSON.parse(response.choices[0].message.content);

        logger.log("Allergen analysis completed successfully.");
        return {
            status: analysis.status,
            ingredient_analysis: analysis.ingredient_analysis,
            summary: analysis.summary,
            logs: logger.getLogs()
        };
    } catch (error) {
        logger.log(`AI request failed: ${error.message}`);
        return {
            status: "error",
            message: `AI request failed: ${error.message}`,
            logs: logger.getLogs()
        };
    }
}

// ==============================================
// FLUX PRINCIPAL (MAIN FLOW)
// ==============================================

const aiEndpoint = "https://api.openai.com/v1/chat/completions";
const apiKey = secret_value('open-ai-key');

// Options de débogage
// Debug options
const debugPrompt = false;
const debugResponse = false;
const forceLogging = true;

const logger = createLogger(debugPrompt || debugResponse || forceLogging);

const contextData = context.allergenInfo;

// Exécution de l'analyse des allergènes
// Perform allergen analysis
const allergenCheck = excecuteAllergenInference(contextData, aiEndpoint, apiKey, debugPrompt, debugResponse, logger);

// Résultat final
// Final result
const retVal = {
    "allergen_result": allergenCheck,
    "logs": logger.getLogs()
};

retVal;