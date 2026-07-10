import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { selectCampaign, setWizardStep, updateWizardData, resetWizard } from "@/store/slices/campaignSlice";
import {
  useStartCampaignMutation,
  usePauseCampaignMutation,
  useCancelCampaignMutation,
} from "@/api/campaignApi";
import toast from "react-hot-toast";

export function useCampaign() {
  const dispatch = useDispatch();
  const { selectedCampaignId, wizardStep, wizardData } = useSelector(
    (state: RootState) => state.campaign
  );
  const [startCampaign] = useStartCampaignMutation();
  const [pauseCampaign] = usePauseCampaignMutation();
  const [cancelCampaign] = useCancelCampaignMutation();

  const handleStart = async (id: number) => {
    try {
      await startCampaign(id).unwrap();
      toast.success("Campaign queued! Emails will start sending shortly.");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error?.data?.message ?? "Failed to start campaign.");
    }
  };

  const handlePause = async (id: number) => {
    try {
      await pauseCampaign(id).unwrap();
      toast.success("Campaign paused.");
    } catch {
      toast.error("Failed to pause campaign.");
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelCampaign(id).unwrap();
      toast.success("Campaign cancelled.");
    } catch {
      toast.error("Failed to cancel campaign.");
    }
  };

  return {
    selectedCampaignId,
    wizardStep,
    wizardData,
    selectCampaign: (id: number | null) => dispatch(selectCampaign(id)),
    setWizardStep: (step: number) => dispatch(setWizardStep(step)),
    updateWizardData: (data: object) => dispatch(updateWizardData(data)),
    resetWizard: () => dispatch(resetWizard()),
    handleStart,
    handlePause,
    handleCancel,
  };
}
