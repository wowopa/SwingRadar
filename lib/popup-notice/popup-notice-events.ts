export type PopupNoticeClientState = "loading" | "open" | "closed";

export const POPUP_NOTICE_STATE_EVENT = "swing-radar:popup-notice-state";

const POPUP_NOTICE_STATE_DATASET_KEY = "swingRadarPopupNoticeState";

function normalizePopupNoticeState(value: unknown): PopupNoticeClientState {
  return value === "open" || value === "closed" ? value : "loading";
}

export function readPopupNoticeState(): PopupNoticeClientState {
  if (typeof document === "undefined") {
    return "loading";
  }

  return normalizePopupNoticeState(document.documentElement.dataset[POPUP_NOTICE_STATE_DATASET_KEY]);
}

export function publishPopupNoticeState(state: PopupNoticeClientState) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset[POPUP_NOTICE_STATE_DATASET_KEY] = state;
  window.dispatchEvent(
    new CustomEvent(POPUP_NOTICE_STATE_EVENT, {
      detail: { state }
    })
  );
}
