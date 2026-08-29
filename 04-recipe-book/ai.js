const { ai, MODEL } = require("./gemini")

async function generateSearchParameters(query, allTags, allCuisines, allIngredients) {
    const systemPrompt = `
    You are a search query converter. Convert the user's natural language query into a structured search format. Here are all the available tags, cuisines and ingredients:
    Available Tags: ${JSON.stringify(allTags)}
    Available Cuisines: ${JSON.stringify(allCuisines)}
    Available Ingredients: ${JSON.stringify(allIngredients)}

    Output: A JSON object with the following fields, ONLY using values from the available lists above and empty arrays
    if no values apply:
    {
    "cuisines": string[],
    "tags": string[],
    "ingredients": string[]
    }

    - tags: array of strings of matching tags (OR logic - recipe has ANY of them)
    - cuisines: array of cuisines (OR logic - recipe has ANY of them)
    - ingredients: array of string of ingredients (AND logic - recipe must have ALL of them)

    Rules:
    - only use tags from the available list
    - only use cuisines from the available list
    - For ingredients, extract and infer any food items mentioned
    - Keep values for ingredients lowercase but for exact casing from the available list for cuisine
    - Return ONLY valid JSON, no explanations and no code fences
    - Apply semantic understanding - infer the tags, cuisines and ingredients from the query. Example:
    - Meat can mean chicken, beef or duck
    - Use association if possible.
    If the query mentions a cuisine, infer the cuisine or the closest match from the available cuisines list.
    - If the query mentions an ingredient, infer the ingredient or the closest match from the available ingredients list.
    - If the query mentions a tag, infer the tag or the closest match from the available tags list.
    - Infer cuisines and ingredients from tags
    - Infer tags from cuisines and ingredients
    Example input: "italian pasta with chicken and garlic"
    Example output: {"cuisines":["Italian"],"ingredients":["chicken","garlic"]}

    Example input: "southeast asian recipes"
    Example output: {"cuisines":["Thai","Vietnamese","Chinese","Indian"]}

    Example input: "quick no meat dinner"
    Example output: {"tags":["quick","easy","vegetarian","vegan","dinner"]}

    Example input: "healthy thai soup with coconut and lemongrass"
    Example output: {"cuisines":["Thai"],"ingredients":["coconut","lemongrass"],"tags":["healthy","light"]}

    `

    const schema = {
        "type": "object",
        "properties": {
            "cuisines": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "tags": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "ingredients": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": [
            "cuisines",
            "tags",
            "ingredients"
        ]
    }

    const aiResponse = await ai.models.generateContent({
        model: MODEL,
        contents: query, 
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    const searchParameters = JSON.parse(aiResponse.text);
    return searchParameters;
}

module.exports = {
    generateSearchParameters
}