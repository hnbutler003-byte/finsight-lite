import type { ContentSection } from "@shared/schema";

export interface RegionInfo {
  country: string;
  currency: string;
  currencyCode: string;
  symbol: string;
  mainBank: string;
  exchange: string;
  exchangeAbbr: string;
  exampleCompany1: string;
  exampleCompany1Ticker: string;
  exampleCompany1Desc: string;
  exampleCompany2: string;
  exampleCompany2Ticker: string;
  exampleCompany2Desc: string;
  centralBank: string;
  bondName: string;
  bondRate: string;
  pegged: boolean;
  pegNote: string;
}

export const LESSON_FACTS: Record<string, Record<string, string>> = {
  BSD: {
    "what-is-money": "The Bahamian Dollar has been pegged 1:1 to the US Dollar for decades, so B$1 has bought exactly US$1 the whole time.",
    "saving-vs-spending": "Saving just B$5 a week adds up to more than B$250 in a year, before any interest.",
    "what-is-a-stock": "BISX, the Bahamas International Securities Exchange, opened in 2000 and lists companies across banking, insurance, and retail.",
    "what-is-a-bond": "Bahamas Government Registered Stock can be bought in amounts as small as a few hundred dollars, government bonds aren't only for large investors.",
    "risk-and-reward": "Spreading money across several investments instead of one, diversification, is one of the few strategies that lowers risk without also lowering potential reward.",
    "building-a-portfolio": "The Jamaica Stock Exchange has ranked among the best-performing stock exchanges in the world in some years, proof Caribbean markets can compete globally.",
  },
  BBD: {
    "what-is-money": "The Barbadian Dollar has been pegged at 2 to 1 with the US Dollar since 1975, over 50 years of exchange-rate stability.",
    "saving-vs-spending": "Saving just Bds$5 a week adds up to more than Bds$250 in a year, before any interest.",
    "what-is-a-stock": "The Barbados Stock Exchange was established in 1987, one of the oldest stock exchanges in the Caribbean.",
    "what-is-a-bond": "Barbados Government Savings Bonds can be bought in small amounts, government bonds aren't only for large investors.",
    "risk-and-reward": "Spreading money across several investments instead of one, diversification, is one of the few strategies that lowers risk without also lowering potential reward.",
    "building-a-portfolio": "The Barbados Stock Exchange works closely with the Jamaica and Trinidad and Tobago exchanges, so investors can trade across all three markets.",
  },
  JMD: {
    "what-is-money": "The Jamaican Dollar floats freely, its value is set by supply and demand rather than a fixed peg.",
    "saving-vs-spending": "Saving just J$5 a week adds up to more than J$250 in a year, before any interest.",
    "what-is-a-stock": "The Jamaica Stock Exchange was the first stock exchange in the Caribbean, opening in 1969.",
    "what-is-a-bond": "Bank of Jamaica Investment Notes can be bought in small amounts, government bonds aren't only for large investors.",
    "risk-and-reward": "Spreading money across several investments instead of one, diversification, is one of the few strategies that lowers risk without also lowering potential reward.",
    "building-a-portfolio": "The Jamaica Stock Exchange has been named the world's best-performing stock market by both Bloomberg and the Financial Times.",
  },
  TTD: {
    "what-is-money": "The Trinidad and Tobago Dollar has a managed float, the Central Bank influences its value, but it can still shift day to day.",
    "saving-vs-spending": "Saving just TT$5 a week adds up to more than TT$250 in a year, before any interest.",
    "what-is-a-stock": "The Trinidad and Tobago Stock Exchange opened in 1981 and is the largest stock exchange in the Caribbean by market value.",
    "what-is-a-bond": "Trinidad & Tobago Government Bonds can be bought in small amounts, government bonds aren't only for large investors.",
    "risk-and-reward": "Spreading money across several investments instead of one, diversification, is one of the few strategies that lowers risk without also lowering potential reward.",
    "building-a-portfolio": "Companies from Barbados, Jamaica, and the Eastern Caribbean can cross-list and trade right on the Trinidad and Tobago Stock Exchange.",
  },
  XCD: {
    "what-is-money": "The East Caribbean Dollar is pegged at 2.70 to the US Dollar and shared across eight islands in the Eastern Caribbean Currency Union.",
    "saving-vs-spending": "Saving just EC$5 a week adds up to more than EC$250 in a year, before any interest.",
    "what-is-a-stock": "The Eastern Caribbean Securities Exchange lets investors across all eight member islands buy and sell the very same shares.",
    "what-is-a-bond": "ECCB Treasury Bills can be bought in small amounts, government bonds aren't only for large investors.",
    "risk-and-reward": "Spreading money across several investments instead of one, diversification, is one of the few strategies that lowers risk without also lowering potential reward.",
    "building-a-portfolio": "The Eastern Caribbean Securities Exchange serves all eight islands of the currency union from one shared market.",
  },
  GYD: {
    "what-is-money": "The Guyanese Dollar floats freely, and its value has been strengthening in recent years as Guyana's oil industry has grown rapidly.",
    "saving-vs-spending": "Saving just G$5 a week adds up to more than G$250 in a year, before any interest.",
    "what-is-a-stock": "Guyana's economy has been one of the fastest-growing in the world in recent years, driven by newly discovered offshore oil.",
    "what-is-a-bond": "Guyana Treasury Bills can be bought in small amounts, government bonds aren't only for large investors.",
    "risk-and-reward": "Spreading money across several investments instead of one, diversification, is one of the few strategies that lowers risk without also lowering potential reward.",
    "building-a-portfolio": "Banks DIH and Demerara Distillers are two of the best-known companies trading in Guyana's growing economy.",
  },
};

export function getLocalizedModuleContent(slug: string, region: RegionInfo): { content: string; description: string } | null {
  const r = region;

  const modules: Record<string, { content: string; description: string }> = {
    "what-is-money": {
      description: `Learn why different countries have different currencies and how money works in ${r.country}.`,
      content: `Money is anything that people agree to use to buy and sell things. In ${r.country}, we use the ${r.currency} (${r.currencyCode}). ${r.pegNote}

Why do different countries have different currencies? Each country's government prints its own money and controls how much exists. This helps them manage their economy. Some currencies are "pegged" (locked) to the US Dollar, like the Bahamian Dollar, which means the exchange rate stays the same. Others, like the Jamaican Dollar, "float" freely and change value based on supply and demand.

In the Caribbean, you'll find lots of different currencies: The Bahamas uses BSD, Jamaica uses JMD, Trinidad uses TTD, Barbados uses BBD, and many Eastern Caribbean islands share the East Caribbean Dollar (XCD). Understanding your own currency (the ${r.currencyCode}) is the first step to using money wisely!

Key takeaway: Money is a tool. Understanding how the ${r.currency} works is the first step to using it wisely!`,
    },

    "saving-vs-spending": {
      description: `Discover the power of saving and how to make smart spending choices in ${r.country}.`,
      content: `Every time you get money (whether it's an allowance, a gift, or pay from a part-time job) you have a choice: spend it now or save it for later.

Spending gives you something right away (a snack, a game, new clothes). Saving means you wait, but your money can grow. If you put money in a savings account at a bank like ${r.mainBank} in ${r.country}, they'll pay you interest, a small reward for letting them use your money.

The 50/30/20 Rule is a simple guide:
• 50% for needs (school supplies, lunch)
• 30% for wants (entertainment, treats)
• 20% for savings (your future self will thank you!)

Budgeting is just making a plan for your money before you spend it. Even small amounts saved regularly can add up to something big over time!

Key takeaway: Whether you have ${r.symbol}10 or ${r.symbol}1,000, making a plan for your money is always smart.`,
    },

    "what-is-a-stock": {
      description: `Learn what it means to own a piece of a company in ${r.country}.`,
      content: `A stock (also called a "share") is a tiny piece of ownership in a company. When a company wants to raise money to grow, it can sell shares to the public. If you buy one share of ${r.mainBank} on the ${r.exchange} (${r.exchangeAbbr}), you literally own a small piece of that bank!

Why would you buy a stock?
1. Growth: If the company does well, its stock price goes up. You could sell your share for more than you paid.
2. Dividends: Some companies share their profits with stockholders by paying dividends, regular cash payments just for owning the stock.

But there's risk: if the company does poorly, the stock price can go down, and you could lose money. That's why stocks are considered riskier than savings accounts.

Real example: ${r.exampleCompany1} (${r.exampleCompany1Ticker}) in ${r.country} ${r.exampleCompany1Desc}. If the company does well, its stock might go up. But if a hurricane or other disruption affects operations, the stock might drop temporarily.

Key takeaway: Stocks let you share in a company's success (and risk). They're best for money you won't need for a long time.`,
    },

    "what-is-a-bond": {
      description: `Understand how bonds work and why governments in ${r.country} issue them.`,
      content: `A bond is like an IOU. When you buy a bond, you're lending money to a government or company. They promise to pay you back the full amount (called the "face value") on a set date, plus regular interest payments along the way.

The ${r.centralBank} issues bonds called "${r.bondName}." For example, a 5-year bond might pay ${r.bondRate} interest per year. If you invest ${r.symbol}1,000, you'd earn about ${r.symbol}${(1000 * parseFloat(r.bondRate) / 100).toFixed(0)} every year for 5 years, then get your ${r.symbol}1,000 back.

Why are bonds considered safer than stocks?
• You know exactly how much interest you'll earn
• The government is very unlikely to fail to pay you back
• Your original investment is returned at the end

But there's a trade-off: bonds usually earn less than stocks over time. A stock might gain 8-10% in a great year, but a bond gives you a steady, predictable ${r.bondRate}.

Other Caribbean bonds worth knowing about:
• Bank of Jamaica Investment Notes: Jamaica's central bank bonds
• Trinidad & Tobago Government Bonds: longer-term bonds from T&T
• EC Home Mortgage Bank bonds: help fund housing in the Eastern Caribbean

Key takeaway: Bonds are a safer way to earn steady returns. They're great for money you want to protect while still earning more than a savings account.`,
    },

    "risk-and-reward": {
      description: `Learn why higher returns come with higher risk when investing in ${r.country}.`,
      content: `In investing, risk and reward go hand in hand. The more risk you take, the more you might earn, but you also might lose more.

Think of it like this:
Savings Account (Low Risk, Low Reward): Your money is safe at ${r.mainBank}, but earns maybe 1-2% per year.
Government Bonds (Low-Medium Risk, Medium Reward): Very safe, earns 3-5% per year. Example: ${r.bondName} pays about ${r.bondRate}.
Stocks (Medium-High Risk, Higher Reward): Can earn 5-10%+ per year on average, but prices go up AND down. Example: ${r.exampleCompany1} (${r.exampleCompany1Ticker}) stock has seen good years and tough years.
Speculative Investments (High Risk, Highest Potential Reward): New companies or volatile markets. You could double your money, or lose most of it.

The key concept is "diversification": don't put all your eggs in one basket! If you spread your money across different types of investments (some stocks, some bonds, some savings), a loss in one area won't wipe out everything.

Your age matters too! As a teenager, you have decades ahead of you. That means you can afford to take more risk because you have time to recover from losses. An adult nearing retirement would want to play it safer.

Key takeaway: There's no such thing as a guaranteed high return. Always understand the risk before you invest!`,
    },

    "building-a-portfolio": {
      description: `Learn how to combine different investments for a balanced approach in ${r.country}.`,
      content: `A portfolio is simply the collection of all your investments put together. Building a good portfolio means mixing different types of investments so that your money is balanced and protected.

A simple starter portfolio for a young investor might look like:
• 50% Stocks: for growth (e.g., ${r.mainBank}, ${r.exampleCompany1})
• 30% Bonds: for stability (e.g., ${r.bondName})
• 20% Savings: for emergencies and short-term needs

This is called "asset allocation." The idea is:
• Stocks grow your money over time
• Bonds provide steady income and protect against stock market drops
• Savings give you quick access to cash when you need it

Rebalancing: Over time, if your stocks do really well, they might become 70% of your portfolio. That means more risk than you planned! Rebalancing means selling some stocks and buying more bonds to get back to your target mix.

Dollar-Cost Averaging: Instead of investing all your money at once, invest a small amount regularly (like ${r.symbol}50 every month). This way, you buy more shares when prices are low and fewer when prices are high, which averages out your cost over time.

Real-world tip: In ${r.country}, you can invest through the ${r.exchange} (${r.exchangeAbbr}). Companies like ${r.exampleCompany1} and ${r.exampleCompany2} are traded there.

Key takeaway: A good portfolio is diversified. Start small, stay consistent, and let time work in your favor!`,
    },
  };

  return modules[slug] || null;
}

// ─── Structured content, all regions ───────────────────────────────────────────
// Mirrors the ContentSection/ContentDiagram format used for the BSD static
// seed (server/storage.ts). Generated per-region from real regional_content
// data instead of hand-authored per currency, so all 6 regions stay in sync
// if the underlying facts ever change.

function whatIsMoneySections(r: RegionInfo): ContentSection[] {
  const ownSide = r.pegged
    ? { title: "Pegged (locked)", points: [r.currency, "Exchange rate stays steady", "Value doesn't drift day to day"] }
    : { title: "Floating (free)", points: [r.currency, "Value moves with supply and demand", "Can rise or fall day to day"] };
  const otherSide = r.pegged
    ? { title: "Floating (free)", points: ["Jamaican Dollar (JMD)", "Value moves with supply and demand", "Can rise or fall day to day"] }
    : { title: "Pegged (locked)", points: ["Bahamian Dollar (BSD)", "Exchange rate stays steady", "Always equal to 1 US Dollar"] };
  return [
    { heading: "What is money?", body: `Money is anything that people agree to use to buy and sell things. In ${r.country}, we use the ${r.currency} (${r.currencyCode}).` },
    {
      type: "diagram", heading: "Pegged vs. floating currencies",
      body: "Each country's government controls how much of its own money exists. That control works two different ways.",
      diagram: { kind: "compare", left: ownSide, right: otherSide, note: `Key takeaway: money is a tool. ${r.pegNote}` },
    },
  ];
}

function savingVsSpendingSections(r: RegionInfo): ContentSection[] {
  return [
    { heading: "Spending vs. saving", body: `Every time you get money, whether it's an allowance, a gift, or pay from a part-time job, you have a choice: spend it now or save it for later. Spending gives you something right away. Saving means you wait, but your money can grow. Put money in a savings account at a bank like ${r.mainBank}, and they'll pay you interest, a small reward for letting them use your money.` },
    {
      type: "diagram", heading: "The 50/30/20 rule", body: "A simple guide for splitting any money you receive.",
      diagram: {
        kind: "bars",
        items: [
          { label: "Needs (school supplies, lunch)", value: 50, display: "50%" },
          { label: "Wants (entertainment, treats)", value: 30, display: "30%" },
          { label: "Savings (future you)", value: 20, display: "20%" },
        ],
        note: `Budgeting is just making a plan for your money before you spend it. Whether you have ${r.symbol}10 or ${r.symbol}1,000, making a plan is always smart.`,
      },
    },
  ];
}

function whatIsAStockSections(r: RegionInfo): ContentSection[] {
  return [
    { heading: "What is a stock?", body: `A stock, also called a share, is a tiny piece of ownership in a company. When a company wants to raise money to grow, it can sell shares to the public. Buy one share of ${r.mainBank} on the ${r.exchange} (${r.exchangeAbbr}), and you literally own a small piece of that bank.` },
    {
      type: "diagram", heading: "Why buy a stock?", body: "",
      diagram: {
        kind: "steps",
        items: [
          { label: "Growth", detail: "If the company does well, its stock price goes up. You could sell your share for more than you paid." },
          { label: "Dividends", detail: "Some companies share their profits with stockholders, regular cash payments just for owning the stock." },
        ],
        note: "The flip side: if the company does poorly, the stock price can go down and you could lose money. That's why stocks are considered riskier than savings accounts.",
      },
    },
    {
      heading: "Real example",
      body: `${r.exampleCompany1} (${r.exampleCompany1Ticker}) in ${r.country} ${r.exampleCompany1Desc}. If the company does well, its stock might go up, but disruptions can drop it temporarily. Key takeaway: stocks let you share in a company's success, and its risk. They're best for money you won't need for a long time.`,
      examples: [`${r.mainBank}, owns a piece of the bank`, `${r.exampleCompany1Ticker}, ${r.exampleCompany1}`],
    },
  ];
}

function whatIsABondSections(r: RegionInfo): ContentSection[] {
  const yearlyInterest = (1000 * parseFloat(r.bondRate) / 100).toFixed(0);
  return [
    { heading: "What is a bond?", body: `A bond is like an IOU. When you buy a bond, you're lending money to a government or company. They promise to pay you back the full amount, called the face value, on a set date, plus regular interest payments along the way. The ${r.centralBank} issues bonds called ${r.bondName}. A 5-year one might pay ${r.bondRate} interest per year: invest ${r.symbol}1,000, earn about ${r.symbol}${yearlyInterest} every year for 5 years, then get your ${r.symbol}1,000 back.` },
    {
      type: "diagram", heading: "Bonds vs. stocks", body: "The trade-off between the two comes down to certainty versus growth.",
      diagram: {
        kind: "compare",
        left: { title: "Bonds", points: ["You know the interest in advance", "Government is very unlikely to default", "Your original investment comes back"] },
        right: { title: "Stocks", points: ["No guaranteed return", "Can gain 8 to 10% in a great year", "Can also lose value"] },
        note: `Bonds usually earn less than stocks over time, a steady ${r.bondRate} instead of a swinging 8 to 10%. That's the price of the extra safety.`,
      },
    },
    {
      heading: "Other Caribbean bonds",
      body: "Key takeaway: bonds are a safer way to earn steady returns. They're great for money you want to protect while still earning more than a savings account.",
      examples: ["Bank of Jamaica Investment Notes", "Trinidad & Tobago Government Bonds", "EC Home Mortgage Bank bonds"],
    },
  ];
}

function riskAndRewardSections(r: RegionInfo): ContentSection[] {
  return [
    { heading: "Risk and reward go together", body: "In investing, the more risk you take, the more you might earn, but you also might lose more. Here's roughly where common options sit on that scale." },
    {
      type: "diagram", heading: "The risk ladder", body: "",
      diagram: {
        kind: "bars",
        items: [
          { label: `Savings account, low risk, at ${r.mainBank}`, value: 2, display: "1 to 2%" },
          { label: `Government bonds, e.g. ${r.bondName}`, value: 5, display: r.bondRate },
          { label: `Stocks, e.g. ${r.exampleCompany1} (${r.exampleCompany1Ticker})`, value: 10, display: "5 to 10%+" },
          { label: "Speculative investments, high risk", value: 20, display: "highly variable" },
        ],
        note: "Higher bars mean higher potential reward, and higher potential loss. Speculative investments could double your money, or lose most of it.",
      },
    },
    { heading: "Spread it out", body: "The key concept is diversification: don't put all your eggs in one basket. Spread your money across different types of investments, some stocks, some bonds, some savings, so a loss in one area won't wipe out everything. Your age matters too. As a teenager, you have decades ahead of you, which means you can afford more risk because you have time to recover from losses. Key takeaway: there's no such thing as a guaranteed high return. Always understand the risk before you invest." },
  ];
}

function buildingAPortfolioSections(r: RegionInfo): ContentSection[] {
  return [
    { heading: "What is a portfolio?", body: "A portfolio is simply the collection of all your investments put together. Building a good portfolio means mixing different types of investments so your money is balanced and protected." },
    {
      type: "diagram", heading: "A starter portfolio", body: "A simple mix for a young investor, called asset allocation.",
      diagram: {
        kind: "bars",
        items: [
          { label: `Stocks, e.g. ${r.mainBank}, ${r.exampleCompany1}, for growth`, value: 50, display: "50%" },
          { label: `Bonds, e.g. ${r.bondName}, for stability`, value: 30, display: "30%" },
          { label: "Savings, for emergencies and short-term needs", value: 20, display: "20%" },
        ],
        note: "Stocks grow your money over time, bonds provide steady income and protect against stock market drops, savings give you quick access to cash when you need it.",
      },
    },
    {
      type: "diagram", heading: "Two habits that keep a portfolio healthy", body: "",
      diagram: {
        kind: "steps",
        items: [
          { label: "Rebalancing", detail: "If your stocks do really well, they might grow to 70% of your portfolio, more risk than you planned. Sell some stocks and buy more bonds to get back to your target mix." },
          { label: "Dollar-cost averaging", detail: `Instead of investing all at once, invest a small amount regularly, like ${r.symbol}50 a month. You buy more shares when prices are low and fewer when high, averaging out your cost over time.` },
        ],
      },
    },
    {
      heading: "Where to actually invest",
      body: "Key takeaway: a good portfolio is diversified. Start small, stay consistent, and let time work in your favor.",
      examples: [`${r.exchangeAbbr}, ${r.exchange}`, `${r.exampleCompany1Ticker}, ${r.exampleCompany1}`, `${r.exampleCompany2Ticker}, ${r.exampleCompany2}`],
    },
  ];
}

export function getLocalizedContentSections(slug: string, region: RegionInfo): ContentSection[] | null {
  switch (slug) {
    case "what-is-money": return whatIsMoneySections(region);
    case "saving-vs-spending": return savingVsSpendingSections(region);
    case "what-is-a-stock": return whatIsAStockSections(region);
    case "what-is-a-bond": return whatIsABondSections(region);
    case "risk-and-reward": return riskAndRewardSections(region);
    case "building-a-portfolio": return buildingAPortfolioSections(region);
    default: return null;
  }
}
