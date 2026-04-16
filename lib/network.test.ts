import { fetchWithTimeout } from "@/lib/network";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("resolves when fetch succeeds before timeout", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const promise = fetchWithTimeout("https://example.com/test", {
      timeoutMs: 3000
    });

    await expect(promise).resolves.toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalled();
  });

  it("passes request options through to fetch", async () => {
    const mockResponse = {
      ok: true,
      status: 200
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await fetchWithTimeout("https://example.com/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: "Sightline" }),
      timeoutMs: 5000
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/post",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: "Sightline" })
      })
    );
  });

  it("rejects when fetch exceeds timeout", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const promise = fetchWithTimeout("https://example.com/slow", {
      timeoutMs: 1000
    });

    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow();
  });
});
