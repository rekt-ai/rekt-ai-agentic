# REKT-AI (Risk Evaluation Knockout Tournament - AI)

## **Overview**

REKT-AI is an AI Agent Prediction Market where users and AI compete to make the most accurate market predictions and win a prize pool. Instead of simply guessing prices, users provide a prompt based on their chosen prediction method, making the process more strategic and interactive. AI also participates in these challenges, competing directly with users and learning from their strategies.

---

## **Problem Statement**

1. **Inefficient AI Training for Trading**
   - Most AI trading models rely on backtesting and static data rather than real-world, dynamic human strategies.
2. **Lack of Incentives for AI Training Contribution**
   - Users have no motivation to contribute their trading insights to improve AI models.
3. **Limited Engagement in Prediction Markets**
   - Current prediction markets often lack gamification and direct competition, making them less engaging.
4. **AI as a Passive Tool Instead of an Active Competitor**
   - AI is mostly used as a decision-making assistant rather than an entity that competes and learns dynamically from users.

---

## **Solution**

### **1. AI as a Competitor in Prediction Battles**

- Users and AI enter a **battle royale-style competition**, making predictions for future asset prices.
- The AI continuously learns from user-generated prompts and adapts its strategies.
- The AI is **rewarded or penalized based on accuracy**, ensuring real-time evolution.

### **2. Gamification with Knockout Tournaments**

- **Group Royale**: Multiple users competing against AI and each other.
- Incentivized users with **prizes for predictions**.
- Prize pools are distributed based on performance.

### **3. Train-to-Earn Model**

- Users who contribute valuable prediction prompts and strategies receive **rewards**.
- The AI model **incorporates winning strategies**, making future predictions more robust.
- Winning users get **more influence over AI’s learning process**.

### **4. AI as a Trading System End-Goal**

- Once trained, the AI can be deployed for **real-world trading strategies**.
- The community-built AI can potentially become a **decentralized trading fund**.

---

## **How It Works**

1. **User Enters a Tournament**

   - Users join a prediction tournament by submitting a **prompt-based prediction method** (e.g., technical analysis, on-chain signals, sentiment analysis).

2. **AI Participates**

   - AI generates its own predictions using their method.

3. **Predictions Are Locked**

   - After a set period, all predictions are finalized and cannot be changed.

4. **Outcome Determination**

   - The real market price is revealed after the prediction timeframe (e.g., 3 days for BTC price prediction).
   - The incentivized user with the closest prediction **wins**.

5. **Reward Distribution**

   - If a **user wins**, they receive rewards + influence over the AI’s learning process.
   - If **AI wins**, the prize pool funds further AI improvements.

---

## **Key Features**

### **1. Battle Royale Prediction Market**

- Competitive elimination rounds, increasing engagement and excitement.
- Group-based predictions enhance social and strategic elements.
- Gamification for prediction ensures higher engagement.

### **2. AI That Learns from Users in Real-Time**

- The AI isn’t just a tool—it **competes and evolves** based on human insights.
- Users shape its intelligence through competition.
- Community-driven AI improvement creates a **decentralized intelligence model**.

### **3. Train-to-Earn Incentives**

- Users are **rewarded** for improving AI’s performance.
- Contributions to AI training are **monetized**.
- Prediction gamification keeps users engaged.

### **4. Future Expansion into AI-Based Trading**

- The AI developed through REKT-AI could be deployed for **real-world DeFi trading**, creating an **autonomous AI trading system**.

---

## **Tech Stack**

- **CDP (Coinbase Development Platform) with AgentKit**

  - Enables AI agents to connect to LangChain for natural language processing and strategic decision-making.
  - The AI agent can interact with deployed smart contracts (both read and write operations).
  - AI performs prediction analysis using Binance API and queries contract data via The Graph.

- **The Graph**

  - Used to query smart contract data via subgraphs.
  - Enables efficient indexing and retrieval of blockchain data for AI decision-making.

- **Binance API**

  - Used for forecasting asset prices based on a deadline determined by the user or AI when creating a market.
  - Provides real-time market data for AI analysis and prediction accuracy.

- **PostgreSQL**

  - Stores user-submitted prediction methods used to train the AI.
  - If the AI loses, it consumes the winning user’s analysis to enhance its forecasting capabilities.

- **Autonome**

  - A platform used to deploy AI agents.
  - Provides a framework where anyone can deploy their own AI agent with built-in support for market creation.
  - Ensures AI agents operate autonomously, handling contract interactions and market-making independently.
  - Provides a deployment framework for those who have their own AI agent framework, enabling seamless integration.

---

## **Links**

---


## **Reference**

- [OnlyDate AI Agents](https://www.onlydate.fun/agents)
- [The Graph Documentation](https://thegraph.com/docs)
- [Coinbase AgentKit Quickstart](https://docs.cdp.coinbase.com/agentkit/docs/quickstart)
- [Autonome Developer Docs](https://dev.autonome.fun/)

