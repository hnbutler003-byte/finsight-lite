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

export function getLocalizedModuleContent(slug: string, region: RegionInfo): { content: string; description: string } | null {
  const r = region;

  const modules: Record<string, { content: string; description: string }> = {
    "what-is-money": {
      description: `Learn why different countries have different currencies and how money works in ${r.country}.`,
      content: `Money is anything that people agree to use to buy and sell things. In ${r.country}, we use the ${r.currency} (${r.currencyCode}). ${r.pegNote}

Why do different countries have different currencies? Each country's government prints its own money and controls how much exists. This helps them manage their economy. Some currencies are "pegged" (locked) to the US Dollar — like the Bahamian Dollar — which means the exchange rate stays the same. Others, like the Jamaican Dollar, "float" freely and change value based on supply and demand.

In the Caribbean, you'll find lots of different currencies: The Bahamas uses BSD, Jamaica uses JMD, Trinidad uses TTD, Barbados uses BBD, and many Eastern Caribbean islands share the East Caribbean Dollar (XCD). Understanding your own currency — the ${r.currencyCode} — is the first step to using money wisely!

Key takeaway: Money is a tool. Understanding how the ${r.currency} works is the first step to using it wisely!`,
    },

    "saving-vs-spending": {
      description: `Discover the power of saving and how to make smart spending choices in ${r.country}.`,
      content: `Every time you get money — whether it's an allowance, a gift, or pay from a part-time job — you have a choice: spend it now or save it for later.

Spending gives you something right away (a snack, a game, new clothes). Saving means you wait, but your money can grow. If you put money in a savings account at a bank like ${r.mainBank} in ${r.country}, they'll pay you interest — a small reward for letting them use your money.

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
2. Dividends: Some companies share their profits with stockholders by paying dividends — regular cash payments just for owning the stock.

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
• Bank of Jamaica Investment Notes — Jamaica's central bank bonds
• Trinidad & Tobago Government Bonds — longer-term bonds from T&T
• EC Home Mortgage Bank bonds — help fund housing in the Eastern Caribbean

Key takeaway: Bonds are a safer way to earn steady returns. They're great for money you want to protect while still earning more than a savings account.`,
    },

    "risk-and-reward": {
      description: `Learn why higher returns come with higher risk when investing in ${r.country}.`,
      content: `In investing, risk and reward go hand in hand. The more risk you take, the more you might earn — but you also might lose more.

Think of it like this:
Savings Account (Low Risk, Low Reward): Your money is safe at ${r.mainBank}, but earns maybe 1-2% per year.
Government Bonds (Low-Medium Risk, Medium Reward): Very safe, earns 3-5% per year. Example: ${r.bondName} pays about ${r.bondRate}.
Stocks (Medium-High Risk, Higher Reward): Can earn 5-10%+ per year on average, but prices go up AND down. Example: ${r.exampleCompany1} (${r.exampleCompany1Ticker}) stock has seen good years and tough years.
Speculative Investments (High Risk, Highest Potential Reward): New companies or volatile markets. You could double your money — or lose most of it.

The key concept is "diversification" — don't put all your eggs in one basket! If you spread your money across different types of investments (some stocks, some bonds, some savings), a loss in one area won't wipe out everything.

Your age matters too! As a teenager, you have decades ahead of you. That means you can afford to take more risk because you have time to recover from losses. An adult nearing retirement would want to play it safer.

Key takeaway: There's no such thing as a guaranteed high return. Always understand the risk before you invest!`,
    },

    "building-a-portfolio": {
      description: `Learn how to combine different investments for a balanced approach in ${r.country}.`,
      content: `A portfolio is simply the collection of all your investments put together. Building a good portfolio means mixing different types of investments so that your money is balanced and protected.

A simple starter portfolio for a young investor might look like:
• 50% Stocks — for growth (e.g., ${r.mainBank}, ${r.exampleCompany1})
• 30% Bonds — for stability (e.g., ${r.bondName})
• 20% Savings — for emergencies and short-term needs

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
