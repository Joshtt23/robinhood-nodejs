import fetch from "node-fetch";
import { robinhoodApiBaseUrl, clientId, endpoints } from "./constants.js";
import { v4 as uuidv4 } from "uuid";

const defaultHeaders = {
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=1",

    "X-Robinhood-API-Version": "1.431.4",
    "Connection": "keep-alive",
    "User-Agent": "*"

};

export async function validateSheriffId(deviceToken, workflowId, mfaCode) {
    try {
        console.log("Starting Sheriff ID validation...");

        // 1. Make a POST request to /pathfinder/user_machine/
        const machineUrl = "https://api.robinhood.com/pathfinder/user_machine/";
        const machinePayload = {
            device_id: deviceToken,
            flow: "suv",
            input: { workflow_id: workflowId },
        };

        const machineResponse = await fetch(machineUrl, {
            method: "POST",
            headers: {
                ...defaultHeaders,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(machinePayload),
        });

        const machineData = await machineResponse.json();

        if (!machineData.id) {
            throw new Error("Id not returned in user-machine call");
        }

        // 2. Make a GET request to /pathfinder/inquiries/{id}/user_view/
        const inquiriesUrl = `https://api.robinhood.com/pathfinder/inquiries/${machineData.id}/user_view/`;

        const inquiriesResponse = await fetch(inquiriesUrl);

        const inquiriesData = await inquiriesResponse.json();

        // Extract the challenge_id
        const challengeId =
            inquiriesData.type_context?.context?.sheriff_challenge?.id;
        if (!challengeId) {
            throw new Error("Sheriff challenge id not found in response");
        }

        // 3. Send the mfa_code to /challenge/{challenge_id}/respond/
        const challengeUrl = `https://api.robinhood.com/challenge/${challengeId}/respond/`;
        const challengePayload = {
            response: mfaCode,
        };

        const challengeResponse = await fetch(challengeUrl, {
            method: "POST",
            headers: {
                ...defaultHeaders,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(challengePayload),
        });


        const challengeData = await challengeResponse.json();

        if (challengeData.status !== "validated") {
            throw new Error(
                `Challenge validation failed: ${JSON.stringify(challengeData)}`
            );
        }

        // 4. Send a POST request to /pathfinder/inquiries/{id}/user_view/ to continue
        const finalPayload = {
            sequence: 0,
            user_input: { status: "continue" },
        };

        const finalResponse = await fetch(inquiriesUrl, {
            method: "POST",
            headers: {
                ...defaultHeaders,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(finalPayload),
        });


        const finalData = await finalResponse.json();

        if (finalData.type_context?.result !== "workflow_status_approved") {
            throw new Error("Workflow status not approved");
        }

        console.log("Sheriff ID validation successful!");
        return true;
    } catch (error) {
        console.error("Sheriff ID Validation Error:", error);
        throw error;
    }
}

export async function respondToChallenge(challengeId, challengeResponse) {
    const url =
        robinhoodApiBaseUrl + endpoints.challenge_respond.replace("{}", challengeId);

    const payload = {
        response: challengeResponse,
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...defaultHeaders,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(payload),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
}

export async function authenticate(credentials) {
    console.log("Starting authentication...");
    let { username, password, mfa_code, deviceToken } = credentials;

    if (!deviceToken) {
        deviceToken = uuidv4();
    }
    console.log("Device token:", deviceToken);

    const headers = {
        ...defaultHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
        Host: "api.robinhood.com",
        Referer: "https://robinhood.com/",
        Origin: "https://robinhood.com",
    };

    const payload = {
        client_id: clientId,
        expires_in: 86400,
        grant_type: "password",
        password: password,
        scope: "internal",
        username: username,
        challenge_type: "sms",
        device_token: deviceToken,
        try_passkeys: false,
        token_request_path: '/login',
        create_read_only_secondary_token: true,
        request_id: '848bd19e-02bc-45d9-99b5-01bce5a79ea7'

    };

    if (mfa_code) {
        payload.mfa_code = mfa_code;
    }

    try {
        const response = await fetch(robinhoodApiBaseUrl + endpoints.login, {
            method: "POST",
            headers: headers,
            body: new URLSearchParams(payload),
        });


        const data = await response.json();

        if (data.mfa_required) {
            console.log("MFA required.");
            return {
                mfa_required: true,
                set_mfa_code: async (mfaCode) => {
                    // Log the received MFA code
                    console.log("Received MFA code:", mfaCode);

                    const mfaOptions = {
                        ...credentials,
                        deviceToken: deviceToken,
                        mfa_code: mfaCode,
                    };
                    return authenticate(mfaOptions);
                },
            };
        }

        if (data.challenge) {
            console.log("Challenge required.");
            return {
                challenge_required: true,
                challenge_id: data.challenge.id,
                set_challenge_response: async (challengeResponse) => {
                    const challengeResult = await respondToChallenge(
                        data.challenge.id,
                        challengeResponse
                    );
                    // ... (handle challengeResult as needed)
                    // update header 'X-ROBINHOOD-CHALLENGE-RESPONSE-ID', challenge_id)
                    
                    // Log the challenge result
                    console.log("Challenge result:", challengeResult);

                    return authenticate(credentials); // Retry authentication
                },
            };
        }

        if (data.verification_workflow) {
            console.log("Verification workflow required.");
            return {
                verification_required: true,
                workflow_id: data.verification_workflow.id,
                deviceToken: deviceToken,
            };
        }

        if (response.status === 200 && data.access_token) {
            console.log("Authentication successful!");
            return data;
        }

        throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
    } catch (error) {
        console.error("Auth Error:", error);
        throw new Error(`Authentication failed: ${error.message}`);
    }
}