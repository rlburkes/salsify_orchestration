# README

## Project Overview
This repository contains orchestration scripts developed for the **Leclerc** project and similar project-based workflows. These scripts are designed to streamline integration processes, automate repetitive tasks, and enable efficient management of data and workflows within the **Minirace** platform. The scripts primarily run in a JavaScript environment powered by an embedded **v8** engine, which imposes some specific limitations and considerations detailed below.

While Leclerc serves as the primary use case, the design principles, structure, and functionality of these scripts are applicable to a broad range of projects.

---

## Features
- **Event-Driven Workflows**: Scripts can be triggered by configurable events such as webhook calls, API triggers, or changes to data properties.
- **Data Transformation**: Includes utilities for handling transformations, validations, and cross-referencing datasets (e.g., enum lists).
- **Integration-Friendly**: Supports integrations with external services and APIs via `web_request` or platform-specific connectors.
- **Scalable Design**: Scripts are modular and can be extended to accommodate additional functionality.

---

## Requirements and Environment
### Running Environment
Scripts execute within the **Minirace** runtime, which leverages the **v8** JavaScript engine embedded in a controlled environment. This runtime supports:
- Modern JavaScript (ES6+)
- Built-in functions provided by the Minirace platform (e.g., `web_request`, `log`, and data utilities)

### Key Limitations
1. **No Access to Standard Node.js Modules**: The v8 runtime does not support native Node.js modules (e.g., `fs`, `http`). All functionality must rely on the built-in API provided by the platform.
2. **Restricted Runtime Features**:
   - **No Asynchronous I/O**: Operations must be synchronous; asynchronous patterns like `async/await` and `Promise` are not supported.
   - **Limited Memory and Execution Time**: Ensure scripts are optimized to avoid exceeding runtime limits.
3. **Embedded Functions**:
   - `web_request(url, method, payload, headers)`: Used for making HTTP requests. Returns synchronous responses in JSON.
   - `log(message)`: Logs data to the execution trace, useful for debugging.

---

## Repository Structure
- **`/scripts`**: Contains project-specific orchestration scripts, organized by use case.
  - Example: `leclerc_enum_validator.js`
- **`/utilities`**: Shared helper functions for tasks like validation, transformation, and parsing.
  - Example: `data_transformation_utils.js`
- **`/examples`**: Sample scripts showcasing common use cases and patterns.
- **`/docs`**: Documentation for key workflows, including setup and troubleshooting.

---

## Common Use Cases
1. **Data Validation and Enrichment**
   - Validates incoming data and enriches it with information from reference datasets (e.g., enum mappings for wine appellations).

2. **API Integrations**
   - Interfaces with third-party APIs to fetch or post data during workflow execution.

3. **Change Set Proposals**
   - Creates proposals for record updates based on detected data inconsistencies or business rules.

---

## Development Guidelines
### Coding Standards
- Write modular and reusable functions to ensure maintainability.
- Follow platform constraints (e.g., synchronous execution) to avoid runtime errors.
- Use descriptive logging to aid debugging and monitoring.

### Testing
- Use the platform-provided **REPL task** to debug scripts during development.
- Mock external API responses when testing `web_request` calls.

### Deployment
1. Ensure scripts are validated in the test environment before deployment.
2. Use project-specific folders to organize scripts and maintain clarity.
3. Document script functionality in the `/docs` directory.

---

## Known Issues and Troubleshooting
1. **Memory Limits**: Large datasets can cause memory overflows. Break down processing into smaller batches where possible.
2. **Unsupported Features**: Scripts requiring asynchronous logic or unsupported Node.js modules must be rewritten or executed in external environments like AWS Lambda or Azure Functions.
3. **API Errors**: Use `try-catch` blocks and detailed logging to capture and diagnose issues when making web requests.

---

## Future Enhancements
- Add support for advanced logging and monitoring to improve observability.
- Extend utilities for more comprehensive data transformations.
- Explore hybrid architectures using serverless functions for tasks exceeding Minirace's capabilities.

---

## Contributors
This project was collaboratively developed by the engineering team with contributions from all members. Feedback and improvements are welcome!

---

For questions or additional support, contact the engineering team or refer to the `/docs` directory for detailed workflow documentation.
