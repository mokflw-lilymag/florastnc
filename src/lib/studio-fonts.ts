import {
  Bagel_Fat_One,
  Black_Han_Sans,
  Do_Hyeon,
  Gowun_Batang,
  Yeon_Sung,
  Nanum_Pen_Script,
  Gaegu,
  Jua,
} from "next/font/google";

const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-bagel" });
const blackHan = Black_Han_Sans({ weight: "400", subsets: ["latin"], variable: "--font-black-han" });
const doHyeon = Do_Hyeon({ weight: "400", subsets: ["latin"], variable: "--font-do-hyeon" });
const gowun = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-gowun" });
const yeonSung = Yeon_Sung({ weight: "400", subsets: ["latin"], variable: "--font-yeon-sung" });
const nanumPen = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], variable: "--font-nanum-pen" });
const gaegu = Gaegu({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-gaegu" });
const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-jua" });

/** 리본 프린터·디자인 스튜디오 등에서만 로드 (루트 레이아웃 번들 절감) */
export const studioFontClassName = [
  bagel.variable,
  blackHan.variable,
  doHyeon.variable,
  gowun.variable,
  yeonSung.variable,
  nanumPen.variable,
  gaegu.variable,
  jua.variable,
].join(" ");
