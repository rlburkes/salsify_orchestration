#!/usr/bin/env ruby
#
# run_tests.rb
#
# This script loads our JavaScript runtime via MiniRacer,
# injects a dummy web_request, loads our JS files (product_helper.js and wrapper.js),
# and then runs unit tests (using Test::Unit) to verify the behavior of our
# SalsifyAI providers and the Product helper.
#
# To run:
#   bundle exec ruby run_tests.rb
#
# Optional: For API credentials testing, include a credentials.txt file in the directory.

require 'mini_racer'
require 'json'
require 'test/unit'
require 'base64'

# Helper method to load a JavaScript file.
def load_js_file(ctx, filename)
  code = File.read(filename)
  ctx.eval(code)
end

def deep_stringify_keys(obj)
  case obj
  when Hash
    obj.each_with_object({}) do |(key, value), result|
      result[key.to_s] = deep_stringify_keys(value)
    end
  when Array
    obj.map { |v| deep_stringify_keys(v) }
  else
    obj
  end
end

class TestJSAbstractions < Test::Unit::TestCase
  def setup
    # Create a fresh MiniRacer context.
    @ctx = MiniRacer::Context.new

    # Inject a dummy web_request function for the SalsifyAI code.
    @ctx.eval(<<~JS)
      function web_request(url, method, payload, headers) {
        // Dummy implementation for simulation:
        return {
          choices: [{
            message: {
              content: '{"dummy":"response"}'
            }
          }]
        };
      }

      function download_file_base64(url) {
        // Dummy implementation for simulation:
        return `BASE 64 THIS ${url}`;
      }
    JS

    # Create a dummy workflow context for product_helper.js.
    dummy_context = {
      "entity": {
        "property_value_collections": [
          {
            "property": { "external_id": "SKU", "id": "1" },
            "values": ["SKU123"]
          }
        ],
        "property_values": {
          "Name": ["Test Product"]
        },
        "property_values_snapshot": [
          {
            "property_id": "2",
            "data_type": "string",
            "locale_id": "en-US",
            "values": ["SnapshotValue"]
          }
        ]
      }
    }.to_json
    @ctx.eval("var context = #{dummy_context};")

    # Load our JavaScript modules.
    load_js_file(@ctx, "../product_helpers/product_helper.js")
    load_js_file(@ctx, "../ai_helpers/wrapper.js")
    # Make SalsifyAI available globally.
    @ctx.eval("var SalsifyAI = createSalsifyAI();")
  end

  # --- Product Helper Tests ---
  def test_product_helper_collections
    result = @ctx.eval("productHelper.propertyValues({ name: 'SKU', first: true });")
    assert_equal("SKU123", result, "Expected SKU123 from collections")
  end

  def test_product_helper_object
    result = @ctx.eval("productHelper.propertyValues({ name: 'Name', source: 'object' });")
    assert_equal(["Test Product"], result, "Expected ['Test Product'] from object")
  end

  def test_product_helper_snapshot
    js_code = <<~JS
      productHelper.propertyValues({
        id: '2',
        dataType: 'string',
        locale: 'en-US',
        first: true,
        source: 'snapshot'
      });
    JS
    result = @ctx.eval(js_code)
    assert_equal("SnapshotValue", result, "Expected SnapshotValue from snapshot")
  end

  # --- SalsifyAI Provider Tests ---

  def test_salsify_ai_openai_provider
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
      var response = provider.generateText("Test prompt", { debugPrompt: true, max_tokens: 150 });
      response;
    JS
    result = @ctx.eval(js_code)
    assert_equal("https://api.openai.com/v1/chat/completions", result["url"], "OpenAI URL mismatch")
    assert_equal("REDACTED", result["headers"]["Authorization"], "Authorization header mismatch")
    assert_equal(150, result["payload"]["max_completion_tokens"], "max_tokens value mismatch")
    messages = result["payload"]["messages"]
    assert_not_nil(messages, "Messages payload missing")
    assert_equal("Test prompt", messages[0]["content"], "Prompt message mismatch")
  end

    # Test that using a string prompt with debugPrompt returns a correct request object.
   def test_openai_debug_prompt_with_string
     js_code = <<~JS
       var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
       var response = provider.generateText("Simple prompt", { debugPrompt: true, max_tokens: 150 });
       response;
     JS
     result = @ctx.eval(js_code)
     assert_equal("https://api.openai.com/v1/chat/completions", result["url"], "OpenAI URL mismatch")
     assert_equal("REDACTED", result["headers"]["Authorization"], "Authorization header mismatch")
     assert_equal(150, result["payload"]["max_completion_tokens"], "max_tokens value mismatch")
     messages = result["payload"]["messages"]
     assert(messages.is_a?(Array), "Messages should be an array")
     # When a string prompt is provided, it should be converted to a single message with role 'user'
     assert_equal("user", messages[0]["role"], "Default role should be 'user'")
     assert_equal("Simple prompt", messages[0]["content"], "Message content mismatch")
   end

   # Test that using an array of message tuples returns the expected messages array.
   def test_openai_debug_prompt_with_array
     js_code = <<~JS
       var provider = SalsifyAI.openAIProvider("testkey");
       var response = provider.generateText([["assistant", "Hello"], ["user", "How are you?"]], { debugPrompt: true, max_tokens: 200 });
       response;
     JS
     result = @ctx.eval(js_code)
     messages = result["payload"]["messages"]
     assert_equal(2, messages.length, "Expected 2 messages")
     assert_equal("assistant", messages[0]["role"], "First message role should be 'assistant'")
     assert_equal("Hello", messages[0]["content"], "First message content mismatch")
     assert_equal("user", messages[1]["role"], "Second message role should be 'user'")
     assert_equal("How are you?", messages[1]["content"], "Second message content mismatch")
   end

   # Test that adding context prepends a system message to the messages array.
   def test_openai_with_context
     js_code = <<~JS
       var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
       provider.addContext("Greeting", { msg: "Hello World" });
       var response = provider.generateText("Prompt with context", { debugPrompt: true });
       response;
     JS
     result = @ctx.eval(js_code)
     messages = result["payload"]["messages"]
     assert_equal("user", messages[0]["role"], "First message should be a system message containing the context")
     assert(messages[0]["content"].include?("Greeting"), "Context message should include the 'Greeting' label")
   end

   # Test that debugResponse returns the raw API response (without content extraction).
   def test_openai_debug_response
     js_code = <<~JS
       var provider = SalsifyAI.openAIProvider("testkey");
       var response = provider.generateText("Test prompt", { debugResponse: true, max_tokens: 150 });
       response;
     JS
     result = @ctx.eval(js_code)
     # The dummy web_request returns an object with a "choices" key.
     assert(result.has_key?("choices"), "Raw response should contain 'choices'")
   end

   # Test that an invalid responseFormat returns an error array.
   def test_openai_invalid_response_format
     js_code = <<~JS
       var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
       var response = provider.generateText("Test prompt", { debugPrompt: true, responseFormat: {} });
       response;
     JS
     result = @ctx.eval(js_code)
     assert(result.is_a?(Array), "Expected an error array for invalid responseFormat")
     assert(result.include?("Missing 'name' property."), "Expected error about missing 'name' property")
   end

  def test_openai_response_format_validation
    # For providers supporting JSON (OpenAI and GeminiViaOpenAI), invalid responseFormat should return errors.
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
      // Supply an invalid responseFormat (missing required properties).
      var result = provider.generateText("Test prompt", {debugPrompt: true, responseFormat: {}});
      result;
    JS
    result = @ctx.eval(js_code)
    # Expect an array of error messages.
    assert(result.is_a?(Array), "Expected error array for invalid responseFormat")
    assert(result.include?("Missing 'name' property."), "Expected missing 'name' error")
  end

  def test_salsify_ai_openai_provider_image_analysis
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("fake-key");
      var response = provider.analyzeImage(["https://foobar.png", "https://foobaz.jpg"], "Analyze these images", { debugPrompt: true });
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role": "user",
        "content": [{
          "type": "image_url",
          "image_url": { "url": "https://foobar.png" }
        }]
      },
      {
        "role": "user",
        "content": [{
          "type": "image_url",
          "image_url": { "url": "https://foobaz.jpg" }
        }]
      },
      {
        "role": "user",
        "content": [{
          "type": "text",
          "text": "Analyze these images"
        }]
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")

    expected_url = "https://api.openai.com/v1/chat/completions"
    assert_equal(expected_url, result["url"], "Mistral URL mismatch")

    expected_model = "gpt-4o"
    assert_equal(expected_model, result["payload"]["model"], "OpenAI Model mismatch")
  end

  def test_salsify_ai_openai_provider_image_analysis_model_override
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("fake-key");
      var response = provider.analyzeImage(["https://foobar.png", "https://foobaz.jpg"], "Analyze these images", { debugPrompt: true, model: "4o-mini" });
      response;
    JS
    result = @ctx.eval(js_code)
    expected_model = "4o-mini"
    assert_equal(expected_model, result["payload"]["model"], "OpenAI Model mismatch")
  end

  def test_salsify_ai_anthropic_provider
    js_code = <<~JS
      var provider = SalsifyAI.anthropicProvider("anthrokey", "https://api.anthropic.com");
      var response = provider.generateText("Anthropic test", {debugPrompt: true, responseFormat: { "foo": "bar" }});
      response;
    JS
    result = @ctx.eval(js_code)
    assert_equal("https://api.anthropic.com/v1/messages", result["url"], "Anthropic URL mismatch")
    assert_equal("REDACTED", result["headers"]["x-api-key"], "API key header mismatch")
    assert_equal("2023-06-01", result["headers"]["anthropic-version"], "Anthropic version header mismatch")

    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role": "user",
        "content": "{\"ASSOCIATED RESPONSE SCHEMA\":[\"{\\\"foo\\\":\\\"bar\\\"}\"],\"RESPONSE DIRECTIVE\":[\"Please output only the raw JSON. Where possible attempt to conform with the supplied schema. Reply without markdown formatting (NO backticks or language directive), explanation, or commentary\"]}"
      },
      {
        "role": "user",
        "content": "Anthropic test"
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")
  end

  def test_salsify_ai_gemini_providera
    # For Gemini, note that providerSupportsJSON is false, so the responseFormat is injected as a directive and
    # later used to set generationConfig.responseSchema.
    responseFormat = {
      "name": "TestSchema",
      "strict": false,
      "schema": {
        "type": "object",
        "properties": { test: { type: "string" } },
        "required": ["test"],
        "additionalProperties": false
      }
    }
    js_code = <<~JS
      var provider = SalsifyAI.geminiProvider("geminikey", "https://generativelanguage.googleapis.com");
      var response = provider.generateText("Gemini test", {debugPrompt: true, max_tokens: 200, model: 'gemini-1.5-flash',responseFormat: #{responseFormat.to_json}});
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["contents"]
    expected_messages = [
      {
        "parts": [{
          "text": "{\"ASSOCIATED RESPONSE SCHEMA\":[\"{\\\"name\\\":\\\"TestSchema\\\",\\\"strict\\\":false,\\\"schema\\\":{\\\"type\\\":\\\"object\\\",\\\"properties\\\":{\\\"test\\\":{\\\"type\\\":\\\"string\\\"}},\\\"required\\\":[\\\"test\\\"],\\\"additionalProperties\\\":false}}\"],\"RESPONSE DIRECTIVE\":[\"Please output only the raw JSON. Where possible attempt to conform with the supplied schema. Reply without markdown formatting (NO backticks or language directive), explanation, or commentary\"]}"
          }],
        "role": "user"
      },
      {
        "parts": [{
          "text": "Gemini test"
        }],
        "role": "user"
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")

    # The URL should include the API key as a query parameter.
    expected_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=REDACTED"
    assert_equal(expected_url, result["url"], "Gemini URL mismatch")
    # Verify that max_tokens and the generationConfig are set.
    assert_equal(200, result["payload"]["generationConfig"] && result["payload"]["generationConfig"]["maxOutputTokens"], "max_tokens mismatch for Gemini")
    assert_equal("application/json", result["payload"]["generationConfig"]["responseMimeType"], "Response MIME type mismatch for Gemini")
    # The responseSchema should be the schema with additionalProperties removed.
    expected_schema = { "type" => "object", "properties" => { "test" => { "type" => "string" } }, "required" => ["test"] }
    assert_equal(expected_schema, result["payload"]["generationConfig"]["responseSchema"], "Gemini responseSchema conversion failed")
  end

  def test_salsify_ai_gemini_provider
    # For Gemini, note that providerSupportsJSON is false, so the responseFormat is injected as a directive and
    # later used to set generationConfig.responseSchema.
    responseFormat = {
      "name": "TestSchema",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "test": {
            "type": "object",
            "properties": {
              "nested_key": { "type": "string" }
            },
            "required": ["nested_key"],
            "additionalProperties": false
          }
        },
        "required": ["test"],
        "additionalProperties": false
      }
    }

    js_code = <<~JS
      var provider = SalsifyAI.geminiProvider("geminikey", "https://generativelanguage.googleapis.com");
      var response = provider.generateText("Gemini test", {debugPrompt: true, max_tokens: 200, responseFormat: #{responseFormat.to_json}});
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["contents"]
    expected_messages = [
      {
        "parts" => [{
          "text": "{\"ASSOCIATED RESPONSE SCHEMA\":[\"{\\\"name\\\":\\\"TestSchema\\\",\\\"strict\\\":true,\\\"schema\\\":{\\\"type\\\":\\\"object\\\",\\\"properties\\\":{\\\"test\\\":{\\\"type\\\":\\\"object\\\",\\\"properties\\\":{\\\"nested_key\\\":{\\\"type\\\":\\\"string\\\"}},\\\"required\\\":[\\\"nested_key\\\"],\\\"additionalProperties\\\":false}},\\\"required\\\":[\\\"test\\\"],\\\"additionalProperties\\\":false}}\"],\"RESPONSE DIRECTIVE\":[\"Please output only the raw JSON. Where possible attempt to conform with the supplied schema. Reply without markdown formatting (NO backticks or language directive), explanation, or commentary\"]}"
        }],
        "role" => "user"
      },
      {
        "parts" => [{
          "text" => "Gemini test"
        }],
        "role" => "user"
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")

    # The URL should include the API key as a query parameter.
    expected_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=REDACTED"
    assert_equal(expected_url, result["url"], "Gemini URL mismatch")
    # Verify that max_tokens and the generationConfig are set.
    assert_equal(200, result["payload"]["generationConfig"] && result["payload"]["generationConfig"]["maxOutputTokens"], "max_tokens mismatch for Gemini")
    assert_equal("application/json", result["payload"]["generationConfig"]["responseMimeType"], "Response MIME type mismatch for Gemini")

    # The responseSchema should be the schema with additionalProperties removed.
    expected_schema = {
      "type": "object",
      "properties": {
        "test": {
          "type": "object",
          "properties": {
            "nested_key": { "type": "string" }
          },
          "required": ["nested_key"]
        }
      },
      "required": ["test"]
    }
    assert_equal(deep_stringify_keys(expected_schema), result["payload"]["generationConfig"]["responseSchema"], "Gemini responseSchema conversion failed")
  end

  def test_salsify_ai_gemini_provider_image_analysis
    # For Gemini, note that providerSupportsJSON is false, so the responseFormat is injected as a directive and
    # later used to set generationConfig.responseSchema.
    responseFormat = {
      "name": "TestSchema",
      "strict": false,
      "schema": {
        "type": "object",
        "properties": { test: { type: "string" } },
        "required": ["test"],
        "additionalProperties": false
      }
    }
    js_code = <<~JS
      var provider = SalsifyAI.geminiProvider("geminikey", "https://generativelanguage.googleapis.com");
      var response = provider.analyzeImage(["https://foo.png"],"Caption this image", {debugPrompt: true});
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["contents"]
    expected_messages = [
      {
        "parts": [{
          "inline_data": {
            "mime_type": "image/png",
            "data": "BASE 64 THIS https://foo.png"
          }
        }],
        "role": "user"
      },
      {
        "parts": [{
          "text": "Caption this image"
          }],
        "role": "user"
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")
  end

  def test_salsify_ai_mistral_provider
    js_code = <<~JS
      var provider = SalsifyAI.mistralProvider("mistralkey", "https://api.mistral.ai");
      var response = provider.generateText("Mistral test", {debugPrompt: true, responseFormat: {dummy: true}});
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role": "user",
        "content": "{\"ASSOCIATED RESPONSE SCHEMA\":[\"{\\\"dummy\\\":true}\"],\"RESPONSE DIRECTIVE\":[\"Please output only the raw JSON. Where possible attempt to conform with the supplied schema. Reply without markdown formatting (NO backticks or language directive), explanation, or commentary\"]}"
      },
      {
        "role": "user",
        "content": "Mistral test"
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")

    expected_url = "https://api.mistral.ai/v1/chat/completions"
    assert_equal(expected_url, result["url"], "Mistral URL mismatch")
    assert_equal("REDACTED", result["headers"]["Authorization"], "Mistral Authorization header mismatch")
    assert_equal("application/json", result["headers"]["Accept"], "Mistral Accept header mismatch")

    # For Mistral, any provided responseFormat is converted to a fixed { type: 'json_object' }.
    assert_equal({ "type" => "json_object" }, result["payload"]["response_format"], "Mistral responseFormat conversion failed")
  end

  def test_salsify_ai_mistral_provider_image_analysis
    js_code = <<~JS
      var provider = SalsifyAI.mistralProvider("mistralkey", "https://api.mistral.ai");
      var response = provider.analyzeImage(["https://foobar.png", "https://foobaz.jpg"], "Analyze these images", {debugPrompt: true, responseFormat: {dummy: true}});
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role": "user",
        "content": "{\"ASSOCIATED RESPONSE SCHEMA\":[\"{\\\"dummy\\\":true}\"],\"RESPONSE DIRECTIVE\":[\"Please output only the raw JSON. Where possible attempt to conform with the supplied schema. Reply without markdown formatting (NO backticks or language directive), explanation, or commentary\"]}"
      },
      {
        "role": "user",
        "content": [{
          "type": "image_url",
          "image_url": "https://foobar.png"
        }]
      },
      {
        "role": "user",
        "content": [{
          "type": "image_url",
          "image_url": "https://foobaz.jpg"
        }]
      },
      {
        "role": "user",
        "content": [{
          "type": "text",
          "text": "Analyze these images"
        }]
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")

    expected_url = "https://api.mistral.ai/v1/chat/completions"
    assert_equal(expected_url, result["url"], "Mistral URL mismatch")

    assert_equal("REDACTED", result["headers"]["Authorization"], "Mistral Authorization header mismatch")
    assert_equal("application/json", result["headers"]["Accept"], "Mistral Accept header mismatch")

    expected_model = "pixtral-12b-2409"
    assert_equal(expected_model, result["payload"]["model"], "Mistral Model mismatch")

    # For Mistral, any provided responseFormat is converted to a fixed { type: 'json_object' }.
    assert_equal({ "type" => "json_object" }, result["payload"]["response_format"], "Mistral responseFormat conversion failed")
  end

  def test_salsify_ai_gemini_via_openai_provider
    responseFormat = {
      "name": "ValidSchema",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": { "field": { "type": "number" } },
        "required": ["field"],
        "additionalProperties": false
      }
    }
    js_code = <<~JS
      var provider = SalsifyAI.geminiViaOpenAIProvider("geminiOpenAIKey", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
      provider.addContext("SUper Context", "Duper Context");
      var response = provider.generateText("GeminiViaOpenAI test", {debugPrompt: true, max_tokens: 250, responseFormat: #{responseFormat.to_json}});
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role": "user",
        "content": "{\"SUper Context\":[\"Duper Context\"]}"
      },
      {
        "role": "user",
        "content": "GeminiViaOpenAI test"
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")

    expected_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    assert_equal(expected_url, result["url"], "GeminiViaOpenAI URL mismatch")
    assert_equal("REDACTED", result["headers"]["Authorization"], "GeminiViaOpenAI Authorization header mismatch")
    assert_equal(250, result["payload"]["max_tokens"], "GeminiViaOpenAI max_tokens mismatch")

    # The responseFormat should be embedded as { json_schema: <provided schema>, type: 'json_schema' }.
    expected_responseFormat = { "json_schema" => deep_stringify_keys(responseFormat), "type" => "json_schema" }
    assert_equal(expected_responseFormat, result["payload"]["response_format"], "GeminiViaOpenAI responseFormat mismatch")
  end

  def test_salsify_ai_gemini_via_openai_provider_images
    js_code = <<~JS
      var provider = SalsifyAI.geminiViaOpenAIProvider("geminiOpenAIKey", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
      var response = provider.analyzeImage(["https://foo.jpg"],"Caption this", {debugPrompt: true});
      response;
    JS
    result = @ctx.eval(js_code)

    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role": "user",
        "content": [{
          "type": "image_url",
          "image_url": { "url": "data:image/jpeg;base64,BASE 64 THIS https://foo.jpg" }
        }]
      },
      {
        "role": "user",
        "content": [{
          "type": "text",
          "text": "Caption this"
        }]
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched");
  end

  def test_salsify_ai_azure_ai_foundry_provider
    responseFormat = {
      "name": "TestSchema",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": { test: { type: "string" } },
        "required": ["test"],
        "additionalProperties": false
      }
    }

    js_code = <<~JS
      var provider = SalsifyAI.azureAIFoundryProvider("azkey", "https://az.openai.azure.com");
      var response = provider.generateText("Azure test", {
        debugPrompt: true,
        responseFormat: #{responseFormat.to_json}
      });
      response;
    JS

    result = @ctx.eval(js_code)
    puts result

    # Validate the prompt structure
    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role" => "user",
        "content" => "Azure test"
      }
    ]
    assert_equal(expected_messages, messages, "Messages mismatch")

    # Validate the request URL
    expected_url = "https://az.openai.azure.com/chat/completions?api-version=2024-10-21"
    assert_equal(expected_url, result["url"], "Azure URL mismatch")

    # Validate headers
    assert_equal("REDACTED", result["headers"]["api-key"], "Azure API key header mismatch")

    # Validate payload shape
    expected_response_format = {
      "json_schema" => deep_stringify_keys(responseFormat),
      "type" => "json_schema"
    }
    assert_equal(expected_response_format, result["payload"]["response_format"], "Azure responseFormat mapping failed")

    # Validate a couple default payload values
    assert_equal(1200, result["payload"]["max_completion_tokens"], "Azure default max_completion_tokens mismatch")
    assert_equal(1, result["payload"]["n"], "Azure default 'n' mismatch")
    assert_equal(1, result["payload"]["top_p"], "Azure default 'top_p' mismatch")
  end

  def test_add_context_chainability
    # Verify that addContext can be chained and affects the prompt.
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com/v1");
      provider.addContext("Greeting", {msg: "Hello"});
      provider.addContext("Footer", "Goodbye");
      var response = provider.generateText("Base prompt", {debugPrompt: true});
      response;
    JS
    result = @ctx.eval(js_code)
    # The full prompt (passed as message content) should include the contexts.
    messages = result["payload"]["messages"]
    expected_messages = [
      {
        "role": "user",
        "content": "{\"Greeting\":[{\"msg\":\"Hello\"}],\"Footer\":[\"Goodbye\"]}"
      },
      {
        "role": "user",
        "content": "Base prompt"
      }
    ]
    assert_equal(deep_stringify_keys(expected_messages), messages, "Messages Mismatched")
  end

  # --- Optional: Credentials Injection Test ---
  def test_credentials_injection
    if File.exist?("credentials.txt")
      credentials = File.read("credentials.txt").strip
      js_code = <<~JS
        var provider = SalsifyAI.openAIProvider("#{credentials}", "https://api.openai.com/v1");
        var response = provider.generateText("Credential test", {debugPrompt: true});
        response;
      JS
      result = @ctx.eval(js_code)
      expected_header = "REDACTED"
      assert_equal(expected_header, result["headers"]["Authorization"], "Credentials not injected correctly")
    else
      assert(true, "No credentials.txt file found; skipping credentials test.")
    end
  end

  def test_set_model_and_options
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey");
      provider.setModel("test-model").setOptions({ "debugPrompt": true });
      var response = provider.generateText("Test prompt");
      response;
    JS
    result = @ctx.eval(js_code)
    assert_equal("test-model", result["payload"]["model"], "Model mismatch")
    assert_equal(true, result["debugPrompt"], "provider options mismatch")
  end

  def test_set_model_and_options_override
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey");
      provider.setModel("test-model").setOptions({ "debugPrompt": true });
      var response = provider.generateText("Test prompt", { "model": "cheeseballs" });
      response;
    JS
    result = @ctx.eval(js_code)
    assert_equal("cheeseballs", result["payload"]["model"], "Model mismatch")
    assert_equal(true, result["debugPrompt"], "provider options mismatch")
  end

  def test_get_context
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
      provider.addContext("TestKey", { data: "TestData" });
      provider.getContext("TestKey");
    JS
    result = @ctx.eval(js_code)
    expected_context = [{ "key" => "TestKey", "context" => { "data" => "TestData" } }]
    assert_equal(expected_context, result, "Context retrieval mismatch")
  end

  def test_clear_context
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
      provider.addContext("TestKey", { data: "TestData" });
      provider.clearContext("TestKey");
      provider.getContext();
    JS
    result = @ctx.eval(js_code)
    assert_empty(result, "Context should be cleared")
  end

  def test_clear_all_contexts
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
      provider.addContext("TestKey1", { data: "TestData1" });
      provider.addContext("TestKey2", { data: "TestData2" });
      provider.clearContext();
      provider.getContext();
    JS
    result = @ctx.eval(js_code)
    assert_empty(result, "All contexts should be cleared")
  end

  def test_salsify_ai_openai_provider_generate_image
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com");
      var response = provider.generateImage("a white siamese cat", { quality: "hd", debugPrompt: true });
      response;
    JS
    result = @ctx.eval(js_code)
    assert_equal("https://api.openai.com/v1/images/generations", result["url"], "OpenAI Image Generation URL mismatch")
    assert_equal("REDACTED", result["headers"]["Authorization"], "Authorization header mismatch")
    assert_equal("dall-e-3", result["payload"]["model"], "Model mismatch")
    assert_equal("a white siamese cat", result["payload"]["prompt"], "Prompt mismatch")
    assert_equal(1, result["payload"]["n"], "Number of images mismatch")
    assert_equal("1024x1024", result["payload"]["size"], "Image size mismatch")
    assert_equal("hd", result["payload"]["quality"], "Image quality mismatch")
  end

  def test_non_openai_provider_generate_image_error
    js_code = <<~JS
      var provider = SalsifyAI.anthropicProvider("testkey", "https://api.anthropic.com");
      var response = "";
      try {
        provider.generateImage("a white siamese cat", { debugPrompt: true });
      } catch (e) {
        response = e.message;
      }
      response
    JS
    result = @ctx.eval(js_code)
    assert_equal("Image generation is not currently supported for Anthropic.", result, "Expected error message for unsupported provider")
  end
end
