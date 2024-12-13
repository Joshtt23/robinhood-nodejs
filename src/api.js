import fetch from "node-fetch";
import {
  robinhoodApiBaseUrl,
  endpoints,
  currencyPairsUrl,
} from "./constants.js";

export default class RobinhoodApi {
  constructor(authToken) {
    this.authToken = authToken;
    this.headers = {
      Authorization: `Bearer ${authToken}`,
    };
  }

  async accounts() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.accounts, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch accounts");
    }
    return response.json();
  }

  async user() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.user, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }
    return response.json();
  }

  async dividends() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.dividends, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch dividends data");
    }
    return response.json();
  }

  async earnings(options) {
    let url = robinhoodApiBaseUrl + endpoints.earnings;
    if (options.instrument) {
      url += "?instrument=" + options.instrument;
    } else if (options.symbol) {
      url += "?symbol=" + options.symbol;
    } else {
      url += "?range=" + (options.range || 1) + "day";
    }
    const response = await fetch(url, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch earnings data");
    }
    return response.json();
  }

  async orders(options) {
    let url = robinhoodApiBaseUrl + endpoints.orders;
    if (options) {
      if (options.updated_at) {
        options["updated_at[gte]"] = options.updated_at;
        delete options.updated_at;
      }
      url += "?" + new URLSearchParams(options).toString();
    }
    const response = await fetch(url, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch orders data");
    }
    return response.json();
  }

  async positions() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.positions, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch positions data");
    }
    return response.json();
  }

  async nonzero_positions() {
    const response = await fetch(
      robinhoodApiBaseUrl + endpoints.positions + "?nonzero=true",
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch nonzero positions data");
    }
    return response.json();
  }

  async place_buy_order(options) {
    options.transaction = "buy";
    return this._place_order(options);
  }

  async place_sell_order(options) {
    options.transaction = "sell";
    return this._place_order(options);
  }

  async _place_order(options) {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.orders, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        account: this.account,
        instrument: options.instrument.url,
        price: options.bid_price,
        stop_price: options.stop_price,
        quantity: options.quantity,
        side: options.transaction,
        symbol: options.instrument.symbol.toUpperCase(),
        time_in_force: options.time || "gfd",
        trigger: options.trigger || "immediate",
        type: options.type || "market",
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to place order");
    }
    return response.json();
  }

  async fundamentals(ticker) {
    const response = await fetch(
      robinhoodApiBaseUrl +
        endpoints.fundamentals +
        String(ticker).toUpperCase() +
        "/",
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch fundamentals data");
    }
    return response.json();
  }

  async popularity(symbol) {
    const quote = await this.quote_data(symbol);
    const symbol_uuid = quote.results[0].instrument.split("/")[4];
    const response = await fetch(
      robinhoodApiBaseUrl +
        endpoints.instruments +
        symbol_uuid +
        "/popularity/",
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch popularity data");
    }
    return response.json();
  }

  async quote_data(symbol) {
    const symbols = Array.isArray(symbol) ? symbol.join(",") : symbol;
    const response = await fetch(
      robinhoodApiBaseUrl +
        endpoints.quotes +
        `?symbols=${symbols.toUpperCase()}`,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch quote data");
    }
    return response.json();
  }

  async investment_profile() {
    const response = await fetch(
      robinhoodApiBaseUrl + endpoints.investment_profile,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch investment profile");
    }
    return response.json();
  }

  async instruments(symbol) {
    const response = await fetch(
      robinhoodApiBaseUrl +
        endpoints.instruments +
        `?query=${symbol.toUpperCase()}`,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch instruments");
    }
    return response.json();
  }

  async cancel_order(order) {
    let cancelUrl;
    if (typeof order === "string") {
      cancelUrl =
        robinhoodApiBaseUrl + endpoints.cancel_order + order + "/cancel/";
    } else if (order.cancel) {
      cancelUrl = order.cancel;
    }
    if (cancelUrl) {
      const response = await fetch(cancelUrl, {
        method: "POST",
        headers: this.headers,
      });
      if (!response.ok) {
        throw new Error("Failed to cancel order");
      }
      return response.json();
    } else {
      throw new Error(
        order.state === "cancelled"
          ? "Order already cancelled."
          : "Order cannot be cancelled."
      );
    }
  }

  async watchlists() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.watchlists, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch watchlists");
    }
    return response.json();
  }

  async create_watch_list(name) {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.watchlists, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        name: name,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to create watchlist");
    }
    return response.json();
  }

  async sp500_up() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.sp500_up, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch S&P 500 up movers");
    }
    return response.json();
  }

  async sp500_down() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.sp500_down, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch S&P 500 down movers");
    }
    return response.json();
  }

  async splits(instrument) {
    const response = await fetch(
      robinhoodApiBaseUrl +
        endpoints.instruments +
        "/" +
        instrument +
        "/splits/",
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch splits");
    }
    return response.json();
  }

  async historicals(symbol, intv, span) {
    const response = await fetch(
      robinhoodApiBaseUrl +
        endpoints.quotes +
        "historicals/" +
        symbol +
        "/?interval=" +
        intv +
        "&span=" +
        span,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch historicals");
    }
    return response.json();
  }

  async url(url) {
    const response = await fetch(url, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch URL");
    }
    return response.json();
  }

  async news(symbol) {
    const response = await fetch(
      robinhoodApiBaseUrl + endpoints.news + "/" + symbol,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch news");
    }
    return response.json();
  }

  async tag(tag) {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.tag + tag, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch tag");
    }
    return response.json();
  }

  async get_currency_pairs() {
    const response = await fetch(currencyPairsUrl, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch currency pairs");
    }
    return response.json();
  }

  async get_crypto(symbol) {
    const currencyPairs = await this.get_currency_pairs();
    const assets = currencyPairs.results;
    const asset = assets.find(
      (a) => a.asset_currency.code.toLowerCase() === symbol.toLowerCase()
    );

    if (!asset) {
      const codes = assets.map((a) => a.asset_currency.code);
      throw new Error(
        "Symbol not found. Only these codes are allowed: " +
          JSON.stringify(codes)
      );
    }

    const response = await fetch(
      robinhoodApiBaseUrl + endpoints.crypto + asset.id + "/",
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch crypto data");
    }
    return response.json();
  }

  async options_positions() {
    const response = await fetch(
      robinhoodApiBaseUrl + endpoints.options_positions,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch options positions");
    }
    return response.json();
  }

  async options_orders() {
    const response = await fetch(
      robinhoodApiBaseUrl + endpoints.options_orders,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch options orders");
    }
    return response.json();
  }

  async options_dates(symbol) {
    const instruments = await this.instruments(symbol);
    const tradable_chain_id = instruments.results[0].tradable_chain_id;
    const response = await fetch(
      robinhoodApiBaseUrl + endpoints.options_chains + "/" + tradable_chain_id,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch options dates");
    }
    const { expiration_dates } = await response.json();
    return { expiration_dates, tradable_chain_id };
  }

  async options_available(chain_id, expiration_date, type = "put") {
    const response = await fetch(
      robinhoodApiBaseUrl +
        endpoints.options_instruments +
        `?chain_id=${chain_id}&type=${type}&expiration_date=${expiration_date}&state=active&tradability=tradable`,
      {
        headers: this.headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch available options");
    }
    return response.json();
  }

  async expire_token() {
    const response = await fetch(robinhoodApiBaseUrl + endpoints.logout, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        client_id: clientId,
        token: this.refreshToken,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to expire token");
    }
    return response.json();
  }

  async set_account() {
    const accounts = await this.accounts();
    if (
      accounts.results &&
      accounts.results instanceof Array &&
      accounts.results.length > 0
    ) {
      this.account = accounts.results[0].url;
    }
  }
}
