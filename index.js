import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function generateQuestions(): Promise<Question[]> {
  console.log("Generando preguntas de conocimiento general con Claude...\n");

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Genera exactamente 5 preguntas de conocimiento general en formato JSON. 
        Cada pregunta debe tener:
        - "question": el texto de la pregunta
        - "options": un array con 4 opciones de respuesta (strings)
        - "correctAnswer": el índice (0-3) de la respuesta correcta
        
        Las preguntas deben ser interesantes y de diferentes temas (historia, ciencia, geografía, etc).
        Responde SOLO con el JSON, sin explicaciones adicionales.`,
      },
    ],
  });

  // Extract the text content from the response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  const jsonText = content.text;

  // Parse the JSON response
  const questionsData = JSON.parse(jsonText);

  return questionsData;
}

async function runQuiz(questions: Question[]): Promise<number> {
  console.log("¡Bienvenido al Quiz de Conocimiento General!\n");
  console.log(`Se te harán ${questions.length} preguntas.\n`);
  console.log("Escribe el número (1-4) de tu respuesta.\n");

  let score = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\nPregunta ${i + 1} de ${questions.length}:`);
    console.log(q.question);
    console.log("");

    for (let j = 0; j < q.options.length; j++) {
      console.log(`${j + 1}. ${q.options[j]}`);
    }

    let validAnswer = false;
    let userAnswerIndex = -1;

    while (!validAnswer) {
      const answer = await question("\nTu respuesta (1-4): ");
      const answerNum = parseInt(answer, 10);

      if (answerNum >= 1 && answerNum <= 4) {
        validAnswer = true;
        userAnswerIndex = answerNum - 1;
      } else {
        console.log("Por favor, ingresa un número entre 1 y 4.");
      }
    }

    if (userAnswerIndex === q.correctAnswer) {
      console.log("✓ ¡Correcto!");
      score++;
    } else {
      console.log(
        `✗ Incorrecto. La respuesta correcta era: ${q.options[q.correctAnswer]}`
      );
    }
  }

  return score;
}

function displayResults(score: number, total: number): void {
  const percentage = (score / total) * 100;

  console.log("\n" + "=".repeat(50));
  console.log("RESULTADOS FINALES");
  console.log("=".repeat(50));
  console.log(`Puntuación: ${score} de ${total}`);
  console.log(`Porcentaje: ${percentage.toFixed(1)}%`);

  if (percentage === 100) {
    console.log("¡Excelente! ¡Respuestas perfectas!");
  } else if (percentage >= 80) {
    console.log("¡Muy bien! Gran desempeño.");
  } else if (percentage >= 60) {
    console.log("Bien. Podrías mejorar.");
  } else if (percentage >= 40) {
    console.log("Regular. Necesitas estudiar más.");
  } else {
    console.log("Necesitas mejorar bastante. ¡Intenta de nuevo!");
  }
  console.log("=".repeat(50));
}

async function main(): Promise<void> {
  try {
    const questions = await generateQuestions();

    if (!questions || questions.length === 0) {
      console.error("Error: No se pudieron generar las preguntas.");
      process.exit(1);
    }

    const score = await runQuiz(questions);
    displayResults(score, questions.length);

    rl.close();
  } catch (error) {
    console.error("Error:", error);
    rl.close();
    process.exit(1);
  }
}

main();