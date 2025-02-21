// Helper function to join a base URL with an endpoint path.
function finalApiUrl(base, path) {
  if (base.charAt(base.length - 1) === "/") {
    base = base.substr(0, base.length - 1);
  }
  return base + path;
}

// A factory function that creates a provider object using closures.
function createProvider(apiKey, baseUrl, buildRequestFn, extractContentFn) {
  var _apiKey = apiKey || "";
  var _baseUrl = baseUrl || "";
  var _contexts = [];

  return {
    setApiKey: function(key) {
      _apiKey = key;
      return this;
    },
    setBaseUrl: function(url) {
      _baseUrl = url;
      return this;
    },
    addContext: function(noun, data) {
      var dataString = (typeof data === "object") ? JSON.stringify(data, null, 2) : String(data);
      var contextStr = "~~~~BEGIN " + noun + "~~~~\n" + dataString + "\n~~~~END " + noun + "~~~~";
      _contexts.push(contextStr);
      return this;
    },
    callCompletion: function(prompt, params) {
      params = params || {};
      var debug = params.debug || false;
      var simulate = params.simulate || false;
      var fullPrompt = (_contexts.length > 0 ? _contexts.join("\n") + "\n" : "") + prompt;
      var requestObject = buildRequestFn(_apiKey, _baseUrl, fullPrompt, params);
      if (simulate) {
        return requestObject;
      }
      var response = web_request(requestObject.url, requestObject.method, requestObject.payload, requestObject.headers);
      var content = extractContentFn(response);
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
  };
}

/* ===================== SalsifyAI Factory ===================== */

var SalsifyAI = {
  openAIProvider: function(apiKey, baseUrl) {
    return createProvider(
      apiKey,
      baseUrl || "https://api.openai.com/v1",
      // Inline buildRequest function for OpenAI:
      function(apiKey, baseUrl, fullPrompt, params) {
        return {
          url: finalApiUrl(baseUrl, "/chat/completions"),
          method: "POST",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
          },
          payload: {
            model: params.model || "gpt-4",
            messages: [{ role: "user", content: fullPrompt }],
            max_tokens: params.max_tokens || 1000
          }
        };
      },
      // Inline extractContent function for OpenAI:
      function(response) {
        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
          return response.choices[0].message.content;
        }
        return "";
      }
    );
  },
  anthropicProvider: function(apiKey, baseUrl) {
    return createProvider(
      apiKey,
      baseUrl || "https://api.anthropic.com",
      // Inline buildRequest function for Anthropic (Claude):
      function(apiKey, baseUrl, fullPrompt, params) {
        return {
          url: finalApiUrl(baseUrl, "/v1/messages"),
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          payload: {
            model: params.model || "claude-3-5-sonnet-20241022",
            max_tokens: params.max_tokens || 1024,
            messages: [{ role: "user", content: fullPrompt }]
          }
        };
      },
      // Inline extractContent function for Anthropic:
      function(response) {
        // Return the first element's value using its type key.
        if (response.content && response.content.length > 0 && response.content[0] && response.content[0].type) {
          return response.content[0][response.content[0].type] || "";
        }
        return "";
      }
    );
  },
  geminiProvider: function(apiKey, baseUrl) {
    return createProvider(
      apiKey,
      baseUrl || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      // Inline buildRequest function for Gemini:
      function(apiKey, baseUrl, fullPrompt, params) {
        var url = finalApiUrl(baseUrl, "") + "?key=" + apiKey;
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
      },
      // Inline extractContent function for Gemini:
      function(response) {
        if (response.candidates && response.candidates.length > 0) {
          var candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return candidate.content.parts[0].text;
          }
        }
        return "";
      }
    );
  },
  mistralProvider: function(apiKey, baseUrl) {
    return createProvider(
      apiKey,
      baseUrl || "https://api.mistral.ai",
      // Inline buildRequest function for Mistral:
      function(apiKey, baseUrl, fullPrompt, params) {
        return {
          url: finalApiUrl(baseUrl, "/v1/chat/completions"),
          method: "POST",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          payload: {
            model: params.model || "mistral-large-latest",
            messages: [{ role: "user", content: fullPrompt }]
          }
        };
      },
      // Inline extractContent function for Mistral:
      function(response) {
        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
          return response.choices[0].message.content;
        }
        return "";
      }
    );
  }
};

SalsifyAI;
