import axios from "axios";

interface VeryfiTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
}

interface VeryfiBankStatementResponse {
  transactions?: Array<{
    date?: string;
    description?: string;
    amount?: number;
    type?: string;
    order?: number;
    balance?: number;
    category?: string;
  }>;
  bank_statement?: {
    transactions?: Array<{
      date?: string;
      description?: string;
      amount?: number;
      type?: string;
      order?: number;
      balance?: number;
      category?: string;
    }>;
  };
}

export function isVeryfiConfigured(): boolean {
  return !!(
    process.env.VERYFI_CLIENT_ID &&
    process.env.VERYFI_USERNAME &&
    process.env.VERYFI_API_KEY
  );
}

export async function parseWithVeryfi(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ transactions: VeryfiTransaction[]; error?: string }> {
  const clientId = process.env.VERYFI_CLIENT_ID;
  const username = process.env.VERYFI_USERNAME;
  const apiKey = process.env.VERYFI_API_KEY;

  if (!clientId || !username || !apiKey) {
    return { transactions: [], error: "Veryfi API credentials not configured" };
  }

  try {
    const base64File = fileBuffer.toString("base64");

    const response = await axios.post<VeryfiBankStatementResponse>(
      "https://api.veryfi.com/api/v8/partner/bank-statements",
      {
        file_data: base64File,
        file_name: fileName,
        max_pages_to_process: 50,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "CLIENT-ID": clientId,
          AUTHORIZATION: `apikey ${username}:${apiKey}`,
        },
        timeout: 60000,
      }
    );

    const data = response.data;
    const rawTransactions =
      data?.transactions ||
      data?.bank_statement?.transactions ||
      [];

    if (!rawTransactions || rawTransactions.length === 0) {
      return { transactions: [], error: "No transactions found by Veryfi" };
    }

    const parsed: VeryfiTransaction[] = rawTransactions
      .filter((tx) => tx.date && tx.amount !== undefined)
      .map((tx) => {
        const amount = typeof tx.amount === "number" ? tx.amount : parseFloat(String(tx.amount));
        const isIncome = amount > 0 || tx.type?.toLowerCase() === "credit" || tx.type?.toLowerCase() === "deposit";

        return {
          date: tx.date!,
          description: tx.description || "Imported transaction",
          amount: Math.abs(amount),
          type: isIncome ? ("income" as const) : ("expense" as const),
        };
      });

    return { transactions: parsed };
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Veryfi API request failed";
    console.error("Veryfi API error:", message);
    return { transactions: [], error: message };
  }
}
