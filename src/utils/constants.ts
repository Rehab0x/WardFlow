/**
 * Application constants
 */

// Auto-lock timer (milliseconds)
export const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Performance thresholds (milliseconds)
export const PERF_THRESHOLD_FIRST_RENDER = 500;
export const PERF_THRESHOLD_PATIENT_LIST = 300;
export const PERF_THRESHOLD_PATIENT_DETAIL = 200;

// Antibiotic duration warning threshold (days)
export const ANTIBIOTIC_WARNING_DAYS = 14;

// Naver drug info URL template
export const NAVER_DRUG_SEARCH_URL = 'https://terms.naver.com/search.naver?query=';

// Alternative: MFDS (Ministry of Food and Drug Safety)
export const MFDS_DRUG_SEARCH_URL =
  'https://nedrug.mfds.go.kr/searchDrug?searchYn=true&typeName=&itemName=';
