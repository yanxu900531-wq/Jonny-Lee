import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { StoryData, WordChallenge, CrosswordData } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

// --- Helper Schemas ---

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questionText: { type: Type.STRING },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    correctAnswerIndex: { type: Type.INTEGER },
    explanation: { type: Type.STRING }
  },
  required: ["questionText", "options", "correctAnswerIndex", "explanation"]
};

const storySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: { type: Type.STRING },
    chineseSummary: { type: Type.STRING },
    vocabulary: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 5-8 key English vocabulary words from the story suitable for learning."
    },
    questions: {
      type: Type.ARRAY,
      items: questionSchema
    }
  },
  required: ["title", "content", "chineseSummary", "questions", "vocabulary"]
};

const wordChallengeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    emoji: { type: Type.STRING },
    chineseMeaning: { type: Type.STRING },
    sentence: { type: Type.STRING, description: "A simple example sentence using the word, with the word replaced by underscores." },
    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 incorrect Chinese meanings and 1 correct one mixed." },
    correctIndex: { type: Type.INTEGER }
  },
  required: ["word", "emoji", "chineseMeaning", "sentence", "options", "correctIndex"]
};

const crosswordSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          word: { type: Type.STRING },
          clue: { type: Type.STRING, description: "A simple Chinese definition or hint." },
          startX: { type: Type.INTEGER, description: "X coordinate (0-9)" },
          startY: { type: Type.INTEGER, description: "Y coordinate (0-9)" },
          direction: { type: Type.STRING, enum: ["across", "down"] }
        },
        required: ["id", "word", "clue", "startX", "startY", "direction"]
      }
    }
  },
  required: ["title", "words"]
};

const wordListSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    words: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of English words found in the image."
    }
  },
  required: ["words"]
};

// --- API Functions ---

export const generateIcon = async (prompt: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: `A cute, 3D cartoon icon for a children's app. Style: colorful, rounded, friendly, white background. Subject: ${prompt}` }
      ]
    },
    config: {
      responseModalities: [Modality.IMAGE]
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part && part.inlineData && part.inlineData.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Failed to generate image");
};

export const generateStory = async (topic: string): Promise<StoryData> => {
  const model = "gemini-2.5-flash";
  const prompt = `Write a fun, engaging short story (about 100-150 words) for a 4th-grade student named Rachel learning English. 
  The topic is: ${topic}.
  Language level: CEFR A2/B1. Simple grammar, useful vocabulary.
  After the story, provide a brief summary in Chinese.
  Extract key vocabulary words.
  Then provide 3 reading comprehension questions.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: storySchema,
      temperature: 0.7,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as StoryData;
};

export const generateWordChallenge = async (): Promise<WordChallenge> => {
  const model = "gemini-2.5-flash";
  const prompt = `Generate a random vocabulary challenge for a 4th grader.
  Pick a common, useful English noun, verb, or adjective suitable for this age.
  Create a fill-in-the-blank sentence.
  Provide Chinese options for the definition.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: wordChallengeSchema,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as WordChallenge;
};

export const getChatResponse = async (history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> => {
    const model = "gemini-2.5-flash";
    const chat = ai.chats.create({
        model,
        history: history,
        config: {
            systemInstruction: "You are 'Sparky', a magical, friendly talking squirrel who teaches English to Rachel, a 4th grade girl. Keep sentences simple. If the user makes a grammar mistake, gently correct them in a fun way. Be encouraging and use emojis.",
        }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "";
};

export const generateCrossword = async (): Promise<CrosswordData> => {
  const model = "gemini-2.5-flash";
  const prompt = `Create a simple crossword puzzle for a 4th grader learning English.
  Theme: General 4th grade vocabulary (School, Animals, Family, Hobbies, Food).
  Grid size is 10x10 (indices 0-9).
  Generate 6-8 words that intersect cleanly.
  Provide 'startX' (col), 'startY' (row), and 'direction' ('across' or 'down').
  Ensure words do not go out of bounds.
  Provide Chinese clues.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: crosswordSchema,
      temperature: 0.7,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No crossword generated");
  return JSON.parse(text) as CrosswordData;
};

export const extractWordsFromImage = async (base64Image: string): Promise<string[]> => {
  const model = "gemini-2.5-flash";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: "Identify all the English words in this image that are suitable for a 4th grader to learn. Ignore very short words like 'a', 'the', 'is' unless they are significant. Return a JSON list of strings." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: wordListSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("Could not read image");
  const data = JSON.parse(text) as { words: string[] };
  return data.words;
};

export const generateStoryAudio = async (text: string): Promise<{ audioData: Float32Array; sampleRate: number }> => {
  const model = "gemini-2.5-flash-preview-tts";
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  // 1. Decode Base64 to binary
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 2. Manually Decode PCM (Int16 -> Float32)
  // Gemini TTS returns raw PCM: 24kHz, Mono, 16-bit integer.
  const dataInt16 = new Int16Array(bytes.buffer);
  const float32Data = new Float32Array(dataInt16.length);
  
  // Normalize Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
  for (let i = 0; i < dataInt16.length; i++) {
    float32Data[i] = dataInt16[i] / 32768.0;
  }

  // Return the raw data instead of an AudioBuffer to avoid creating AudioContexts in the service
  return {
    audioData: float32Data,
    sampleRate: 24000
  };
};

export { ai };