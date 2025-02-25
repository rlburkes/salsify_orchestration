/**
 * This module returns an object "SalsifyAI" that exposes provider-specific builder methods.
 * Each provider object includes chainable methods for configuration (setApiKey, setBaseUrl),
 * an addContext method to attach structured data to every prompt, and a callCompletion method
 * that supports simulation mode (via debugPrompt), a debugResponse flag, and a responseFormat option.
 *
 * This version is written in pure ES5 (synchronous, no Promises) and assumes a synchronous
 * web_request(url, method, payload, headers) function is available.
 */
function createSalsifyAI() {

  // A shared function to perform the web request using the built request object.
  function performRequest(requestObject) {
    try {
      if (requestObject.debugPrompt) {
        return requestObject;
      } else {
        return web_request(requestObject.url, requestObject.method, requestObject.payload, requestObject.headers);
      }
    } catch (e) {
      return { "status": "failure", "request": requestObject, "message": e };
    }
  }

  // Helper to correctly join a base URL with an endpoint path.
  function finalApiUrl(base, path) {
    if (base.charAt(base.length - 1) === "/") {
      base = base.substr(0, base.length - 1);
    }
    return base + path;
  }

  // Converts response format for Gemini provider.
  function convertResponseFormatForGemini(responseFormat) {
    if (typeof responseFormat !== "object" || responseFormat === null) {
      return responseFormat;
    }
    if (responseFormat.hasOwnProperty("schema")) {
      var newSchema = JSON.parse(JSON.stringify(responseFormat.schema));
      if (newSchema.hasOwnProperty("additionalProperties")) {
        delete newSchema.additionalProperties;
      }
      return newSchema;
    }
    return responseFormat;
  }

  function validateResponseFormat(respFormat) {
    var errors = [];

    // Check that respFormat is a non-null object.
    if (typeof respFormat !== "object" || respFormat === null) {
      errors.push("Response format must be a non-null object.");
      return errors;
    }

    // Check for required properties and their types.
    if (!respFormat.hasOwnProperty("name")) {
      errors.push("Missing 'name' property.");
    }

    if (respFormat.strict !== true) {
      errors.push("'strict' property must be true.");
    }

    // Validate the 'schema' property.
    if (!respFormat.hasOwnProperty("schema") || typeof respFormat.schema !== "object" || respFormat.schema === null) {
      errors.push("Missing or invalid 'schema' property.");
    } else {
      var schema = respFormat.schema;

      // Validate schema properties.
      if (schema.type !== "object") {
        errors.push("Schema 'type' must be 'object'.");
      }

      if (!schema.hasOwnProperty("properties") || typeof schema.properties !== "object" || schema.properties === null) {
        errors.push("Schema must have a 'properties' object.");
      }

      if (!schema.hasOwnProperty("required") || !Array.isArray(schema.required)) {
        errors.push("Schema must have a 'required' array.");
      }

      if (schema.additionalProperties !== false) {
        errors.push("Schema 'additionalProperties' must be explicitly false.");
      }
    }

    return errors;
  }

  // Updated buildProviderMessage now includes providerName as first argument.
  function buildProviderMessage(providerName, role, content) {
    switch (providerName) {
      case "Mistral":
      case "Anthropic":
      case "GeminiViaOpenAI":
      case "OpenAI":
        return [{ role: role, content: content }];
      case "Gemini":
        return [{ parts: [{ text: content }], role: "user" }];
      default:
        throw new Error("Unsupported provider: " + providerName);
    }
  }

  function buildMessages(providerName, prompt) {
    if (typeof prompt === "string") {
      return buildProviderMessage(providerName, "user", prompt);
    } else if (Array.isArray(prompt)) {
      return prompt.map(function(item) {
        if (Array.isArray(item) && item.length === 2) {
          return { role: item[0], content: item[1] };
        } else if (typeof item === "object" && item.hasOwnProperty("role") && item.hasOwnProperty("content")) {
          return item;
        } else {
          throw new Error(`Invalid message format: each message must be a [role, content] tuple or an object with role and content. Got ${item}`);
        }
      });
    } else {
      throw new Error("Prompt must be a string or an array of messages or role/content tuples.");
    }
  }

  function basePayload(params) {
    return {
      url: '',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: {},
      debugPrompt: params.debugPrompt || false,
      debugResponse: params.debugResponse || false
    };
  }

  // Build a request object based on provider specifics.
  function buildRequest(providerName, apiKey, baseUrl, messages, params) {
    var request = basePayload(params);

    switch (providerName) {
      case "OpenAI":
        request.url = finalApiUrl(baseUrl, "/v1/chat/completions");
        request.headers.Authorization = "Bearer " + apiKey;
        request.payload = {
          model: params.model || "gpt-4o",
          messages: messages,
          max_tokens: params.max_tokens || 1000
        };
        if (params.responseFormat) {
          request.payload.response_format = {
            json_schema: params.responseFormat,
            type: 'json_schema'
          };
        }
        break;

      case "Anthropic":
        request.url = finalApiUrl(baseUrl, "/v1/messages");
        request.headers["x-api-key"] = apiKey;
        request.headers["anthropic-version"] = "2023-06-01";
        request.payload = {
          model: params.model || "claude-3-5-sonnet-20241022",
          max_tokens: params.max_tokens || 1024,
          messages: messages
        };
        break;

      case "Gemini":
        request.url = finalApiUrl(baseUrl, "") + "?key=" + apiKey;
        request.payload = {
          contents: messages
        };
        if (params.max_tokens) {
          request.payload.generationConfig = request.payload.generationConfig || {};
          request.payload.generationConfig.maxOutputTokens = params.max_tokens;
        }
        if (params.responseFormat) {
          request.payload.generationConfig = request.payload.generationConfig || {};
          request.payload.generationConfig.responseMimeType = "application/json";
          request.payload.generationConfig.responseSchema = convertResponseFormatForGemini(params.responseFormat);
        }
        break;

      case "Mistral":
        request.url = finalApiUrl(baseUrl, "/v1/chat/completions");
        request.headers.Authorization = "Bearer " + apiKey;
        request.headers.Accept = "application/json";
        request.payload = {
          model: params.model || "mistral-large-latest",
          messages: messages
        };
        if (params.responseFormat) {
          request.payload.response_format = { type: "json_object" };
        }
        break;

      case "GeminiViaOpenAI":
        request.url = finalApiUrl(baseUrl, "");
        request.headers.Authorization = "Bearer " + apiKey;
        request.payload = {
          model: params.model || "gemini-2.0-flash",
          messages: messages,
          max_tokens: params.max_tokens || 1000
        };
        if (params.responseFormat) {
          request.payload.response_format = {
            json_schema: params.responseFormat,
            type: 'json_schema'
          };
        }
        break;

      default:
        throw new Error("Unsupported provider: " + providerName);
    }

    return request;
  }

  // Factory function to create a provider-specific object.
  function createProvider(providerName, apiKey, baseUrl) {
    var apiKey = apiKey || "";
    var baseUrl = baseUrl || "";
    var contexts = [];
    var providerSupportsJSON = (providerName === "OpenAI" || providerName === "GeminiViaOpenAI");

    function setApiKey(key) {
      apiKey = key;
      return providerObj;
    }

    function setBaseUrl(url) {
      baseUrl = url;
      return providerObj;
    }

    function addContext(noun, data) {
      var dataString = (typeof data === "object") ? JSON.stringify(data, null, 2) : String(data);
      var contextStr = "~~~~BEGIN " + noun + "~~~~\n" + dataString + "\n~~~~END " + noun + "~~~~";
      contexts.push(contextStr);
      return providerObj;
    }

    function extractContent(response) {
      switch (providerName) {
        case "OpenAI":
        case "GeminiViaOpenAI":
          return response.choices && response.choices[0].message ? response.choices[0].message.content : "";
        case "Anthropic":
          return response.content && response.content[0] ? response.content[0][response.content[0].type] || "" : "";
        case "Gemini":
          var candidate = response.candidates && response.candidates[0];
          return candidate && candidate.content && candidate.content.parts[0] ? candidate.content.parts[0].text : "";
        case "Mistral":
          return response.choices && response.choices[0].message ? response.choices[0].message.content : "";
        default:
          return "";
      }
    }

    function serializeContext(messages) {

      if (contexts.length < 1) {
        return contexts;
      }

      switch (providerName) {
        case "Anthropic":
          return messages.unshift({ role: "user", content: contexts.join("\n") });
        case "Gemini":
          return messages.unshift({ role: "user", parts: [ { text: contexts.join("\n") } ] });
        default:
          return messages.unshift({ role: "system", content: contexts.join("\n") });
      }
    }

    function extractJSON(content, coerceJSON) {
      if (coerceJSON) {
        try {
          return JSON.parse(content);
        } catch (e) {
          // If parsing fails, leave content as is.
          return content;
        }
      }
      return content;
    }

    function callCompletion(prompt, params) {
      if (!apiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      params = params || {};

      // if (Array.isArray(prompt)) {
      //   throw new Error(`These Prompts be whilllin Got ${prompt.length}, ${prompt}`);
      // }
      var messages = buildMessages(providerName, prompt);
      // Ensure that the response format is valid if present, and if the provider doesn't support JSON append the format to the context as a directive to the LLM.
      if (params.responseFormat) {
        if (providerSupportsJSON) {
          var errors = validateResponseFormat(params.responseFormat);
          if (errors.length > 0) {
            return errors;
          }
        } else {
          addContext("RESPOND WITH THIS SCHEMA", JSON.stringify(params.responseFormat));
          addContext("RESPONSE DIRECTIVE", "Please output only the raw JSON without markdown formatting (NO backticks or language directive), explanation, or commentary");
        }
      }

      // Serialize any added CONTEXTS to the request;
      serializeContext(messages);

      var requestObject = buildRequest(providerName, apiKey, baseUrl, messages, params);

      var response = requestObject; // default to the request so we can debug
      if (!requestObject.debugPrompt) {
        response = performRequest(requestObject);
      }

      if (requestObject.debugResponse || requestObject.debugPrompt) {
        return response;
      } else {
        response = extractJSON(extractContent(response), params.responseFormat || false);
      }

      return response;
    }

    // New method to support multi-modal image analysis.
    function callImageAnalysis(imageUrls, prompt, params) {
      if (!Array.isArray(imageUrls)) {
        throw new Error("Image URLs must be provided as an array.");
      }

      if (providerName != "Mistral" && providerName != "OpenAI") {
        throw new Error(`Image analysis is not currently supported for ${providerName}.`)
      }

      params = params || {};

      params["model"] = params["model"] || ((providerName === "OpenAI")? "4o" : "pixtral-12b-2409")
      // Build an image message. Here we simply join the image URLs into a text string.
      var imageMessageTuples = imageUrls.map(imageUrl => {
        var img = (providerName === "OpenAI") ? { "url": imageUrl } : imageUrl;
        return ["user", [{ "type": "image_url", "image_url": img }]];
      });

      imageMessageTuples.push(["user", [{ "type": "text", "text": prompt }]]);

      return callCompletion(imageMessageTuples, params);
    }

    var providerObj = {
      setApiKey: setApiKey,
      setBaseUrl: setBaseUrl,
      addContext: addContext,
      callCompletion: callCompletion,
      callImageAnalysis: callImageAnalysis
    };

    return providerObj;
  }

  return {
    openAIProvider: function(apiKey, baseUrl) {
      return createProvider("OpenAI", apiKey, baseUrl || "https://api.openai.com");
    },
    anthropicProvider: function(apiKey, baseUrl) {
      return createProvider("Anthropic", apiKey, baseUrl || "https://api.anthropic.com");
    },
    geminiProvider: function(apiKey, baseUrl) {
      return createProvider("Gemini", apiKey, baseUrl || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
    },
    mistralProvider: function(apiKey, baseUrl) {
      return createProvider("Mistral", apiKey, baseUrl || "https://api.mistral.ai");
    },
    geminiViaOpenAIProvider: function(apiKey, baseUrl) {
      return createProvider("GeminiViaOpenAI", apiKey, baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    }
  };
}

createSalsifyAI();
