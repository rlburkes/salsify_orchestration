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

  // Simple validator function assumed to be defined elsewhere.
  // function validateResponseFormat(respFormat) { ... }

  // Build a request object based on provider specifics.
  function buildRequest(providerName, finalApiKey, finalBaseUrl, fullPrompt, params) {
    var req = {};
    if (providerName === "OpenAI") {
      req.url = finalApiUrl(finalBaseUrl, "/chat/completions");
      req.method = "POST";
      req.headers = {
        "Authorization": "Bearer " + finalApiKey,
        "Content-Type": "application/json"
      };
      req.payload = {
        model: params.model || "gpt-4o",
        messages: [{ role: "user", content: fullPrompt }],
        max_tokens: params.max_tokens || 1000
      };
      if (params.response_format) {
        req.payload.response_format = {
          json_schema: params.response_format,
          type: 'json_schema'
        };
      }
    } else if (providerName === "Anthropic") {
      req.url = finalApiUrl(finalBaseUrl, "/v1/messages");
      req.method = "POST";
      req.headers = {
        "x-api-key": finalApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      };
      req.payload = {
        model: params.model || "claude-3-5-sonnet-20241022",
        max_tokens: params.max_tokens || 1024,
        messages: [{ role: "user", content: fullPrompt }]
      };
    } else if (providerName === "Gemini") {
      req.url = finalApiUrl(finalBaseUrl, "") + "?key=" + finalApiKey;
      req.method = "POST";
      req.headers = { "Content-Type": "application/json" };
      req.payload = {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      };
      if (params.max_tokens) {
        req.payload.generationConfig = req.payload.generationConfig || {};
        req.payload.generationConfig.maxOutputTokens = params.max_tokens;
      }
      if (params.response_format) {
        req.payload.generationConfig = req.payload.generationConfig || {};
        req.payload.generationConfig.responseMimeType = "application/json";
        req.payload.responseSchema = params.response_format;
      }
    } else if (providerName === "Mistral") {
      req.url = finalApiUrl(finalBaseUrl, "/v1/chat/completions");
      req.method = "POST";
      req.headers = {
        "Authorization": "Bearer " + finalApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      req.payload = {
        model: params.model || "mistral-large-latest",
        messages: [{ role: "user", content: fullPrompt }]
      };
      if (params.response_format) {
        req.payload.response_format = {
          type: "json_object"
        };
      }
    } else if (providerName === "GeminiViaOpenAI") {
      // New provider: Gemini via OpenAI
      req.url = finalApiUrl(finalBaseUrl, ""); // baseUrl already includes the endpoint.
      req.method = "POST";
      req.headers = {
        "Authorization": "Bearer " + finalApiKey,
        "Content-Type": "application/json"
      };
      req.payload = {
        model: params.model || "gemini-2.0-flash",
        messages: [{ role: "user", content: fullPrompt }],
        max_tokens: params.max_tokens || 1000
      };
      if (params.response_format) {
        req.payload.response_format = {
          json_schema: params.response_format,
          type: 'json_schema'
        };
      }
    }
    return req;
  }

  // Factory function to create a provider-specific object.
  function createProvider(providerName, apiKey, baseUrl) {
    var finalApiKey = apiKey || "";
    var finalBaseUrl = baseUrl || "";
    var contexts = [];
    // Providers that support response_format natively.
    var providerSupportsJSON = (providerName === "OpenAI" || providerName === "GeminiViaOpenAI");

    function setApiKey(key) {
      finalApiKey = key;
      return providerObj;
    }

    function setBaseUrl(url) {
      finalBaseUrl = url;
      return providerObj;
    }

    function addContext(noun, data) {
      var dataString = (typeof data === "object") ? JSON.stringify(data, null, 2) : String(data);
      var contextStr = "~~~~BEGIN " + noun + "~~~~\n" + dataString + "\n~~~~END " + noun + "~~~~";
      contexts.push(contextStr);
      return providerObj;
    }

    function extractContent(response) {
      if (providerName === "OpenAI" || providerName === "GeminiViaOpenAI") {
        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
          return response.choices[0].message.content;
        }
      } else if (providerName === "Anthropic") {
        if (response.content && response.content.length > 0 && response.content[0] && response.content[0].type) {
          return response.content[0][response.content[0].type] || "";
        }
      } else if (providerName === "Gemini") {
        if (response.candidates && response.candidates.length > 0) {
          var candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return candidate.content.parts[0].text;
          }
        }
      } else if (providerName === "Mistral") {
        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
          return response.choices[0].message.content;
        }
      }
      return "";
    }

    // Synchronous callCompletion function.
    // If params.simulate is true, returns the request object.
    function callCompletion(prompt, params) {
      if (!finalApiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      params = params || {};
      var debug = params.debug || false;
      var simulate = params.simulate || false;
      var fullPrompt = (contexts.length > 0 ? contexts.join("\n") + "\n" : "") + prompt;

      // If a response_format is provided and the provider does NOT support it natively,
      // prepend a directive.
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

      var requestObject = buildRequest(providerName, finalApiKey, finalBaseUrl, fullPrompt, params);
      if (simulate) {
        return requestObject;
      }
      var response = performRequest(requestObject);
      var content = extractContent(response);

      // If response_format is provided, attempt to JSON.parse the extracted content.
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
