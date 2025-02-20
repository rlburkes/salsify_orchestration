/**
 * This script returns a single abstraction object that:
 *  1) Allows you to set configuration (provider, apiKey, baseUrl).
 *  2) Lets you call callCompletion(...) to invoke the configured AI provider.
 *
 * It relies on a synchronous web_request(url, method, payload, headers) function
 * that your environment provides.
 */
function createAIAbstraction() {
  // Internal "state" for the abstraction
  var finalProvider = null;
  var finalApiKey = null;
  var finalBaseUrl = null;

  /**
   * Maps provider name to a default base URL if none is provided.
   */
  function getDefaultBaseUrl(provider) {
    var defaults = {
      "anthropic": "https://api.anthropic.com",
      "gemini":    "https://api.google.com/gemini",
      "openai":    "https://api.openai.com/v1",
      "mistral":   "https://api.mistral.com"
    };
    var lower = (provider || "").toLowerCase();
    if (!defaults[lower]) {
      throw new Error("Unsupported provider: " + provider);
    }
    return defaults[lower];
  }

  /**
   * Sets the config for which provider to use, along with API key and optional base URL.
   * @param {string} provider - e.g. "anthropic", "gemini", "openai", or "mistral"
   * @param {string} apiKey - The API key/token for that provider
   * @param {string} [baseUrl] - (Optional) If you need to override the default base URL
   */
  function setConfig(provider, apiKey, baseUrl) {
    finalProvider = (provider || "").toLowerCase();
    finalApiKey = apiKey;
    finalBaseUrl = baseUrl || getDefaultBaseUrl(finalProvider);
  }

  /**
   * Main method to request a completion from the configured provider.
   * @param {string} prompt - The user prompt or message
   * @param {object} [params] - Additional parameters (e.g. max_tokens, model)
   * @returns {object} - Parsed JSON response from the provider
   */
  function callCompletion(prompt, params) {
    if (!finalProvider || !finalApiKey) {
      throw new Error("Configuration not set. Call setConfig(provider, apiKey, [baseUrl]) first.");
    }
    params = params || {};

    if (finalProvider === "anthropic") {
      return callAnthropic(prompt, params);
    } else if (finalProvider === "gemini") {
      return callGemini(prompt, params);
    } else if (finalProvider === "openai") {
      return callOpenAI(prompt, params);
    } else if (finalProvider === "mistral") {
      return callMistral(prompt, params);
    } else {
      throw new Error("Unsupported provider: " + finalProvider);
    }
  }

  // ------------------ Provider-specific methods ------------------

  function callAnthropic(prompt, params) {
    var url = finalBaseUrl + "/v1/complete";
    var headers = {
      "Authorization": "Bearer " + finalApiKey,
      "Content-Type": "application/json"
    };
    var payload = {
      "prompt": prompt,
      "max_tokens": params.max_tokens || 1000
      // Add Anthropic-specific fields if needed
    };
    var response = web_request(url, "POST", payload, headers);
    return response;
  }

  function callGemini(prompt, params) {
    var url = finalBaseUrl + "/v1/complete";
    var headers = {
      "Authorization": "Bearer " + finalApiKey,
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

  function callOpenAI(prompt, params) {
    // Using OpenAI's Chat Completions endpoint
    var url = finalBaseUrl + "/chat/completions";
    var headers = {
      "Authorization": "Bearer " + finalApiKey,
      "Content-Type": "application/json"
    };
    var payload = {
      "model": params.model || "gpt-4",
      "messages": [{ "role": "user", "content": prompt }],
      "max_tokens": params.max_tokens || 1000
      // Add more OpenAI-specific fields if needed
    };
    var response = web_request(url, "POST", payload, headers);
    return response;
  }

  function callMistral(prompt, params) {
    var url = finalBaseUrl + "/v1/complete";
    var headers = {
      "Authorization": "Bearer " + finalApiKey,
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

  // Return the object that your system can bind to.
  // It exposes both setConfig and callCompletion.
  return {
    setConfig: setConfig,
    callCompletion: callCompletion
  };
}

// Create the abstraction and return it.
// Your system can then do something like:
//   myAI.setConfig("openai", "YOUR_KEY");
//   var result = myAI.callCompletion("Hello!", { max_tokens: 50 });
var AIAbstraction = createAIAbstraction();
AIAbstraction;
