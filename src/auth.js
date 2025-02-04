import fetch from "node-fetch";
import { robinhoodApiBaseUrl, clientId, endpoints } from "./constants.js";
import { v4 as uuidv4 } from "uuid";

const defaultHeaders = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
  origin: "https://robinhood.com",
  referer: "https://robinhood.com/",
  "X-Robinhood-API-Version": "1.431.4",
  Connection: "keep-alive",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
  "x-timezone-id": "America/New_York",
};

// Store authentication states for tracking ongoing workflows
const workflowStates = new Map();

function saveWorkflowState(id, state) {
  workflowStates.set(id, state);
}

function getWorkflowState(id) {
  return workflowStates.get(id);
}

function deleteWorkflowState(id) {
  workflowStates.delete(id);
}

// **START AUTHENTICATION**
export async function authenticate(credentials) {
  console.log("🔑 Starting authentication...");
  let { username, password, deviceToken } = credentials;

  if (!deviceToken) {
    deviceToken = uuidv4();
  }
  console.log("🆔 Device token:", deviceToken);

  const headers = {
    ...defaultHeaders,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const payload = {
    client_id: clientId,
    grant_type: "password",
    username,
    password,
    device_token: deviceToken,
    scope: "internal",
    challenge_type: "sms", // Default, but can change based on workflow
    expires_in: 86400,
    long_session: true,
    create_read_only_secondary_token: true,
    token_request_path: "/login",
    try_passkeys: false,
  };

  try {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.login, {
      method: "POST",
      headers,
      body: new URLSearchParams(payload),
    });

    const data = await response.json();

    if (data.verification_workflow) {
      const workflowId = uuidv4();

      // ✅ Call user_machine endpoint
      const machineResponse = await fetch(
        `${robinhoodApiBaseUrl}/pathfinder/user_machine/`,
        {
          method: "POST",
          headers: { ...defaultHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: deviceToken,
            flow: "suv",
            input: { workflow_id: data.verification_workflow.id },
          }),
        }
      );
      const machineData = await machineResponse.json();
      console.log("🤖 Machine Response:", machineData);
      if (!machineData.id) {
        return { status: "error", message: "❌ Machine ID not found!" };
      }

      // ✅ Fetch challenge details
      const inquiriesResponse = await fetch(
        `${robinhoodApiBaseUrl}/pathfinder/inquiries/${machineData.id}/user_view/`
      );
      const inquiriesData = await inquiriesResponse.json();
      console.log("🔍 Inquiries Response:", inquiriesData);
      const challenge = inquiriesData.context?.sheriff_challenge;
      console.log("🛡️ Challenge:", challenge);
      if (!challenge)
        return { status: "error", message: "❌ Challenge not found!" };

      // ✅ Save workflow state
      saveWorkflowState(workflowId, {
        workflowId: data.verification_workflow.id,
        machineId: machineData.id,
        deviceToken,
        challengeId: challenge.id,
        challengeType: challenge.type,
        username,
        password,
      });

      if (challenge.type === "sms") {
        return {
          status: "awaiting_input",
          workflow_id: workflowId,
          message: "📩 Enter the SMS code:",
        };
      } else {
        return {
          status: "awaiting_input",
          workflow_id: workflowId,
          message: "📲 Confirm device approval and press Enter:",
        };
      }
    }

    if (data.access_token) {
      return { status: "success", access_token: data.access_token };
    }

    return { status: "error", message: data.detail };
  } catch (error) {
    console.error("⚠️ Auth Error:", error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// **SUBMIT USER INPUT (SMS OR DEVICE APPROVAL)**
export async function submitChallenge(workflowId, userInput = null) {
  const state = getWorkflowState(workflowId);
  if (!state) throw new Error("❌ Invalid workflow ID!");

  try {
    if (state.challengeType === "sms") {
      console.log("📩 Sending SMS code...");
      const smsResponse = await fetch(
        `${robinhoodApiBaseUrl}/challenge/${state.challengeId}/respond/`,
        {
          method: "POST",
          headers: {
            ...defaultHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ response: userInput }),
        }
      );

      const smsData = await smsResponse.json();
      if (smsData.status !== "validated") {
        throw new Error("❌ SMS validation failed!");
      }
    } else {
      console.log("📲 Checking device approval...");
      const pollResponse = await fetch(
        `${robinhoodApiBaseUrl}/push/${state.challengeId}/get_prompts_status/`,
        {
          headers: defaultHeaders,
        }
      );
      const pollData = await pollResponse.json();
      console.log("🛂 Poll Response:", pollData);

      if (pollData.challenge_status !== "validated") {
        throw new Error("❌ Device approval failed!");
      }
    }

    return await finalizeAuthentication(state);
  } catch (error) {
    console.error("⚠️ Submission Error:", error);
    throw error;
  }
}

// **FINALIZE AUTHENTICATION**
export async function finalizeAuthentication(state) {
  console.log("✅ Challenge validated! Sending final approval...");

  // ✅ Step 1: Send a POST request to finalize the verification
  const finalizeResponse = await fetch(
    `${robinhoodApiBaseUrl}/pathfinder/inquiries/${state.machineId}/user_view/`,
    {
      method: "POST",
      headers: {
        ...defaultHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sequence: 0,
        user_input: { status: "continue" },
      }),
    }
  );

  const finalizeData = await finalizeResponse.json();
  console.log("🔄 Final Approval Response:", finalizeData);

  // ✅ Step 2: Request the final authentication token
  console.log("🔓 Requesting final authentication token...");
  const tokenResponse = await fetch(robinhoodApiBaseUrl + endpoints.login, {
    method: "POST",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "password",
      device_token: state.deviceToken,
      scope: "internal",
      expires_in: 86400,
      create_read_only_secondary_token: true,
      token_request_path: "/login",
      try_passkeys: false,
      username: state.username,
      password: state.password,
      long_session: true,
    }),
  });

  const tokenData = await tokenResponse.json();
  console.log("🔑 Auth Token Response:", tokenData);

  if (!tokenData.access_token) {
    throw new Error("❌ Failed to retrieve access token.");
  }

  deleteWorkflowState(state.workflowId); // ✅ Clean up workflow state

  return { status: "success", tokenData };
}
