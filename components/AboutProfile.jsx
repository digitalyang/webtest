import { normalizeAboutProfile } from "../lib/about-profile";

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

function tagKey(tag, index) {
  const label = typeof tag === "string" ? tag : tag.label;
  return `${label}-${index}`;
}

function TagGroup({ title, tags }) {
  return (
    <div className="about-tag-group">
      <h3>{title}</h3>
      <div className="about-tags">
        {tags.map((tag, index) => (
          <Tag key={tagKey(tag, index)} tag={tag} />
        ))}
      </div>
    </div>
  );
}

export default function AboutProfile({ profile }) {
  const aboutProfile = normalizeAboutProfile(profile);

  return (
    <section className="about-profile" aria-labelledby="about-title">
      <aside className="about-identity">
        <div className="badge">{aboutProfile.identity.badge}</div>
        <h1 id="about-title">{aboutProfile.identity.headline}</h1>
        <p className="subtitle">{aboutProfile.identity.subtitle}</p>
        <div className="about-tags" aria-label="个人关键词">
          {aboutProfile.identity.heroTags.map((tag, index) => (
            <Tag key={tagKey(tag, index)} tag={tag} />
          ))}
        </div>
      </aside>

      <div className="about-content">
        <section className="about-section">
          <div className="section-kicker">About</div>
          <h2>{aboutProfile.about.heading}</h2>
          {aboutProfile.about.paragraphs.map((paragraph, index) => (
            <p key={`${paragraph}-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section className="about-section">
          <div className="section-kicker">Game Tags</div>
          <h2>游戏雷达</h2>
          {aboutProfile.games.map((group, index) => (
            <TagGroup key={`${group.title}-${index}`} title={group.title} tags={group.tags} />
          ))}
        </section>

        <section className="about-section">
          <div className="section-kicker">Anime IP</div>
          <h2>动画与 IP</h2>
          <TagGroup title="喜欢的作品" tags={aboutProfile.anime.tags} />
          <div className="about-watch-list">
            <p>
              <strong>正在看：</strong>
              {aboutProfile.anime.watching}
            </p>
            <p>
              <strong>准备看：</strong>
              {aboutProfile.anime.planned}
            </p>
          </div>
        </section>

        <section className="about-section">
          <div className="section-kicker">Tech Stack</div>
          <h2>技术栈</h2>
          <div className="about-tech-grid">
            {aboutProfile.tech.map((group, index) => (
              <TagGroup key={`${group.title}-${index}`} title={group.title} tags={group.tags} />
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="section-kicker">Experience</div>
          <h2>经历卡</h2>
          <div className="about-experience-grid">
            {aboutProfile.experiences.map((experience, index) => (
              <article key={`${experience.title}-${index}`} className="about-experience-card">
                <h3>{experience.title}</h3>
                <p>{experience.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="section-kicker">Direction</div>
          <h2>接下来关注</h2>
          <p>{aboutProfile.direction}</p>
        </section>
      </div>
    </section>
  );
}
