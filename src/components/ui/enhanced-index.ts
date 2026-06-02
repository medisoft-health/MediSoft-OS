/**
 * Enhanced UI Components — MediSoft Creative UI/UX Package
 *
 * This file exports all the new creative UI components added
 * as part of the UI/UX enhancement initiative.
 */

// Adaptive Context (Clinical Context Awareness)
export { AdaptiveProvider, useAdaptiveContext } from "./adaptive-context";
export type { ClinicalContext } from "./adaptive-context";

// Context Switcher (UI for switching clinical contexts)
export { ContextSwitcher, ContextBadge } from "./context-switcher";

// Smart Clinical Cards (Interactive medical data cards)
export { SmartClinicalCard } from "./smart-clinical-card";

// Dark Mode Toggle (Smart auto-switching)
export { DarkModeToggle } from "./dark-mode-toggle";

// Patient Infographics (Lab results visualization)
export { LabResultVisual, HealthSummaryCard } from "./patient-infographic";

// Micro-Interactions (Animations and feedback)
export {
  FadeIn,
  StaggeredList,
  PulseOnChange,
  ProcessingIndicator,
  SuccessCheckmark,
  SkeletonCard,
} from "./micro-interactions";
