// pages/api/questions.ts

import { NextApiRequest, NextApiResponse } from "next";
import { ChatOpenAI } from "@langchain/openai";

// Define the type structure for a question
interface Question {
  id: string;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: keyof Question["choices"];
}


const getQuestion = async (paragraph) => {
    function parseQuizResponse(response) {
      const lines = response.split("\n");
      
      const question = lines.find((line) => line.startsWith("Question:"))?.replace("Question: ", "").trim();
      const choices = {
        A: lines.find((line) => line.startsWith("A)"))?.replace("A) ", "").trim(),
        B: lines.find((line) => line.startsWith("B)"))?.replace("B) ", "").trim(),
        C: lines.find((line) => line.startsWith("C)"))?.replace("C) ", "").trim(),
        D: lines.find((line) => line.startsWith("D)"))?.replace("D) ", "").trim(),
      };
      const correctAnswer = lines.find((line) => line.startsWith("Correct Answer:"))?.replace("Correct Answer: ", "").trim()?.charAt(0);
    
      return { question, choices, correctAnswer };
    }
    const prompt = `
    You are a quiz generator. I will provide a paragraph, and you will create one question based on it along with four multiple-choice answers. Ensure that:
    1. The question is relevant to the paragraph's content.
    2. One answer is correct, and the other three are plausible distractors.
    3. Indicate the correct answer explicitly.
    
    Here is the paragraph:
    "${paragraph}"
    
    Generate:
    1. The question.
    2. Four answer choices labeled A, B, C, and D.
    3. Indicate the correct answer.
    
    Output your response in this format:
    Question: <Your question>
    A) <Answer choice A>
    B) <Answer choice B>
    C) <Answer choice C>
    D) <Answer choice D>
    Correct Answer: <Correct answer label (A, B, C, or D)>
      `;
    const model = new ChatOpenAI({
      apiKey: process.env.OPEN_AI_KEY,
      modelName: "gpt-4-1106-preview",
    });
    const response = await model.invoke(prompt);
    const parsedResponse = parseQuizResponse(response.content);
    return parsedResponse;
  }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Handle GET request to fetch questions
    const { paragraph } = req.body;
    const question = await getQuestion(paragraph);
    res.status(200).json(question);
  } else {
    // Handle unsupported methods
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
