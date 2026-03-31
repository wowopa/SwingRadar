export function normalizeActionLanguage(text?: string | null) {
  if (!text) {
    return "";
  }

  return [
    ["공용 추적 참고", "공용 관찰 참고"],
    ["공용 추적 진단", "관찰 진단"],
    ["공용 추적", "공용 관찰"],
    ["장초 체크", "장초 확인"],
    ["자동 감시 가능", "관찰 가능"],
    ["자동 감시", "관찰"],
    ["진입 추적 가능", "매수 검토 가능"],
    ["진입 추적", "매수 검토"],
    ["활성화 점수", "관찰 점수"],
    ["후보 점수", "우선순위 점수"]
  ].reduce((current, [from, to]) => current.replaceAll(from, to), text);
}

export function getFeaturedRankLabel(rank: number) {
  return `우선순위 #${rank}`;
}

export function getValidationBasisDisplayLabel(basis?: string | null) {
  return normalizeActionLanguage(basis);
}
