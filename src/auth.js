import fetch from "node-fetch";
import { robinhoodApiBaseUrl, clientId, endpoints } from "./constants.js";

export async function authenticate(credentials) {
  const { username, password, mfa_code, device_token } = credentials;
  const headers = {
    Host: "api.robinhood.com",
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate",
    Referer: "https://robinhood.com/",
    Origin: "https://robinhood.com",
  };

  const form = {
    grant_type: "password",
    scope: "internal",
    client_id: clientId,
    expires_in: 86400,
    password: password,
    username: username,
    device_token: device_token,
    mfa_code: mfa_code,
  };

  try {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.login, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(form),
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
