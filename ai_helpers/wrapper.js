/**
 * Minimal ES5 module returning an object "SalsifyAI" with provider-specific
 * methods (e.g. openAIProvider, anthropicProvider) that each return an
 * AI client object. That AI client object has:
 *   - setApiKey(key)
 *   - setBaseUrl(url)
 *   - callCompletion(prompt, params)
 *
 * Relies on a synchronous web_request(url, method, payload, headers) function.
 */

function createSalsifyAI() {
  /**
   * Common factory to build a provider object with chainable config.
   */
  function createProvider(providerName, defaultBaseUrl, apiKey, baseUrl, callFn) {
    var finalApiKey = apiKey || "";
    var finalBaseUrl = baseUrl || defaultBaseUrl;

    // Chainable setter for API key
    function setApiKey(key) {
      finalApiKey = key;
      return this;
    }

    // Chainable setter for base URL
    function setBaseUrl(url) {
      finalBaseUrl = url;
      return this;
    }

    // The main completion call
    function callCompletion(prompt, params) {
      if (!finalApiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      return callFn(finalApiKey, finalBaseUrl, prompt, params || {});
    }

    // Return the provider object
    return {
      provider: providerName,
      setApiKey: setApiKey,
      setBaseUrl: setBaseUrl,
      callCompletion: callCompletion
    };
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
      // Add more Anthropic-specific fields if needed
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
      // Adjust as needed for Gemini
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
      // Add Mistral-specific fields if needed
    };
    var response = web_request(url, "POST", payload, headers);
    return response;
  }

  // ------------------ Public "SalsifyAI" object ------------------

  return {
    /**
     * Creates a provider object for OpenAI with optional immediate API key and base URL.
     */
    openAIProvider: function(apiKey, baseUrl) {
      return createProvider(
        "OpenAI",
        "https://api.openai.com/v1",
        apiKey,
        baseUrl,
        callOpenAI
      );
    },

    /**
     * Creates a provider object for Anthropic with optional immediate API key and base URL.
     */
    anthropicProvider: function(apiKey, baseUrl) {
      return createProvider(
        "Anthropic",
        "https://api.anthropic.com",
        apiKey,
        baseUrl,
        callAnthropic
      );
    },

    /**
     * Creates a provider object for Google Gemini with optional immediate API key and base URL.
     */
    geminiProvider: function(apiKey, baseUrl) {
      return createProvider(
        "Gemini",
        "https://api.google.com/gemini",
        apiKey,
        baseUrl,
        callGemini
      );
    },

    /**
     * Creates a provider object for Mistral with optional immediate API key and base URL.
     */
    mistralProvider: function(apiKey, baseUrl) {
      return createProvider(
        "Mistral",
        "https://api.mistral.com",
        apiKey,
        baseUrl,
        callMistral
      );
    }
  };
}

// Create the SalsifyAI object and return it so your system can bind to it.
createSalsifyAI();
