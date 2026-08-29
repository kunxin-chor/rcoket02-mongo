require('dotenv').config();
const {GoogleGenAI} = require('@google/genai');

// to create a new object from the class GoogleGenAI
// in JavaScript, a class is a definition for an object (aka a template for objects in JavaScript)
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})

const MODEL = process.env.GEMINI_MODEL;

module.exports = {
    ai, MODEL
}