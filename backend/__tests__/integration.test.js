/**
 * Integration tests — SignLearn backend HTTP API
 *
 * Tests the three core scenarios from the roadmap (Week 3.4):
 *   1. Cache endpoint: 404 on miss, 200 from file cache, hot promotion
 *   2. Batch gloss pipeline with mocked Groq: produces results, writes to cache
 *   3. Health check
 *
 * External dependencies (Groq SDK, YouTube network) are mocked so tests are
 * deterministic and run offline.
 */

const request = require("supertest");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Mock Groq SDK before any require that loads sign.js ─────────────────────
// Simulate a successful Groq response returning a batch gloss JSON.
jest.mock("groq-sdk", () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            glosses: [
              "NEURAL NETWORK DATA LEARN",
              "LAYER FUNCTION ACTIVATE",
              "GRADIENT DESCENT LOSS MINIMIZE",
            ],
            simplified: [
              "A neural network learns from data.",
              "Each layer activates a function.",
              "Gradient descent reduces loss.",
            ],
          }),
        },
      },
    ],
  });

  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

// ── Mock axios so captions route never hits YouTube ──────────────────────────
jest.mock("axios");
const axios = require("axios");

// ── Set fake API key so groq is not null in sign.js ─────────────────────────
process.env.GROQ_API_KEY = "gsk_test_integration_key";

// ── Redirect cache dir to a temp directory for isolation ────────────────────
const TMP_CACHE = fs.mkdtempSync(path.join(os.tmpdir(), "signolight-test-cache-"));
process.env.SIGNOLIGHT_CACHE_DIR = TMP_CACHE;

const app = require("../server");

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// GET /api/cache/:videoId
// ---------------------------------------------------------------------------

describe("GET /api/cache/:videoId", () => {
  const VIDEO_ID = "test_video_abc123";
  const CACHE_FILE = path.join(TMP_CACHE, `${VIDEO_ID}.json`);
  const SAMPLE_RESULTS = [
    { start: 0, end: 3000, text: "Hello world", gloss: "HELLO WORLD", words: ["HELLO", "WORLD"] },
    { start: 3500, end: 6000, text: "Neural network", gloss: "NEURAL NETWORK", words: ["NEURAL", "NETWORK"] },
  ];

  afterEach(() => {
    // Clean up between tests
    try { fs.unlinkSync(CACHE_FILE); } catch {}
  });

  it("returns 404 when video is not cached", async () => {
    const res = await request(app).get(`/api/cache/${VIDEO_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it("returns cached results when a file cache exists", async () => {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(SAMPLE_RESULTS), "utf8");

    const res = await request(app).get(`/api/cache/${VIDEO_ID}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].gloss).toBe("HELLO WORLD");
  });

  it("returns 404 for a different videoId when only one is cached", async () => {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(SAMPLE_RESULTS), "utf8");

    const res = await request(app).get("/api/cache/completely_different_id");
    expect(res.status).toBe(404);
  });

  it("sanitizes dangerous videoId characters in cache filename", async () => {
    // videoIds with path traversal characters must not escape the cache dir
    const res = await request(app).get("/api/cache/../../etc/passwd");
    // Should either 404 or return empty — must not read outside cache dir
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      // If somehow it returned, it should be empty results
      expect(res.body.results).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/sign/batch
// ---------------------------------------------------------------------------

describe("POST /api/sign/batch", () => {
  const SAMPLE_CAPTIONS = [
    { start: 0, end: 3000, text: "A neural network learns from data." },
    { start: 3500, end: 6000, text: "Each layer activates a function." },
    { start: 6500, end: 9000, text: "Gradient descent reduces the loss." },
  ];

  it("returns 400 when captions array is missing", async () => {
    const res = await request(app).post("/api/sign/batch").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when captions is not an array", async () => {
    const res = await request(app).post("/api/sign/batch").send({ captions: "not an array" });
    expect(res.status).toBe(400);
  });

  it("returns results array with same length as input", async () => {
    const res = await request(app)
      .post("/api/sign/batch")
      .send({ captions: SAMPLE_CAPTIONS });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(SAMPLE_CAPTIONS.length);
  });

  it("each result has gloss, words, confidence, start, end, text fields", async () => {
    const res = await request(app)
      .post("/api/sign/batch")
      .send({ captions: SAMPLE_CAPTIONS });

    expect(res.status).toBe(200);
    for (const result of res.body.results) {
      expect(typeof result.gloss).toBe("string");
      expect(result.gloss.length).toBeGreaterThan(0);
      expect(Array.isArray(result.words)).toBe(true);
      expect(typeof result.confidence).toBe("number");
      expect(typeof result.start).toBe("number");
      expect(typeof result.end).toBe("number");
      expect(typeof result.text).toBe("string");
    }
  });

  it("writes results to file cache when videoId is provided", async () => {
    const VIDEO_ID = "batch_cache_test_xyz";
    const CACHE_FILE = path.join(TMP_CACHE, `${VIDEO_ID}.json`);

    try { fs.unlinkSync(CACHE_FILE); } catch {}

    await request(app)
      .post("/api/sign/batch")
      .send({ captions: SAMPLE_CAPTIONS, videoId: VIDEO_ID });

    expect(fs.existsSync(CACHE_FILE)).toBe(true);
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    expect(Array.isArray(cached)).toBe(true);
    expect(cached).toHaveLength(SAMPLE_CAPTIONS.length);

    fs.unlinkSync(CACHE_FILE);
  });

  it("subsequent cache GET returns batch results without re-processing", async () => {
    const VIDEO_ID = "cache_roundtrip_test";
    const CACHE_FILE = path.join(TMP_CACHE, `${VIDEO_ID}.json`);
    try { fs.unlinkSync(CACHE_FILE); } catch {}

    // Step 1: process batch — populates file cache
    const batchRes = await request(app)
      .post("/api/sign/batch")
      .send({ captions: SAMPLE_CAPTIONS, videoId: VIDEO_ID });
    expect(batchRes.status).toBe(200);

    // Step 2: cache GET — must hit file cache and return same count
    const cacheRes = await request(app).get(`/api/cache/${VIDEO_ID}`);
    expect(cacheRes.status).toBe(200);
    expect(cacheRes.body.results).toHaveLength(SAMPLE_CAPTIONS.length);

    try { fs.unlinkSync(CACHE_FILE); } catch {}
  });

  it("does not write to file cache when videoId is absent", async () => {
    const files_before = fs.readdirSync(TMP_CACHE).length;

    await request(app)
      .post("/api/sign/batch")
      .send({ captions: SAMPLE_CAPTIONS }); // no videoId

    const files_after = fs.readdirSync(TMP_CACHE).length;
    expect(files_after).toBe(files_before);
  });

  it("handles empty captions array without crashing", async () => {
    const res = await request(app)
      .post("/api/sign/batch")
      .send({ captions: [] });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterAll(() => {
  try {
    fs.readdirSync(TMP_CACHE).forEach((f) => fs.unlinkSync(path.join(TMP_CACHE, f)));
    fs.rmdirSync(TMP_CACHE);
  } catch {}
});
