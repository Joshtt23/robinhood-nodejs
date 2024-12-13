import Robinhood from "../index.js"; // Importing from the refactored package

// Assuming you have username and password in your .env file
require("dotenv").config();

async function main() {
  try {
    const robinhood = await Robinhood({
      username: process.env.ROBINHOOD_USERNAME,
      password: process.env.ROBINHOOD_PASSWORD,
    });

    const quote = await robinhood.quote_data("GOOG");
    console.log(quote);
  } catch (error) {
    console.error(error);
  }
}

main();
