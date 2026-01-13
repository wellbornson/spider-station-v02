import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For browser compatibility
});

interface GridDataPoint {
  no: number;
  name: string;
  amount: number;
}

export async function runAgent(messages: { role: string; content: string }[]) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an AI assistant for the Click Management System. Help the user with financial queries." },
        ...messages
      ] as any
    });
    return response.choices[0].message.content;
  } catch (error) {
    // Agent Error
    return "Sorry, I encountered an error. Please check your API key.";
  }
}

export class ClickAgent {
  /**
   * Analyzes the 3-block grid data.
   * Calculates totals based on the 'Amount' column and provides insights.
   */
  static async analyzeGrid(data: GridDataPoint[]) {
    // 1. Deterministic Calculation
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const count = data.length;
    const average = count > 0 ? totalAmount / count : 0;

    // 2. AI Analysis (Optional/Enriched)
    // We send a summary to the LLM for higher-level insights if needed
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are 'Click Intelligence', an AI assistant for a Cafe Management System. Analyze the current user grid stats."
          },
          {
            role: "user",
            content: `Current Grid Stats:
            - Total Users: ${count}
            - Total Amount: ${totalAmount}
            - Average: ${average}
            
            Provide a brief, 1-sentence operational insight.`
          }
        ]
      });

      return {
        totalAmount,
        average,
        insight: response.choices[0].message.content
      };

    } catch (error) {
      // AI Analysis failed
      // Fallback to basic stats
      return {
        totalAmount,
        average,
        insight: "AI unavailable. Stats calculated locally."
      };
    }
  }
}