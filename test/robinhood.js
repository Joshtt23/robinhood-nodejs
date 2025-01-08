import test from "ava";
import Robinhood from "../index.js";
import { authenticate } from "../src/auth.js";

const TEST_SYMBOL = "GOOG";

test("Should get " + TEST_SYMBOL + " quote", async (t) => {
  const robinhood = await Robinhood({
    username: process.env.ROBINHOOD_USERNAME,
    password: process.env.ROBINHOOD_PASSWORD,
  });
  const body = await robinhood.quote_data(TEST_SYMBOL);
  t.is(body.results[0].symbol, TEST_SYMBOL);
});

test("Should get " + TEST_SYMBOL + " fundamentals", async (t) => {
  const robinhood = await Robinhood({
    username: process.env.ROBINHOOD_USERNAME,
    password: process.env.ROBINHOOD_PASSWORD,
  });
  const body = await robinhood.fundamentals(TEST_SYMBOL);
  t.is(Object.keys(body).length, 21);
});

test("Should get markets", async (t) => {
  const robinhood = await Robinhood({
    username: process.env.ROBINHOOD_USERNAME,
    password: process.env.ROBINHOOD_PASSWORD,
  });
  const body = await robinhood.markets();
  t.true(body.results.length > 0);
});

test("Should get news about " + TEST_SYMBOL, async (t) => {
  const robinhood = await Robinhood({
    username: process.env.ROBINHOOD_USERNAME,
    password: process.env.ROBINHOOD_PASSWORD,
  });
  const body = await robinhood.news(TEST_SYMBOL);
  t.true(body.results.length > 0);
});

test("Should get data for the SP500 index up", async (t) => {
  const robinhood = await Robinhood({
    username: process.env.ROBINHOOD_USERNAME,
    password: process.env.ROBINHOOD_PASSWORD,
  });
  const body = await robinhood.sp500_up();
  t.true(body.results.length > 0);
});

test("Should get data for the SP500 index down", async (t) => {
  const robinhood = await Robinhood({
    username: process.env.ROBINHOOD_USERNAME,
    password: process.env.ROBINHOOD_PASSWORD,
  });
  const body = await robinhood.sp500_down();
  t.true(body.results.length > 0);
});

test("Should not get positions without login", async (t) => {
  try {
    const robinhood = await Robinhood({
      username: "",
      password: "",
    });
    await robinhood.positions();
    t.fail("Expected an error to be thrown");
  } catch (error) {
    t.pass("Error thrown as expected");
  }
});

test("Should not get nonzero positions without credentials", async (t) => {
  try {
    const robinhood = await Robinhood({
      username: "",
      password: "",
    });
    await robinhood.nonzero_positions();
    t.fail("Expected an error to be thrown");
  } catch (error) {
    t.pass("Error thrown as expected");
  }
});

test("Should be able to set MFA code", async (t) => {
  const authResponse = await authenticate({
    username: process.env.ROBINHOOD_USERNAME,
    password: process.env.ROBINHOOD_PASSWORD,
  });

  t.not(authResponse, undefined);

  if (authResponse.mfa_required) {
    const client = await authenticate({
      username: process.env.ROBINHOOD_USERNAME,
      password: process.env.ROBINHOOD_PASSWORD,
      mfa_code: process.env.MFA_CODE,
    });
    t.not(client, undefined);
  }
});
