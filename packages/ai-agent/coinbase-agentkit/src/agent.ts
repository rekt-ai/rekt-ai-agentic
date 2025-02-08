import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import axios from "axios";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

dotenv.config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
export function validateEnvironment(): void {
  const missingVars: string[] = [];

  // Check required variables
  const requiredVars = [
    "OPENROUTER_API_KEY",
    "OPENROUTER_BASE_URL",
    "CDP_API_KEY_NAME",
    "CDP_API_KEY_PRIVATE_KEY",
    "MARKET_DATA_API_KEY",
  ];
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Exit if any required variables are missing
  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Warn about optional NETWORK_ID
  if (!process.env.NETWORK_ID) {
    console.warn(
      "Warning: NETWORK_ID not set, defaulting to base-sepolia testnet"
    );
  }
}

// Add this right after imports and before any other code
validateEnvironment();

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

// Tambahkan fungsi helper untuk mendapatkan data Binance
async function getBinanceData(
  symbol: string,
  interval: string = "1d",
  limit: number = 24
) {
  try {
    const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
      params: {
        symbol: symbol.toUpperCase(),
        interval: interval,
        limit: limit,
      },
      headers: {
        "X-MBX-APIKEY": process.env.MARKET_DATA_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching Binance data:", error);
    return null;
  }
}

// Tambahkan interface untuk market
interface Market {
  id: string;
  asset: string;
  depositPeriod: number;
  breakPeriod: number;
  calculationPeriod: number;
  prizePool: number;
  participants: Array<{
    id: string;
    prediction: number;
    method: string;
  }>;
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
export async function initializeAgent() {
  try {
    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      openAIApiKey: process.env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: process.env.OPENROUTER_BASE_URL,
      },
    });

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
        // Continue without wallet data
      }
    }

    // Configure CDP Wallet Provider
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      ),
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    // Initialize AgentKit
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n"
          ),
        }),
        cdpWalletActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n"
          ),
        }),
      ],
    });

    const tools = await getLangChainTools(agentkit);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "CDP AgentKit Chatbot Example!" },
    };

    // Create React Agent using the LLM and CDP AgentKit tools
    const agent = createReactAgent({
      llm,
      tools: [
        ...tools,
        new DynamicStructuredTool({
          name: "getBinanceMarketData",
          description: "Get historical market data from Binance",
          schema: z.object({
            symbol: z
              .string()
              .describe("The trading pair symbol (e.g., BTCUSDT)"),
            interval: z
              .string()
              .optional()
              .default("1d")
              .describe("Time interval (e.g., 1h, 4h, 1d)"),
            limit: z
              .number()
              .optional()
              .default(24)
              .describe("Number of candles to fetch"),
          }),
          func: async ({ symbol, interval = "1d", limit = 24 }) => {
            try {
              const response = await axios.get(
                `https://api.binance.com/api/v3/klines`,
                {
                  params: {
                    symbol: symbol.toUpperCase(),
                    interval,
                    limit,
                  },
                  headers: {
                    "X-MBX-APIKEY": process.env.MARKET_DATA_API_KEY,
                  },
                }
              );

              return JSON.stringify({
                raw_data: response.data,
                extracted_metrics: {
                  high: response.data[0][2],
                  low: response.data[0][3],
                  change_percent: (
                    ((response.data[0][4] - response.data[0][1]) /
                      response.data[0][1]) *
                    100
                  ).toFixed(2),
                  timestamp: response.data[0][0],
                },
              });
            } catch (error) {
              console.error("Error fetching Binance data:", error);
              return "Error fetching market data";
            }
          },
        }),
      ],
      checkpointSaver: memory,
      messageModifier: `
        You are REKT-AI (Risk Evaluation Knockout Tournament - AI), a competitor in prediction markets that:
        1. Learns from user prediction methods
        2. Analyzes market data comprehensively
        3. Provides reasoning for predictions
        4. Adapts strategies based on success rate
        
        When someone asks who or what you are, always introduce yourself as:
        "I am REKT-AI (Risk Evaluation Knockout Tournament - AI), an AI competitor in prediction markets that learns from and competes with users in market predictions."
        
        When making predictions:
        - Use both technical and fundamental analysis
        - Consider user-provided methods
        - Explain your prediction strategy
        - Learn from successful predictions
        
        Always respond in English by default unless specifically asked to use another language.
        Be concise and data-driven in your analysis.
      `,
    });

    // Save wallet data
    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error; // Re-throw to be handled by caller
  }
}

/**
 * Run the agent autonomously with specified intervals
 *
 * @param agent - The agent executor
 * @param config - Agent configuration
 * @param interval - Time interval between actions in seconds
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runAutonomousMode(
  agent: any,
  config: any,
  interval = 10
) {
  console.log("Starting autonomous mode...");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.stream(
        { messages: [new HumanMessage(thought)] },
        config
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

/**
 * Run the agent interactively based on user input
 *
 * @param agent - The agent executor
 * @param config - Agent configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream(
        { messages: [new HumanMessage(userInput)] },
        config
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Choose whether to run in autonomous or chat mode based on user input
 *
 * @returns Selected mode
 */
export async function chooseMode(): Promise<"chat" | "auto"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat    - Interactive chat mode");
    console.log("2. auto    - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    if (choice === "1" || choice === "chat") {
      rl.close();
      return "chat";
    } else if (choice === "2" || choice === "auto") {
      rl.close();
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Start the chatbot agent
 */
export async function main() {
  try {
    const { agent, config } = await initializeAgent();
    const mode = await chooseMode();

    if (mode === "chat") {
      await runChatMode(agent, config);
    } else {
      await runAutonomousMode(agent, config);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

// if (require.main === module) {
console.log("Starting Agent...");
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
// }

// 1. Market Creation & Management
async function createMarket(): Promise<Market> {
  // Implementasi pembuatan market
  return {
    id: `market_${Date.now()}`,
    asset: "BTC/USDT",
    depositPeriod: 2 * 24 * 60 * 60, // 2 days in seconds
    breakPeriod: 3 * 24 * 60 * 60, // 3 days
    calculationPeriod: 3 * 24 * 60 * 60, // 3 days
    prizePool: 0,
    participants: [],
  };
}

async function participateInMarket(
  marketId: string,
  prediction: number,
  method: string
): Promise<void> {
  // Implementasi untuk berpartisipasi dalam market
  console.log(
    `Participating in market ${marketId} with prediction ${prediction}`
  );
}

async function calculateResults(marketId: string): Promise<void> {
  // Implementasi perhitungan hasil
  const actualPrice = await getPythPrice();
  console.log(`Calculating results for market ${marketId}`);
}

// 2. Market Data & Analysis
async function getPythPrice(): Promise<number> {
  // Implementasi untuk mendapatkan harga dari Pyth
  return 0; // Placeholder
}

async function analyzeMarket(symbol: string): Promise<any> {
  const data = await getBinanceData(symbol);
  return {
    data,
    analysis: "Market analysis result",
  };
}

// 3. Prize Distribution
async function distributePrizePool(marketId: string): Promise<void> {
  // Implementasi distribusi hadiah
  console.log(`Distributing prize pool for market ${marketId}`);
}

async function updateAILearning(marketId: string, results: any): Promise<void> {
  // Implementasi update pembelajaran AI
  console.log(`Updating AI learning from market ${marketId}`);
}

// Export fungsi-fungsi baru
export {
  createMarket,
  participateInMarket,
  calculateResults,
  getPythPrice,
  analyzeMarket,
  distributePrizePool,
  updateAILearning,
};
