/**
 * This module returns an object "SalsifyAI" that exposes provider-specific builder methods.
 * Each provider object includes chainable methods for configuration (e.g. setApiKey, setBaseUrl)
 * as well as an addContext method to attach structured data to every prompt.
 *
 * The callCompletion method now supports a debug flag:
 *   - When debug is false (default), it returns the extracted content.
 *   - When debug is true, it returns an object with the full prompt, raw response, and extracted content.
 *
 * Relies on a synchronous web_request(url, method, payload, headers) function provided by your environment.
 */
function createSalsifyAI() {

  /**
   * Internal factory function to create a provider object with chainable configuration.
   * It maintains a list of context strings (each with a demarcation header/footer) that get prepended to the prompt.
   *
   * @param {string} providerName - e.g. "OpenAI", "Anthropic", etc.
   * @param {string} defaultBaseUrl - The default API base URL for the provider.
   * @param {string} apiKey - Optional immediate API key.
   * @param {string} baseUrl - Optional base URL override.
   * @param {function} callFn - The provider-specific function that makes the web request.
   * @returns {object} - The provider object exposing configuration methods and callCompletion.
   */
  function createProvider(providerName, defaultBaseUrl, apiKey, baseUrl, callFn) {
    var finalApiKey = apiKey || "";
    var finalBaseUrl = baseUrl || defaultBaseUrl;
    var contexts = [];

    // Chainable setter for API key
    function setApiKey(key) {
      finalApiKey = key;
      return providerObj;
    }

    // Chainable setter for base URL
    function setBaseUrl(url) {
      finalBaseUrl = url;
      return providerObj;
    }

    /**
     * Appends context data to be automatically included with every completion call.
     * The context is wrapped with a demarcation block based on the provided noun.
     *
     * @param {string} noun - A descriptor for the context (e.g. "Product Data").
     * @param {object|string} data - The data to include. If an object, it will be stringified.
     * @returns {object} - The provider object (for chaining).
     */
    function addContext(noun, data) {
      var dataString;
      if (typeof data === "object") {
        dataString = JSON.stringify(data, null, 2);
      } else {
        dataString = String(data);
      }
      var contextStr = "~~~~BEGIN " + noun + "~~~~\n" + dataString + "\n~~~~END " + noun + "~~~~";
      contexts.push(contextStr);
      return providerObj;
    }

    /**
     * Extracts the relevant text content from the raw response, based on the provider.
     * For OpenAI, it pulls from choices[0].message.content.
     * For Anthropic, Gemini, and Mistral it looks for a 'completion' or 'text' field.
     *
     * @param {object} response - The raw response object.
     * @returns {string} - The extracted content (or an empty string if not found).
     */
    function extractContent(response) {
      if (providerName === "OpenAI") {
        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
          return response.choices[0].message.content;
        }
      } else if (providerName === "Anthropic") {
        return response.completion || "";
      } else if (providerName === "Gemini" || providerName === "Mistral") {
        return response.completion || response.text || "";
      }
      return "";
    }

    /**
     * Calls the completion API after pre-pending all stored context blocks to the prompt.
     * If params.debug is true, returns an object with the full prompt, raw response, and extracted content.
     * Otherwise, returns just the extracted content.
     *
     * @param {string} prompt - The original prompt.
     * @param {object} [params] - Additional parameters for the API call (e.g. max_tokens, model, debug).
     * @returns {object|string} - The filtered content or a detailed object if debug is true.
     */
    function callCompletion(prompt, params) {
      if (!finalApiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      params = params || {};
      var debug = params.debug || false;

      var fullPrompt = (contexts.length > 0 ? contexts.join("\n") + "\n" : "") + prompt;
      var response = callFn(finalApiKey, finalBaseUrl, fullPrompt, params);
      var content = extractContent(response);

      if (debug) {
        return {
          prompt: fullPrompt,
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

  // ------------------ Provider-specific call functions ------------------

  function callOpenAI(apiKey, baseUrl, prompt, params) {
    var url = baseUrl + "/chat/completions";
    var headers = {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    };
    var payload = {
      "model": params.model || "gpt-4",
      "messages": [{ "role": "user", "content": prompt }],
      "max_tokens": params.max_tokens || 1000
    };
    // web_request handles JSON conversion.
    return web_request(url, "POST", payload, headers);
  }

  function callAnthropic(apiKey, baseUrl, prompt, params) {
    var url = baseUrl + "/v1/complete";
    var headers = {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    };
    var payload = {
      "prompt": prompt,
      "max_tokens": params.max_tokens || 1000
    };
    return web_request(url, "POST", payload, headers);
  }

  function callGemini(apiKey, baseUrl, prompt, params) {
    var url = baseUrl + "/v1/complete";
    var headers = {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    };
    var payload = {
      "prompt": prompt,
      "max_tokens": params.max_tokens || 1000
    };
    return web_request(url, "POST", payload, headers);
  }

  function callMistral(apiKey, baseUrl, prompt, params) {
    var url = baseUrl + "/v1/complete";
    var headers = {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    };
    var payload = {
      "prompt": prompt,
      "max_tokens": params.max_tokens || 1000
    };
    return web_request(url, "POST", payload, headers);
  }

  // ------------------ Public SalsifyAI object ------------------

  return {
    openAIProvider: function(apiKey, baseUrl) {
      return createProvider("OpenAI", "https://api.openai.com/v1", apiKey, baseUrl, callOpenAI);
    },
    anthropicProvider: function(apiKey, baseUrl) {
      return createProvider("Anthropic", "https://api.anthropic.com", apiKey, baseUrl, callAnthropic);
    },
    geminiProvider: function(apiKey, baseUrl) {
      return createProvider("Gemini", "https://api.google.com/gemini", apiKey, baseUrl, callGemini);
    },
    mistralProvider: function(apiKey, baseUrl) {
      return createProvider("Mistral", "https://api.mistral.com", apiKey, baseUrl, callMistral);
    }
  };
}

// Create the SalsifyAI object and return it so your service can bind to it.
createSalsifyAI();
