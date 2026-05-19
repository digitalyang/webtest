const nailongMemes = [
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0ff2d016kLr.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d10206e1cxgX.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d1010d36dsHW.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d100da4e7pZb.jpeg",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d100b5643AUW.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d100940eeXHO.jpeg",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d100794e0hsy.jpeg",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d10033ee3NFD.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d1000e5feZNf.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0ffdbbe7Ao5.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0ff76727WPM.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0ff53677JP8.jpeg",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0febe9c4bFC.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0fe413b1F3b.jpeg",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0fd6263eaav.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0fe5b2b0Y39.jpeg",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0fe0e54cDL2.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/6841d0fdbd093hlz.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/62ec7a1b26f2a3B1.gif",
  "https://imgs.qiubiaoqing.com/qiubiaoqing/imgs/69162ebbb986426b.gif"
];

const loadMemeButton = document.querySelector("#loadMemeButton");
const memeImage = document.querySelector("#memeImage");
const memeStage = document.querySelector(".meme-stage");
const memeStatus = document.querySelector("#memeStatus");
let lastMemeUrl = "";

function getShuffledMemes() {
  return [...nailongMemes].sort(() => Math.random() - 0.5);
}

function loadMemeFromNetwork(candidates) {
  const [nextUrl, ...restUrls] = candidates;

  if (!nextUrl) {
    memeStatus.textContent = "获取失败，可能是网络或图片站点限制，请稍后再试。";
    loadMemeButton.disabled = false;
    loadMemeButton.textContent = "重新获取一张";
    return;
  }

  const previewImage = new Image();
  previewImage.referrerPolicy = "no-referrer";

  previewImage.onload = () => {
    memeImage.src = nextUrl;
    memeStage.classList.add("has-image");
    memeStatus.textContent = "已从网络获取一张奶龙表情包。";
    loadMemeButton.disabled = false;
    loadMemeButton.textContent = "再获取一张";
    lastMemeUrl = nextUrl;
  };

  previewImage.onerror = () => {
    loadMemeFromNetwork(restUrls);
  };

  previewImage.src = nextUrl;
}

if (loadMemeButton && memeImage && memeStage && memeStatus) {
  loadMemeButton.addEventListener("click", () => {
    loadMemeButton.disabled = true;
    loadMemeButton.textContent = "正在获取...";
    memeStatus.textContent = "正在从网络加载奶龙表情包...";

    const candidates = getShuffledMemes().filter((url) => url !== lastMemeUrl);
    loadMemeFromNetwork(candidates.length > 0 ? candidates : getShuffledMemes());
  });
}
