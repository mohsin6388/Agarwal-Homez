import { create } from "zustand";

const initialState = () => ({
  campaignName: `WhatsApp campaign ${new Date().toLocaleDateString("en-IN")}`,
  audienceId: "",
  recipientSource: "audience",
  selectedLeadIds: [],
  skipAlreadySent: true,
  selectedTemplate: null,
  variables: {},
  headerImageUrl: "",
  headerDocumentUrl: "",
  preview: null,
  testPhone: "",
  scheduleMode: "now",
  scheduleDate: "",
  scheduleTime: "10:00",
  optInConfirmed: false,
  launching: false,
});

export const useCampaignWizardStore = create((set) => ({
  ...initialState(),
  setField: (key, value) => set({ [key]: value }),
  setVariable: (index, value) =>
    set((state) => ({
      variables: {
        ...state.variables,
        [index]: {
          source: "name",
          value: "",
          fallback: "Sir/Ma'am",
          ...(state.variables[index] || {}),
          ...value,
        },
      },
    })),
  setTemplate: (template, variables) =>
    set((state) => ({
      selectedTemplate: template,
      variables: variables || state.variables,
      headerImageUrl: template?.imageUrl || state.headerImageUrl || "",
      headerDocumentUrl:
        template?.headerDocumentUrl || state.headerDocumentUrl || "",
      preview: null,
    })),
  setPreview: (preview) => set({ preview }),
  reset: () => set(initialState()),
}));
