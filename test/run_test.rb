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
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com/v1");
      var response = provider.callCompletion("Test prompt", {simulate: true, max_tokens: 150});
      response;
    JS
    result = @ctx.eval(js_code)
    assert_equal("https://api.openai.com/v1/chat/completions", result["url"], "OpenAI URL mismatch")
    assert_equal("Bearer testkey", result["headers"]["Authorization"], "Authorization header mismatch")
    assert_equal(150, result["payload"]["max_tokens"], "max_tokens value mismatch")
    messages = result["payload"]["messages"]
    assert_not_nil(messages, "Messages payload missing")
    assert_equal("Test prompt", messages[0]["content"], "Prompt message mismatch")
  end

  def test_openai_response_format_validation
    # For providers supporting JSON (OpenAI and GeminiViaOpenAI), invalid response_format should return errors.
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com/v1");
      // Supply an invalid response_format (missing required properties).
      var result = provider.callCompletion("Test prompt", {simulate: true, response_format: {}});
      result;
    JS
    result = @ctx.eval(js_code)
    # Expect an array of error messages.
    assert(result.is_a?(Array), "Expected error array for invalid response_format")
    assert(result.include?("Missing 'name' property."), "Expected missing 'name' error")
  end

  def test_salsify_ai_anthropic_provider
    js_code = <<~JS
      var provider = SalsifyAI.anthropicProvider("anthrokey", "https://api.anthropic.com");
      var response = provider.callCompletion("Anthropic test", {simulate: true});
      response;
    JS
    result = @ctx.eval(js_code)
    assert_equal("https://api.anthropic.com/v1/messages", result["url"], "Anthropic URL mismatch")
    assert_equal("anthrokey", result["headers"]["x-api-key"], "API key header mismatch")
    assert_equal("2023-06-01", result["headers"]["anthropic-version"], "Anthropic version header mismatch")
    messages = result["payload"]["messages"]
    assert_equal("Anthropic test", messages[0]["content"], "Anthropic prompt message mismatch")
  end

  def test_salsify_ai_gemini_provider
    # For Gemini, note that providerSupportsJSON is false, so the response_format is injected as a directive and
    # later used to set generationConfig.responseSchema.
    response_format = {
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
      var provider = SalsifyAI.geminiProvider("geminikey", "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
      var response = provider.callCompletion("Gemini test", {simulate: true, max_tokens: 200, response_format: #{response_format.to_json}});
      response;
    JS
    result = @ctx.eval(js_code)
    # The URL should include the API key as a query parameter.
    expected_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=geminikey"
    assert_equal(expected_url, result["url"], "Gemini URL mismatch")
    # Verify that max_tokens and the generationConfig are set.
    assert_equal(200, result["payload"]["generationConfig"] && result["payload"]["generationConfig"]["maxOutputTokens"], "max_tokens mismatch for Gemini")
    assert_equal("application/json", result["payload"]["generationConfig"]["responseMimeType"], "Response MIME type mismatch for Gemini")
    # The responseSchema should be the schema with additionalProperties removed.
    expected_schema = { "type" => "object", "properties" => { "test" => { "type" => "string" } }, "required" => ["test"] }
    assert_equal(expected_schema, result["payload"]["generationConfig"]["responseSchema"], "Gemini responseSchema conversion failed")
  end

  def test_salsify_ai_mistral_provider
    js_code = <<~JS
      var provider = SalsifyAI.mistralProvider("mistralkey", "https://api.mistral.ai");
      var response = provider.callCompletion("Mistral test", {simulate: true, response_format: {dummy: true}});
      response;
    JS
    result = @ctx.eval(js_code)
    expected_url = "https://api.mistral.ai/v1/chat/completions"
    assert_equal(expected_url, result["url"], "Mistral URL mismatch")
    assert_equal("Bearer mistralkey", result["headers"]["Authorization"], "Mistral Authorization header mismatch")
    assert_equal("application/json", result["headers"]["Accept"], "Mistral Accept header mismatch")
    # For Mistral, any provided response_format is converted to a fixed { type: 'json_object' }.
    assert_equal({ "type" => "json_object" }, result["payload"]["response_format"], "Mistral response_format conversion failed")
  end

  def test_salsify_ai_gemini_via_openai_provider
    response_format = {
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
      var response = provider.callCompletion("GeminiViaOpenAI test", {simulate: true, max_tokens: 250, response_format: #{response_format.to_json}});
      response;
    JS
    result = @ctx.eval(js_code)
    expected_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    assert_equal(expected_url, result["url"], "GeminiViaOpenAI URL mismatch")
    assert_equal("Bearer geminiOpenAIKey", result["headers"]["Authorization"], "GeminiViaOpenAI Authorization header mismatch")
    assert_equal(250, result["payload"]["max_tokens"], "GeminiViaOpenAI max_tokens mismatch")
    # The response_format should be embedded as { json_schema: <provided schema>, type: 'json_schema' }.
    expected_response_format = { "json_schema" => deep_stringify_keys(response_format), "type" => "json_schema" }
    assert_equal(expected_response_format, result["payload"]["response_format"], "GeminiViaOpenAI response_format mismatch")
  end

  def test_add_context_chainability
    # Verify that addContext can be chained and affects the prompt.
    js_code = <<~JS
      var provider = SalsifyAI.openAIProvider("testkey", "https://api.openai.com/v1");
      provider.addContext("Greeting", {msg: "Hello"});
      provider.addContext("Footer", "Goodbye");
      var response = provider.callCompletion("Base prompt", {simulate: true});
      response;
    JS
    result = @ctx.eval(js_code)
    # The full prompt (passed as message content) should include the contexts.
    prompt = result["payload"]["messages"][0]["content"]
    assert_match(/~~~~BEGIN Greeting~~~~/, prompt, "Context 'Greeting' missing from prompt")
    assert_match(/~~~~BEGIN Footer~~~~/, prompt, "Context 'Footer' missing from prompt")
    assert_match(/Base prompt/, prompt, "Base prompt missing")
  end

  # --- Optional: Credentials Injection Test ---
  def test_credentials_injection
    if File.exist?("credentials.txt")
      credentials = File.read("credentials.txt").strip
      js_code = <<~JS
        var provider = SalsifyAI.openAIProvider("#{credentials}", "https://api.openai.com/v1");
        var response = provider.callCompletion("Credential test", {simulate: true});
        response;
      JS
      result = @ctx.eval(js_code)
      expected_header = "Bearer #{credentials}"
      assert_equal(expected_header, result["headers"]["Authorization"], "Credentials not injected correctly")
    else
      assert(true, "No credentials.txt file found; skipping credentials test.")
    end
  end
end

puts "All tests passed."
