# SalsifyAI Library Documentation

The SalsifyAI library provides a unified, chainable interface for interacting with multiple AI providers, including OpenAI, Anthropic, Gemini, Mistral, and Gemini via OpenAI. It abstracts differences in API endpoints and payload formats while allowing you to inject additional context and control various aspects of the request flow. The library supports both text-only and multi-modal (image + text) requests for providers that support it.

## Table of Contents
1. [Installation](#installation)
2. [Creating a Provider Instance](#creating-a-provider-instance)
3. [Configuration](#configuration)
4. [Adding Context](#adding-context)
5. [Making API Calls](#making-api-calls)
   - [Text Completion](#text-completion)
   - [Image Analysis (Multi-modal)](#image-analysis-multi-modal)
6. [Debugging Options](#debugging-options)
7. [Response Format](#response-format)
8. [Providers Supported](#providers-supported)
9. [Examples](#examples)

## Installation

Include the `wrapper.js` file in your project. This library is written in pure ES5 and assumes that a synchronous function `web_request(url, method, payload, headers)` is available in your runtime environment.

## Creating a Provider Instance

To interact with a specific AI provider, create an instance via the global `SalsifyAI` object:

```javascript
var SalsifyAI = createSalsifyAI();

// For example, to create an OpenAI provider instance:
var openAIProvider = SalsifyAI.openAIProvider('your-openai-api-key');

// Similarly for other providers:
var anthropicProvider = SalsifyAI.anthropicProvider('your-anthropic-api-key');
var geminiProvider = SalsifyAI.geminiProvider('your-gemini-api-key');
var mistralProvider = SalsifyAI.mistralProvider('your-mistral-api-key');
var geminiViaOpenAIProvider = SalsifyAI.geminiViaOpenAIProvider('your-gemini-via-openai-api-key');
```

## Configuration

Each provider instance exposes chainable methods to configure your API key and base URL. For example:

```javascript
openAIProvider
  .setApiKey('your-openai-api-key')
  .setBaseUrl('https://api.openai.com');
```

## Adding Context

You can add additional context that will be merged into your prompts on every API call. This is useful to supply background data or operational constraints.

```javascript
openAIProvider.addContext('PRODUCT DETAILS', {
  name: 'Example Product',
  description: 'A great example product for testing purposes.'
});
```

The library merges this context into your first message (or system message, depending on the provider) so that your original prompt remains intact.

## Making API Calls

### Text Completion

Use the `callCompletion` method to send a text prompt to the AI provider. You can pass additional parameters such as model selection, maximum token count, and a desired response format.

```javascript
var response = openAIProvider.callCompletion('Tell me a joke about our product.', {
  model: 'gpt-4o',
  max_tokens: 150,
  responseFormat: {
    name: "jokeResponse",
    strict: true,
    schema: {
      type: "object",
      properties: {
        joke: { type: "string" },
        explanation: { type: "string" }
      },
      required: ["joke", "explanation"],
      additionalProperties: false
    }
  }
});
```
=>
```json
{
  "joke": "Why did the Example Product break up with its rival?",
  "explanation": "Because it couldn't handle the comparison anymore! The joke plays on the word 'example', implying the product is used to set a standard or benchmark, making any comparison rival obsolete."
}
```

### Image Analysis (Multi-modal)

For providers that support image input (currently OpenAI and Mistral), use the `callImageAnalysis` method. This method takes an array of image URLs and a text prompt.

```javascript
var multiModalResponse = openAIProvider.callImageAnalysis(
  [ "https://images.salsify.com/image/upload/s--VEs3SZqz--/t_salsify_thumb/2d0e8e5aa13922cd110c79fb248237133ea49961.jpg" ],
  'Provide an analysis of the images along with a creative caption.'
);
```
![Sample Photo](https://images.salsify.com/image/upload/s--VEs3SZqz--/t_salsify_thumb/2d0e8e5aa13922cd110c79fb248237133ea49961.jpg)

=>
```
**Image Analysis:**

The image shows the iconic Golden Gate Bridge, partially covered by mist, spanning across the water. The bridge's towering red-orange suspension towers rise above the fog, creating a dramatic and picturesque view. The scene is enhanced by the bright blue sky and sunlight reflecting off the calm water below. A small boat or sailboat can be seen, adding a sense of scale and tranquility to the composition.

**Creative Caption:**

"Bridging the Mist: Where Horizons Meet Dreams"
```

For providers that do not support multi-modal analysis (e.g., Anthropic, Gemini, GeminiViaOpenAI), calling `callImageAnalysis` will throw an error.

## Debugging Options

The library offers two debugging flags to help inspect and troubleshoot requests:
- `debugPrompt`: When set to `true`, the method returns the constructed request object without making an actual API call.
- `debugResponse`: When set to `true`, the method returns the raw API response (as returned by `web_request`), bypassing any JSON extraction.

These flags can be used with both `callCompletion` and `callImageAnalysis`:

```javascript
// To inspect the request payload:
var debugRequest = openAIProvider.callCompletion('Sample prompt', {
  debugPrompt: true,
  max_tokens: 100
});

// To inspect the raw response:
var debugRawResponse = openAIProvider.callCompletion('Sample prompt', {
  debugResponse: true,
  max_tokens: 100
});
```

## Response Format

When specifying a response format via the `responseFormat` parameter, ensure that it is an object with the following structure:

```json
{
  "name": "desiredResponseFormat",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "output": { "type": "string" }
    },
    "required": ["output"],
    "additionalProperties": false
  }
}
```

For providers that support JSON output (such as OpenAI and GeminiViaOpenAI), the library validates and attaches the format to the payload.

## Providers Supported

- **OpenAI**: Fully supported, including multi-modal requests via `callImageAnalysis`.
- **Anthropic**: Supports text completions via `callCompletion`.
- **Gemini**: Supports text completions.
- **Mistral**: Supports text completions and multi-modal image analysis.
- **Gemini via OpenAI**: Supports text completions.

> **Note**: Multi-modal image analysis is currently implemented only for OpenAI and Mistral. Attempts to use `callImageAnalysis` with other providers will result in an error.

## Examples

### Example: Text Completion with OpenAI

```javascript
var openAIProvider = SalsifyAI.openAIProvider('your-openai-api-key');
openAIProvider.addContext('Product Info', { name: 'Example', description: 'This is an example product.' });

var response = openAIProvider.callCompletion('Generate a creative tagline for the product.', {
  model: 'gpt-4o',
  max_tokens: 1000,
  responseFormat: {
    name: "taglineResponse",
    strict: true,
    schema: {
      type: "object",
      properties: {
        tagline: { type: "string" }
      },
      required: ["tagline"],
      additionalProperties: false
    }
  }
});
```
=>
```json
  {
    "tagline": "Example: Where Possibilities Become Reality"
  }
```

### Example: Multi-Modal Image Analysis with Mistral

```javascript
var mistralProvider = SalsifyAI.mistralProvider('your-mistral-api-key');
var multiModalResponse = mistralProvider.callImageAnalysis(
  [ 'https://example.com/image.jpg' ],
  'Describe the scene in the image and provide creative feedback.',
  {
    max_tokens: 1500,
    responseFormat: {
      name: "imageAnalysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          feedback: { type: "string" }
        },
        required: ["description", "feedback"],
        additionalProperties: false
      }
    }
  }
);
```
=>
```json
{
  "feedback":"The foggy ambiance adds a sense of tranquility and mystery to the scene, enhancing the beauty of this architectural marvel.",
  "description":"The image depicts the iconic Golden Gate Bridge shrouded in a thick layer of fog. The bridge's towering structure and suspension cables are partially obscured by the mist, creating a mysterious and ethereal atmosphere. The water below is calm, reflecting the muted colors of the sky and the bridge."
}
```
