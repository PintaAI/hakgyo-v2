// HTML for the template images (documents, charts, signs, dates and prices), rendered to PNG with
// headless Chromium so the Korean text is exact. Every name, number and address is fictional.
import type { TemplateSpec } from "./content";

const FONT = `font-family: "Noto Sans CJK KR", "Noto Sans KR", sans-serif;`;

function page(width: number, height: number, body: string, css = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; padding: 0; background: #fff; }
    body { width: ${width}px; height: ${height}px; ${FONT} color: #111; display: flex;
      align-items: center; justify-content: center; overflow: hidden; }
    ${css}
  </style></head><body>${body}</body></html>`;
}

/** Text the template shows, for the checks and the blind test. */
export function templateText(spec: TemplateSpec): string {
  switch (spec.template) {
    case "sign-electric":
      return "노란 삼각형 경고 표지판 안에 검은 번개 그림 (글자 없음)";
    case "notice-counseling":
      return "다솜 외국인근로자 상담소 / 상담 시간: 평일(월~금) 오전 10:00 ~ 오후 6:00, 일요일 오후 1:00 ~ 오후 5:00 / ※ 토요일, 공휴일은 쉽니다. / 상담 언어: 인도네시아어, 베트남어, 네팔어 / 전화: 031-555-0147";
    case "chart-weekend":
      return "외국인 근로자가 주말에 가장 많이 하는 일 (단위: %, 응답자 200명): 집에서 쉬기 35, 친구 만나기 25, 한국어 공부 20, 운동 12, 쇼핑 8";
    case "notice-health":
      return "[공지] 건강 검진 안내 / 날짜: 11월 19일(목) ~ 11월 20일(금) / 시간: 오전 8시 ~ 오전 11시 / 장소: 본관 1층 회의실 / 검진 전날 밤 9시부터 아무것도 드시지 마십시오. (물은 마셔도 됩니다.) / 신분증(외국인등록증)을 꼭 가지고 오십시오. / 검진 비용은 회사에서 냅니다. / 총무팀";
    case "calendar":
      return `달력: ${spec.month}월 ${spec.day}일`;
    case "price":
      return `가격표: ${spec.amount.toLocaleString("en-US")}원`;
  }
}

export function templateHtml(spec: TemplateSpec): {
  html: string;
  width: number;
  height: number;
} {
  switch (spec.template) {
    case "sign-electric": {
      const svg = `<svg width="520" height="470" viewBox="0 0 520 470" xmlns="http://www.w3.org/2000/svg">
        <path d="M260 22 L502 446 L18 446 Z" fill="#f7c600" stroke="#111" stroke-width="22" stroke-linejoin="round"/>
        <path d="M282 128 L196 300 L258 300 L222 410 L330 252 L268 252 L310 128 Z" fill="#111"/>
      </svg>`;
      return { html: page(600, 540, svg), width: 600, height: 540 };
    }
    case "notice-counseling": {
      const body = `<div class="board">
        <div class="title">다솜 외국인근로자 상담소</div>
        <table>
          <tr><th rowspan="2">상담 시간</th><td>평일(월~금)</td><td>오전 10:00 ~ 오후 6:00</td></tr>
          <tr><td>일요일</td><td>오후 1:00 ~ 오후 5:00</td></tr>
        </table>
        <div class="note">※ 토요일, 공휴일은 쉽니다.</div>
        <div class="row"><b>상담 언어</b> 인도네시아어, 베트남어, 네팔어</div>
        <div class="row"><b>전화</b> 031-555-0147</div>
      </div>`;
      const css = `
        .board { width: 760px; border: 6px solid #2d5b8a; border-radius: 18px; padding: 34px 40px 30px; }
        .title { font-size: 40px; font-weight: 700; text-align: center; color: #1f4570;
          padding-bottom: 22px; border-bottom: 3px solid #2d5b8a; margin-bottom: 26px; }
        table { width: 100%; border-collapse: collapse; font-size: 28px; }
        th, td { border: 2px solid #9db3c9; padding: 14px 16px; text-align: left; }
        th { background: #e8f0f8; width: 160px; text-align: center; }
        .note { font-size: 24px; margin: 16px 0 22px; color: #b3261e; }
        .row { font-size: 28px; margin-top: 10px; }
        .row b { display: inline-block; width: 150px; color: #1f4570; }`;
      return { html: page(860, 560, body, css), width: 860, height: 560 };
    }
    case "chart-weekend": {
      const rows: Array<[string, number]> = [
        ["집에서 쉬기", 35],
        ["친구 만나기", 25],
        ["한국어 공부", 20],
        ["운동", 12],
        ["쇼핑", 8],
      ];
      const bars = rows
        .map(
          ([label, value]) => `<div class="bar-row">
            <div class="label">${label}</div>
            <div class="track"><div class="bar" style="width:${value * 14}px"></div>
            <span class="value">${value}</span></div></div>`,
        )
        .join("");
      const body = `<div class="chart">
        <div class="title">외국인 근로자가 주말에 가장 많이 하는 일</div>
        <div class="sub">(단위: %, 응답자 200명)</div>
        ${bars}</div>`;
      const css = `
        .chart { width: 800px; }
        .title { font-size: 34px; font-weight: 700; text-align: center; }
        .sub { font-size: 22px; text-align: right; color: #444; margin: 10px 0 24px; }
        .bar-row { display: flex; align-items: center; margin: 16px 0; }
        .label { width: 190px; font-size: 28px; text-align: right; padding-right: 18px; }
        .track { display: flex; align-items: center; border-left: 3px solid #111; height: 54px; }
        .bar { height: 40px; background: #4a7fb5; }
        .value { font-size: 28px; font-weight: 700; margin-left: 12px; }`;
      return { html: page(880, 560, body, css), width: 880, height: 560 };
    }
    case "notice-health": {
      const body = `<div class="notice">
        <div class="title">[공지] 건강 검진 안내</div>
        <ul>
          <li><b>날짜</b> 11월 19일(목) ~ 11월 20일(금)</li>
          <li><b>시간</b> 오전 8시 ~ 오전 11시</li>
          <li><b>장소</b> 본관 1층 회의실</li>
        </ul>
        <ol>
          <li>검진 전날 밤 9시부터 아무것도 드시지 마십시오.<br><span>(물은 마셔도 됩니다.)</span></li>
          <li>신분증(외국인등록증)을 꼭 가지고 오십시오.</li>
          <li>검진 비용은 회사에서 냅니다.</li>
        </ol>
        <div class="from">총무팀</div>
      </div>`;
      const css = `
        .notice { width: 780px; border: 4px solid #111; padding: 32px 44px 26px; background: #fffef6; }
        .title { font-size: 40px; font-weight: 700; text-align: center; margin-bottom: 26px; }
        ul { list-style: none; padding: 0; margin: 0 0 22px; font-size: 28px; }
        ul li { margin: 8px 0; } ul b { display: inline-block; width: 100px; }
        ol { font-size: 27px; padding-left: 36px; margin: 0; border-top: 2px dashed #777; padding-top: 18px; }
        ol li { margin: 10px 0; line-height: 1.45; } ol span { color: #444; }
        .from { text-align: right; font-size: 26px; margin-top: 18px; font-weight: 700; }`;
      return { html: page(880, 680, body, css), width: 880, height: 680 };
    }
    case "calendar": {
      const body = `<div class="cal">
        <div class="month">${spec.month}월</div>
        <div class="day">${spec.day}</div>
        <div class="unit">일</div>
      </div>`;
      const css = `
        .cal { width: 360px; height: 400px; border: 5px solid #111; border-radius: 22px; overflow: hidden; text-align: center; }
        .month { background: #c8102e; color: #fff; font-size: 64px; font-weight: 700; padding: 16px 0; }
        .day { font-size: 170px; font-weight: 700; line-height: 1; margin-top: 30px; }
        .unit { font-size: 48px; margin-top: 6px; }`;
      return { html: page(480, 480, body, css), width: 480, height: 480 };
    }
    case "price": {
      const amount = spec.amount.toLocaleString("en-US");
      const body = `<div class="tag"><div class="hole"></div>
        <div class="amount">${amount}<span>원</span></div></div>`;
      const css = `
        .tag { position: relative; width: 400px; height: 210px; border: 5px solid #111; border-radius: 26px;
          background: #fff4c2; display: flex; align-items: center; justify-content: center; }
        .hole { position: absolute; left: 26px; top: 50%; width: 26px; height: 26px; margin-top: -13px;
          border: 4px solid #111; border-radius: 50%; background: #fff; }
        .amount { font-size: 78px; font-weight: 700; margin-left: 60px; letter-spacing: -1px; }
        .amount span { font-size: 54px; margin-left: 6px; }`;
      return { html: page(480, 480, body, css), width: 480, height: 480 };
    }
  }
}
