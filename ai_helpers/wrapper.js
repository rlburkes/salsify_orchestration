/**
 * This module returns an object "SalsifyAI" that exposes provider-specific builder methods.
 * Each provider object includes chainable methods for configuration (e.g. setApiKey, setBaseUrl)
 * as well as an addContext method. The addContext method appends a clearly demarcated JSON blob
 * to the prompt before the callCompletion method sends it.
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
        // Pretty-print JSON with indentation.
        dataString = JSON.stringify(data, null, 2);
      } else {
        dataString = String(data);
      }
      var contextStr = "~~~~BEGIN " + noun + "~~~~\n" + dataString + "\n~~~~END " + noun + "~~~~";
      contexts.push(contextStr);
      return providerObj;
    }

    /**
     * Calls the completion API after pre-pending all stored context blocks to the prompt.
     *
     * @param {string} prompt - The original prompt.
     * @param {object} [params] - Additional parameters for the API call (e.g. max_tokens, model).
     * @returns {object} - The response from the API.
     */
    function callCompletion(prompt, params) {
      if (!finalApiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      params = params || {};

      var fullPrompt = "";
      if (contexts.length > 0) {
        fullPrompt = contexts.join("\n") + "\n";
      }
      fullPrompt += prompt;
      return callFn(finalApiKey, finalBaseUrl, fullPrompt, params);
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
    // Pass the payload object directly; web_request handles stringification/parsing.
    var response = web_request(url, "POST", payload, headers);
    return response;
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
    var response = web_request(url, "POST", payload, headers);
    return response;
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
    var response = web_request(url, "POST", payload, headers);
    return response;
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
    var response = web_request(url, "POST", payload, headers);
    return response;
  }

  // ------------------ Public SalsifyAI object ------------------

  return {
    /**
     * Returns an OpenAI provider object.
     * Usage:
     *   var openAI = SalsifyAI.openAIProvider("YOUR_KEY");
     *   openAI.addContext("Product Data", context.product);
     *   var result = openAI.callCompletion("Hello!", { max_tokens: 50 });
     */
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
