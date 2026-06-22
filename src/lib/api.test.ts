import { describe, expect, it } from "vitest";
import { backendDownMessage } from "./api";

describe("backendDownMessage", () => {
  it("mentions the proxy address and how to start it", () => {
    const message = backendDownMessage();
    expect(message).toContain("127.0.0.1:8787");
    expect(message).toContain("npm start");
  });

  it("includes the proxy status code when provided", () => {
    expect(backendDownMessage(502)).toContain("502");
  });

  it("omits the status note when none is given", () => {
    expect(backendDownMessage()).not.toContain("proxy responded");
  });
});
