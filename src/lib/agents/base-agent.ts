import { db, schema } from "../db";
import { eq, desc } from "drizzle-orm";

export interface AgentResult {
  status: "success" | "retry" | "failed";
  output?: unknown;
  errors?: string[];
  creditsUsed: number;
}

export abstract class BaseAgent {
  abstract agentName: string;
  abstract creditCost: number;

  async run(domainId: string, taskInput: unknown): Promise<AgentResult> {
    // 1. CHECK CREDITS
    const canProceed = await this.checkCredits(domainId);
    if (!canProceed) {
      return { status: "failed", errors: ["Insufficient credits"], creditsUsed: 0 };
    }

    // 2. LOAD CONTEXT FROM KNOWLEDGE GRAPH
    const context = await this.loadContext(domainId);

    // 3. EXECUTE (subclass implements)
    let result: AgentResult;
    try {
      result = await this.execute(domainId, taskInput, context);
    } catch (err) {
      result = {
        status: "failed",
        errors: [err instanceof Error ? err.message : "Unknown error"],
        creditsUsed: 0,
      };
    }

    // 4. VALIDATE OUTPUT
    if (result.status === "success" && !this.validate(result)) {
      return { status: "retry", errors: ["Validation failed"], creditsUsed: result.creditsUsed };
    }

    // 5. LOG ACTION (append-only)
    await this.logAction(domainId, taskInput, result);

    // 6. DEDUCT CREDITS
    if (result.creditsUsed > 0) {
      await this.deductCredits(domainId, result.creditsUsed);
    }

    return result;
  }

  protected abstract execute(
    domainId: string,
    taskInput: unknown,
    context: AgentContext
  ): Promise<AgentResult>;

  protected validate(_result: AgentResult): boolean {
    return true; // Override in subclass for quality gates
  }

  protected async loadContext(domainId: string): Promise<AgentContext> {
    const priorActions = db
      .select()
      .from(schema.agentActions)
      .where(eq(schema.agentActions.domainId, domainId))
      .orderBy(desc(schema.agentActions.timestamp))
      .limit(50)
      .all();

    const learnings = db
      .select()
      .from(schema.domainLearnings)
      .where(eq(schema.domainLearnings.domainId, domainId))
      .all();

    const domain = await db.query.domains.findFirst({
      where: eq(schema.domains.id, domainId),
    });

    return { priorActions, learnings, domain: domain ?? null };
  }

  private async checkCredits(_domainId: string): Promise<boolean> {
    // For MVP: always allow (no billing enforced yet)
    // TODO: check credit_ledger balance >= this.creditCost
    return true;
  }

  private async deductCredits(domainId: string, credits: number) {
    // Get domain's user
    const domain = await db.query.domains.findFirst({
      where: eq(schema.domains.id, domainId),
    });
    if (!domain) return;

    db.insert(schema.creditLedger)
      .values({
        userId: domain.userId,
        action: this.agentName,
        creditsUsed: credits,
        balanceAfter: 0, // TODO: calculate real balance
        agent: this.agentName,
      })
      .run();
  }

  private async logAction(domainId: string, input: unknown, result: AgentResult) {
    db.insert(schema.agentActions)
      .values({
        domainId,
        agentName: this.agentName,
        actionType: "run",
        inputSummary: typeof input === "string" ? input : JSON.stringify(input),
        outputSummary:
          result.status === "success"
            ? JSON.stringify(result.output).slice(0, 1000)
            : result.errors?.join("; ") || "Failed",
        qualityGatePassed: result.status === "success",
        creditsUsed: result.creditsUsed,
      })
      .run();
  }
}

export interface AgentContext {
  priorActions: typeof schema.agentActions.$inferSelect[];
  learnings: typeof schema.domainLearnings.$inferSelect[];
  domain: typeof schema.domains.$inferSelect | null;
}
