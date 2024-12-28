import { authenticate, respondToChallenge, validateSheriffId } from "./auth.js";
import RobinhoodApi from "./api.js";

export default async function Robinhood(credentials) {
  try {
    if (credentials.token) {
      // If a token is provided, initialize and return RobinhoodApi instance
      const robinhoodApi = new RobinhoodApi(credentials.token); // Changed to pass just the token
      return robinhoodApi; // Removed redundant header setting since it's done in constructor
    }
    let authResponse = await authenticate(credentials);

    if (authResponse.mfa_required) {
      // MFA is required, return a function to set the MFA code
      return {
        set_mfa_code: async (mfaCode) => {
          const mfaOptions = {
            ...credentials,
            mfa_code: mfaCode,
            device_token: authResponse.device_token,
          };
          // Retry authentication with the MFA code
          return authenticate(mfaOptions);
        },
        mfa_type: authResponse.mfa_type,
      };
    } else if (authResponse.challenge_required) {
      // Challenge is required, return a function to set the challenge response
      return {
        set_challenge_response: async (challengeResponse) => {
          // Use respondToChallenge to respond to the challenge
          const challengeResult = await respondToChallenge(
            authResponse.challenge_id,
            challengeResponse
          );

          // Check if the challenge was successful
          if (
            challengeResult.challenge &&
            challengeResult.challenge.remaining_attempts > 0
          ) {
            throw new Error(
              `Challenge failed. ${challengeResult.challenge.remaining_attempts} attempts remaining.`
            );
          }

          // Retry authentication with the challenge response
          return authenticate({
            ...credentials,
            challenge_id: authResponse.challenge_id,
            challenge_response: challengeResponse,
            device_token: authResponse.device_token,
          });
        },
        challenge_details: {
          challenge_id: authResponse.challenge_id,
          challenge_type: authResponse.challenge_type,
          remaining_attempts: authResponse.remaining_attempts,
        },
      };
    } else if (authResponse.verification_required) {
      // Verification is required, return a function to set the verification code
      return {
        verification_required: true,
        deviceToken: authResponse.deviceToken,
        set_verification_code: async (verificationCode, deviceToken) => {
          // Now call validateSheriffId with the provided verificationCode
          const verificationResult = await validateSheriffId(
            deviceToken,
            authResponse.workflow_id,
            verificationCode
          );
          if (verificationResult) {
            // If verification is successful, retry authentication
            return await authenticate({
              ...credentials,
              mfa_code: verificationCode,
              deviceToken: deviceToken,
            });
          } else {
            throw new Error("Verification failed.");
          }
        },
        verification_details: {
          workflow_id: authResponse.workflow_id,
          workflow_status: authResponse.workflow_status,
          challenge_type: "sms",
          remaining_attempts: null,
        },
      };
    } else if (authResponse.access_token) {
      // Authentication successful, initialize and return RobinhoodApi instance
      const robinhoodApi = new RobinhoodApi(authResponse.access_token); // Changed to pass just the token
      return robinhoodApi; // Return just the API instance to match token path behavior
    } else {
      console.error("Authentication failed:", authResponse);
      throw new Error("Authentication failed: Unexpected response");
    }
  } catch (error) {
    console.error("Robinhood Error:", error);
    throw error;
  }
}
