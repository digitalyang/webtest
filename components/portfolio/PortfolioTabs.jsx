"use client";

import Link from "next/link";
import { useState } from "react";
import { getProjectHref } from "../../lib/portfolio";
import WorkGrid from "./WorkGrid";

function ProjectCard({ project }) {
  const href = getProjectHref(project.href);

  return (
    <article className="card">
      <div className="card-content">
        <h2>{project.title}</h2>
        <p>{project.description}</p>
        {href ? (
          <p>
            <Link className="button" href={href}>
              查看
            </Link>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function PortfolioTabs({ categories = [], photographyWorks = [], projects = [] }) {
  const [activeTab, setActiveTab] = useState(categories[0]?.id);
  const codeProjects = projects.filter((project) => project.category === "code");

  return (
    <div className="portfolio-app" aria-live="polite">
      <div className="portfolio-tabs">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`portfolio-tab${category.id === activeTab ? " is-active" : ""}`}
            data-tab={category.id}
            onClick={() => setActiveTab(category.id)}
          >
            {category.title}
          </button>
        ))}
      </div>

      {categories.map((category) => (
        <div key={category.id} className="portfolio-panel" data-category={category.id} hidden={category.id !== activeTab}>
          {category.id === "photography" ? <WorkGrid works={photographyWorks} /> : null}
          {category.id === "code" ? (
            <div className="card-grid">
              {codeProjects.map((project) => (
                <ProjectCard key={project.title} project={project} />
              ))}
            </div>
          ) : null}
          {category.id === "drawing" ? <p className="muted">手绘作品即将上传</p> : null}
        </div>
      ))}
    </div>
  );
}
