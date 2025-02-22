/**
 * ProductHelper is an ergonomic wrapper over the workflow context.
 * It exposes a propertyValues(options) method to look up property values.
 *
 * Options:
 *   - name: string — Matches the property external_id (from property_value_collections) or the key in property_values.
 *   - id: string — Matches the property id (from property_value_collections or property_values_snapshot).
 *   - dataType: string — e.g., "string", "number", "enumerated", etc.
 *   - locale: string — Optional locale filter.
 *   - source: string — (Optional) "collections", "object", or "snapshot". Defaults to "collections" if available.
 *   - first: boolean — If true, returns the first matching value rather than an array.
 *
 * Usage Example:
 *   var sku = Product.propertyValues({ name: "SKU", first: true });
 *   var allStrings = Product.propertyValues({ dataType: "string" });
 */
function createProductHelper(context) {
  return {
    propertyValues: function(options) {
      options = options || {};
      var results = [];
      var entity = context.entity;
      var source = options.source;

      // Determine default source if not provided
      if (!source) {
        if (entity.property_value_collections && entity.property_value_collections.length > 0) {
          source = "collections";
        } else if (entity.property_values) {
          source = "object";
        } else if (entity.property_values_snapshot && entity.property_values_snapshot.length > 0) {
          source = "snapshot";
        } else {
          source = "object"; // fallback
        }
      }

      // Helper function to check if a value matches the given options
      function matchesOptions(value, options) {
        return (!options.name || value.property.external_id === options.name) &&
               (!options.id || value.property.id === options.id) &&
               (!options.dataType || value.value_data_type === options.dataType) &&
               (!options.locale || value.locale_id === options.locale);
      }

      // Process structured collections
      if (source === "collections") {
        var collections = entity.property_value_collections;
        collections.forEach(function(col) {
          if (matchesOptions(col, options) && col.values && col.values.length > 0) {
            results = results.concat(col.values);
          }
        });
      }
      // Process flat object (less detailed; no data type filtering possible)
      else if (source === "object") {
        var propVals = entity.property_values;
        for (var key in propVals) {
          if (propVals.hasOwnProperty(key) && (!options.name || key === options.name) && !options.dataType) {
            results = results.concat(propVals[key]);
          }
        }
      }
      // Process snapshot array (can filter by data_type and id)
      else if (source === "snapshot") {
        var snapshots = entity.property_values_snapshot;
        snapshots.forEach(function(snap) {
          if ((!options.id || snap.property_id === options.id) &&
              (!options.dataType || snap.data_type === options.dataType) &&
              (!options.locale || snap.locale_id === options.locale) &&
              snap.values && snap.values.length > 0) {
            results = results.concat(snap.values);
          }
        });
      }

      return options.first && results.length > 0 ? results[0] : results;
    }
  };
}

// Assume the workflow context is available as "context" (provided by your environment).
// Create the Product helper from the workflow context.
var productHelper = createProductHelper(context);
productHelper;
