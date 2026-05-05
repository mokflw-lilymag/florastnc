import type { LandingFeatureDetailPagesMap } from "./types";

export const ZH_DETAIL_PAGES: LandingFeatureDetailPagesMap = {
  "ai-order-concierge": {
    sections: [
      {
        body: "顾客订单消息语气、顺序、缺项各不相同，每次接单都在耗时间。AI 订单管家读取类微信消息、短信与电话备忘，先把收货人、配送时间、贺卡文案与金额提示整理成订单雏形，员工以核对修改为主，而非从零录入。",
      },
      {
        heading: "门店侧变化",
        body: "高峰时瓶颈往往是确认而非打字。先把字段标准化，就能减少挂断电话再开聊天复制粘贴的循环，更快发现错漏。“今天务必送达”这类急单体感最明显。",
      },
      {
        heading: "更适合谁",
        body: "即时聊天订单占比高、电话订单在员工间多次转述、或每天重复录入相似字段的团队受益最大；单量上升时也能更稳地保持受理质量。",
      },
    ],
  },
  "shop-sync": {
    sections: [
      {
        body: "若 Naver、Cafe24 与门店订单彼此割裂，员工就会在多个后台来回并重复录入。一体化同步把下单、支付与配送状态串在同一时间线，降低双录与遗漏。",
      },
      {
        heading: "运营流程",
        body: "新订单 → 制作排队/进行 → 调度/自提 → 送达自动衔接；每次状态切换都有记录，团队用同一口径看清“谁在跟哪一单”。",
      },
      {
        heading: "预期收益",
        body: "渠道再多也能一眼看到来源、处理进度与积压，减少关店前突击整理；周末与节庆高峰的运营波动也会更可控。",
      },
    ],
  },
  "smart-print-bridge": {
    sections: [
      {
        heading: "突破 A4：长幅横幅",
        body: "家用喷墨并非为超长幅面设计。Floxync 流式输出把硬件边界外推，数米横幅可连续打印，无需昂贵宽幅机也能接近专业条幅效果。",
      },
      {
        heading: "热敏 ribbon 精密控制",
        body: "热量与 ribbon 张力在浏览器侧极难拿捏。Floxync 即时驱动多种热敏设备，尽量保留 ribbon 印刷应有的细腻度。",
      },
      {
        heading: "XPrint：浏览器统管硬件",
        body: "厌倦驱动与漂移的设置？XPrint 在 Web 侧统一设备，一键同步店内打印机，并追求与预览一致的输出。",
      },
    ],
    ctaLinks: [
      {
        label: "购买咨询",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] 智能打印桥购买咨询")}`,
      },
      {
        label: "申请测试用户",
        href: "/#test-user-apply",
      },
    ],
  },
  "ai-expense-magic": {
    sections: [
      {
        heading: "“拍一下”就记账",
        body: "整理小票是花店最烦的杂务。AI OCR 能读褶皱与模糊字迹，拆分店名、日期、总额与税额并写入支出账本。",
      },
      {
        heading: "读懂语境的分类",
        body: "不仅是识字：模型结合供应商与行项目，自动归入花材、配送、耗材等你定义的科目；店主负责拍照，分类交给 AI。",
      },
      {
        heading: "与结算引擎实时联动",
        body: "录入的支出立刻同步到金融级结算引擎，实时看到扣成本后的真利润，减轻报税季翻小票山的痛苦。",
      },
    ],
    ctaLinks: [
      {
        label: "申请测试用户",
        href: "/#test-user-apply",
      },
      {
        label: "联系我们",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] AI 魔法记账助手咨询")}`,
      },
    ],
  },
  "settlement-engine": {
    sections: [
      {
        body: "销售额上去但利润薄，多半因为佣金、成本、运费、税各自为政。引擎固定规则，让同一订单每次得到同一套结果，减少月末对账摇摆。",
      },
      {
        heading: "透明",
        body: "按订单拆解“销售-成本-佣金-运费-税”，让利润在何处被吃掉可被解释；减少老板与执行层对数字理解的分歧。",
      },
      {
        heading: "报表",
        body: "提供日/周/月汇总与渠道对比，快速判断哪种单型更赚钱；用数据而非直觉调整价格、促销与运营策略。",
      },
    ],
  },
  "mobile-premium": {
    sections: [
      {
        body: "移动中心尊享版（Android）在开发中。将优先上线离店也能快速查看订单、进度与轻审批的现场向能力。",
      },
      {
        heading: "上线计划",
        body: "提交测试申请或留言咨询，可优先获得 Beta 通知，并同步告知适配机型范围。",
      },
      {
        heading: "路线图",
        body: "核心流程稳定后，会分批上线通知、审批、现场清单与导入指南。",
      },
    ],
    ctaLinks: [
      {
        label: "申请测试用户",
        href: "/#test-user-apply",
      },
      {
        label: "联系我们",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Android 应用上线咨询")}`,
      },
    ],
  },
};
