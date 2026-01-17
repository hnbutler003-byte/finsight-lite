import { z } from 'zod';
import { insertTransactionSchema, insertCategorySchema, insertBudgetSchema, insertLinkedCardSchema, transactions, categories, budgets, linkedCards } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        categoryId: z.string().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect & { category?: typeof categories.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions',
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transactions/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories',
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories',
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  budgets: {
    list: {
      method: 'GET' as const,
      path: '/api/budgets',
      responses: {
        200: z.array(z.custom<typeof budgets.$inferSelect & { category?: typeof categories.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/budgets',
      input: insertBudgetSchema,
      responses: {
        201: z.custom<typeof budgets.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/budgets/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  cards: {
    list: {
      method: 'GET' as const,
      path: '/api/cards',
      responses: {
        200: z.array(z.custom<typeof linkedCards.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    link: {
      method: 'POST' as const,
      path: '/api/cards/link',
      input: z.object({
        cardNumber: z.string().min(16).max(16),
        bankName: z.string(),
      }),
      responses: {
        201: z.custom<typeof linkedCards.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.object({
          totalIncome: z.number(),
          totalExpenses: z.number(),
          balance: z.number(),
          recentTransactions: z.array(z.custom<typeof transactions.$inferSelect & { category?: typeof categories.$inferSelect }>()),
          expensesByCategory: z.array(z.object({
            category: z.string(),
            amount: z.number(),
            color: z.string().optional(),
          })),
          isCardLinked: z.boolean(),
        }),
        401: errorSchemas.unauthorized,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type TransactionResponse = z.infer<typeof api.transactions.list.responses[200]>[number];
export type CategoryResponse = z.infer<typeof api.categories.list.responses[200]>[number];
export type BudgetResponse = z.infer<typeof api.budgets.list.responses[200]>[number];
export type CardResponse = z.infer<typeof api.cards.list.responses[200]>[number];
