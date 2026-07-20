const { extractVideoId } = require("../routes/video");

describe("YouTube video URL parsing", () => {
  const id = "LPZh9BOjkQs";

  test.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}&t=10`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=share`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}?feature=share`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])("extracts the video id from %s", (url) => {
    expect(extractVideoId(url)).toBe(id);
  });

  test.each([
    "",
    "https://example.com/watch?v=LPZh9BOjkQs",
    "https://youtube.com/watch?v=too-short",
    "not a url",
  ])("rejects invalid input %s", (url) => {
    expect(extractVideoId(url)).toBeNull();
  });
});
