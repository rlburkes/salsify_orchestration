const imageProperties = [
  "Haute résolution ∣ 1",
  "Résolution standard ∣ 0",
  "Autre hero image optimisée ∣ 17"
]

var selectedPropertyValues = {}
imageProperties.forEach(property => {
  const values = entity.property_values[property];
  var urls = [];
  if (values) {
    values.forEach(value => {
      urls.push(value_from_salsify('/digital_assets/' + value.external_id, 'data', 'download_url'));
    });
  }
  selectedPropertyValues[property] = urls;
});

selectedPropertyValues
