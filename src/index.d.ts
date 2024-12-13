// src/index.d.ts
import { RobinhoodApi } from "./api.js";

declare const Robinhood: (credentials: {
  username: string;
  password: string;
}) => Promise<RobinhoodApi>;

export default Robinhood;
