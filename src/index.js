import { authenticate } from "./auth.js";
import RobinhoodApi from "./api.js";
import readline from "readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export default async function Robinhood(credentials) {
  try {
    let authResponse = await authenticate(credentials);

    if (authResponse.mfa_required) {
      const mfaCode = await rl.question("Enter your MFA code: ");
      authResponse = await authenticate({ ...credentials, mfa_code: mfaCode });
    }

    return new RobinhoodApi(authResponse.access_token);
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    rl.close();
  }
}
