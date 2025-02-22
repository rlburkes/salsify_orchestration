# ProductHelper Library Documentation

The `ProductHelper` library provides an ergonomic wrapper over the workflow context, allowing you to easily look up property values for a product entity. This documentation will guide you through setting up and using the library to retrieve property values based on various criteria.

## Table of Contents

1. [Introduction](#introduction)
2. [Setup](#setup)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Examples](#examples)

## Introduction

The `ProductHelper` library is designed to simplify the process of accessing property values from a product entity. It supports various filtering options, allowing you to retrieve specific property values based on criteria such as name, ID, data type, locale, and source.

## Setup

To use the `ProductHelper` library, you need to create an instance of the helper using the workflow context. The context should contain the product entity with its properties.

```javascript
// Assume the workflow context is available as "context" (provided by your environment).
var Product = createProductHelper(context);
```

## Configuration

The `propertyValues` method allows you to configure the retrieval of property values using various options. Here are the available options:

- `name` (string): Matches the property `external_id` (from `property_value_collections`) or the key in `property_values`.
- `id` (string): Matches the property ID (from `property_value_collections` or `property_values_snapshot`).
- `dataType` (string): Filters properties by data type (e.g., "string", "number", "enumerated").
- `locale` (string): Optional locale filter.
- `source` (string): Specifies the source of the property values. Can be "collections", "object", or "snapshot". Defaults to "collections" if available.
- `first` (boolean): If `true`, returns the first matching value rather than an array.

## Usage

Use the `propertyValues` method to retrieve property values based on the configured options. The method returns an array of values or a single value if the `first` option is set to `true`.

```javascript
// Retrieve the SKU of the product
var sku = Product.propertyValues({ name: "SKU", first: true });

// Retrieve all string property values
var allStrings = Product.propertyValues({ dataType: "string" });
```

## Examples

Here are some examples of how to use the `ProductHelper` library with different configurations:

### Retrieve a Specific Property Value

```javascript
// Retrieve the brand of the product
var brand = Product.propertyValues({ name: "Brand", first: true });
console.log(brand); // Output: "VisionTech"
```

### Filter by Data Type

```javascript
// Retrieve all numeric property values
var numericValues = Product.propertyValues({ dataType: "number" });
console.log(numericValues); // Output: ["599.99", "25"]
```

### Filter by Locale

```javascript
// Retrieve the description in the "en-US" locale
var description = Product.propertyValues({ name: "Description", locale: "en-US", first: true });
console.log(description); // Output: "A 55-inch Ultra HD smart television with vibrant colors and deep blacks."
```

### Specify Source

```javascript
// Retrieve the price from the snapshot source
var price = Product.propertyValues({ name: "Price", source: "snapshot", first: true });
console.log(price); // Output: "599.99"
```

### Retrieve All Matching Values

```javascript
// Retrieve all values for the "Category" property
var categories = Product.propertyValues({ name: "Category" });
console.log(categories); // Output: ["Electronics"]
```

This documentation should help you get started with the `ProductHelper` library and integrate it into your projects. If you have any further questions or need additional examples, feel free to ask!
