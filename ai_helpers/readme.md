# SalsifyAI Library Documentation

The `SalsifyAI` library provides a unified interface to interact with various AI providers such as OpenAI, Anthropic, Gemini, Mistral, and Gemini via OpenAI. This documentation will guide you through setting up and using the library to make API calls to these providers.

## Table of Contents

1. [Installation](#installation)
2. [Creating a Provider Instance](#creating-a-provider-instance)
3. [Configuration](#configuration)
4. [Adding Context](#adding-context)
5. [Making API Calls](#making-api-calls)
6. [Response Format](#response-format)
7. [Examples](#examples)

## Installation

To use the `SalsifyAI` library, include it in your JavaScript project. Ensure you have access to the necessary API keys for the providers you intend to use.

## Creating a Provider Instance

To interact with an AI provider, you need to create an instance of the provider using the `SalsifyAI` object. Here's how you can create instances for different providers:

```javascript
var SalsifyAI = createSalsifyAI();

// Create an instance for OpenAI
var openAIProvider = SalsifyAI.openAIProvider(apiKey);

// Create an instance for Anthropic
var anthropicProvider = SalsifyAI.anthropicProvider(apiKey);

// Create an instance for Gemini
var geminiProvider = SalsifyAI.geminiProvider(apiKey);

// Create an instance for Mistral
var mistralProvider = SalsifyAI.mistralProvider(apiKey);

// Create an instance for Gemini via OpenAI
var geminiViaOpenAIProvider = SalsifyAI.geminiViaOpenAIProvider(apiKey);
```

## Configuration

You can configure the provider instance with an API key and base URL. These methods are chainable, allowing for fluent configuration.
By default, you'll only need to provide your API key.

```javascript
// Set the API key
openAIProvider.setApiKey('your-api-key');

// Set the base URL (optional, defaults are provided)
openAIProvider.setBaseUrl('https://api.openai.com/v1');
```

## Adding Context

You can add context to your prompts, which will be included in every API call made with that provider instance. This is useful for providing additional information or constraints to the AI model.

```javascript
// Add context to the provider
openAIProvider.addContext('PRODUCT CONTEXT', {
  productName: 'Example Product',
  productDescription: 'This is an example product.'
});
```

## Making API Calls

Use the `callCompletion` method to send a prompt to the AI provider and receive a response. You can pass additional parameters to customize the behavior of the API call.

```javascript
var response = openAIProvider.callCompletion('Generate a joke based on the product context.', {
  model: 'gpt-4',
  max_tokens: 150,
  response_format: responseFormat
});
```

### Parameters

- `prompt` (string): The input prompt to send to the AI model.
- `params` (object, optional): Additional parameters to customize the API call.
  - `model` (string, optional): The AI model to use.
  - `max_tokens` (number, optional): The maximum number of tokens in the response.
  - `response_format` (object, optional): The desired format of the response.
  - `debug` (boolean, optional): If `true`, returns additional debug information.
  - `simulate` (boolean, optional): If `true`, returns the request object without making an API call.

## Response Format

You can specify a response format to structure the AI's output. The format should be an object with a schema defining the expected structure.

```javascript
var responseFormat = {
  "name": "desired_response_format",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "joke": {
        "type": "string"
      },
      "explanation": {
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "joke",
      "explanation"
    ]
  }
};
```

## Examples

Here are some examples of how to use the `SalsifyAI` library with different providers:

### Using Gemini Provider

```javascript
var geminiProvider = SalsifyAI.geminiProvider('your-gemini-api-key');
geminiProvider.addContext('PRODUCT CONTEXT', Product.propertyValues({ dataType: 'string' }));
var response = geminiProvider.callCompletion('Consider the attached PRODUCT CONTEXT, draw a funny conclusion', {
  response_format: responseFormat
});
```

### Using Anthropic Provider

```javascript
var anthropicProvider = SalsifyAI.anthropicProvider('your-anthropic-api-key');
anthropicProvider.addContext('PRODUCT CONTEXT', Product.propertyValues({ dataType: 'string' }));
var response = anthropicProvider.callCompletion('Consider the attached PRODUCT CONTEXT, draw a funny conclusion', {
  response_format: responseFormat
});
```

### Using OpenAI Provider

```javascript
var openAIProvider = SalsifyAI.openAIProvider('your-openai-api-key');
openAIProvider.addContext('GEMINI RESPONSE', Product.propertyValues({ dataType: 'string' }));
var response = openAIProvider.callCompletion('Consider the attached PRODUCT CONTEXT, draw a funny conclusion', {
  response_format: responseFormat
});
```

This documentation should help you get started with the `SalsifyAI` library and integrate it into your projects. If you have any further questions or need additional examples, feel free to ask!

