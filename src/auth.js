import fetch from "node-fetch";
import { robinhoodApiBaseUrl, clientId, endpoints } from "./constants.js";
import { v4 as uuidv4 } from "uuid";

export async function authenticate(credentials) {
  if (credentials.token) {
    // If a token is provided, return it directly
    return { access_token: credentials.token };
  }

  const { username, password, mfa_code } = credentials;
  const headers = {
    Host: "api.robinhood.com",
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate",
    Referer: "https://robinhood.com/",
    Origin: "https://robinhood.com",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const form = new URLSearchParams({
    grant_type: "password",
    scope: "internal",
    client_id: clientId,
    expires_in: 86400,
    password: password,
    username: username,
    device_token: uuidv4(),
  });

  if (mfa_code) {
    form.append("mfa_code", mfa_code);
  }

  try {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.login, {
      method: "POST",
      headers: headers,
      body: form.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.mfa_required) {
        return { mfa_required: true };
      }
      throw new Error(`Authentication failed: ${data.detail}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}
