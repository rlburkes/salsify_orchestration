/**
 * This module returns an object "SalsifyAI" that exposes provider-specific builder methods.
 * Each provider object includes chainable methods for configuration (setApiKey, setBaseUrl),
 * an addContext method to attach structured data to every prompt, and a callCompletion method
 * that supports simulation mode, a debug flag, and a response_format option.
 *
 * This version is written in pure ES5 (synchronous, no Promises) and assumes a synchronous
 * web_request(url, method, payload, headers) function is available.
 */
function createSalsifyAI() {

  // A shared function to perform the web request using the built request object.
  function performRequest(requestObject) {
    return web_request(requestObject.url, requestObject.method, requestObject.payload, requestObject.headers);
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

  // Simple validator function assumed to be defined elsewhere.
  // function validateResponseFormat(respFormat) { ... }

  // Build a request object based on provider specifics.
  function buildRequest(providerName, apiKey, baseUrl, prompt, params) {
    var request = {
      url: '',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: {}
    };

    switch (providerName) {
      case "OpenAI":
        request.url = finalApiUrl(baseUrl, "/chat/completions");
        request.headers.Authorization = "Bearer " + apiKey;
        request.payload = {
          model: params.model || "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: params.max_tokens || 1000
        };
        if (params.response_format) {
          request.payload.response_format = {
            json_schema: params.response_format,
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
          messages: [{ role: "user", content: prompt }]
        };
        break;

      case "Gemini":
        request.url = finalApiUrl(baseUrl, "") + "?key=" + apiKey;
        request.payload = {
          contents: [{ parts: [{ text: prompt }] }]
        };
        if (params.max_tokens) {
          request.payload.generationConfig = request.payload.generationConfig || {};
          request.payload.generationConfig.maxOutputTokens = params.max_tokens;
        }
        if (params.response_format) {
          request.payload.generationConfig = request.payload.generationConfig || {};
          request.payload.generationConfig.responseMimeType = "application/json";
          request.payload.generationConfig.responseSchema = convertResponseFormatForGemini(params.response_format);
        }
        break;

      case "Mistral":
        request.url = finalApiUrl(baseUrl, "/v1/chat/completions");
        request.headers.Authorization = "Bearer " + apiKey;
        request.headers.Accept = "application/json";
        request.payload = {
          model: params.model || "mistral-large-latest",
          messages: [{ role: "user", content: prompt }]
        };
        if (params.response_format) {
          request.payload.response_format = { type: "json_object" };
        }
        break;

      case "GeminiViaOpenAI":
        request.url = finalApiUrl(baseUrl, "");
        request.headers.Authorization = "Bearer " + apiKey;
        request.payload = {
          model: params.model || "gemini-2.0-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: params.max_tokens || 1000
        };
        if (params.response_format) {
          request.payload.response_format = {
            json_schema: params.response_format,
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

    function callCompletion(prompt, params) {
      if (!apiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      params = params || {};
      var debug = params.debug || false;
      var simulate = params.simulate || false;
      var fullPrompt = contexts.length > 0 ? contexts.join("\n") + "\n" + prompt : prompt;

      if (params.response_format && !providerSupportsJSON) {
        var directive = "----- RESPONSE WITH THIS SCHEMA: " + JSON.stringify(params.response_format) + "\n" +
                        "----- CRITICAL DIRECTIVE: Please output only the raw JSON without markdown formatting (NO backticks or language directive), explanation, or commentary.";
        fullPrompt = directive + "\n" + fullPrompt;
      } else if (params.response_format && providerSupportsJSON) {
        var errors = validateResponseFormat(params.response_format);
        if (errors.length > 0) {
          return errors;
        }
      }

      var requestObject = buildRequest(providerName, apiKey, baseUrl, fullPrompt, params);
      if (simulate) {
        return requestObject;
      }
      var response = performRequest(requestObject);
      var content = extractContent(response);

      if (params.response_format) {
        try {
          content = JSON.parse(content);
        } catch (e) {
          // If parsing fails, leave content as is.
        }
      }

      if (debug) {
        return {
          prompt: fullPrompt,
          request: requestObject,
          rawResponse: response,
          content: content
        };
      }
      return content;
    }

    var providerObj = {
      setApiKey: setApiKey,
      setBaseUrl: setBaseUrl,
      addContext: addContext,
      callCompletion: callCompletion
    };

    return providerObj;
  }

  return {
    openAIProvider: function(apiKey, baseUrl) {
      return createProvider("OpenAI", apiKey, baseUrl || "https://api.openai.com/v1");
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
