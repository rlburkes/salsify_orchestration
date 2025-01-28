const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${secret_value('open-ai-key')}`
};

var content = [
  {
    "type": "text",
    "text": `Please analyze the attached certificate PDF and extract embedded data.`
  }
]

const mockCertificate = {
  "certificate": [
    "https://images.salsify.com/image/upload/f_png/lacp7wbkvyf699ykxjcx",
    "https://images.salsify.com/image/upload/f_png,pg_2/lacp7wbkvyf699ykxjcx"
  ]
}

Object.entries(mockCertificate).forEach(entry => {
  const [key, values] = entry;
  values.forEach(imageUrl => {
    content.push({
      "type": "image_url",
      "image_url": {
        "url": imageUrl
      }
    });
  });
});

var payload = {
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": content
    }
  ],
  "response_format": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "document_number": {
        "type": "string",
        "description": "Unique identifier for the document"
      },
      "operator_type": {
        "type": "string",
        "enum": ["Operator"],
        "description": "Type of operator (e.g., Operator)"
      },
      "operator": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the operator"
          },
          "address": {
            "type": "string",
            "description": "Address of the operator"
          }
        },
        "required": ["name", "address"]
      },
      "control_body": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the control body"
          },
          "code": {
            "type": "string",
            "description": "Code of the control body"
          },
          "address": {
            "type": "string",
            "description": "Address of the control body"
          }
        },
        "required": ["name", "code", "address"]
      },
      "activities": {
        "type": "array",
        "items": {
          "type": "string",
          "description": "List of activities"
        }
      },
      "product_categories": {
        "type": "object",
        "properties": {
          "article_reference": {
            "type": "string",
            "description": "Reference to EU regulation article"
          },
          "products": {
            "type": "array",
            "items": {
              "type": "string",
              "description": "List of product categories"
            }
          }
        },
        "required": ["article_reference", "products"]
      },
      "certificate_date_and_place": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "format": "date",
            "description": "Date of the certificate"
          },
          "location": {
            "type": "string",
            "description": "Location where the certificate was signed"
          },
          "signed_by": {
            "type": "string",
            "description": "Name of the person who signed the certificate"
          }
        },
        "required": ["date", "location", "signed_by"]
      },
      "validity": {
        "type": "object",
        "properties": {
          "from": {
            "type": "string",
            "format": "date",
            "description": "Start date of the certificate validity"
          },
          "to": {
            "type": "string",
            "format": "date",
            "description": "End date of the certificate validity"
          }
        },
        "required": ["from", "to"]
      },
      "compliance_confirmation": {
        "type": "string",
        "description": "Confirmation of compliance with EU regulation"
      }
    },
    "required": [
      "document_number",
      "operator_type",
      "operator",
      "control_body",
      "activities",
      "product_categories",
      "certificate_date_and_place",
      "validity",
      "compliance_confirmation"
    ]
  },
  "max_tokens": 6000
}

web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
