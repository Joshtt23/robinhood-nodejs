import { authenticate, submitChallenge } from "./auth.js";
import RobinhoodApi from "./api.js";

// ✅ Export `submitChallenge` explicitly
export { submitChallenge };

export default async function Robinhood(credentials) {
  try {
    let authResponse;

    if (credentials.token) {
      console.log("✅ Using provided token...");
      authResponse = { tokenData: { access_token: credentials.token } };
    } else {
      // ✅ Start authentication
      authResponse = await authenticate(credentials);

      if (authResponse.status === "awaiting_input") {
        let authType = "unknown";

        if (authResponse.message.includes("SMS") || authResponse.message.includes("Authenticator")) {
          authType = "mfa";
        } else if (authResponse.message.includes("Confirm device approval")) {
          authType = "device_confirmation";
        }

        return {
          status: "awaiting_input",
          workflow_id: authResponse.workflow_id,
          message: authResponse.message,
          authType, // ✅ Now includes what type of authentication is needed
        };
      }

      if (
        authResponse.status !== "success" ||
        !authResponse.tokenData.access_token
      ) {
        throw new Error("❌ Authentication failed: Unexpected response");
      }

      console.log("✅ Authentication successful!");
    }

    // ✅ Always ensure API instance is included
    const apiInstance = new RobinhoodApi(authResponse.tokenData.access_token);

    return {
      tokenData: authResponse.tokenData,
      api: apiInstance,
    };
  } catch (error) {
    console.error("🚨 Robinhood Error:", error);
    throw error;
  }
}
