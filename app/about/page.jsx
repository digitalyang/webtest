import Link from "next/link";
import AboutProfile from "../../components/AboutProfile";
import { DEFAULT_ABOUT_PROFILE } from "../../lib/about-profile";
import { getPublishedAboutProfile } from "../../lib/server/about-profile";
import { getRequestContext } from "../../lib/server/cloudflare";

export const metadata = {
  title: "DigitalSheep - 个人简介"
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const profile = await getAboutProfile();

  return (
    <>
      <AboutProfile profile={profile} />

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}

async function getAboutProfile() {
  try {
    return getPublishedAboutProfile(getRequestContext().env);
  } catch {
    return DEFAULT_ABOUT_PROFILE;
  }
}
