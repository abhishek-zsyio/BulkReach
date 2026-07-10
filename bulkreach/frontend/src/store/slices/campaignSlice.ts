import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Campaign } from "@/types/campaign";

interface CampaignState {
  selectedCampaignId: number | null;
  wizardStep: number;
  wizardData: Partial<Campaign>;
}

const initialState: CampaignState = {
  selectedCampaignId: null,
  wizardStep: 1,
  wizardData: {},
};

const campaignSlice = createSlice({
  name: "campaign",
  initialState,
  reducers: {
    selectCampaign(state, action: PayloadAction<number | null>) {
      state.selectedCampaignId = action.payload;
    },
    setWizardStep(state, action: PayloadAction<number>) {
      state.wizardStep = action.payload;
    },
    updateWizardData(state, action: PayloadAction<Partial<Campaign>>) {
      state.wizardData = { ...state.wizardData, ...action.payload };
    },
    resetWizard(state) {
      state.wizardStep = 1;
      state.wizardData = {};
    },
  },
});

export const { selectCampaign, setWizardStep, updateWizardData, resetWizard } =
  campaignSlice.actions;
export default campaignSlice.reducer;
