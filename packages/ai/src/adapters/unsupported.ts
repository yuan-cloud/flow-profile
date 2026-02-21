import type { AIAdapter } from '../adapter';
import type { AboutMyFlows, AIOptions, AIResult } from '../types';

export class UnsupportedAdapter implements AIAdapter {
  name: string;
  private message: string;

  constructor(name: string, message: string) {
    this.name = name;
    this.message = message;
  }

  async generateSuggestions(_bundle: AboutMyFlows, _options: AIOptions): Promise<AIResult> {
    throw new Error(`${this.name} adapter unavailable: ${this.message}`);
  }

  static placeholder(name: string, message: string) {
    return new UnsupportedAdapter(name, message);
  }
}
