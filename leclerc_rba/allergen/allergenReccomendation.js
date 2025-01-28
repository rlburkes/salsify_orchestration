function extractKnownAllergens(ingredientAnalysis) {
    const knownAllergensSet = new Set();

    ingredientAnalysis.forEach(entry => {
        entry.associated_allergens.forEach(allergen => {
            knownAllergensSet.add(allergen); // Add each allergen to the Set
        });
    });

    return Array.from(knownAllergensSet); // Convert the Set back to an array
}

function filterUnknownAllergenIngredients(ingredientAnalysis) {
    return ingredientAnalysis
        .filter(entry => entry.potential_unknown_allergens)
        .map(entry => entry.ingredient); // Return only the ingredient names
}

const knownAllergens = extractKnownAllergens(context.allergenIdentification.allergen_result.ingredient_analysis);
const unknownAllergenIngredients = filterUnknownAllergenIngredients(context.allergenIdentification.allergen_result.ingredient_analysis);

const retval = { reccommendedKnownAllergens: knownAllergens, potentialUnknownAllergens: unknownAllergenIngredients, allergenIngredientAnalysis: context.allergenIdentification.allergen_result.ingredient_analysis };
retval;