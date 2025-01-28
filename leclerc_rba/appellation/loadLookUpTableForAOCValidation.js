// Logging utility that accumulates logs if debug mode is enabled
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

// Enable debugging based on context or default
const debugMode = context?.debug || false;
const logger = createLogger(debugMode);

// Function to decode UTF-8 correctly
function decodeUTF8(csvString) {
    try {
        return new TextDecoder('utf-8').decode(new Uint8Array([...csvString].map(c => c.charCodeAt(0))));
    } catch (e) {
        logger.log("Failed to decode UTF-8, using fallback.");
        return csvString; // Fallback for decoding issues
    }
}

// Function to normalize text and correct encoding issues
function normalizeText(text) {
    return text.normalize("NFC").replace(/‚à£/g, "∣");  // Replace incorrect characters
}

// Fetch and process CSV data
logger.log("Fetching CSV data from the provided URL.");
let csvString = web_request(secret_value("appellation-validation-lookup-table-url"), "get", {}, { 'Content-Type': 'text/csv; charset=utf-8' });

csvString = decodeUTF8(csvString);

const AOCDeterminationProperties = ['Libellé fiscal - Libellé fiscal', 'Code Produit Accise France'];

var selectedValues = {};

// Extract values from the entity
AOCDeterminationProperties.map(property => {
    selectedValues[property] = entity.property_values[property] || '';
    logger.log(`Extracted value for ${property}: ${selectedValues[property]}`);
    return selectedValues[property];
});

// Serialize objects cleanly for debugging or string interpolation
function serializeObject(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        logger.log("Error serializing object.");
        return String(obj); // Fallback for circular references or non-serializable objects
    }
}

// Parse the CSV with compound keys and normalization
function parseCSVWithCompoundKeysAndNormalization(csvString, compoundKeyField, prefixToStrip) {
    logger.log("Parsing CSV data.");
    const lines = csvString.split(/\r?\n/);
    const headers = lines[0].split(",");

    const data = lines.slice(1).map(line => {
        const values = line.split(",");
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = normalizeText(values[index]?.trim() || "");
            return obj;
        }, {});
    });

    logger.log(`Parsed ${data.length} rows from CSV.`);

    const lookupTable = new Map();
    const individualPartTable = new Map();
    const normalizedPartTable = new Map();

    data.forEach(item => {
        const rawCompoundKey = item[compoundKeyField];

        if (rawCompoundKey) {
            lookupTable.set(rawCompoundKey, item);

            const parts = rawCompoundKey.split("∣").map(part => part.trim());

            parts.forEach(part => {
                if (!individualPartTable.has(part)) {
                    individualPartTable.set(part, []);
                }
                individualPartTable.get(part).push(item);

                if (prefixToStrip && part.startsWith(prefixToStrip)) {
                    const normalizedPart = part.slice(prefixToStrip.length).trim();
                    if (!normalizedPartTable.has(normalizedPart)) {
                        normalizedPartTable.set(normalizedPart, []);
                    }
                    normalizedPartTable.get(normalizedPart).push(item);
                }
            });
        }
    });

    logger.log(`Lookup table contains ${lookupTable.size} entries.`);
    return {
        status: "success",
        message: "CSV parsed successfully.",
        data: { data, lookupTable, individualPartTable, normalizedPartTable }
    };
}

// Validate a product against the enumerated fields
function validateProduct(product, appellationCode, lookupTable) {
    logger.log(`Validating product against appellation code: ${appellationCode}`);
    const enumeratedData = lookupTable.get(appellationCode);

    if (!enumeratedData) {
        logger.log(`Appellation code "${appellationCode}" not found in lookup table.`);
        return {
            status: "error",
            message: `Appellation code "${appellationCode}" not found in the lookup table.`,
            performedChecks: ["Appellation viticole", "Code Produit Accise France", "Libellé fiscal - Libellé fiscal"],
            errors: [`Appellation code "${appellationCode}" not found in lookup table.`]
        };
    }

    const fieldsToValidate = [
        "Code Produit Accise France",
        "Libellé fiscal - Libellé fiscal"
    ];

    const checks = [];
    const errors = [];

    fieldsToValidate.forEach(field => {
        const expected = enumeratedData[field];
        const actual = product[field];

        checks.push({
            field,
            expected,
            actual,
            result: expected === actual ? "pass" : "fail"
        });

        if (expected !== actual) {
            logger.log(`Field mismatch: ${field}, expected: ${expected}, got: ${actual}`);
            errors.push(`Field "${field}" does not match. Expected "${expected}", got "${actual}".`);
        }
    });

    if (errors.length > 0) {
        logger.log("Validation failed with errors.");
        return {
            status: "error",
            message: "Validation failed.",
            performedChecks: checks,
            errors
        };
    }

    logger.log("Product validation successful.");
    return {
        status: "success",
        message: "Product is valid.",
        performedChecks: checks
    };
}

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
    return input; // Base case: return the value as-is if it's not an array or object
}

const prefixToStrip = "";
const parseResult = parseCSVWithCompoundKeysAndNormalization(csvString, "Appellation viticole", prefixToStrip);

if (parseResult.status === "success") {
    const { lookupTable } = parseResult.data;

    const recommendedAoc = `${context.bestFit.enumMatch.name} ∣ ${context.bestFit.enumMatch.id}`;
    logger.log(`Recommended AOC: ${recommendedAoc}`);

    const validationRecResult = validateProduct(flattenSingleValueArrays(selectedValues), recommendedAoc, lookupTable);
    const validatCurrentResult = validateProduct(flattenSingleValueArrays(selectedValues), context.aocDeterminationValues["Appellation viticole"][0], lookupTable);

    const result = {
        "recommended_appellation_results": validationRecResult,
        "current_appellation_results": validatCurrentResult,
        "logs": logger.getLogs()
    };

    logger.log("Validation process completed.");
    result;
} else {
    logger.log("CSV parsing failed.");
    parseResult;
}