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
    let api;

    try {
      // Load existing token if available
      const tokenData = await fs.readFile(TOKEN_FILE, "utf8");
      const savedAuth = JSON.parse(tokenData);

      // Check if token is expired & refresh if possible
      if (
        savedAuth.refresh_token &&
        (await isTokenExpired(savedAuth.access_token))
      ) {
        console.log("🔄 Token expired, refreshing...");
        try {
          // Initialize API with expired token
          ({ api } = await Robinhood({
            token: savedAuth.access_token,
          }));

          // Use the API's refresh_token function
          const refreshedTokens = await api.refresh_token({
            refreshToken: savedAuth.refresh_token,
            deviceToken: savedAuth.device_token,
          });

          // Update saved auth data
          authResponse = {
            ...refreshedTokens,
          };

          // Save the refreshed tokens
          await fs.writeFile(TOKEN_FILE, JSON.stringify(authResponse));
          console.log("✅ Token refreshed successfully.");

          // ✅ FIX: Reinitialize API client with new access token
          ({ tokenData: authResponse, api } = await Robinhood({
            token: authResponse.access_token,
          }));
          console.log("✅ API reinitialized with refreshed token.");
        } catch (refreshError) {
          console.log("❌ Token refresh failed, re-authenticating...");
          throw refreshError;
        }
      } else {
        // Token is still valid
        ({ tokenData: authResponse, api } = await Robinhood({
          token: savedAuth.access_token,
        }));
        console.log("✅ Authenticated using saved token.");
      }
    } catch (err) {
      // Full authentication flow
      console.log("🔑 Need to authenticate with username/password");
      const username = process.env.ROBINHOOD_USERNAME;
      const password = process.env.ROBINHOOD_PASSWORD;

      if (!username || !password) {
        console.error("❌ Missing Robinhood credentials in .env file.");
        process.exit(1);
      }

      authResponse = await Robinhood({ username, password });

      // Handle MFA/Challenge if required
      let attempts = 0;
      const maxAttempts = 3;

      while (
        authResponse.status === "awaiting_input" &&
        attempts < maxAttempts
      ) {
        attempts++;
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
        console.log(authResponse);
      }

      if (attempts >= maxAttempts) {
        console.error("❌ Too many failed authentication attempts.");
        process.exit(1);
      }

      // Save new token if authentication succeeds
      if (authResponse?.access_token) {
        console.log("✅ Authenticated successfully.");
        await fs.writeFile(
          TOKEN_FILE,
          JSON.stringify({
            device_token: authResponse.device_token, // Ensure consistency
            access_token: authResponse.access_token,
            expires: authResponse.expires_in,
            token_type: authResponse.token_type,
            refresh_token: authResponse.refresh_token,
          })
        );

        // ✅ FIX: Reinitialize API client with new access token after login
        ({ tokenData: authResponse, api } = await Robinhood({
          token: authResponse.access_token,
        }));
      } else {
        console.error("❌ Authentication failed:", authResponse);
        process.exit(1);
      }
    }

    // Test API Call
    try {
      console.log("📈 Fetching stock data...");
      const quote = await api.quote_data("AAPL");
      console.log("🟢 Stock Quote:", quote);
    } catch (apiError) {
      console.error("❌ API call failed:", apiError.response?.data || apiError);
    }
  } catch (error) {
    console.error("❌ Authentication error:", error);
  }
}

// Start the authentication & test process
main();
