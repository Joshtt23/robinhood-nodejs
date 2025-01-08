# Robinhood Node.js Client

A modern Node.js library for interacting with Robinhood's private API. This package allows developers to authenticate and interact with Robinhood to fetch account details, place trades, retrieve market data, and more.

> **Disclaimer**: This library is not affiliated with Robinhood and uses their private API, which is undocumented and may change at any time. **Use this package at your own risk.**

---

## Status: Beta

This library is in **beta**. While many methods are functional, not all have been fully tested, and additional features are being added. Feedback and contributions are welcome!

---

## Features

- **Authentication**: Username/password login with support for MFA and challenge verification.
- **Token Management**: Supports saving and reusing authentication tokens (users must implement their own token-saving logic).
- **Modern JavaScript Syntax**: A complete rewrite of `aurbano/robinhood-node` with modern JavaScript features.
- **API Coverage**: Fetch accounts, positions, orders, dividends, fundamentals, and more.
- **Trading**: Place buy and sell orders programmatically.
- **Market Data**: Retrieve historical data, quotes, S&P 500 movers, news, and popularity rankings.
- **Options & Crypto**: Fetch cryptocurrency and options data.

---

## Acknowledgments

This project is a modernization and continuation of the [aurbano/robinhood-node](https://github.com/aurbano/robinhood-node) library. Special thanks to the original contributors for laying the foundation of this project. We aim to build upon their work with modern features and better support.

---

## Installation

Install the package via npm:

```bash
npm install robinhood-nodejs
```

---

## Setup for Contributions

If you want to contribute to this project, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/Joshtt23/robinhood-node.git
   cd robinhood-node
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run tests (if available):

   ```bash
   npm test
   ```

---

## Usage

### Example: Connecting to Robinhood

The following is an example to demonstrate how the library works. **This is not included in the repository**, and users should implement their own token-saving logic.

```javascript
import * as dotenv from "dotenv";
import Robinhood from "robinhood-nodejs";
import readline from "readline/promises";
import fs from "fs/promises";

dotenv.config();

const TOKEN_FILE = "robinhood_auth.json";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const username = process.env.ROBINHOOD_USERNAME;
    const password = process.env.ROBINHOOD_PASSWORD;

    if (!username || !password) {
      console.error("Error: Missing Robinhood credentials in .env file.");
      process.exit(1);
    }

    let authResponse;
    try {
      const tokenData = await fs.readFile(TOKEN_FILE, "utf8");
      authResponse = JSON.parse(tokenData);

      const robinhoodClient = await Robinhood({
        token: authResponse.access_token,
      });
      console.log("Authenticated client:", robinhoodClient);

      const accounts = await robinhoodClient.accounts();
      console.log("Accounts:", accounts);
    } catch (err) {
      authResponse = await Robinhood({ username, password });

      if (authResponse.mfa_required) {
        const mfaCode = await rl.question("Enter MFA code: ");
        authResponse = await authResponse.set_mfa_code(mfaCode);
      }

      if (authResponse.access_token) {
        const robinhoodClient = await Robinhood({
          token: authResponse.access_token,
        });
        console.log("Authenticated client:", robinhoodClient);

        await fs.writeFile(TOKEN_FILE, JSON.stringify(authResponse));
        const accounts = await robinhoodClient.accounts();
        console.log("Accounts:", accounts);
      } else {
        console.error("Authentication failed.");
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    rl.close();
  }
}

main();
```

---

## Key Features and Supported API Methods

Below are some of the key API methods. For a comprehensive list, see the [Full API Methods](#full-api-methods) section.

### Authentication

```javascript
// With username and password
const robinhoodClient = await Robinhood({ username, password });

// With a saved token
const robinhoodClient = await Robinhood({ token: authToken });
```

### Account Details

```javascript
await robinhoodClient.accounts();
```

### Positions

```javascript
await robinhoodClient.positions();
await robinhoodClient.nonzero_positions();
```

### Trading

#### Place a Buy Order

```javascript
await robinhoodClient.place_buy_order({
  instrument: { url: "instrument_url", symbol: "AAPL" },
  bid_price: 150,
  quantity: 1,
});
```

#### Place a Sell Order

```javascript
await robinhoodClient.place_sell_order({
  instrument: { url: "instrument_url", symbol: "AAPL" },
  bid_price: 160,
  quantity: 1,
});
```

### Market Data

```javascript
await robinhoodClient.fundamentals("AAPL");
await robinhoodClient.quote_data("TSLA");
await robinhoodClient.historicals("AAPL", "day", "1month");
await robinhoodClient.news("GOOGL");
```

### Options & Crypto

```javascript
await robinhoodClient.get_crypto("BTC");
await robinhoodClient.options_positions();
```

---

## Full API Methods

Below is the full list of supported API methods:

- **Account & User**

  - `accounts()`
  - `user()`
  - `investment_profile()`
  - `set_account()`

- **Positions & Orders**

  - `positions()`
  - `nonzero_positions()`
  - `orders(options)`
  - `options_positions()`
  - `options_orders()`

- **Trading**

  - `place_buy_order(options)`
  - `place_sell_order(options)`
  - `_place_order(options)` _(Internal method)_
  - `cancel_order(order)`

- **Market Data**

  - `dividends()`
  - `earnings(options)`
  - `fundamentals(ticker)`
  - `quote_data(symbol)`
  - `historicals(symbol, interval, span)`
  - `news(symbol)`
  - `popularity(symbol)`
  - `sp500_up()`
  - `sp500_down()`
  - `splits(instrument)`
  - `tag(tag)`

- **Instruments & Watchlists**

  - `instruments(symbol)`
  - `instruments_by_id(id)`
  - `watchlists()`
  - `create_watch_list(name)`

- **Options Data**

  - `options_dates(symbol)`
  - `options_available(chain_id, expiration_date, type)`

- **Crypto**

  - `get_currency_pairs()`
  - `get_crypto(symbol)`

- **Utilities**

  - `url(url)`
  - `expire_token()`

---

## TODOs

### For Version 2.0.x

- **Abstraction**: Add higher-level utility methods to simplify common workflows, such as placing orders or fetching market data, to make the library more beginner-friendly.
- **Transpile Code**: Add Babel to transpile ES6+ syntax to CommonJS for broader compatibility.
- **Testing**: Implement unit and integration tests using Jest.
- **Custom Endpoints**: Allow users to define and access custom endpoints dynamically.
- **Error Handling**: Improve error messages and add retry logic where applicable.
- **Input Validation**: Validate inputs for critical methods like `place_buy_order` and `place_sell_order`.
- **CI/CD Setup**: Automate testing and deployment using GitHub Actions or similar tools.

---

## Contributing

We welcome contributions! Feel free to open issues or submit pull requests to improve the library.

### How to Contribute

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Write tests for your changes.
4. Submit a pull request with a clear explanation of the changes.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
