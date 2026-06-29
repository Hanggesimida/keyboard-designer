import { Injectable } from '@nestjs/common';
// import { PrismaClient, Prisma } from "@prisma/client";

// ─── Context & Rule 接口 ─────────────────────────────────────────────────────

/**
 * 定价上下文，描述"要为什么东西定价"。
 * 未来扩展商城商品时，在 union type 中增加新的 type 分支即可。
 */
export type PricingContext =
  | { type: 'CUSTOM_KEYCAP'; designId: string };

/**
 * 定价规则策略接口。
 * 每种商品类型对应一个 Rule 实现，PricingService 按顺序匹配第一个 applies() 为 true 的规则。
 */
export interface PricingRule {
  applies(context: PricingContext): boolean;
  calculate(context: PricingContext): PriceQuote;
}

// ─── Quote 返回结构 ──────────────────────────────────────────────────────────

export interface PriceBreakdownItem {
  label: string;
  amount: number;
}

export interface PriceQuote {
  /** 合计金额（分解项之和，精确到两位小数） */
  totalAmount: number;
  /** 价格分解明细，供前端展示 */
  breakdown: PriceBreakdownItem[];
}

// ─── 内置规则：定制键帽 ──────────────────────────────────────────────────────

/**
 * 定制键帽固定定价规则。
 * 当前阶段价格由此处统一管理，未来可替换为查询数据库的动态规则。
 */
class CustomKeycapRule implements PricingRule {
  private static readonly BASE_PRICE = 99.00;

  applies(context: PricingContext): boolean {
    return context.type === 'CUSTOM_KEYCAP';
  }

  calculate(_context: PricingContext): PriceQuote {
    const price = CustomKeycapRule.BASE_PRICE;
    return {
      totalAmount: price,
      breakdown: [
        { label: '定制键帽（1 套）', amount: price },
      ],
    };
  }
}

// ─── PricingService ──────────────────────────────────────────────────────────

@Injectable()
export class PricingService {
  /**
   * 定价规则列表，按优先级顺序排列。
   * 扩展时在此注入新规则（通过构造函数注入或直接 push），无需修改 quote() 逻辑。
   */
  private readonly rules: PricingRule[] = [
    new CustomKeycapRule(),
  ];

  /**
   * 根据上下文计算价格，返回含明细的报价单。
   * OrderService 和前端 quote 接口共用此方法，保证两端价格完全一致。
   */
  quote(context: PricingContext): PriceQuote {
    const rule = this.rules.find((r) => r.applies(context));

    if (!rule) {
      throw new Error(`No pricing rule found for context type: ${context.type}`);
    }

    return rule.calculate(context);
  }
}
