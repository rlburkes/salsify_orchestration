/**
 * This module returns an object "SalsifyAI" that exposes provider-specific builder methods.
 * Each provider object includes chainable methods for configuration (configureAPIKey, configureEndpoint),
 * an addContext method to attach structured data to every prompt, and a generateText method
 * that supports simulation mode (via debugPrompt), a debugResponse flag, and a responseFormat option.
 *
 * This version is written in pure ES5 (synchronous, no Promises) and assumes a synchronous
 * web_request(url, method, payload, headers) function is available.
 */
function createSalsifyAI() {


  function scrubHeaders(requestObject) {
    if (requestObject.headers.Authorization) {
      requestObject.headers['Authorization'] = 'REDACTED';
    }
    if (requestObject.headers['x-api-key']) {
      requestObject.headers['x-api-key'] = 'REDACTED'
    }
    if (requestObject.headers['api-key']) {
      requestObject.headers['api-key'] = 'REDACTED'
    }
    if (typeof requestObject.url === 'string' &&
    requestObject.url.indexOf('generativelanguage.googleapis.com') !== -1) {
      requestObject.url = requestObject.url.replace(/([?&])key=[^&]+/, '$1key=REDACTED');
    }
    return requestObject;
  }

  // A shared function to perform the web request using the built request object.
  function performRequest(requestObject) {
    try {
      if (requestObject.debugPrompt) {
        return scrubHeaders(requestObject);
      } else {
        return web_request(requestObject.url, requestObject.method, requestObject.payload, requestObject.headers);
      }
    } catch (e) {
      return { "status": "failure", "request": scrubHeaders(requestObject), "message": e };
    }
  }

  // Helper to correctly join a base URL with an endpoint path.
  function finalApiUrl(base, path) {
    if (base.charAt(base.length - 1) === "/") {
      base = base.substr(0, base.length - 1);
    }
    return base + path;
  }

  function basePayload(params) {
    return {
      url: '',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: {},
      debugPrompt: params.debugPrompt || false,
      debugResponse: params.debugResponse || false
    };
  }
  // Converts response format for Gemini provider.
  function convertResponseFormatForGemini(responseFormat) {
      if (typeof responseFormat !== "object" || responseFormat === null) {
          return responseFormat;
      }

      if (responseFormat.hasOwnProperty("schema")) {
          // Deep clone the schema to avoid modifying the original object
          var newSchema = JSON.parse(JSON.stringify(responseFormat.schema));

          function removeAdditionalProperties(obj) {
              if (typeof obj !== "object" || obj === null) return obj;

              // Create a shallow copy to maintain immutability
              var cleanedObj = { ...obj };

              // Remove `additionalProperties` if it exists
              if (cleanedObj.hasOwnProperty("additionalProperties")) {
                  delete cleanedObj.additionalProperties;
              }

              // Recursively process nested objects in `properties` and `items`
              if (cleanedObj.hasOwnProperty("properties")) {
                  cleanedObj.properties = Object.fromEntries(
                      Object.entries(cleanedObj.properties).map(([key, value]) => [key, removeAdditionalProperties(value)])
                  );
              }

              if (cleanedObj.hasOwnProperty("items")) {
                  cleanedObj.items = removeAdditionalProperties(cleanedObj.items);
              }

              return cleanedObj;
          }

          // Generate the cleaned version of the schema
          return removeAdditionalProperties(newSchema);
      }

      return responseFormat;
  }

  function validateResponseFormat(respFormat) {
    var errors = [];

    // Check that respFormat is a non-null object.
    if (typeof respFormat !== "object" || respFormat === null) {
      errors.push("Response format must be a non-null object.");
      return errors;
    }

    // Check for required properties and their types.
    if (!respFormat.hasOwnProperty("name")) {
      errors.push("Missing 'name' property.");
    }

    if (respFormat.strict !== true) {
      errors.push("'strict' property must be true.");
    }

    // Validate the 'schema' property.
    if (!respFormat.hasOwnProperty("schema") || typeof respFormat.schema !== "object" || respFormat.schema === null) {
      errors.push("Missing or invalid 'schema' property.");
    } else {
      var schema = respFormat.schema;

      // Validate schema properties.
      if (schema.type !== "object") {
        errors.push("Schema 'type' must be 'object'.");
      }

      if (!schema.hasOwnProperty("properties") || typeof schema.properties !== "object" || schema.properties === null) {
        errors.push("Schema must have a 'properties' object.");
      }

      if (!schema.hasOwnProperty("required") || !Array.isArray(schema.required)) {
        errors.push("Schema must have a 'required' array.");
      }

      if (schema.additionalProperties !== false) {
        errors.push("Schema 'additionalProperties' must be explicitly false.");
      }
    }

    return errors;
  }

  function extractJSON(content, coerceJSON) {
    if (coerceJSON) {
      try {
        return JSON.parse(content);
      } catch (e) {
        // If parsing fails, leave content as is.
        return content;
      }
    }
    return content;
  }

  function guessMimeType(url) {
    const extensionToMime = {
      "png": "image/png",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "webp": "image/webp",
      "heic": "image/heic",
      "heif": "image/heif"
    };

    // Extract file extension from the URL
    const match = url.match(/\.([a-z0-9]+)(?:[\?#]|$)/i);
    const ext = match ? match[1].toLowerCase() : null;

    return ext ? extensionToMime[ext] || "unknown" : "unknown";
  }

  function toYAML(obj, indent = 0) {
    const spacing = "  ".repeat(indent);
    if (Array.isArray(obj)) {
        return obj.map(item => `${spacing}- ${toYAML(item, indent + 1)}`).join("\n");
    } else if (typeof obj === "object" && obj !== null) {
        return Object.entries(obj)
            .map(([key, value]) => `${spacing}${key}: ${toYAML(value, indent + 1)}`)
            .join("\n");
    } else {
        return String(obj);
    }
  }

  // Factory function to create a provider-specific object.
  function createProvider(providerName, apiKey, baseUrl) {
    var apiKey = apiKey || "";
    var baseUrl = baseUrl || "";

    // These typically are provided on an individual request, but for conveninece we include ability to set at provider level.
    var model = "";
    var options = {};
    var contexts = [];

    var providerObj = {
      model: model,
      options: options,
      apiKey: apiKey,
      baseUrl: baseUrl,
      contexts: contexts
    }

    var providerSupportsJSON = (providerName === "OpenAI" || providerName === "AzureAIFoundry" || providerName === "GeminiViaOpenAI");

    function setModel(modl) {
      model = modl;
      return providerObj;
    }

    function setOptions(optns) {
      options = optns;
      return providerObj;
    }

    function configureAPIKey(key) {
      apiKey = key;
      return providerObj;
    }

    function configureEndpoint(url) {
      baseUrl = url;
      return providerObj;
    }

    function getContext(noun) {
      if (noun) {
        return contexts.filter(context => { return context.key === noun; })
      } else {
        return contexts;
      }
    }

    function addContext(noun, data) {
      // var dataString = (typeof data === "object") ? JSON.stringify(data, null, 2) : String(data);
      contexts.push({ key: noun, context: data });
      return providerObj;
    }

    function clearContext(noun) {
      if (noun) {
        contexts = contexts.reduce((acc, item) => {
          if (item.key === noun) {
            return acc;
          }
          acc.push(item);
          return acc;
        }, []);
      } else {
        contexts = [];
      }
      return providerObj;
    }

    function extractContent(response) {
      switch (providerName) {
        case "OpenAI":
        case "AzureAIFoundry":
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

    function serializeContext(messages) {

      if (contexts.length < 1) {
        return contexts;
      }

      var contextObject = contexts.reduce((acc, { key, context }) => {
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(context);
        return acc;
      }, {});

      switch (providerName) {
        case "Gemini":
          return messages.unshift({ role: "user", parts: [{ text: JSON.stringify(contextObject) }] });
        default:
          return messages.unshift({ role: "user", content: JSON.stringify(contextObject) });
      }
    }

    // Updated buildProviderMessage now includes providerName as first argument.
    function buildProviderMessage(role, content) {
      switch (providerName) {
        case "Mistral":
        case "Anthropic":
        case "GeminiViaOpenAI":
        case "AzureAIFoundry":
        case "OpenAI":
          return [{ role: role, content: content }];
        case "Gemini":
          if (typeof content === "string") {
            return [{ parts: [{ text: content }], role: "user" }];
          } else {
            return [{ parts: content, role: "user" }];
          }
        default:
          throw new Error("Unsupported provider: " + providerName);
      }
    }

    function buildMessages(prompt) {
      if (typeof prompt === "string") {
        return buildProviderMessage("user", prompt);
      } else if (Array.isArray(prompt)) {
        return prompt.map(function(item) {
          if (Array.isArray(item) && item.length === 2) {
            // the [0] at the end of this line in unwrapping the single element array.
            return buildProviderMessage(item[0], item[1])[0];
          } else if (typeof item === "object" && item.hasOwnProperty("role") && item.hasOwnProperty("content")) {
            return item;
          } else {
            throw new Error(`Invalid message format: each message must be a [role, content] tuple or an object with role and content. Got ${item}`);
          }
        });
      } else {
        throw new Error("Prompt must be a string or an array of messages or role/content tuples.");
      }
    }

    // Build a request object based on provider specifics.
    function buildRequest(apiKey, baseUrl, messages, params) {
      var request = basePayload(params);

      switch (providerName) {
        case "OpenAI":
          request.url = finalApiUrl(baseUrl, "/v1/chat/completions");
          request.headers.Authorization = "Bearer " + apiKey;
          request.payload = {
            model: params.model || model || "gpt-4o",
            messages: messages,
            max_completion_tokens: params.max_tokens || 1200
          };
          if (params.responseFormat) {
            request.payload.response_format = {
              json_schema: params.responseFormat,
              type: 'json_schema'
            };
          }
          break;

        case "AzureAIFoundry":
          request.url = finalApiUrl(baseUrl, "/chat/completions?api-version=2024-10-21");
          request.headers["api-key"] = apiKey;
          request.payload = {
            temperature: params.temperature || 1,
            top_p: params.top_p || 1,
            stop: params.stop || null,
            max_tokens: params.max_tokens || null,
            max_completion_tokens: params.max_completion_tokens || 1200,
            presence_penalty: params.presence_penalty || 0,
            frequency_penalty: params.frequency_penalty || 0,
            logit_bias: params.logit_bias || null,
            user: params.user || null,
            messages: messages,
            data_sources: params.data_sources || null,
            logprobs: params.logprobs || null,
            n: params.n || 1,
            parrallel_tool_calls: params.parallel_tool_calls || true,
            tools: params.tools || null,
            tool_choices: params.tool_choices || null,
            seed: params.seed || null
          };
          if (params.responseFormat) {
            request.payload.response_format = {
              json_schema: params.responseFormat,
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
            messages: messages
          };
          break;

        case "Gemini":
          request.url = finalApiUrl(baseUrl, `/v1beta/models/${params.model || model || 'gemini-2.0-flash'}:generateContent`) + "?key=" + apiKey;
          request.payload = {
            contents: messages
          };
          if (params.max_tokens) {
            request.payload.generationConfig = request.payload.generationConfig || {};
            request.payload.generationConfig.maxOutputTokens = params.max_tokens;
          }
          if (params.responseFormat) {
            request.payload.generationConfig = request.payload.generationConfig || {};
            request.payload.generationConfig.responseMimeType = "application/json";
            request.payload.generationConfig.responseSchema = convertResponseFormatForGemini(params.responseFormat);
          }
          break;

        case "Mistral":
          request.url = finalApiUrl(baseUrl, "/v1/chat/completions");
          request.headers.Authorization = "Bearer " + apiKey;
          request.headers.Accept = "application/json";
          request.payload = {
            model: params.model || "mistral-large-latest",
            messages: messages
          };
          if (params.responseFormat) {
            request.payload.response_format = { type: "json_object" };
          }
          break;

        case "GeminiViaOpenAI":
          request.url = finalApiUrl(baseUrl, "");
          request.headers.Authorization = "Bearer " + apiKey;
          request.payload = {
            model: params.model || "gemini-2.0-flash",
            messages: messages,
            max_tokens: params.max_tokens || 1000
          };
          if (params.responseFormat) {
            request.payload.response_format = {
              json_schema: params.responseFormat,
              type: 'json_schema'
            };
          }
          break;

        default:
          throw new Error("Unsupported provider: " + providerName);
      }

      return request;
    }

    function buildTextAttachment(prompt) {
      switch(providerName) {
        case "OpenAI":
        case "AzureAIFoundry":
        case "Mistral":
        case "GeminiViaOpenAI":
          return { "type": "text", "text": prompt };
        case "Gemini":
          return { "text": prompt };
      }
    }

    function buildImageAttachment(imageUrl) {
      switch(providerName) {
        case "AzureAIFoundry":
        case "OpenAI":
          return { "type": "image_url", "image_url": { "url": imageUrl } };
        case "Mistral":
          return { "type": "image_url", "image_url": imageUrl };
        case "Gemini":
          return { "inline_data": { "mime_type": guessMimeType(imageUrl), "data": download_file_base64(imageUrl) } };
        case "GeminiViaOpenAI":
          return { "type": "image_url", "image_url": { "url": `data:${guessMimeType(imageUrl)};base64,${download_file_base64(imageUrl)}` } };
      }
    }

    function defaultImageModel() {
      switch(providerName) {
        case "AzureAIFoundry":
        case "OpenAI":
          return "gpt-4o";
        case "Mistral":
          return "pixtral-12b-2409";
        case "Gemini":
        case "GeminiViaOpenAI":
          return "gemini-2.0-flash";
      }
    }
    // New method to support multi-modal image analysis.
    function analyzeImage(imageUrls, prompt, params) {
      if (!Array.isArray(imageUrls)) {
        throw new Error("Image URLs must be provided as an array.");
      }

      if (providerName === "Anthropic") {
        throw new Error(`Image analysis is not currently supported for ${providerName}.`)
      }

      params = params || {};
      params = { ...options, ...params };

      params["model"] = params["model"] || model || defaultImageModel();

      var imageMessageTuples = imageUrls.map(imageUrl => {
        var imageAttachment = buildImageAttachment(imageUrl);
        return ["user", [imageAttachment]];
      });

      var textAttachment = buildTextAttachment(prompt);

      imageMessageTuples.push(["user", [textAttachment]]);

      return generateText(imageMessageTuples, params);
    }

    function generateText(prompt, params) {
      if (!apiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }
      params = params || {};
      params = { ...options, ...params };

      var messages = buildMessages(prompt);
      // Ensure that the response format is valid if present, and if the provider doesn't support JSON append the format to the context as a directive to the LLM.
      if (params.responseFormat) {
        if (providerSupportsJSON) {
          var errors = validateResponseFormat(params.responseFormat);
          if (errors.length > 0) {
            return errors;
          }
        } else {
          addContext("ASSOCIATED RESPONSE SCHEMA", JSON.stringify(params.responseFormat));
          addContext("RESPONSE DIRECTIVE", "Please output only the raw JSON. Where possible attempt to conform with the supplied schema. Reply without markdown formatting (NO backticks or language directive), explanation, or commentary");
        }
      }

      // Serialize any added CONTEXTS to the request;
      serializeContext(messages);

      var requestObject = buildRequest(apiKey, baseUrl, messages, params);

      var response = requestObject; // default to the request so we can debug
      if (!requestObject.debugPrompt) {
        response = performRequest(requestObject);
      }

      if (requestObject.debugResponse || requestObject.debugPrompt) {
        if (requestObject.debugPrompt) {
          scrubHeaders(response);
        }
        return response;
      } else {
        response = extractJSON(extractContent(response), params.responseFormat || false);
      }

      return response;
    }

    function generateImage(prompt, params) {
      if (!apiKey) {
        throw new Error("No API key set for " + providerName + ".");
      }

      if (providerName != "OpenAI") {
        throw new Error(`Image generation is not currently supported for ${providerName}.`)
      }

      params = params || {};
      params = { ...options, ...params };

      var request = basePayload(params);
      request.url = finalApiUrl(baseUrl, "/v1/images/generations");
      request.headers.Authorization = "Bearer " + apiKey;
      request.payload = {
        model: params.model || "dall-e-3",
        prompt: prompt,
        n: params.n || 1,
        size: params.size || "1024x1024",
        quality: params.quality || "standard"
      };

      return performRequest(request);
    }

    providerObj = {
      ...providerObj,
      configureAPIKey: configureAPIKey,
      configureEndpoint: configureEndpoint,
      getContext: getContext,
      addContext: addContext,
      setModel: setModel,
      setOptions: setOptions,
      clearContext: clearContext,
      generateText: generateText,
      analyzeImage: analyzeImage,
      generateImage: generateImage
    };

    return providerObj;
  }

  return {
    openAIProvider: function(apiKey, baseUrl) {
      return createProvider("OpenAI", apiKey, baseUrl || "https://api.openai.com");
    },
    anthropicProvider: function(apiKey, baseUrl) {
      return createProvider("Anthropic", apiKey, baseUrl || "https://api.anthropic.com");
    },
    geminiProvider: function(apiKey, baseUrl) {
      return createProvider("Gemini", apiKey, baseUrl || "https://generativelanguage.googleapis.com");
    },
    mistralProvider: function(apiKey, baseUrl) {
      return createProvider("Mistral", apiKey, baseUrl || "https://api.mistral.ai");
    },
    geminiViaOpenAIProvider: function(apiKey, baseUrl) {
      return createProvider("GeminiViaOpenAI", apiKey, baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    },
    azureAIFoundryProvider: function(apiKey, baseUrl) {
      return createProvider("AzureAIFoundry", apiKey, baseUrl);
    }
  };
}

createSalsifyAI();
