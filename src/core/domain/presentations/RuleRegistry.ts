import { MatchingRule } from './types';

/** Registry of pluggable soft rules. Adding a rule requires no engine change. */
export class RuleRegistry {
  private readonly rules: MatchingRule[] = [];

  register(rule: MatchingRule): void {
    this.rules.push(rule);
  }

  all(): MatchingRule[] {
    return [...this.rules];
  }
}