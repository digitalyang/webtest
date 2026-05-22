import { describe, expect, test } from "vitest";

import {
  DEFAULT_ABOUT_PROFILE,
  normalizeAboutProfile,
  tagsFromLines,
  tagsToLines
} from "../lib/about-profile.js";

describe("about profile data", () => {
  test("keeps the current DigitalSheep default profile content", () => {
    expect(DEFAULT_ABOUT_PROFILE.identity.badge).toBe("DigitalSheep");
    expect(DEFAULT_ABOUT_PROFILE.identity.headline).toBe("不玩游戏不看动漫的嵌入式开发者不是一个好的摄影师");
    expect(DEFAULT_ABOUT_PROFILE.games[0].tags).toContain("PUBG");
    expect(DEFAULT_ABOUT_PROFILE.anime.watching).toBe("药屋少女的呢喃");
    expect(DEFAULT_ABOUT_PROFILE.tech[0].tags[0]).toEqual({ label: "C/C++", icon: "C++" });
    expect(DEFAULT_ABOUT_PROFILE.experiences).toHaveLength(4);
  });

  test("normalizes strings, tag lines, paragraphs, technical icons, and empty cards", () => {
    const profile = normalizeAboutProfile({
      identity: {
        badge: " DigitalSheep ",
        headline: " Headline ",
        subtitle: " Subtitle ",
        heroTags: [" AI ", "", " 摄影 "]
      },
      about: {
        paragraphs: [" First paragraph ", "", " Second paragraph "]
      },
      games: [{ title: " 主机 / PC ", tags: [" PUBG ", ""] }],
      anime: {
        tags: [" 初音未来 ", ""],
        watching: " 药屋少女的呢喃 ",
        planned: " 美妙天堂 "
      },
      tech: [
        {
          title: " 编程语言 ",
          tags: [{ label: " C/C++ ", icon: " C++ " }, { label: " Python ", icon: " " }, " Verilog ", ""]
        }
      ],
      experiences: [
        { title: " Project ", description: " Description " },
        { title: "", description: "" }
      ],
      direction: " Future focus "
    });

    expect(profile.identity).toEqual({
      badge: "DigitalSheep",
      headline: "Headline",
      subtitle: "Subtitle",
      heroTags: ["AI", "摄影"]
    });
    expect(profile.about.paragraphs).toEqual(["First paragraph", "Second paragraph"]);
    expect(profile.about.heading).toBe(DEFAULT_ABOUT_PROFILE.about.heading);
    expect(profile.games).toEqual([{ title: "主机 / PC", tags: ["PUBG"] }]);
    expect(profile.anime).toEqual({
      tags: ["初音未来"],
      watching: "药屋少女的呢喃",
      planned: "美妙天堂"
    });
    expect(profile.tech).toEqual([
      { title: "编程语言", tags: [{ label: "C/C++", icon: "C++" }, { label: "Python" }, "Verilog"] }
    ]);
    expect(profile.experiences).toEqual([{ title: "Project", description: "Description" }]);
    expect(profile.direction).toBe("Future focus");
  });

  test("rejects missing required content", () => {
    expect(() =>
      normalizeAboutProfile({
        ...DEFAULT_ABOUT_PROFILE,
        identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "" }
      })
    ).toThrow("个人简介标题不能为空。");

    expect(() =>
      normalizeAboutProfile({
        ...DEFAULT_ABOUT_PROFILE,
        about: { paragraphs: [""] }
      })
    ).toThrow("About 至少需要一段正文。");

    expect(() =>
      normalizeAboutProfile({
        ...DEFAULT_ABOUT_PROFILE,
        direction: ""
      })
    ).toThrow("接下来关注不能为空。");
  });

  test("converts tags to and from one-tag-per-line text", () => {
    expect(tagsFromLines("AI\n\n摄影\n 自动驾驶 ")).toEqual(["AI", "摄影", "自动驾驶"]);
    expect(tagsToLines(["AI", "摄影", "自动驾驶"])).toBe("AI\n摄影\n自动驾驶");
    expect(tagsToLines([{ label: "C/C++", icon: "C++" }, "Python"])).toBe("C/C++\nPython");
  });
});
