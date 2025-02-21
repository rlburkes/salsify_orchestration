/**
 * This module returns an object "SalsifyAI" that exposes provider-specific builder methods.
 * Each provider object includes chainable methods for configuration (setApiKey, setBaseUrl),
 * an addContext method to attach structured data to every prompt, and a callCompletion method
 * that supports simulation mode and a debug flag.
 *
 * This version is written in pure ES5 (synchronous, no Promises) and reuses the built request object.
 * It assumes that a synchronous web_request(url, method, payload, headers) function is available.
 */
function createSalsifyAI() {

  // A shared function to perform the web request using the built request object.
  function doRequest(requestObject) {
    return web_request(requestObject.url, requestObject.method, requestObject.payload, requestObject.headers);
  }

  // Build a request object based on the provider specifics.
  function buildRequest(providerName, finalApiKey, finalBaseUrl, fullPrompt, params) {
    var req = {};
    if (providerName === "OpenAI") {
      req.url = finalApiUrl(finalBaseUrl, "/chat/completions");
      req.method = "POST";
      req.headers = { "Authorization": "Bearer " + finalApiKey, "Content-Type": "application/json" };
      req.payload = {
        "model": params.model || "gpt-4",
        "messages": [{ "role": "user", "content": fullPrompt }],
        "max_tokens": params.max_tokens || 1000
      };
    } else if (providerName === "Anthropic") {
      // Updated for Claude per your curl:
      req.url = finalApiUrl(finalBaseUrl, "/v1/messages");
      req.method = "POST";
      req.headers = {
        "x-api-key": finalApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      };
      req.payload = {
        "model": params.model || "claude-3-5-sonnet-20241022",
        "max_tokens": params.max_tokens || 1024,
        "messages": [{ "role": "user", "content": fullPrompt }]
      };
    } else if (providerName === "Gemini") {
      req.url = finalApiUrl(finalBaseUrl, "") + "?key=" + finalApiKey;
      req.method = "POST";
      req.headers = { "Content-Type": "application/json" };
      req.payload = {
        "contents": [{
          "parts": [{ "text": fullPrompt }]
        }]
      };
      if (params.maxOutputTokens) {
        req.payload.maxOutputTokens = params.maxOutputTokens;
      }
    } else if (providerName === "Mistral") {
      req.url = finalApiUrl(finalBaseUrl, "/v1/complete");
      req.method = "POST";
      req.headers = { "Authorization": "Bearer " + finalApiKey, "Content-Type": "application/json" };
      req.payload = {
        "prompt": fullPrompt,
        "max_tokens": params.max_tokens || 1000
      };
    }
    return req;
  }

  // Helper to correctly join base URLs with endpoint paths.
  function finalApiUrl(base, path) {
    if (base.charAt(base.length - 1) === "/") {
      base = base.substr(0, base.length - 1);
    }
    return base + path;
  }

  // Factory function to create a provider-specific object.
  function createProvider(providerName, defaultBaseUrl, apiKey, baseUrl) {
    var finalApiKey = apiKey || "";
    var finalBaseUrl = baseUrl || defaultBaseUrl;
    var contexts = [];

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
      if (providerName === "OpenAI") {
        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
          return response.choices[0].message.content;
        }
      } else if (providerName === "Anthropic") {
        // Instead of looping, return the first element's value using its type key.
        if (response.content && response.content.length > 0 && response.content[0] && response.content[0].type) {
          return response.content[0][ response.content[0].type ] || "";
        }
        return "";
      } else if (providerName === "Gemini") {
        if (response.candidates && response.candidates.length > 0) {
          var candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return candidate.content.parts[0].text;
          }
        }
        return "";
      } else if (providerName === "Mistral") {
        return response.completion || response.text || "";
      }
      return "";
    }

    // Synchronous callCompletion function.
    // If params.simulate is true, it returns the request object that would be sent.
    function callCompletion(prompt, params) {
      if (!finalApiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      params = params || {};
      var debug = params.debug || false;
      var simulate = params.simulate || false;
      var fullPrompt = (contexts.length > 0 ? contexts.join("\n") + "\n" : "") + prompt;
      var requestObject = buildRequest(providerName, finalApiKey, finalBaseUrl, fullPrompt, params);
      if (simulate) {
        return requestObject;
      }
      var response = doRequest(requestObject);
      var content = extractContent(response);
      if (debug) {
        return {
          prompt: fullPrompt,
          request: requestObject,
          rawResponse: response,
          content: content
        };
      } else {
        return content;
      }
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
      return createProvider("OpenAI", "https://api.openai.com/v1", apiKey, baseUrl);
    },
    anthropicProvider: function(apiKey, baseUrl) {
      return createProvider("Anthropic", "https://api.anthropic.com", apiKey, baseUrl);
    },
    geminiProvider: function(apiKey, baseUrl) {
      return createProvider("Gemini", "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", apiKey, baseUrl);
    },
    mistralProvider: function(apiKey, baseUrl) {
      return createProvider("Mistral", "https://api.mistral.com", apiKey, baseUrl);
    }
  };
}

createSalsifyAI();
