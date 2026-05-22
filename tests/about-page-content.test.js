import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const pageContext = vi.hoisted(() => ({ env: undefined }));

vi.mock("../lib/server/cloudflare", () => ({
  getRequestContext: () => {
    if (!pageContext.env) {
      throw new Error("No request context");
    }
    return { env: pageContext.env };
  }
}));

import AboutPage, { metadata as aboutMetadata } from "../app/about/page.jsx";
import HomePage from "../app/page.jsx";
import { metadata as rootMetadata } from "../app/layout.jsx";

async function renderComponent(Component) {
  const element = await Component();
  const html = renderToStaticMarkup(element);
  const root = document.createElement("main");
  root.innerHTML = html;

  return { html, root };
}

function createAboutEnv(row) {
  return {
    DB: {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            return row;
          }
        };
      }
    }
  };
}

beforeEach(() => {
  pageContext.env = undefined;
});

describe("DigitalSheep about page content", () => {
  test("renders the approved DigitalSheep identity and headline", async () => {
    const { html } = await renderComponent(AboutPage);

    expect(aboutMetadata.title).toBe("DigitalSheep - 个人简介");
    expect(html).toContain("DigitalSheep");
    expect(html).toContain("不玩游戏不看动漫的嵌入式开发者不是一个好的摄影师");
    expect(html).toContain("南京信息工程大学");
    expect(html).toContain("ESFJ");
    expect(html).toContain("嵌入式开发工程师");
    expect(html).toContain("摄影");
    expect(html).toContain("自动驾驶");
    expect(html).toContain("AI");
    expect(html).toContain("智能硬件");
  });

  test("renders games, anime, tech stack, and lightweight experience cards", async () => {
    const { html } = await renderComponent(AboutPage);

    [
      "主机 / PC",
      "手游 / 二游",
      "PUBG",
      "GTA5",
      "荒野大镖客2",
      "刺客信条",
      "泰拉瑞亚",
      "生化危机",
      "黑神话：悟空",
      "孤岛惊魂",
      "FGO",
      "原神",
      "王者荣耀",
      "崩坏三",
      "洛克王国",
      "初音未来",
      "未闻花名",
      "四月是你的谎言",
      "葬送的芙莉莲",
      "紫罗兰永恒花园",
      "EVA",
      "狐妖小红娘",
      "凡人修仙传",
      "灵笼",
      "非人哉",
      "时光代理人",
      "药屋少女的呢喃",
      "美妙天堂",
      "正在看",
      "准备看",
      "C/C++",
      "Python",
      "Verilog",
      "CUDA 编程",
      "SystemVerilog",
      "Xilinx FPGA",
      "车载 SoC",
      "STM32",
      "51 单片机",
      "Esp32c3",
      "PCIe",
      "UART",
      "SPI",
      "I2C",
      "CSI-2",
      "GMSL",
      "CAN",
      "MQTT",
      "Wi-Fi",
      "BLE",
      "UDP/TCP",
      "HDMI",
      "基于 FPGA 的雷达数据高速采集系统",
      "基于 Esp32c3 的四足机器人",
      "基于 NVIDIA DRIVE Thor U SoC 的视频传输模块设计",
      "基于树莓派的微型 NAS"
    ].forEach((content) => {
      expect(html).toContain(content);
    });
  });

  test("renders the approved about page section structure", async () => {
    const { html, root } = await renderComponent(AboutPage);

    ["About", "Game Tags", "Anime IP", "Tech Stack", "Experience", "Direction", "编程语言", "硬件平台", "协议栈", "准备学习"].forEach(
      (heading) => {
        expect(html).toContain(heading);
      }
    );
    expect(root.querySelectorAll(".about-experience-card")).toHaveLength(4);
  });

  test("does not hotlink remote icon or image assets", async () => {
    const { root } = await renderComponent(AboutPage);
    const remoteAssetUrls = Array.from(root.querySelectorAll("img, source"))
      .flatMap((node) => {
        const src = node.getAttribute("src");
        const srcset = node.getAttribute("srcset");
        const srcsetUrls = srcset
          ? srcset
              .split(",")
              .map((candidate) => candidate.trim().split(/\s+/)[0])
              .filter(Boolean)
          : [];

        return [src, ...srcsetUrls].filter(Boolean);
      })
      .filter((url) => /^(https?:)?\/\//i.test(url));

    expect(remoteAssetUrls).toEqual([]);
  });

  test("removes placeholder profile copy from the about page", async () => {
    const { html } = await renderComponent(AboutPage);

    expect(html).not.toContain("digitalyang");
    expect(html).not.toContain("GitHub Pages");
    expect(html).not.toContain("这里可以放你的经历、技能、兴趣方向和联系方式。");
  });

  test("renders the published D1 about profile when available", async () => {
    pageContext.env = createAboutEnv({
      id: 2,
      status: "published",
      content_json: JSON.stringify({
        identity: {
          badge: "Admin Sheep",
          headline: "后台发布标题",
          subtitle: "后台发布副标题",
          heroTags: ["后台", "D1"]
        },
        about: {
          heading: "后台 About",
          paragraphs: ["后台发布段落"]
        },
        games: [{ title: "后台游戏", tags: ["测试游戏"] }],
        anime: {
          tags: ["测试动画"],
          watching: "测试正在看",
          planned: "测试准备看"
        },
        tech: [{ title: "后台技术", tags: [{ label: "测试技术", icon: "T" }] }],
        experiences: [{ title: "后台经历", description: "后台经历描述" }],
        direction: "后台关注方向"
      }),
      created_at: "2026-05-22 10:00:00",
      updated_at: "2026-05-22 10:00:00",
      published_at: "2026-05-22 10:00:00"
    });

    const { html } = await renderComponent(AboutPage);

    expect(html).toContain("后台发布标题");
    expect(html).toContain("后台发布段落");
    expect(html).toContain("后台关注方向");
    expect(html).not.toContain("不玩游戏不看动漫的嵌入式开发者不是一个好的摄影师");
  });
});

describe("DigitalSheep public site identity", () => {
  test("updates root metadata for the DigitalSheep personal site", () => {
    expect(rootMetadata.title).toBe("DigitalSheep");
    expect(rootMetadata.description).toContain("DigitalSheep");
    expect(rootMetadata.description).toContain("嵌入式");
  });

  test("updates the home page entry copy", async () => {
    const { html } = await renderComponent(HomePage);

    expect(html).toContain("DigitalSheep");
    expect(html).toContain("不玩游戏不看动漫");
    expect(html).toContain("嵌入式");
    expect(html).not.toContain("访问统计");
    expect(html).not.toContain("/stats");
    expect(html).not.toContain("放一些关于自己的介绍、技能方向、联系方式和当前关注的事情。");
  });
});
