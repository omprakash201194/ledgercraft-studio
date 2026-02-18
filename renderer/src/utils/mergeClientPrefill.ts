
/**
 * Merges form field values with client field values.
 * 
 * Rules:
 * 1. If form value is empty/null/undefined -> use client value.
 * 2. If form value exists -> keep it (manual override).
 * 3. Input objects are NOT mutated.
 * 4. Returns a new object.
 */
export function mergeClientPrefill(
    formValues: Record<string, any>,
    clientValues: Record<string, any>
): Record<string, any> {
    // Start with a shallow copy of form values to ensure we have all manual entries
    const result = { ...formValues };

    // Iterate over client values to fill in missing/empty spots
    // We iterate clientValues because formValues might not even HAVE the keys yet if they are empty
    for (const key of Object.keys(clientValues)) {
        const formVal = result[key];
        // Check if form value is "empty" (undefined, null, or empty string)
        if (formVal === undefined || formVal === null || formVal === '') {
            result[key] = clientValues[key];
        }
    }

    return result;
}
