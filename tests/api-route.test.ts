import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/mask/route";

function request(body: BodyInit | null, contentType = "application/json") {
  return new Request("http://localhost/api/mask", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  }) as unknown as NextRequest;
}

describe("POST /api/mask", () => {
  it("masks text and returns entities with offsets", async () => {
    const res = await POST(
      request(JSON.stringify({ text: "Mejla anna@email.se nu" }))
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.maskedText).toBe("Mejla <EMAIL_ADDRESS_1> nu");
    expect(json.maskedData.EMAIL_ADDRESS[0].value).toBe("anna@email.se");
    expect(json.entities[0]).toMatchObject({ start: 6, end: 19 });
  });

  it("honors the strict flag", async () => {
    const invalidCard = "kort 4111 1111 1111 1112";
    const lenient = await (
      await POST(request(JSON.stringify({ text: invalidCard })))
    ).json();
    const strict = await (
      await POST(request(JSON.stringify({ text: invalidCard, strict: true })))
    ).json();
    expect(lenient.maskedText).toContain("<VISA_CREDIT_CARD_1>");
    expect(strict.maskedText).not.toContain("VISA_CREDIT_CARD");
  });

  it("only enables strict mode for boolean true", async () => {
    const res = await POST(
      request(JSON.stringify({ text: "4111 1111 1111 1112", strict: "yes" }))
    );
    const json = await res.json();
    expect(json.maskedText).toContain("<VISA_CREDIT_CARD_1>");
  });

  it("honors scoreThreshold", async () => {
    const bare = "ordernummer 8327-9123456";
    const defaulted = await (
      await POST(request(JSON.stringify({ text: bare })))
    ).json();
    expect(defaulted.entities).toEqual([]);

    const recovered = await (
      await POST(request(JSON.stringify({ text: bare, scoreThreshold: 0.2 })))
    ).json();
    expect(recovered.entities.map((e: { label: string }) => e.label)).toEqual([
      "SE_BANK_NUMBER",
    ]);
  });

  it("rejects an out-of-range scoreThreshold with 400", async () => {
    for (const scoreThreshold of [-0.1, 1.5, "high"]) {
      const res = await POST(
        request(JSON.stringify({ text: "x", scoreThreshold }))
      );
      expect(res.status).toBe(400);
    }
  });

  it("returns scores on entities", async () => {
    const res = await POST(
      request(JSON.stringify({ text: "pnr 811218-9876" }))
    );
    const json = await res.json();
    expect(json.entities[0].score).toBe(0.95);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(request("not json at all"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid JSON/);
  });

  it("rejects a missing or non-string text field with 400", async () => {
    for (const body of [{}, { text: 5 }, { text: null }, { text: ["x"] }]) {
      const res = await POST(request(JSON.stringify(body)));
      expect(res.status).toBe(400);
    }
  });

  it("rejects a JSON null body with 400", async () => {
    const res = await POST(request("null"));
    expect(res.status).toBe(400);
  });

  it("rejects oversized input with 413", async () => {
    const res = await POST(
      request(JSON.stringify({ text: "x".repeat(100_001) }))
    );
    expect(res.status).toBe(413);
  });

  it("accepts input exactly at the size limit", async () => {
    const res = await POST(
      request(JSON.stringify({ text: "x".repeat(100_000) }))
    );
    expect(res.status).toBe(200);
  });

  it("handles empty text", async () => {
    const res = await POST(request(JSON.stringify({ text: "" })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.maskedText).toBe("");
    expect(json.entities).toEqual([]);
  });
});
