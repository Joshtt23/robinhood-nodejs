import { authenticate } from "./auth.js";
import RobinhoodApi from "./api.js";

export default async function Robinhood(credentials) {
  try {
    const authResponse = await authenticate(credentials);

    if (authResponse.mfa_required) {
      // Return a function to set the MFA code and complete authentication
      return {
        set_mfa_code: async (mfaCode) => {
          const mfaOptions = {
            ...credentials,
            mfa_code: mfaCode,
          };
          // Retry authentication with the MFA code
          const client = await authenticate(mfaOptions);
          return new RobinhoodApi(client.access_token);
        },
      };
    }

    return new RobinhoodApi(authResponse.access_token);
  } catch (error) {
    console.error(error);
    throw error;
  }
}
