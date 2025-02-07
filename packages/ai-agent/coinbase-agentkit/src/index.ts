import express from "express";
import {
	initializeAgent,
	runAutonomousMode,
	runChatMode,
	validateEnvironment,
} from "./agent";
import * as dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 8081;

// Add this right after imports and before any other code

app.get("/run/:mode", async (req, res) => {
	validateEnvironment();
	try {
		const { agent, config } = await initializeAgent();
		let mode = req.params.mode;

		while (true) {
			if (mode === "chat") {
				await runChatMode(agent, config);
				// Restart if 'exit' is received in chat mode
				mode = req.params.mode;
			} else if (mode === "auto") {
				await runAutonomousMode(agent, config);
				// Autonomous mode keeps running indefinitely
			}
		}
		res.send("Agent executed successfully.");
	} catch (error) {
		if (error instanceof Error) {
			console.error("Error:", error.message);
			res.status(500).send("Internal Server Error: " + error.message);
		} else {
			res.status(500).send("Unknown error occurred.");
		}
	}
});

// API endpoint to trigger nodemon restart
app.get("/restart", (req, res) => {
	// This will cause nodemon to restart the app
	console.log("Restarting the app...");
	process.exit(0); // Exit the process, causing nodemon to restart
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
