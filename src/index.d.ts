// src/index.d.ts

import { RobinhoodApi } from "./api.js";

/**
 * Credentials for authenticating with Robinhood.
 */
export interface Credentials {
  username?: string;
  password?: string;
  token?: string;
  mfa_code?: string;
}

/**
 * Authenticates with Robinhood and returns an instance of RobinhoodApi.
 * @param credentials - The credentials or token for authentication.
 * @returns A promise resolving to an instance of RobinhoodApi.
 */
declare const Robinhood: (credentials: Credentials) => Promise<RobinhoodApi>;

export default Robinhood;
