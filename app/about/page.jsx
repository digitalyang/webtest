import Link from "next/link";

export const metadata = {
  title: "DigitalSheep - 个人简介"
};

const heroTags = ["ESFJ", "南京信息工程大学", "嵌入式开发工程师", "摄影", "自动驾驶", "AI", "智能硬件"];

const gameGroups = [
  {
    title: "主机 / PC",
    tags: ["PUBG", "GTA5", "荒野大镖客2", "刺客信条", "泰拉瑞亚", "生化危机", "黑神话：悟空", "孤岛惊魂"]
  },
  {
    title: "手游 / 二游",
    tags: ["FGO", "原神", "王者荣耀", "崩坏三", "洛克王国"]
  }
];

const animeTags = [
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
];

const techGroups = [
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
];

const experiences = [
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
];

function Tag({ tag }) {
  const label = typeof tag === "string" ? tag : tag.label;
  const icon = typeof tag === "string" ? undefined : tag.icon;

  return (
    <span className="about-tag">
      {icon ? (
        <span className="about-tag-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {label}
    </span>
  );
}

function TagGroup({ title, tags }) {
  return (
    <div className="about-tag-group">
      <h3>{title}</h3>
      <div className="about-tags">
        {tags.map((tag) => (
          <Tag key={typeof tag === "string" ? tag : tag.label} tag={tag} />
        ))}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="about-profile" aria-labelledby="about-title">
        <aside className="about-identity">
          <div className="badge">DigitalSheep</div>
          <h1 id="about-title">不玩游戏不看动漫的嵌入式开发者不是一个好的摄影师</h1>
          <p className="subtitle">
            ESFJ，毕业于南京信息工程大学，目前是一名嵌入式开发工程师。关注自动驾驶、AI 与智能硬件，也喜欢用摄影记录那些刚好发光的瞬间。
          </p>
          <div className="about-tags" aria-label="个人关键词">
            {heroTags.map((tag) => (
              <Tag key={tag} tag={tag} />
            ))}
          </div>
        </aside>

        <div className="about-content">
          <section className="about-section">
            <div className="section-kicker">About</div>
            <h2>你好，我是 DigitalSheep</h2>
            <p>
              我毕业于南京信息工程大学，目前是一名嵌入式开发工程师。我喜欢游戏、动漫和摄影，也喜欢把硬件、协议和代码一点点接起来，让真实世界里的设备稳定运行。对我来说，嵌入式开发不只是和寄存器、接口、时序打交道，也是一种观察细节、拆解问题、再把系统重新拼好的过程。
            </p>
            <p>
              现在的我主要关注自动驾驶、AI 和智能硬件方向。主机游戏、二游、动画作品和摄影给了我很多关于体验、节奏和画面的直觉，而这些直觉也会反过来影响我理解产品和工程的方式。
            </p>
          </section>

          <section className="about-section">
            <div className="section-kicker">Game Tags</div>
            <h2>游戏雷达</h2>
            {gameGroups.map((group) => (
              <TagGroup key={group.title} title={group.title} tags={group.tags} />
            ))}
          </section>

          <section className="about-section">
            <div className="section-kicker">Anime IP</div>
            <h2>动画与 IP</h2>
            <TagGroup title="喜欢的作品" tags={animeTags} />
            <div className="about-watch-list">
              <p>
                <strong>正在看：</strong>药屋少女的呢喃
              </p>
              <p>
                <strong>准备看：</strong>美妙天堂
              </p>
            </div>
          </section>

          <section className="about-section">
            <div className="section-kicker">Tech Stack</div>
            <h2>技术栈</h2>
            <div className="about-tech-grid">
              {techGroups.map((group) => (
                <TagGroup key={group.title} title={group.title} tags={group.tags} />
              ))}
            </div>
          </section>

          <section className="about-section">
            <div className="section-kicker">Experience</div>
            <h2>经历卡</h2>
            <div className="about-experience-grid">
              {experiences.map((experience) => (
                <article key={experience.title} className="about-experience-card">
                  <h3>{experience.title}</h3>
                  <p>{experience.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="about-section">
            <div className="section-kicker">Direction</div>
            <h2>接下来关注</h2>
            <p>
              我会继续围绕自动驾驶、AI 和智能硬件积累工程经验，也希望把个人站维护成一个能展示项目、照片、兴趣和学习轨迹的小空间。
            </p>
          </section>
        </div>
      </section>

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}
