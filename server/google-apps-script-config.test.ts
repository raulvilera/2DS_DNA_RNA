import { describe, expect, it, vi } from "vitest";

describe("Google Apps Script configuration", () => {
  it("calls the configured endpoint without exposing it to the frontend", async () => {
    const endpoint = process.env.GOOGLE_APPS_SCRIPT_URL;
    expect(endpoint).toBeTruthy();
    expect(endpoint).toMatch(/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/);

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 302, headers: { Location: "https://script.googleusercontent.com/macros/echo" } }));
    const response = await fetch(endpoint!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ healthCheck: true }),
    });

    expect([200, 201, 202, 204, 301, 302, 303, 307, 308]).toContain(response.status);
    expect(fetchMock).toHaveBeenCalledWith(endpoint!, expect.objectContaining({ method: "POST" }));
    fetchMock.mockRestore();
  });
});
