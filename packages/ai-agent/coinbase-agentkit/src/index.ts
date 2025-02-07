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
		const mode = req.params.mode;

		if (mode === "chat") {
			await runChatMode(agent, config);
		} else {
			await runAutonomousMode(agent, config);
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

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
