import * as dotenv from "dotenv";
import Robinhood, { submitChallenge } from "../src/index.js";
import fs from "fs/promises";

dotenv.config();

const TOKEN_FILE = "robinhood_auth.json";

/**
 * Check if a given token is expired.
 */
async function isTokenExpired(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // Assume expired if token is invalid
  }
}

/**
 * Handles authentication & API calls.
 */
async function main() {
  try {
    console.log("🔄 Connecting to Robinhood...");

    let authResponse;
    let robinhoodClient;
    let api; // ✅ Store API instance separately

    try {
      // ✅ Load existing token if available
      const tokenData = await fs.readFile(TOKEN_FILE, "utf8");
      authResponse = JSON.parse(tokenData);

      // ✅ Refresh token if expired
      if (await isTokenExpired(authResponse.access_token)) {
        console.log("🔄 Token expired, refreshing...");

        try {
          ({ tokenData: authResponse, api } = await Robinhood({
            token: authResponse.access_token,
          }));

          // ✅ Save refreshed token
          await fs.writeFile(TOKEN_FILE, JSON.stringify(authResponse));
        } catch (refreshError) {
          console.log("❌ Token refresh failed, re-authenticating...");
          throw refreshError;
        }
      } else {
        // ✅ Token valid, initialize API
        ({ tokenData: authResponse, api } = await Robinhood({
          token: authResponse.access_token,
        }));
      }

      console.log("✅ Authenticated using saved token.");
    } catch (err) {
      // ✅ Start fresh authentication if no valid token
      console.log("🔑 Need to authenticate with username/password");
      const username = process.env.ROBINHOOD_USERNAME;
      const password = process.env.ROBINHOOD_PASSWORD;

      if (!username || !password) {
        console.error("❌ Missing Robinhood credentials in .env file.");
        process.exit(1);
      }

      authResponse = await Robinhood({ username, password });

      // ✅ Handle MFA/Challenge if required
      while (authResponse.status === "awaiting_input") {
        console.log(authResponse.message);

        const readline = await import("readline/promises");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        let userInput;

        if (authResponse.authType === "device_confirmation") {
          console.log("📲 Confirm device approval on your phone.");
          await rl.question("👉 Press Enter once you have confirmed: ");
          userInput = null;
        } else if (authResponse.authType === "mfa") {
          userInput = await rl.question(
            "🔑 Enter the MFA code (SMS/Auth App): "
          );
        } else {
          userInput = await rl.question(
            "Enter the required input (SMS code or auth code): "
          );
        }

        rl.close();

        authResponse = await submitChallenge(
          authResponse.workflow_id,
          userInput
        );
      }

      // ✅ Save new token if authentication succeeds
      if (authResponse.tokenData.access_token) {
        console.log("✅ Authenticated successfully.");

        await fs.writeFile(TOKEN_FILE, JSON.stringify(authResponse.tokenData));

        // ✅ Ensure API instance is included
        ({ tokenData: authResponse, api } = await Robinhood({
          token: authResponse.tokenData.access_token,
        }));
      } else {
        console.error("❌ Authentication failed:", authResponse);
        process.exit(1);
      }
    }

    // ✅ Test API Call (fetch stock quote)
    try {
      console.log("📈 Fetching stock data...");
      const quote = await api.quote_data("AAPL"); // ✅ Now correctly using API instance
      console.log("🟢 Stock Quote:", quote);
    } catch (apiError) {
      console.error("❌ API call failed:", apiError);
    }
  } catch (error) {
    console.error("❌ Authentication error:", error);
  }
}

// 🔥 Start the authentication & test process
main();
