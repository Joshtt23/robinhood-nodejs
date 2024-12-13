// src/robinhood.d.ts
import request = require("request");

declare class RobinhoodApi {
  constructor(authToken: string);

  expire_token(): Promise<void>;
  auth_token(): string | null;
  investment_profile(): Promise<any>;
  instruments(symbol?: string): Promise<any>;
  fundamentals(symbol: string): Promise<any>;
  popularity(symbol: string): Promise<any>;
  accounts(): Promise<any>;
  quote_data(symbol: string | string[]): Promise<any>;
  orders(
    options?: { updated_at: string; instrument: string } | string
  ): Promise<any>;
  positions(): Promise<any>;
  nonzero_positions(): Promise<any>;
  place_buy_order(options: {
    type: "limit" | "market";
    quantity: number;
    bid_price: number;
    instrument: {
      url?: string;
      symbol?: string;
    };
    trigger?: "immediate" | "day";
    time?: "gfd" | "gtc" | "oco";
  }): Promise<any>;
  place_sell_order(options: {
    type: "limit" | "market";
    quantity: number;
    bid_price: number;
    instrument: {
      url?: string;
      symbol?: string;
    };
    trigger?: "immediate" | "day";
    time?: "gfd" | "gtc" | "oco";
  }): Promise<any>;
  cancel_order(order: object | string): Promise<void>;
  historicals(
    symbol: string,
    intv: "5minute" | "10minute",
    span: "week" | "day"
  ): Promise<any>;
  user(): Promise<any>;
  watchlists(): Promise<any>;
  earnings(
    options:
      | { range?: number; symbol: string }
      | { range?: number; instrument: string }
  ): Promise<any>;
  dividends(): Promise<any>;
  splits(instrument: string): Promise<any>;
  news(symbol: string): Promise<any>;
  tag(tag: "10-most-popular" | "100-most-popular"): Promise<any>;
  url(url: string): Promise<any>;
  get_currency_pairs(): Promise<any>;
  get_crypto(symbol: string): Promise<any>;
  sp500_down(): Promise<any>;
  sp500_up(): Promise<any>;
}

declare const Robinhood: (credentials: {
  username: string;
  password: string;
}) => Promise<RobinhoodApi>;

export = Robinhood;
