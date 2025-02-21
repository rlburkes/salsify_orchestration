/**
 * This module returns an object "SalsifyAI" that exposes provider-specific builder methods.
 * Each provider object includes chainable methods for configuration (setApiKey, setBaseUrl),
 * an addContext method to attach structured data to every prompt, and a callCompletion method that
 * supports a debug flag.
 *
 * Relies on a synchronous web_request(url, method, payload, headers) function provided by your environment.
 */
 function createSalsifyAI() {

   function createProvider(providerName, defaultBaseUrl, apiKey, baseUrl, callFn) {
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

     // Updated extractContent to handle Gemini's response structure.
     function extractContent(response) {
       if (providerName === "OpenAI") {
         if (response.choices && response.choices.length > 0 && response.choices[0].message) {
           return response.choices[0].message.content;
         }
       } else if (providerName === "Anthropic") {
         return response.completion || "";
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

   // Gemini call adjusted per quickstart with API key as query param.
   function callGemini(apiKey, baseUrl, prompt, params) {
     var url = baseUrl + "?key=" + apiKey;
     var headers = {
       "Content-Type": "application/json"
     };
     var payload = {
       "contents": [{
         "parts": [{"text": prompt}]
       }]
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

   return {
     openAIProvider: function(apiKey, baseUrl) {
       return createProvider("OpenAI", "https://api.openai.com/v1", apiKey, baseUrl, callOpenAI);
     },
     anthropicProvider: function(apiKey, baseUrl) {
       return createProvider("Anthropic", "https://api.anthropic.com", apiKey, baseUrl, callAnthropic);
     },
     geminiProvider: function(apiKey, baseUrl) {
       return createProvider("Gemini", "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", apiKey, baseUrl, callGemini);
     },
     mistralProvider: function(apiKey, baseUrl) {
       return createProvider("Mistral", "https://api.mistral.com", apiKey, baseUrl, callMistral);
     }
   };
 }

 createSalsifyAI();
