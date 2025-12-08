import type { WizardStep } from '../store/useQuoteWizardStore';

// Step-specific titles
export const getStepTitle = (step: WizardStep): string => {
  const titles: Record<WizardStep, string> = {
    1: 'What do you need fixed?',
    2: "What's the damage like?",
    3: 'Almost there!',
    4: 'Tell us about your vehicle',
    5: 'Confirm your glass',
    6: 'Where do you need service?',
    7: 'Your Quote',
  };
  return titles[step];
};

// Step-specific subtitles
export const getStepSubtitle = (step: WizardStep): string => {
  const subtitles: Record<WizardStep, string> = {
    1: 'Select the glass that needs repair or replacement',
    2: 'Help us determine if repair is possible or replacement is needed',
    3: "Where should we send your quote?",
    4: 'We need your vehicle info to find the right glass',
    5: 'Make sure we have the right part for your vehicle',
    6: 'Choose mobile service or visit a shop near you',
    7: "Here's your personalized quote",
  };
  return subtitles[step];
};
