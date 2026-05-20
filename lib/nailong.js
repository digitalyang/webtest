export const nailongMemes = [
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

export function getShuffledMemes(memes = nailongMemes) {
  return [...memes].sort(() => Math.random() - 0.5);
}
