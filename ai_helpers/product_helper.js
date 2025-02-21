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

      // Process structured collections
      if (source === "collections") {
        var collections = entity.property_value_collections;
        for (var i = 0; i < collections.length; i++) {
          var col = collections[i];
          // Filter by property external_id if name provided
          if (options.name && col.property && col.property.external_id !== options.name) {
            continue;
          }
          // Filter by property id if provided
          if (options.id && col.property && col.property.id !== options.id) {
            continue;
          }
          // Filter by data type if provided
          if (options.dataType && col.value_data_type !== options.dataType) {
            continue;
          }
          // Filter by locale if provided
          if (options.locale && col.locale_id !== options.locale) {
            continue;
          }
          if (col.values && col.values.length > 0) {
            results = results.concat(col.values);
          }
        }
      }
      // Process flat object (less detailed; no data type filtering possible)
      else if (source === "object") {
        var propVals = entity.property_values;
        for (var key in propVals) {
          if (propVals.hasOwnProperty(key)) {
            if (options.name && key !== options.name) {
              continue;
            }
            // Cannot filter by dataType here
            if (options.dataType) {
              continue;
            }
            results = results.concat(propVals[key]);
          }
        }
      }
      // Process snapshot array (can filter by data_type and id)
      else if (source === "snapshot") {
        var snapshots = entity.property_values_snapshot;
        for (var j = 0; j < snapshots.length; j++) {
          var snap = snapshots[j];
          if (options.id && snap.property_id !== options.id) {
            continue;
          }
          if (options.dataType && snap.data_type !== options.dataType) {
            continue;
          }
          // Name filtering not supported here as snapshot doesn't include a property name
          if (options.locale && snap.locale_id !== options.locale) {
            continue;
          }
          if (snap.values && snap.values.length > 0) {
            results = results.concat(snap.values);
          }
        }
      }

      if (options.first && results.length > 0) {
        return results[0];
      }
      return results;
    }
  };
}

// Assume the workflow context is available as "context" (provided by your environment).
// Create the Product helper from the workflow context.
createProductHelper(context);

