// Helper to correctly join a base URL with an endpoint path.
function finalApiUrl(base, path) {
  if (base.charAt(base.length - 1) === "/") {
    base = base.substr(0, base.length - 1);
  }
  return base + path;
}

/**
 * Base Provider "class" – defines common properties and methods.
 */
function Provider(apiKey, baseUrl) {
  this.apiKey = apiKey || "";
  this.baseUrl = baseUrl || "";
  this.contexts = [];
}

Provider.prototype.setApiKey = function(key) {
  this.apiKey = key;
  return this;
};

Provider.prototype.setBaseUrl = function(url) {
  this.baseUrl = url;
  return this;
};

Provider.prototype.addContext = function(noun, data) {
  var dataString = (typeof data === "object") ? JSON.stringify(data, null, 2) : String(data);
  var contextStr = "~~~~BEGIN " + noun + "~~~~\n" + dataString + "\n~~~~END " + noun + "~~~~";
  this.contexts.push(contextStr);
  return this;
};

// Abstract: must be implemented in subclasses.
Provider.prototype.buildRequest = function(fullPrompt, params) {
  throw new Error("buildRequest not implemented");
};

// Abstract: must be implemented in subclasses.
Provider.prototype.extractContent = function(response) {
  throw new Error("extractContent not implemented");
};

Provider.prototype.callCompletion = function(prompt, params) {
  if (!this.apiKey) {
    throw new Error("No API key set.");
  }
  params = params || {};
  var debug = params.debug || false;
  var simulate = params.simulate || false;
  var fullPrompt = (this.contexts.length > 0 ? this.contexts.join("\n") + "\n" : "") + prompt;
  var requestObject = this.buildRequest(fullPrompt, params);

  if (simulate) {
    return requestObject;
  }

  // Use the synchronous web_request function (assumed to be defined).
  var response = web_request(requestObject.url, requestObject.method, requestObject.payload, requestObject.headers);
  var content = this.extractContent(response);

  if (debug) {
    return {
      prompt: fullPrompt,
      request: requestObject,
      rawResponse: response,
      content: content
    };
  }
  return content;
};

/* ===================== Discrete Provider Implementations ===================== */

// OpenAIProvider
function OpenAIProvider(apiKey, baseUrl) {
  Provider.call(this, apiKey, baseUrl || "https://api.openai.com/v1");
}
OpenAIProvider.prototype = Object.create(Provider.prototype);
OpenAIProvider.prototype.constructor = OpenAIProvider;

OpenAIProvider.prototype.buildRequest = function(fullPrompt, params) {
  return {
    url: finalApiUrl(this.baseUrl, "/chat/completions"),
    method: "POST",
    headers: {
      "Authorization": "Bearer " + this.apiKey,
      "Content-Type": "application/json"
    },
    payload: {
      model: params.model || "gpt-4",
      messages: [{ role: "user", content: fullPrompt }],
      max_tokens: params.max_tokens || 1000
    }
  };
};

OpenAIProvider.prototype.extractContent = function(response) {
  if (response.choices && response.choices.length > 0 && response.choices[0].message) {
    return response.choices[0].message.content;
  }
  return "";
};

// AnthropicProvider (Claude)
function AnthropicProvider(apiKey, baseUrl) {
  Provider.call(this, apiKey, baseUrl || "https://api.anthropic.com");
}
AnthropicProvider.prototype = Object.create(Provider.prototype);
AnthropicProvider.prototype.constructor = AnthropicProvider;

AnthropicProvider.prototype.buildRequest = function(fullPrompt, params) {
  return {
    url: finalApiUrl(this.baseUrl, "/v1/messages"),
    method: "POST",
    headers: {
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    payload: {
      model: params.model || "claude-3-5-sonnet-20241022",
      max_tokens: params.max_tokens || 1024,
      messages: [{ role: "user", content: fullPrompt }]
    }
  };
};

AnthropicProvider.prototype.extractContent = function(response) {
  // Instead of looping, return response.content[0][ response.content[0].type ]
  if (response.content && response.content.length > 0 && response.content[0] && response.content[0].type) {
    return response.content[0][response.content[0].type] || "";
  }
  return "";
};

// GeminiProvider
function GeminiProvider(apiKey, baseUrl) {
  Provider.call(this, apiKey, baseUrl || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
}
GeminiProvider.prototype = Object.create(Provider.prototype);
GeminiProvider.prototype.constructor = GeminiProvider;

GeminiProvider.prototype.buildRequest = function(fullPrompt, params) {
  var url = finalApiUrl(this.baseUrl, "") + "?key=" + this.apiKey;
  var payload = {
    contents: [{
      parts: [{ text: fullPrompt }]
    }]
  };
  if (params.maxOutputTokens) {
    payload.maxOutputTokens = params.maxOutputTokens;
  }
  return {
    url: url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: payload
  };
};

GeminiProvider.prototype.extractContent = function(response) {
  if (response.candidates && response.candidates.length > 0) {
    var candidate = response.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      return candidate.content.parts[0].text;
    }
  }
  return "";
};

// MistralProvider
function MistralProvider(apiKey, baseUrl) {
  Provider.call(this, apiKey, baseUrl || "https://api.mistral.ai");
}
MistralProvider.prototype = Object.create(Provider.prototype);
MistralProvider.prototype.constructor = MistralProvider;

MistralProvider.prototype.buildRequest = function(fullPrompt, params) {
  return {
    url: finalApiUrl(this.baseUrl, "/v1/chat/completions"),
    method: "POST",
    headers: {
      "Authorization": "Bearer " + this.apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    payload: {
      model: params.model || "mistral-large-latest",
      messages: [{ role: "user", content: fullPrompt }]
    }
  };
};

MistralProvider.prototype.extractContent = function(response) {
  if (response.choices && response.choices.length > 0 && response.choices[0].message) {
    return response.choices[0].message.content;
  }
  return "";
};

// ==================== SalsifyAI Factory ====================

var SalsifyAI = {
  openAIProvider: function(apiKey, baseUrl) {
    return new OpenAIProvider(apiKey, baseUrl);
  },
  anthropicProvider: function(apiKey, baseUrl) {
    return new AnthropicProvider(apiKey, baseUrl);
  },
  geminiProvider: function(apiKey, baseUrl) {
    return new GeminiProvider(apiKey, baseUrl);
  },
  mistralProvider: function(apiKey, baseUrl) {
    return new MistralProvider(apiKey, baseUrl);
  }
};

SalsifyAI;
