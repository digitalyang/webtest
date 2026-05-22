import Link from "next/link";
import NailongMeme from "../../components/NailongMeme";

export const metadata = {
  title: "奶龙表情包 - DigitalSheep's Space"
};

export default function NailongPage() {
  return (
    <>
      <NailongMeme />

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}
