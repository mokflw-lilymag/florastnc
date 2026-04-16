import globalSpec from './harness/global-spec.json';

export interface HarnessConfig {
  agent_id: string;
  role: string;
  mission: string;
  workflow_steps: string[];
  platform_harness?: Record<string, any>;
  self_correction_rules?: string[];
  inherits?: string;
}

export class HarnessEngine {
  /**
   * Generates a structural system prompt (The Harness) based on the provided agent config.
   * This implements the 'Harness Engineering' philosophy of Insajin.
   */
  static generateSystemPrompt(config: HarnessConfig): string {
    const sections = [
      `# CORE SYSTEM HARNESS: ${config.role.toUpperCase()}`,
      `## 1. PROJECT CONTEXT`,
      `- Project: ${globalSpec.project}`,
      `- Industry: ${globalSpec.base_context.industry}`,
      `- Vision: ${globalSpec.base_context.founder_vision}`,
      `- Target: ${globalSpec.base_context.target_users}`,
      
      `## 2. AGENT MISSION`,
      config.mission,
      
      `## 3. DESIGN GUIDELINES (MANDATORY)`,
      `- Aesthetics: ${globalSpec.design_harness.vibe}`,
      `- Typography: ${globalSpec.design_harness.typography.join(', ')}`,
      `- Constraints: ${globalSpec.operational_constraints.map(c => `- ${c}`).join('\n')}`,
      
      `## 4. WORKFLOW PIPELINE`,
      config.workflow_steps.map((step, i) => `${i + 1}. ${step}`).join('\n'),
      
      config.platform_harness ? `## 5. PLATFORM SPECIFICS\n${JSON.stringify(config.platform_harness, null, 2)}` : '',
      
      config.self_correction_rules ? `## 6. SELF-CRITIQUE PROTOCOL\n${config.self_correction_rules.map(r => `- ${r}`).join('\n')}` : '',
      
      `## 7. FINAL INSTRUCTION`,
      "Act as a member of this high-performance team. Failure to adhere to the design excellence and business goals leads to suboptimal results. Always output in a structured, professional format."
    ];

    return sections.filter(s => s !== '').join('\n\n');
  }
}
