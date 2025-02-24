require 'json'

def generate_curl_command(request_json)
  url = request_json["url"]
  method = request_json["method"]
  headers = request_json["headers"].map { |k, v| "-H \"#{k}: #{v}\"" }.join(" ")
  payload = request_json["payload"].to_json

  "curl -X #{method} #{headers} -d '#{payload}' \"#{url}\""
end

if ARGV.empty?
  puts "Usage: ruby generate_curl.rb '<JSON_STRING>'"
  exit 1
end

# Read JSON from command-line argument
begin
  request_json = JSON.parse(ARGV[0])
  puts generate_curl_command(request_json)
rescue JSON::ParserError => e
  puts "Invalid JSON: #{e.message}"
end

