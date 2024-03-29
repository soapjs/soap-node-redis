import {
  Condition,
  NestedCondition,
  Where,
  WhereCondition,
} from "@soapjs/soap";

/**
 * Class for parsing Where clauses and converting them into RedisSearch command parameters.
 */
export class RedisWhereParser {
  static parse(data: Where | WhereCondition | null): string {
    if (!data) {
      return "*";
    }

    if (data instanceof Where) {
      return RedisWhereParser.parse(data.result);
    }

    if ("left" in data) {
      return RedisWhereParser.parseSimpleCondition(data);
    } else if ("conditions" in data) {
      return RedisWhereParser.parseNestedCondition(data);
    }

    throw new Error("Invalid condition format");
  }

  private static parseSimpleCondition(condition: Condition): string {
    const { left, operator, right } = condition;
    switch (operator) {
      case "eq":
        return `@${left}:{${right}}`;
      case "ne":
        return `-@${left}:{${right}}`;
      case "gt":
        return `@${left}:[(${right} +inf]`;
      case "lt":
        return `@${left}:[-inf (${right})]`;
      case "gte":
        return `@${left}:[${right} +inf]`;
      case "lte":
        return `@${left}:[-inf ${right}]`;
      case "in":
        return right.map((value: string) => `@${left}:{${value}}`).join(" | ");
      case "nin":
        return right.map((value: string) => `-@${left}:{${value}}`).join(" ");
      case "like":
        return `@${left}:/.*${right}.*/`;
      default:
        throw new Error(`Unsupported operator ${operator}`);
    }
  }

  private static parseNestedCondition(
    nestedCondition: NestedCondition
  ): string {
    const { conditions, operator } = nestedCondition;
    const parsedConditions = conditions
      .map((cond) => RedisWhereParser.parse(cond))
      .join(` ${operator.toUpperCase()} `);

    return `(${parsedConditions})`;
  }
}
