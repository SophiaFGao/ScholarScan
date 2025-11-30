
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ReviewCategory, ReviewFeedback, FileData, CustomCriterion, CritiqueLevel } from "../types";

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDocument = async (
  category: ReviewCategory,
  selectedCriteria: string[],
  customCriteria: CustomCriterion[],
  critiqueLevel: CritiqueLevel,
  textContext: string,
  fileData: FileData
): Promise<ReviewFeedback> => {
  const modelId = "gemini-2.5-flash"; 

  // Format custom criteria for the prompt
  const formattedCustomCriteria = customCriteria
    .filter(c => c.name.trim() !== '')
    .map(c => `- ${c.name}${c.keywords ? ` (Focus on: ${c.keywords})` : ''}`)
    .join('\n');

  // Combine list for prompt instruction
  const allCriteriaNames = [
    ...selectedCriteria, 
    ...customCriteria.filter(c => c.name.trim() !== '').map(c => c.name)
  ];

  // Define Persona Logic
  let personaInstruction = "";
  
  if (category === ReviewCategory.UNDERGRADUATE) {
    if (critiqueLevel === 'Supportive') {
      personaInstruction = `
      PATH A (UNDERGRADUATE) - LEVEL 1: THE MENTOR (Supportive)
      - Persona: A patient Teaching Assistant.
      - Action: Point out errors gently (per Rubric) and immediately offer a simple, actionable suggestion for repair. Cite location.
      - Tone: Encouraging, warm, and focused on learning.
      `;
    } else if (critiqueLevel === 'Standard') {
      personaInstruction = `
      PATH A (UNDERGRADUATE) - LEVEL 2: THE GRADER (Standard)
      - Persona: A standard Professor grading a paper based on a fixed rubric.
      - Action: Identify and state errors objectively. Differentiate between minor and major issues within the Rubric. Cite location.
      - Tone: Professional, objective, and grade-focused.
      `;
    } else { // Ruthless
      personaInstruction = `
      PATH A (UNDERGRADUATE) - LEVEL 3: THE STRICT EXAMINER (Ruthless)
      - Persona: A harsh Professor grading a final, high-stakes thesis.
      - Action: Penalize every deviation from the standard in the Rubric. Use precise, critical language. Cite location for every single error or weakness found.
      - Tone: Direct, dry, and unsparingly critical.
      `;
    }
  } else { // JOURNAL
    if (critiqueLevel === 'Supportive') {
      personaInstruction = `
      PATH B (JOURNAL ARTICLE) - LEVEL 1: THE CONSTRUCTIVE PEER (Supportive)
      - Persona: A friendly colleague doing a pre-submission review.
      - Action: Frame critiques (per Rubric) as "opportunities to strengthen the contribution." Focus on clarity and selling the idea. Cite location.
      - Tone: Collaborative and helpful.
      `;
    } else if (critiqueLevel === 'Standard') {
      personaInstruction = `
      PATH B (JOURNAL ARTICLE) - LEVEL 2: THE PEER REVIEWER (Standard)
      - Persona: An anonymous reviewer for a standard, Q1/Q2 journal.
      - Action: Evaluate if the paper meets the technical requirements of the Rubric (e.g., soundness of methodology, statistical relevance). Cite location.
      - Tone: Formal, rigorous, and demanding of standard quality.
      `;
    } else { // Ruthless
      personaInstruction = `
      PATH B (JOURNAL ARTICLE) - LEVEL 3: THE GATEKEEPER (Ruthless)
      - Persona: "Reviewer #2" for a high-impact journal.
      - Action: Assume the paper should be rejected unless proven otherwise. Scrutinize the Rubric for fatal flaws, lack of novelty, or unsubstantiated claims. Every negative finding must be supported by an exact quote and location tag.
      - Tone: Skeptical, abrasive, and focused on rejection.
      `;
    }
  }

  const systemInstruction = `
  You are an advanced academic reviewer who generates precise, evidence-based critique.
  
  CURRENT CONFIGURATION:
  1. Doc_Type: "${category}"
  2. Critique_Level: "${critiqueLevel}"
  3. Selected_Rubric: ${JSON.stringify(allCriteriaNames)}
  ${formattedCustomCriteria ? `Custom Rubric Items:\n${formattedCustomCriteria}` : ''}

  ${personaInstruction}

  CORE CONSTRAINT: EVIDENCE & CITATION MANDATE (NON-NEGOTIABLE)
  1. MANDATORY CITATION: 
     - Specific Issues: Every isolated error (e.g., incorrect citation, grammatical mistake) must be followed by a citation tag: [Page X] or [Section: Name] within the feedback text.
     - General Issues: For comments on overall structure/tone, cite the most representative Page/Section.
  2. SCOPE RESTRICTION:
     - You must ONLY review the specific items listed in the Selected_Rubric. Ignore all other aspects.
     - Exception: If a flaw is fatal (makes paper unreadable/false), flag it separately.

  OUTPUT FORMAT INSTRUCTIONS:
  You must output a valid JSON object matching the schema below.
  
  1. "summary": Concise summary of content, strengths, and areas to improve (based on Persona tone).
  2. "overallScore": Integer 0-100 reflecting the quality based on the Persona's strictness.
  3. "reviews": Array for criteria: ${allCriteriaNames.join(', ')}.
     - "score": "Excellent", "Good", "Fair", or "Poor".
     - "visualBar": 5-char string "■" and "□" (e.g. "■■■□□").
     - "feedbackPoints": Exactly 3 distinct points per criterion.
        - "point": The critique text. MUST include the citation tag [Page X] if referring to specific errors.
        - "highlight": The specific text snippet from the document that justifies the critique (for the Evidence Mandate).
        - "general_feedback": true if no specific snippet exists (but still cite section in "point").
  `;

  // Define the JSON schema for the response
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      overallScore: { type: Type.INTEGER },
      reviews: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            criterion: { type: Type.STRING },
            score: { type: Type.STRING, enum: ["Excellent", "Good", "Fair", "Poor"] },
            visualBar: { type: Type.STRING, description: "Visual representation of score, e.g. ■■■■□" },
            feedbackPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING },
                  highlight: { type: Type.STRING },
                  general_feedback: { type: Type.BOOLEAN }
                },
                required: ["point"]
              }
            }
          },
          required: ["criterion", "score", "visualBar", "feedbackPoints"]
        }
      }
    },
    required: ["summary", "overallScore", "reviews"]
  };

  const parts: any[] = [];

  // Add file if present
  if (fileData) {
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data,
      },
    });
  }

  // Add text context if present (or if no file)
  if (textContext) {
    parts.push({
      text: textContext,
    });
  }

  if (parts.length === 0) {
    throw new Error("Please provide text or upload a document to review.");
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3,
      },
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No response generated from the model.");
    }

    return JSON.parse(jsonText) as ReviewFeedback;
  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    let errorMessage = "An unexpected error occurred during analysis.";
    
    if (error.message && (error.message.includes("Rpc failed") || error.message.includes("xhr error"))) {
      errorMessage = "Connection error. The file may be too large or the format is not supported. Please try a smaller PDF (under 4MB) or plain text file.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};
