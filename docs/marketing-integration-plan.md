# Marketing SaaS Integration Plan (LilyMag x Autopus ADK)

## 1. Overview
This document outlines the strategic integration of the high-performance AI marketing engine from `marketing-saas` into the `floxync-saas` (LilyMag) ecosystem. The goal is to provide florists with an automated, high-conversion SNS marketing solution powered by "Harness Engineering" and "Multi-Agent Orchestration".

## 2. Core Architectural Principles
- **Standardized Harnessing**: All AI logic will follow the Harness Engineering protocol (Specification -> Constraint -> Generation -> Audit).
- **Brain DNA Injection**: Infusing the shop owner's unique persona into every AI-generated content.
- **Global Context Awareness**: Tailoring marketing strategies for specific regions (KR, VN, JP, US, CN).
- **Autonomous Operations**: 24/7 background marketing orchestration using n8n and Supabase.

## 3. Screen & Role Separation

### A. Non-Admin (Tenant/Florist) View
**Route**: `/dashboard/marketing`
- **Marketing Auto-Pilot Control**: Toggle for autonomous campaign generation.
- **Persona Configurator**: Selection of 브랜드 아이덴티티 (Elegant, Warm, Trendy, Expert).
- **Campaign Studio**: Manual generation of Shorts scenarios (TikTok), Blog posts, and Threads/Instagram captions.
- **Agent Thought Log**: Transparent view of AI agent's decision-making process (Why this topic? Why this tone?).
- **Limbic Map Selector**: Choose between Dominance, Stimulus, or Balance triggers.

### B. Admin (Super Admin) View
**Route**: `/dashboard/admin/marketing`
- **Global Campaign Fleet Management**: Dashboard monitoring all active marketing tasks across all tenants.
- **Harness Master Controls**: Ability to update system prompts and constraints globally for all AI agents.
- **Regional Strategy Hub**: Edit and update the cultural/psychological marketing strategies for different countries.
- **AI Audit System**: Review and approve/reject AI generated content for quality control before it hits production.

## 4. Technical Integration Roadmap

### Phase 1: Infrastructure & Specs (Current)
- [x] Create `harness-engine.ts` for unified prompt generation.
- [x] Define `global-spec.json` and agent-specific harnesses.
- [ ] Extend Supabase schema with `agent_logs`, `marketing_campaigns`, and `platform_configs`.

### Phase 2: Core Engine Porting
- [ ] Migrate `ai-engine.ts` (Neural Context & Limbic Map logic).
- [ ] Migrate `autonomous-brain.ts` (Multi-agent orchestration: Researcher, Creative, CEO).
- [ ] Set up n8n workflows using the `n8n_master_workflow.json` as a base.

### Phase 3: UI Implementation
- [ ] Develop the Marketing Studio for Users with premium glassmorphism.
- [ ] Develop the Global Control Center for Admins.
- [ ] Link components to the Supabase backend for real-time log tracking.

### Phase 4: Quality & Scaling
- [ ] Conduct A/B/C testing using the Limbic Map triggers.
- [ ] Optimize response times using model tiering (Opus for planning, Sonnet for execution).

---
**Version**: 1.0.0
**Author**: Antigravity (Advanced AI Agent)
**Reference**: Insajin / Autopus-ADK Framework
