export const DEFAULT_ABOUT_PROFILE = {
  identity: {
    badge: "DigitalSheep",
    headline: "不玩游戏不看动漫的嵌入式开发者不是一个好的摄影师",
    subtitle:
      "ESFJ，毕业于南京信息工程大学，目前是一名嵌入式开发工程师。关注自动驾驶、AI 与智能硬件，也喜欢用摄影记录那些刚好发光的瞬间。",
    heroTags: ["ESFJ", "南京信息工程大学", "嵌入式开发工程师", "摄影", "自动驾驶", "AI", "智能硬件"]
  },
  about: {
    heading: "你好，我是 DigitalSheep",
    paragraphs: [
      "我毕业于南京信息工程大学，目前是一名嵌入式开发工程师。我喜欢游戏、动漫和摄影，也喜欢把硬件、协议和代码一点点接起来，让真实世界里的设备稳定运行。对我来说，嵌入式开发不只是和寄存器、接口、时序打交道，也是一种观察细节、拆解问题、再把系统重新拼好的过程。",
      "现在的我主要关注自动驾驶、AI 和智能硬件方向。主机游戏、二游、动画作品和摄影给了我很多关于体验、节奏和画面的直觉，而这些直觉也会反过来影响我理解产品和工程的方式。"
    ]
  },
  games: [
    {
      title: "主机 / PC",
      tags: ["PUBG", "GTA5", "荒野大镖客2", "刺客信条", "泰拉瑞亚", "生化危机", "黑神话：悟空", "孤岛惊魂"]
    },
    {
      title: "手游 / 二游",
      tags: ["FGO", "原神", "王者荣耀", "崩坏三", "洛克王国"]
    }
  ],
  anime: {
    tags: [
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
      "时光代理人"
    ],
    watching: "药屋少女的呢喃",
    planned: "美妙天堂"
  },
  tech: [
    {
      title: "编程语言",
      tags: [
        { label: "C/C++", icon: "C++" },
        { label: "Python", icon: "Py" },
        { label: "Verilog", icon: "VL" },
        { label: "CUDA 编程", icon: "GPU" },
        { label: "SystemVerilog", icon: "SV" }
      ]
    },
    {
      title: "硬件平台",
      tags: [
        { label: "Xilinx FPGA", icon: "FPGA" },
        { label: "车载 SoC", icon: "SoC" },
        { label: "STM32", icon: "STM" },
        { label: "51 单片机", icon: "MCU" },
        { label: "Esp32c3", icon: "ESP" }
      ]
    },
    {
      title: "协议栈",
      tags: ["PCIe", "UART", "SPI", "I2C", "CSI-2", "GMSL", "CAN", "MQTT", "Wi-Fi", "BLE"]
    },
    {
      title: "准备学习",
      tags: ["UDP/TCP", "HDMI"]
    }
  ],
  experiences: [
    {
      title: "基于 FPGA 的雷达数据高速采集系统",
      description: "关注高速数据链路、采集稳定性和硬件侧的数据组织。"
    },
    {
      title: "基于 Esp32c3 的四足机器人",
      description: "把嵌入式控制、无线连接和结构动作组合成可运行的小型机器人。"
    },
    {
      title: "基于 NVIDIA DRIVE Thor U SoC 的视频传输模块设计",
      description: "围绕车载 SoC 视频链路，处理传输模块设计与接口协同。"
    },
    {
      title: "基于树莓派的微型 NAS",
      description: "用轻量硬件搭建个人数据存储与家庭网络服务。"
    }
  ],
  direction:
    "我会继续围绕自动驾驶、AI 和智能硬件积累工程经验，也希望把个人站维护成一个能展示项目、照片、兴趣和学习轨迹的小空间。"
};

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTag(tag, { preserveObject = false } = {}) {
  if (typeof tag === "string") {
    const label = cleanString(tag);
    return label || null;
  }

  if (!tag || typeof tag !== "object") {
    return null;
  }

  const label = cleanString(tag.label);
  const icon = cleanString(tag.icon);

  if (!label) {
    return null;
  }

  if (preserveObject) {
    return icon ? { label, icon } : { label };
  }

  return icon ? { label, icon } : label;
}

function cleanTags(tags, options) {
  return (Array.isArray(tags) ? tags : []).map((tag) => cleanTag(tag, options)).filter(Boolean);
}

function cleanTagGroups(groups, options) {
  return (Array.isArray(groups) ? groups : [])
    .map((group) => {
      const title = cleanString(group?.title);
      const tags = cleanTags(group?.tags, options);

      if (!title && tags.length === 0) {
        return null;
      }

      return { title, tags };
    })
    .filter(Boolean);
}

function cleanExperience(experience) {
  const title = cleanString(experience?.title);
  const description = cleanString(experience?.description);

  if (!title && !description) {
    return null;
  }

  if (!title || !description) {
    throw new Error("经历卡需要同时填写标题和描述。");
  }

  return { title, description };
}

export function normalizeAboutProfile(value) {
  const identity = {
    badge: cleanString(value?.identity?.badge),
    headline: cleanString(value?.identity?.headline),
    subtitle: cleanString(value?.identity?.subtitle),
    heroTags: cleanTags(value?.identity?.heroTags)
  };

  if (!identity.badge) {
    throw new Error("个人简介标识不能为空。");
  }

  if (!identity.headline) {
    throw new Error("个人简介标题不能为空。");
  }

  if (!identity.subtitle) {
    throw new Error("个人简介副标题不能为空。");
  }

  if (identity.heroTags.length === 0) {
    throw new Error("个人关键词至少需要一个标签。");
  }

  const about = {
    heading: cleanString(value?.about?.heading) || DEFAULT_ABOUT_PROFILE.about.heading,
    paragraphs: (Array.isArray(value?.about?.paragraphs) ? value.about.paragraphs : []).map(cleanString).filter(Boolean)
  };

  if (about.paragraphs.length === 0) {
    throw new Error("About 至少需要一段正文。");
  }

  const direction = cleanString(value?.direction);

  if (!direction) {
    throw new Error("接下来关注不能为空。");
  }

  return {
    identity,
    about,
    games: cleanTagGroups(value?.games),
    anime: {
      tags: cleanTags(value?.anime?.tags),
      watching: cleanString(value?.anime?.watching),
      planned: cleanString(value?.anime?.planned)
    },
    tech: cleanTagGroups(value?.tech, { preserveObject: true }),
    experiences: (Array.isArray(value?.experiences) ? value.experiences : []).map(cleanExperience).filter(Boolean),
    direction
  };
}

export function tagsFromLines(value) {
  return cleanString(value)
    .split(/\r?\n/)
    .map(cleanString)
    .filter(Boolean);
}

export function tagsToLines(tags) {
  return cleanTags(tags)
    .map((tag) => (typeof tag === "string" ? tag : tag.label))
    .join("\n");
}
