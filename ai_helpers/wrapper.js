function AIModelWrapper(provider, apiKey, baseUrl) {
  this.provider = provider.toLowerCase();
  this.apiKey = apiKey;
  this.baseUrl = baseUrl || this.getDefaultBaseUrl(provider);
}

AIModelWrapper.prototype.getDefaultBaseUrl = function(provider) {
  var defaults = {
    'anthropic': 'https://api.anthropic.com',
    'gemini': 'https://api.google.com/gemini',
    'openai': 'https://api.openai.com/v1',
    'mistral': 'https://api.mistral.com'
  };
  if (!defaults[provider.toLowerCase()]) {
    throw new Error("Unsupported provider: " + provider);
  }
  return defaults[provider.toLowerCase()];
};

AIModelWrapper.prototype.callCompletion = function(prompt, params) {
  params = params || {};
  if (this.provider === 'anthropic') {
    return this.callAnthropic(prompt, params);
  } else if (this.provider === 'gemini') {
    return this.callGemini(prompt, params);
  } else if (this.provider === 'openai') {
    return this.callOpenAI(prompt, params);
  } else if (this.provider === 'mistral') {
    return this.callMistral(prompt, params);
  } else {
    throw new Error("Unsupported provider: " + this.provider);
  }
};

AIModelWrapper.prototype.callAnthropic = function(prompt, params) {
  var url = this.baseUrl + "/v1/complete";
  var headers = {
    "Authorization": "Bearer " + this.apiKey,
    "Content-Type": "application/json"
  };
  var payload = {
    "prompt": prompt,
    "max_tokens": params.max_tokens || 1000
    // Include any additional Anthropic-specific parameters here.
  };
  var response = web_request(url, "POST", JSON.stringify(payload), headers);
  return JSON.parse(response);
};

AIModelWrapper.prototype.callGemini = function(prompt, params) {
  var url = this.baseUrl + "/v1/complete";
  var headers = {
    "Authorization": "Bearer " + this.apiKey,
    "Content-Type": "application/json"
  };
  var payload = {
    "prompt": prompt,
    "max_tokens": params.max_tokens || 1000
    // Adjust payload parameters as required by Google Gemini.
  };
  var response = web_request(url, "POST", JSON.stringify(payload), headers);
  return JSON.parse(response);
};

AIModelWrapper.prototype.callOpenAI = function(prompt, params) {
  var url = this.baseUrl + "/chat/completions";
  var headers = {
    "Authorization": "Bearer " + this.apiKey,
    "Content-Type": "application/json"
  };
  var payload = {
    "model": params.model || "gpt-4",
    "messages": [{ "role": "user", "content": prompt }],
    "max_tokens": params.max_tokens || 1000
  };
  var response = web_request(url, "POST", JSON.stringify(payload), headers);
  return JSON.parse(response);
};

AIModelWrapper.prototype.callMistral = function(prompt, params) {
  var url = this.baseUrl + "/v1/complete";
  var headers = {
    "Authorization": "Bearer " + this.apiKey,
    "Content-Type": "application/json"
  };
  var payload = {
    "prompt": prompt,
    "max_tokens": params.max_tokens || 1000
    // Add any Mistral-specific parameters here.
  };
  var response = web_request(url, "POST", JSON.stringify(payload), headers);
  return JSON.parse(response);
};

// Example usage:
// var wrapper = new AIModelWrapper("openai", "YOUR_OPENAI_API_KEY");
// var promptText = "Explain the theory of relativity in simple terms.";
// var result = wrapper.callCompletion(promptText, { max_tokens: 150 });

