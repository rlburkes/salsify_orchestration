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

Use a [js helper](https://developers.salsify.com/docs/workflow-templating#custom-helpers) to associate the library with your desired workflow.
 ```json
 "__js_helpers__": [
    {
      "url": "https://raw.githubusercontent.com/rlburkes/salsify_orchestration/refs/heads/main/ai_helpers/wrapper.js",
      "type": "remote",
      "binding": "SalsifyAI"
    }
  ]
 ```

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
  [ 'https://images.salsify.com/image/upload/s--VEs3SZqz--/t_salsify_thumb/2d0e8e5aa13922cd110c79fb248237133ea49961.jpg' ],
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
![Sample Photo](https://images.salsify.com/image/upload/s--VEs3SZqz--/t_salsify_thumb/2d0e8e5aa13922cd110c79fb248237133ea49961.jpg)
=>
```json
{
  "feedback":"The foggy ambiance adds a sense of tranquility and mystery to the scene, enhancing the beauty of this architectural marvel.",
  "description":"The image depicts the iconic Golden Gate Bridge shrouded in a thick layer of fog. The bridge's towering structure and suspension cables are partially obscured by the mist, creating a mysterious and ethereal atmosphere. The water below is calm, reflecting the muted colors of the sky and the bridge."
}
```
### Example: Text Completion with Gemini
```javascript
var geminiProvider = SalsifyAI.geminiProvider(secret_value('gemini'));
geminiProvider.addContext('Product Data', context.entity);

var geminiResponse = geminiProvider.callCompletion('Analyze the product data and summarize key insights.', {
  responseFormat: {
    name: "geminiResponse",
    strict: true,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        details: { type: "string" }
      },
      required: ["summary", "details"],
      additionalProperties: false
    }
  }
});
```
=>
```json
{
  "details": "The product data provides a comprehensive description of a 55-inch Ultra HD television manufactured by VisionTech.  Key features include vibrant colors, deep blacks, and smart TV functionality.  Dimensions are 48 x 28 x 3 inches, and it weighs 15 lbs. The product is categorized as \"Electronics\", has a SKU of \"TV-001\", a price of $599.99, and 25 units are currently in stock.  The release date was July 15, 2023.  An image URL is also included in the data.",
  "summary": "55\" Ultra HD Smart TV from VisionTech.  $599.99, 25 in stock."
}
```
### Example: Text Completion with Anthropic (Claude)
```javascript
var anthropicProvider = SalsifyAI.anthropicProvider(secret_value('anthropic-claude'));

anthropicProvider.addContext('Target Language', { language: 'French' });
anthropicProvider.addContext('Product Data', Product.propertyValues({ "dataType": "string" }));

var anthropicResponse = anthropicProvider.callCompletion('Translate the attached "Product Data" into the "Target Language"');
anthropicResponse
```
=>
```
Here's the product data translated to French:

[
  "VisionTech",
  "Un téléviseur intelligent Ultra HD de 55 pouces avec des couleurs vibrantes et des noirs profonds.",
  "122 x 71 x 7,6 centimètres",
  "Téléviseur Ultra HD 55\"",
  "1",
  "TV-001",
  "6,8 kg"
]

Note: I've converted the measurements to metric units as commonly used in French-speaking countries:
- 48 x 28 x 3 inches → 122 x 71 x 7,6 centimètres
- 15 lbs → 6,8 kg
```
### Example: Text Completion with GeminiViaOpenAI

GeminiViaOpenAI provides an interface to the Gemini model using a request format similar to OpenAI’s chat completions. This allows clients accustomed to OpenAI’s payload structure to leverage Gemini’s capabilities with minimal changes.
```javascript
var geminiViaOpenAIProvider = SalsifyAI.geminiViaOpenAIProvider(secret_value('gemini'));
geminiViaOpenAIProvider.addContext('User Preferences', { tone: 'friendly', style: 'conversational' });

var geminiViaOpenAIResponse = geminiViaOpenAIProvider.callCompletion('Generate a response that adheres to the user preferences provided.', {
  model: 'gemini-2.0-flash',
  responseFormat: {
    name: "geminiViaOpenAIResponse",
    strict: true,
    schema: {
      type: "object",
      properties: {
        response: { type: "string" }
      },
      required: ["response"],
      additionalProperties: false
    }
  }
});
geminiViaOpenAIResponse
```

```json
{
  "response":"Hey there! How can I help you today? I'm happy to assist in any way I can!"
}
```
