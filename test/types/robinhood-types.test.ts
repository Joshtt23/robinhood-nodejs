import Robinhood from "../../index.js";

const username = "robinhood-user";
const password = "robinhood-pass";

async function main() {
  try {
    const api = await Robinhood({
      username,
      password,
    });

    console.log("Login success, auth token is: ", api.auth_token());

    const positions = await api.positions();
    console.log("positions are: ", positions);

    const historicals = await api.historicals("AAPL", "5minute", "day");
    console.log("historicals are: ", historicals);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
