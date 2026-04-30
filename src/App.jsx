
import { useEffect, useRef, useState } from "react";
import "./App.css";
import craftechLogo from "./assets/logoblacktext.png";
import { isSupabaseConfigured, supabase, SUPABASE_BUCKET, SUPABASE_URL } from "./supabaseClient";

const STAR = "\u2605";
const PROJECT_ID_PREFIX = "CFT202627";

const RATING_QUESTIONS = [
  "How would you rate the overall project delivery as per client expectation?",
  "Was the setup completed on time and fully ready before event start?",
  "How stable and reliable was the hardware & software during the event?",
  "How well was the event handled on-ground (setup, coordination, troubleshooting)?",
  "How satisfied was the client with the overall execution?",
];

const RATING_QUESTION_DESCRIPTIONS = [
  "Evaluate if the final outcome matched what was promised to the client.",
  "Check if setup was completed before event start without delays.",
  "Assess system stability, failures, or performance issues.",
  "Evaluate execution quality, coordination, and problem handling.",
  "Based on client reactions, feedback, and overall satisfaction.",
];

const FEEDBACK_QUESTIONS = [
  "What went well?",
  "What went wrong?",
  "What should we improve next time?",
  "Was there any major issue?",
];

const FEEDBACK_QUESTION_DESCRIPTIONS = [
  "Mention key positives such as smooth setup, no issues, client appreciation. Keep it short (1-2 lines).",
  "Mention issues faced such as delay, hardware/software problems, or miscommunication.",
  "Suggest improvements in process, technical setup, or team coordination.",
  "Answer Yes/No. If Yes, mention type (Delay / Hardware / Software / Client Expectation) and impact (Low/Medium/High) within the same response.",
];

const REVIEW_QUESTIONS = RATING_QUESTIONS;
const REVIEW_TABLE_HEADER_STYLE = { background: "transparent", color: "#000000" };
const FEEDBACK_TEXTAREA_MIN_HEIGHT = 38;
const FEEDBACK_TEXTAREA_MAX_HEIGHT = 148;

function resizeFeedbackTextarea(textarea) {
  if (!textarea) {
    return;
  }

  textarea.style.setProperty("height", `${FEEDBACK_TEXTAREA_MIN_HEIGHT}px`, "important");
  const nextHeight = Math.min(
    Math.max(textarea.scrollHeight, FEEDBACK_TEXTAREA_MIN_HEIGHT),
    FEEDBACK_TEXTAREA_MAX_HEIGHT,
  );

  textarea.style.setProperty("height", `${nextHeight}px`, "important");
  textarea.style.setProperty(
    "overflow-y",
    textarea.scrollHeight > FEEDBACK_TEXTAREA_MAX_HEIGHT ? "auto" : "hidden",
    "important",
  );
}

const RATING_SCALE_REFERENCE = [
  { value: 5, blocks: "■■■■■", label: "Excellent", description: "No issues, smooth execution." },
  { value: 4, blocks: "■■■■", label: "Strong", description: "Minor issues, handled well." },
  { value: 3, blocks: "■■■", label: "Average", description: "Noticeable issues." },
  { value: 2, blocks: "■■", label: "Poor", description: "Multiple problems." },
  { value: 1, blocks: "■", label: "Critical", description: "Major failure." },
];

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  submitted: "Submitted",
};

const STATUS_TONES = {
  active: "green",
  inactive: "slate",
  submitted: "blue",
};

const NAV_ITEMS = [
  { page: "dashboard", label: "Dashboard", icon: "dashboard" },
  { page: "events", label: "Events", icon: "calendar" },
  { page: "reviews", label: "Reviews", icon: "star" },
  { page: "feedback", label: "Submit review", icon: "message" },
  { page: "photos", label: "Gallery", icon: "image" },
];

const INITIAL_EVENTS = [];

const INITIAL_FORM = {
  title: "",
  desc: "",
  date: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  setupDate: new Date().toISOString().slice(0, 10),
  loc: "",
  clientName: "",
  projectId: "",
  projectTitle: "",
  attendeeName: "",
  salesPerson: "",
};

const INITIAL_REVIEW_FORM = {
  eventId: "",
  author: "",
  rating: 5,
  questionRatings: RATING_QUESTIONS.map(() => 0),
  answers: FEEDBACK_QUESTIONS.map(() => ""),
};

const EMPTY_REVIEWER_SLOTS = [null, null, null];
const REVIEWER_ROLES = ["BD", "ET", "TT"];
const REVIEWER_ROLE_LABELS = ["BD", "Executor", "Tech"];

const MEDIA_TONES = ["ocean", "gold", "forest", "coral"];
const REVIEW_QUESTIONS_STORAGE_KEY = "eventReviewRatingQuestionsV2";
const UI_STATE_STORAGE_KEY = "eventReviewUiState";
const ADMIN_ACCESS_STORAGE_KEY = "eventReviewAdminAccess";
const LOGIN_ACCESS_STORAGE_KEY = "eventReviewAllowedEmail";
const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || "craftech360";
const ALLOWED_SIGNIN_EMAIL = "subscription.cft360@gmail.com";
const RESTORABLE_PAGES = new Set(["dashboard", "events", "reviews", "eventDetail", "feedback", "photos"]);

function getStoredReviewQuestions() {
  return REVIEW_QUESTIONS;
}

function getStoredUiState() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedState = window.localStorage.getItem(UI_STATE_STORAGE_KEY);
    const parsedState = storedState ? JSON.parse(storedState) : null;
    return parsedState && typeof parsedState === "object" ? parsedState : {};
  } catch {
    return {};
  }
}

function getStoredAdminAccess() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(ADMIN_ACCESS_STORAGE_KEY) === "true";
}

function isAllowedCompanyEmail(email) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  return normalizedEmail === ALLOWED_SIGNIN_EMAIL;
}

function getStoredAccessEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  const storedEmail = window.localStorage.getItem(LOGIN_ACCESS_STORAGE_KEY) ?? "";
  return isAllowedCompanyEmail(storedEmail) ? storedEmail : "";
}

function createEmptyDetailDraft(index = 0) {
  return {
    reviewerName: "",
    questionRatings: RATING_QUESTIONS.map(() => 0),
    answers: FEEDBACK_QUESTIONS.map(() => ""),
    remark: "",
  };
}

function getReviewerRoleLabel(reviewIndex) {
  return REVIEWER_ROLE_LABELS[reviewIndex] ?? `Reviewer ${reviewIndex + 1}`;
}

function getReviewerHeaderLabel(review, reviewIndex) {
  const roleLabel = getReviewerRoleLabel(reviewIndex);
  const reviewerName = review?.author ? review.author : "Pending";
  return `${roleLabel}: ${reviewerName}`;
}

function ReviewerRoleLabel({ review, reviewIndex }) {
  return <div className="reviewer-head-name">{getReviewerHeaderLabel(review, reviewIndex)}</div>;
}

function ReviewerNameInput({ reviewIndex, value, onChange }) {
  return (
    <label className="reviewer-slot-entry">
      <span className="reviewer-slot-label">{`${getReviewerRoleLabel(reviewIndex)}:`}</span>
      <input
        type="text"
        className="reviewer-slot-input reviewer-name-input"
        value={value}
        placeholder="Enter name"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function RatingScaleReference({ title = "Rating Scale Reference", compact = false }) {
  return (
    <section className={`rating-scale-card ${compact ? "compact" : ""}`}>
      <div className="rating-scale-title">{title}</div>
      <div className="rating-scale-list">
        {RATING_SCALE_REFERENCE.map((item) => (
          <article key={item.value} className="rating-scale-item">
            <div className="rating-scale-scoreline">
              <span className="rating-scale-blocks" aria-hidden="true">
                {item.blocks}
              </span>
              <strong>{`(${item.value})`}</strong>
            </div>
            <div className="rating-scale-copy">
              <span>{item.description}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function createInitialMediaItems(events) {
  return [];
}

function normalizeReview(review = {}) {
  const normalizedAnswers = Array.isArray(review.answers)
    ? FEEDBACK_QUESTIONS.map((_, index) => review.answers[index] ?? "")
    : FEEDBACK_QUESTIONS.map(() => "");

  return {
    author: review.author ?? "Anonymous Reviewer",
    initials: review.initials ?? getInitials(review.author ?? "Anonymous Reviewer"),
    avatar: review.avatar ?? getAvatarTone(review.author ?? "Anonymous Reviewer"),
    rating: Number(review.rating ?? 0),
    reviewSlot:
      review.reviewSlot === null || review.reviewSlot === undefined
        ? undefined
        : Number(review.reviewSlot),
    questionRatings: Array.isArray(review.questionRatings)
      ? RATING_QUESTIONS.map((_, index) => Number(review.questionRatings[index] ?? 0))
      : RATING_QUESTIONS.map(() => 0),
    answers: normalizedAnswers,
    remark: review.remark ?? normalizedAnswers.find((answer) => answer.trim()) ?? "",
  };
}

function normalizeAttendeeName(value) {
  return value === "Not assigned" ? "" : value ?? "";
}

function normalizeActivities(activities, fallbackTitle = "", fallbackDescription = "") {
  if (Array.isArray(activities) && activities.length) {
    return activities.map((activity, index) => ({
      name: activity?.name ?? (index === 0 ? fallbackTitle : ""),
      description: activity?.description ?? "",
      setupCount:
        activity?.setupCount === ""
          ? ""
          : Math.max(1, Number(activity?.setupCount ?? 1)),
    }));
  }

  return [
    {
      name: fallbackTitle,
      description: fallbackDescription,
      setupCount: 1,
    },
  ];
}

function mapDbEvent(record) {
  return {
    id: Number(record.id),
    title: record.title,
    desc: record.desc ?? "No description provided.",
    activities: normalizeActivities(record.activities, record.title, record.desc ?? "No description provided."),
    date: record.date,
    endDate: record.end_date ?? record.date,
    loc: record.loc ?? "TBD",
    clientName: record.client_name ?? "",
    projectId: String(record.project_id ?? "").trim(),
    projectTitle: record.project_title ?? "",
    attendeeName: normalizeAttendeeName(record.attendee_name),
    salesPerson: record.sales_person ?? "",
    setupDate:
      normalizeDateInputValue(record.setup_date) ||
      normalizeDateInputValue(record.created_at) ||
      record.date,
    status: record.status ?? "active",
    photos: Number(record.photos ?? 0),
    reviews: Array.isArray(record.reviews) ? record.reviews.map(normalizeReview) : [],
  };
}

function mapDbMediaItem(record) {
  return {
    id: record.id,
    eventId: Number(record.event_id),
    event: record.event,
    date: record.date,
    label: record.label,
    tone: record.tone ?? "ocean",
    type: record.type ?? "image",
    sourceType: record.source_type ?? "upload",
    url: record.url,
    storagePath: record.storage_path ?? null,
  };
}

function toEventPayload(event, includeId = true) {
  const payload = {
    title: event.title,
    desc: event.activities?.[0]?.description ?? event.desc ?? "",
    activities: normalizeActivities(event.activities, event.title, event.desc ?? ""),
    date: event.date,
    end_date: event.endDate || event.date,
    loc: event.loc ?? "",
    client_name: event.clientName ?? "",
    project_id: event.projectId ?? "",
    project_title: event.projectTitle ?? "",
    attendee_name: normalizeAttendeeName(event.attendeeName),
    sales_person: event.salesPerson ?? "",
    status: event.status ?? "active",
    photos: Number(event.photos ?? 0),
    reviews: Array.isArray(event.reviews) ? event.reviews : [],
    updated_at: new Date().toISOString(),
  };

  if (event.setupDate) {
    payload.setup_date = event.setupDate;
  }

  if (includeId) {
    payload.id = Number(event.id);
  }

  return payload;
}

function normalizeDateInputValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }

    if (trimmedValue.length >= 10) {
      const leadingDate = trimmedValue.slice(0, 10);

      if (/^\d{4}-\d{2}-\d{2}$/.test(leadingDate)) {
        return leadingDate;
      }
    }
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function isMissingSupabaseColumn(error, columnName) {
  return String(error?.message ?? "")
    .toLowerCase()
    .includes(`'${columnName.toLowerCase()}' column`);
}

function getMissingSupabaseColumn(error, columnNames) {
  return columnNames.find((columnName) => isMissingSupabaseColumn(error, columnName)) ?? null;
}

function isSupabaseNetworkError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return error instanceof TypeError || message.includes("failed to fetch") || message.includes("networkerror");
}

function getSupabaseOfflineMessage() {
  return "Supabase could not be reached, so this change is kept locally for now. Check your internet connection, Supabase URL/key, or retry after Supabase is reachable.";
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatProjectId(number) {
  return `${PROJECT_ID_PREFIX}/${String(number).padStart(3, "0")}`;
}

function normalizeProjectId(value, fallbackNumber = 0) {
  const trimmedValue = String(value ?? "").trim();

  if (trimmedValue) {
    return trimmedValue;
  }

  if (Number.isFinite(Number(fallbackNumber)) && Number(fallbackNumber) > 0) {
    return formatProjectId(Number(fallbackNumber));
  }

  return "";
}

function applyOrderedProjectIds(events) {
  return events.map((event, index) => ({
    ...event,
    projectId: normalizeProjectId(event.projectId, index + 1),
  }));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatEventDateRange(event) {
  const fromDate = event.date;
  const toDate = event.endDate || event.date;

  if (!fromDate || !toDate) {
    return formatDate(fromDate || toDate);
  }

  return `${formatDate(fromDate)} to ${formatDate(toDate)}`;
}

function formatShortYearDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(date));
}

function formatShortEventDateRange(event) {
  const fromDate = event.date;
  const toDate = event.endDate || event.date;

  if (!fromDate || !toDate) {
    return formatShortYearDate(fromDate || toDate);
  }

  return `${formatShortYearDate(fromDate)} to ${formatShortYearDate(toDate)}`;
}

function formatEventTimelineDate(date) {
  if (!date) {
    return { month: "--", day: "--" };
  }

  const parsedDate = new Date(date);

  return {
    month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(parsedDate),
    day: new Intl.DateTimeFormat("en-IN", { day: "numeric" }).format(parsedDate),
  };
}

function formatStatusLabel(status) {
  return STATUS_LABELS[status] ?? `${String(status ?? "inactive").slice(0, 1).toUpperCase()}${String(status ?? "inactive").slice(1)}`;
}

function getSupabaseLoadErrorMessage(...errors) {
  const validErrors = errors.filter(Boolean);
  const hasInvalidKey = validErrors.some((error) =>
    [error.message, error.hint].some((value) => String(value ?? "").toLowerCase().includes("invalid api key")),
  );

  if (hasInvalidKey) {
    return "Supabase rejected the API key. Update VITE_SUPABASE_ANON_KEY in .env and Netlify with the anon public key from this Supabase project.";
  }

  const eventsError = validErrors.find(Boolean);
  const rawError = getSupabaseErrorText(eventsError);

  if (isMissingSupabaseRelation(eventsError, "events")) {
    return "Supabase is connected, but the events table is missing. Run supabase-setup.sql in this Supabase project.";
  }

  if (isMissingSupabaseRelation(eventsError, "media_items")) {
    return "Supabase is connected, but the media_items table is missing. Run supabase-setup.sql in this Supabase project.";
  }

  return `Supabase load failed: ${rawError || "Unknown Supabase error"}`;
}

function getSupabaseMissingConfigMessage() {
  return "Supabase sync is off in this deployed build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify, then redeploy the site.";
}

function isMissingSupabaseRelation(error, relationName) {
  const errorText = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ").toLowerCase();
  const relation = String(relationName ?? "").toLowerCase();
  return Boolean(
    relation &&
      (errorText.includes(`relation "${relation}" does not exist`) ||
        errorText.includes(`table "${relation}" does not exist`) ||
        errorText.includes(relation)),
  );
}

function getSupabasePartialLoadWarning(mediaError) {
  if (!mediaError) {
    return "";
  }

  if (isMissingSupabaseRelation(mediaError, "media_items")) {
    return "Events loaded from Supabase, but the gallery table is missing. Run supabase-setup.sql to add media_items and storage setup.";
  }

  return `Events loaded from Supabase, but gallery data could not be loaded: ${getSupabaseErrorText(mediaError) || "Unknown error"}`;
}

function getSupabaseProjectHost() {
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return "";
  }
}

function getSupabaseErrorText(error) {
  return [
    error?.message,
    error?.name,
    error?.code,
    error?.status,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ");
}

function getSupabaseActionErrorMessage(action, error) {
  const rawError = getSupabaseErrorText(error) || "Unknown Supabase error";
  const lowerError = rawError.toLowerCase();
  const host = getSupabaseProjectHost();

  if (
    lowerError.includes("failed to fetch") ||
    lowerError.includes("networkerror") ||
    lowerError.includes("load failed")
  ) {
    return `${action}: the browser could not reach Supabase${
      host ? ` (${host})` : ""
    }. Check VITE_SUPABASE_URL, that the Supabase project is active, that this device/network can reach Supabase, and that Supabase API CORS/allowed origins includes this site. Original error: ${rawError}`;
  }

  if (lowerError.includes("bucket not found") || lowerError.includes("not found")) {
    return `${action}: the "${SUPABASE_BUCKET}" storage bucket was not found. Run supabase-setup.sql in the matching Supabase project. Original error: ${rawError}`;
  }

  if (lowerError.includes("row-level security") || lowerError.includes("violates row-level security")) {
    return `${action}: Supabase row-level security blocked the request. Run supabase-setup.sql and confirm the storage policies are installed for "${SUPABASE_BUCKET}". Original error: ${rawError}`;
  }

  if (lowerError.includes("invalid api key") || lowerError.includes("jwt")) {
    return `${action}: Supabase rejected the API key. Update VITE_SUPABASE_ANON_KEY with the anon public key from the same Supabase project. Original error: ${rawError}`;
  }

  return `${action}: ${rawError}`;
}

function getAverageRating(reviews) {
  if (!reviews.length) {
    return 0;
  }

  return reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
}

function getInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "GU";
}

function getAvatarTone(name) {
  const tones = ["a", "b", "c"];
  const total = name.split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return tones[total % tones.length];
}

function getRatingDistribution(reviews) {
  return [5, 4, 3, 2, 1].map((value) => ({
    value,
    count: reviews.filter((review) => review.rating === value).length,
  }));
}

function StarDisplay({ rating, compact = false }) {
  return (
    <span className={`stars ${compact ? "stars-compact" : ""} score-${Math.max(1, rating)}`} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={`${rating}-${index}`}
          className={`star-glyph ${index < rating ? "filled" : "muted"}`}
          style={{ "--star-index": index }}
        >
          {STAR}
        </span>
      ))}
    </span>
  );
}

function InteractiveRatingBadge({
  badgeId,
  rating,
  text,
  compact = false,
  activeStarBadge,
  onActivate,
}) {
  const isActive = activeStarBadge.id === badgeId;

  return (
    <button
      type="button"
      className={`${compact ? "question-rating-badge" : "rating-badge"} clickable-rating score-${Math.max(1, rating)} ${isActive ? "is-active" : ""}`}
      onClick={(event) => onActivate(event, badgeId)}
      style={
        isActive
          ? {
              "--ripple-x": activeStarBadge.x,
              "--ripple-y": activeStarBadge.y,
            }
          : undefined
      }
    >
      <StarDisplay rating={rating} compact={compact} />
    </button>
  );
}

function InteractiveStarOption({
  optionId,
  value,
  filled,
  selected,
  activeStarBadge,
  onActivate,
  onSelect,
  onMouseEnter,
  compact = false,
}) {
  return (
    <button
      type="button"
      className={`star-input-button clickable-rating ${filled ? "active" : ""} ${
        activeStarBadge.id === optionId ? "is-active" : ""
      }`}
      onClick={(event) => {
        onActivate(event, optionId);
        onSelect();
      }}
      onMouseEnter={onMouseEnter}
      style={
        activeStarBadge.id === optionId
          ? {
              "--ripple-x": activeStarBadge.x,
              "--ripple-y": activeStarBadge.y,
              width: compact ? "42px" : undefined,
              height: compact ? "42px" : undefined,
              borderRadius: compact ? "12px" : undefined,
            }
          : compact
            ? {
                width: "42px",
                height: "42px",
                borderRadius: "12px",
              }
            : undefined
      }
      aria-label={`${value} star${value > 1 ? "s" : ""}`}
      aria-pressed={selected}
    >
      <span className="star-input-glyph" aria-hidden="true" style={compact ? { fontSize: "30px" } : undefined}>
        {STAR}
      </span>
    </button>
  );
}

function StarRatingInput({
  inputId,
  value,
  activeStarBadge,
  onActivate,
  onChange,
  compact = false,
}) {
  const [hoveredValue, setHoveredValue] = useState(0);
  const visibleValue = hoveredValue || value;

  return (
    <div
      className="star-input-group"
      role="radiogroup"
      aria-label="Select rating"
      onMouseLeave={() => setHoveredValue(0)}
      style={compact ? { gap: "6px", width: "100%", justifyContent: "center", alignItems: "center" } : undefined}
    >
      {[1, 2, 3, 4, 5].map((starValue) => (
        <InteractiveStarOption
          key={`${inputId}-${starValue}`}
          optionId={`${inputId}-${starValue}`}
          value={starValue}
          filled={starValue <= visibleValue}
          activeStarBadge={activeStarBadge}
          onActivate={onActivate}
          onSelect={() => onChange(starValue)}
          selected={starValue === value}
          onMouseEnter={() => setHoveredValue(starValue)}
          compact={compact}
        />
      ))}
    </div>
  );
}

function getQuestionRating(review, index) {
  return review.questionRatings?.[index] ?? review.rating ?? 0;
}

function getReviewRemark(review) {
  if (!review) {
    return "-";
  }

  const feedbackText = [
    String(review.remark ?? "").trim(),
    ...(Array.isArray(review.answers) ? review.answers.map((answer) => String(answer ?? "").trim()) : []),
  ]
    .filter(Boolean)
    .join(" ");

  const validRatings = Array.isArray(review.questionRatings)
    ? review.questionRatings.map((rating) => Number(rating)).filter((rating) => rating > 0)
    : [];
  const averageRating = validRatings.length
    ? validRatings.reduce((total, rating) => total + rating, 0) / validRatings.length
    : Number(review.rating ?? 0);

  return getOverallRemarkWord(feedbackText, averageRating);
}

function shouldUseActivityDescriptionPreview(description) {
  const normalizedDescription = String(description ?? "").trim();

  if (!normalizedDescription) {
    return false;
  }

  return /\r?\n/.test(normalizedDescription) || normalizedDescription.length > 90;
}

function QuestionCell({ question, description }) {
  return (
    <div className="question-copy">
      <div className="question-title-copy">{question}</div>
      {description ? <div className="question-description-copy">{description}</div> : null}
    </div>
  );
}

function getFallbackRemarkWord(rating) {
  const roundedRating = Math.round(Number(rating) || 0);

  if (roundedRating >= 5) {
    return "Best";
  }

  if (roundedRating >= 4) {
    return "Strong";
  }

  if (roundedRating >= 3) {
    return "Average";
  }

  if (roundedRating >= 2) {
    return "Bad";
  }

  if (roundedRating >= 1) {
    return "Critical";
  }

  return "Pending";
}

function getOverallRemarkWord(comment, rating = 0) {
  const text = String(comment ?? "").trim().toLowerCase();

  if (!text) {
    return getFallbackRemarkWord(rating);
  }

  const hasAny = (terms) => terms.some((term) => text.includes(term));

  if (hasAny(["critical", "major failure", "worst", "disaster", "failed", "failure"])) {
    return "Critical";
  }

  if (hasAny(["best", "excellent", "smooth", "perfect", "outstanding", "great", "superb"])) {
    return "Best";
  }

  if (hasAny(["bad", "poor", "delay", "issue", "problem", "unstable", "difficult"])) {
    return "Bad";
  }

  if (hasAny(["average", "okay", "ok", "fine", "manageable", "decent"])) {
    return "Average";
  }

  if (hasAny(["good", "nice", "well", "satisfied", "positive", "successful"])) {
    return "Strong";
  }

  return getFallbackRemarkWord(rating);
}

function getDraftAverageRating(draft) {
  const ratings = draft.questionRatings.filter(Boolean);

  if (!ratings.length) {
    return "-";
  }

  return (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1);
}

function getTotalRatingValue(questionRatings = []) {
  const validRatings = questionRatings.filter(Boolean);

  if (!validRatings.length) {
    return "-/5";
  }

  return `${(validRatings.reduce((total, rating) => total + rating, 0) / validRatings.length).toFixed(1)}/5`;
}

function getOverallReviewSummary(entries = []) {
  const populatedEntries = entries.filter((entry) => {
    if (!entry) {
      return false;
    }

    const hasRatings = Array.isArray(entry.questionRatings) && entry.questionRatings.some((rating) => Number(rating) > 0);
    const hasRemark = String(entry.remark ?? "").trim().length > 0;
    return hasRatings || hasRemark;
  });

  if (!populatedEntries.length) {
    return {
      total: "-/5",
      average: "Pending",
      remark: "Pending",
    };
  }

  const perQuestionAverages = RATING_QUESTIONS.map((_, index) => {
    const questionRatings = populatedEntries
      .map((entry) => Number(entry.questionRatings?.[index] ?? 0))
      .filter((rating) => rating > 0);

    if (!questionRatings.length) {
      return null;
    }

    return questionRatings.reduce((total, rating) => total + rating, 0) / questionRatings.length;
  }).filter((rating) => rating !== null);

  if (!perQuestionAverages.length) {
    return {
      total: "-/5",
      average: "Pending",
      remark: "Pending",
    };
  }

  const totalScore = perQuestionAverages.reduce((total, rating) => total + rating, 0);
  const averageScore = totalScore / perQuestionAverages.length;
  const combinedRemark = populatedEntries.map((entry) => String(entry.remark ?? "").trim()).filter(Boolean).join(" ");

  return {
    total: `${averageScore.toFixed(1)}/5`,
    average: getOverallRemarkWord(combinedRemark, averageScore),
    remark: getOverallRemarkWord(combinedRemark, averageScore),
  };
}

function getQuestionAverage(reviews, index) {
  if (!reviews.length) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + getQuestionRating(review, index), 0);
  return total / reviews.length;
}

function getReviewerSlots(reviews) {
  const slots = [null, null, null];

  reviews.forEach((review) => {
    const preferredSlot = review.reviewSlot;

    if (Number.isInteger(preferredSlot) && preferredSlot >= 0 && preferredSlot < 3 && !slots[preferredSlot]) {
      slots[preferredSlot] = review;
      return;
    }

    const firstFreeSlot = slots.findIndex((slot) => slot === null);
    if (firstFreeSlot !== -1) {
      slots[firstFreeSlot] = review;
    }
  });

  return slots;
}

function getEventDisplayStatus(event) {
  if (!event.reviews.length) {
    return "inactive";
  }

  if (getAverageRating(event.reviews) >= 4) {
    return "active";
  }

  if (event.reviews.length > 0) {
    return "submitted";
  }

  return "inactive";
}

function ReadOnlyReviewSplitTables({
  event,
  reviewUsers,
  feedbackQuestions,
  ratingQuestions,
  onDeleteReview,
  activeStarBadge,
  onActivateStarBadge,
  plainStars = false,
  dashboardLayout = false,
}) {
  const overallSummary = getOverallReviewSummary(reviewUsers);
  const submittedReviewCount = reviewUsers.filter(Boolean).length;

  const feedbackTableSection = (
    <div className="detail-table-section">
      <div className="detail-table-heading">
        <div className="ev-name">Feedback</div>
      </div>
      <div className="detail-table-card detail-table-card-compact">
        <table className="rev-table review-compare-table detail-split-table">
          <thead>
            <tr>
              <th className="question-heading" style={REVIEW_TABLE_HEADER_STYLE}>Question</th>
              {reviewUsers.map((review, reviewIndex) => (
                <th key={`${event.id}-readonly-feedback-head-${reviewIndex}`} className="reviewer-heading-cell">
                  <div className="reviewer-head-name">{getReviewerHeaderLabel(review, reviewIndex)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {feedbackQuestions.map((question, index) => (
              <tr key={`${event.id}-${question}-readonly-feedback-row`}>
                <td className="q-cell">
                  <QuestionCell
                    question={question}
                    />
                  </td>
                {reviewUsers.map((review, reviewIndex) => (
                  <td key={`${event.id}-readonly-feedback-${reviewIndex}-${index}`} className="answer-cell">
                    {review ? <div className="question-answer-copy">{review.answers[index] || "-"}</div> : <div className="table-placeholder">-</div>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ratingTableSection = (
    <div className="detail-table-section">
      <div className="detail-table-heading">
        <div className="ev-name">Rating Table</div>
      </div>
      <div className="detail-table-card detail-table-card-compact detail-table-card-rating">
        <table className="rev-table review-compare-table detail-split-table">
          <thead>
            <tr>
              <th className="question-heading" style={REVIEW_TABLE_HEADER_STYLE}>Question</th>
              {reviewUsers.map((review, reviewIndex) => (
                <th key={`${event.id}-readonly-rating-head-${reviewIndex}`} className="reviewer-heading-cell">
                  <div className="reviewer-head-name">{getReviewerHeaderLabel(review, reviewIndex)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ratingQuestions.map((question, index) => (
              <tr key={`${event.id}-${question}-readonly-rating-row`}>
                <td className="q-cell">
                  <QuestionCell
                    question={question}
                    />
                  </td>
                {reviewUsers.map((review, reviewIndex) => (
                  <td key={`${event.id}-readonly-rating-${reviewIndex}-${index}`} className="answer-cell rating-only-cell">
                    {review ? (
                      plainStars ? (
                        <div className="event-detail-flat-star-copy">{STAR.repeat(getQuestionRating(review, index)) || "-"}</div>
                      ) : (
                        <InteractiveRatingBadge
                          badgeId={`${event.id}-readonly-question-${reviewIndex}-${index}`}
                          rating={getQuestionRating(review, index)}
                          text={`${getQuestionRating(review, index)}/5`}
                          compact
                          activeStarBadge={activeStarBadge}
                          onActivate={onActivateStarBadge}
                        />
                      )
                    ) : (
                      <div className="table-placeholder">-</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const totalsSection = (
    <div className="overall-remark-section">
      <div className="detail-table-heading">
        <div className="ev-name">Rating</div>
      </div>
      <div className="overall-remark-grid">
        {reviewUsers.map((review, reviewIndex) => {
          const reviewerRole = getReviewerRoleLabel(reviewIndex);
          const reviewerName = review?.author?.trim() || "Pending";

          return (
            <article key={`${event.id}-readonly-total-${reviewIndex}`} className="overall-remark-card">
              <span>{reviewerRole}</span>
              <div className="overall-remark-meta">
                <p>{reviewerName}</p>
              </div>
              <div className="overall-remark-summary">
                <strong>{review ? getTotalRatingValue(review.questionRatings) : "-/5"}</strong>
              </div>
            </article>
          );
        })}
        <article className="overall-remark-card overall-summary-card">
          <span>Overall rating</span>
          <div className="overall-remark-meta">
            <p>{`${submittedReviewCount} reviewer${submittedReviewCount === 1 ? "" : "s"}`}</p>
          </div>
          <div className="overall-remark-summary">
            <strong>{overallSummary.total}</strong>
          </div>
        </article>
      </div>
    </div>
  );

  return (
    dashboardLayout ? (
      <div className={`reviews-table-wrap detail-review-table-wrap ${dashboardLayout ? "review-dashboard-layout" : ""}`}>
        <div className="event-detail-review-dashboard">
          <div className="event-detail-review-table-stack">
            {feedbackTableSection}
            {ratingTableSection}
          </div>
          <div className="event-detail-review-highlights">
            {totalsSection}
          </div>
        </div>
      </div>
    ) : (
      <>
        <div className="reviews-table-wrap detail-review-table-wrap">
          {feedbackTableSection}
        </div>
        <div className="detail-table-gap" />
        <div className="reviews-table-wrap detail-review-table-wrap">
          {ratingTableSection}
        </div>
        {totalsSection}
      </>
    )
  );
}

function App() {
  const reviewOnlyPath = window.location.pathname.replace(/\/+$/, "") === "/review";
  const reviewOnlyQuery = new URLSearchParams(window.location.search).get("view") === "review";
  const isPublicReviewMode = reviewOnlyPath || reviewOnlyQuery;
  const initialEventState = INITIAL_EVENTS;
  const storedAccessEmail = getStoredAccessEmail();
  const storedUiState = getStoredUiState();
  const storedSelectedEventExists = initialEventState.some((event) => String(event.id) === String(storedUiState.selectedEventId));
  const storedSelectedReviewEventExists = initialEventState.some((event) => String(event.id) === String(storedUiState.selectedReviewEventId));
  const storedMediaEventExists = initialEventState.some((event) => String(event.id) === String(storedUiState.mediaEventId));
  const initialSelectedEventId = String(
    storedSelectedEventExists ? storedUiState.selectedEventId : initialEventState[0]?.id ?? "",
  );
  const initialReviewEventId = String(
    storedSelectedReviewEventExists ? storedUiState.selectedReviewEventId : initialEventState[0]?.id ?? "",
  );
  const initialMediaEventId = String(
    storedMediaEventExists
      ? storedUiState.mediaEventId
      : (initialEventState.find((event) => event.status !== "inactive")?.id ?? initialEventState[0]?.id ?? ""),
  );
  const initialActivePage =
    isPublicReviewMode
      ? "feedback"
      : RESTORABLE_PAGES.has(storedUiState.activePage)
        ? storedUiState.activePage
        : "dashboard";
  const [activePage, setActivePage] = useState(initialActivePage);
  const [events, setEvents] = useState(initialEventState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextId, setNextId] = useState(
    initialEventState.reduce((maxId, event) => Math.max(maxId, Number(event.id ?? 0)), 0) + 1,
  );
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingEventId, setEditingEventId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    ...INITIAL_REVIEW_FORM,
    eventId: String(initialEventState.find((event) => event.status === "active")?.id ?? initialEventState[0]?.id ?? ""),
  });
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [selectedReviewEventId, setSelectedReviewEventId] = useState(initialReviewEventId);
  const [selectedEventId, setSelectedEventId] = useState(initialSelectedEventId);
  const [feedbackReturnPage, setFeedbackReturnPage] = useState("feedback");
  const [detailDrafts, setDetailDrafts] = useState(() =>
    Array.from({ length: 3 }, (_, index) => createEmptyDetailDraft(index)),
  );
  const [feedbackDrafts, setFeedbackDrafts] = useState(() =>
    Array.from({ length: 3 }, (_, index) => createEmptyDetailDraft(index)),
  );
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState(() => getStoredReviewQuestions());
  const [questionDrafts, setQuestionDrafts] = useState(() => getStoredReviewQuestions());
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [mediaItems, setMediaItems] = useState(() => createInitialMediaItems(initialEventState));
  const [mediaEventId, setMediaEventId] = useState(initialMediaEventId);
  const [pendingEventMediaFiles, setPendingEventMediaFiles] = useState([]);
  const [pendingFeedbackMediaFiles, setPendingFeedbackMediaFiles] = useState([]);
  const [mediaSuccess, setMediaSuccess] = useState("");
  const [previewMediaItem, setPreviewMediaItem] = useState(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const [activeStarBadge, setActiveStarBadge] = useState({ id: "", x: "50%", y: "50%" });
  const [syncError, setSyncError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [eventDetailTab, setEventDetailTab] = useState("overview");
  const [editingActivityNameIndex, setEditingActivityNameIndex] = useState(null);
  const [editingActivityDescriptionIndex, setEditingActivityDescriptionIndex] = useState(null);
  const [activityDescriptionPreview, setActivityDescriptionPreview] = useState(null);
  const [dashboardSearchInput, setDashboardSearchInput] = useState("");
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState("");
  const [eventsSearchInput, setEventsSearchInput] = useState("");
  const [eventsSearchQuery, setEventsSearchQuery] = useState("");
  const [feedbackSearchInput, setFeedbackSearchInput] = useState("");
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => getStoredAdminAccess());
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [accessEmail, setAccessEmail] = useState(storedAccessEmail);
  const [loginEmail, setLoginEmail] = useState(storedAccessEmail);
  const [loginError, setLoginError] = useState("");
  const eventDetailMediaInputRef = useRef(null);
  const feedbackMediaInputRef = useRef(null);

  useEffect(() => {
    if (!previewMediaItem) {
      return undefined;
    }

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setPreviewMediaItem(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewMediaItem]);

  useEffect(() => {
    setEditingActivityNameIndex(null);
    setEditingActivityDescriptionIndex(null);
    setActivityDescriptionPreview(null);
    setEventDetailTab("overview");
  }, [selectedEventId]);

  useEffect(() => {
    if (JSON.stringify(reviewQuestions) !== JSON.stringify(REVIEW_QUESTIONS)) {
      setReviewQuestions(REVIEW_QUESTIONS);
      setQuestionDrafts(REVIEW_QUESTIONS);
    }
  }, [reviewQuestions]);

  useEffect(() => {
    window.localStorage.setItem(REVIEW_QUESTIONS_STORAGE_KEY, JSON.stringify(reviewQuestions));
  }, [reviewQuestions]);

  useEffect(() => {
    if (typeof window === "undefined" || isPublicReviewMode) {
      return;
    }

    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        activePage,
        selectedEventId,
        selectedReviewEventId,
        mediaEventId,
      }),
    );
  }, [activePage, selectedEventId, selectedReviewEventId, mediaEventId, isPublicReviewMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (accessEmail) {
      window.localStorage.setItem(LOGIN_ACCESS_STORAGE_KEY, accessEmail);
      return;
    }

    window.localStorage.removeItem(LOGIN_ACCESS_STORAGE_KEY);
  }, [accessEmail]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsSyncing(false);
      setSyncError(getSupabaseMissingConfigMessage());
      return;
    }

    setSyncError("");
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined;
    }

    let ignore = false;

    const applyLoadedEvents = (loadedEvents, loadedMedia, partialLoadWarning = "") => {
      const mappedEvents = applyOrderedProjectIds(loadedEvents.map(mapDbEvent));
      const mappedMedia = loadedMedia.map(mapDbMediaItem);
      setEvents(mappedEvents);
      setMediaItems(mappedMedia);
      setSyncError(partialLoadWarning);
      setNextId(mappedEvents.reduce((maxId, event) => Math.max(maxId, event.id), 0) + 1);

      if (!mappedEvents.length) {
        setSelectedEventId("");
        setSelectedReviewEventId("");
        setReviewForm((current) => ({ ...current, eventId: "" }));
        setMediaEventId("");
        setIsSyncing(false);
        return;
      }

      const restoredSelectedEventId =
        mappedEvents.find((event) => String(event.id) === String(storedUiState.selectedEventId))?.id ?? mappedEvents[0].id;
      const restoredSelectedReviewEventId =
        mappedEvents.find((event) => String(event.id) === String(storedUiState.selectedReviewEventId))?.id ??
        mappedEvents.find((event) => event.reviews.length > 0)?.id ??
        mappedEvents[0].id;
      const restoredMediaEventId =
        mappedEvents.find((event) => String(event.id) === String(storedUiState.mediaEventId))?.id ??
        mappedEvents.find((event) => event.status !== "inactive")?.id ??
        mappedEvents[0].id;

      setSelectedEventId(String(restoredSelectedEventId));
      setSelectedReviewEventId(String(restoredSelectedReviewEventId));
      setReviewForm((current) => ({
        ...current,
        eventId: String(
          mappedEvents.find((event) => String(event.id) === String(current.eventId))?.id ??
            mappedEvents.find((event) => event.status === "active")?.id ??
            mappedEvents[0].id,
        ),
      }));
      setMediaEventId(String(restoredMediaEventId));
      setIsSyncing(false);
    };

    const loadRemoteData = async () => {
      setIsSyncing(true);
      setSyncError("");

      const fetchEvents = async () =>
        supabase.from("events").select("*").order("id", { ascending: true });
      const fetchMedia = async () =>
        supabase.from("media_items").select("*").order("created_at", { ascending: false });
      let [{ data: eventRows, error: eventsError }, { data: mediaRows, error: mediaError }] =
        await Promise.all([fetchEvents(), fetchMedia()]);

      if (eventsError) {
        if (!ignore) {
          setSyncError(getSupabaseLoadErrorMessage(eventsError, mediaError));
          setIsSyncing(false);
        }
        return;
      }

      let partialLoadWarning = "";
      if (mediaError) {
        partialLoadWarning = getSupabasePartialLoadWarning(mediaError);
        mediaRows = [];
      }

      if (!ignore) {
        applyLoadedEvents(eventRows, mediaRows, partialLoadWarning);
      }
    };

    loadRemoteData();

    return () => {
      ignore = true;
    };
  }, []);

  const totalReviews = events.reduce((count, event) => count + event.reviews.length, 0);
  const totalPhotos = mediaItems.length;
  const activeEventsCount = events.filter((event) => event.status === "active").length;
  const overallAverageRating = totalReviews
    ? events.reduce((total, event) => total + event.reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0), 0) /
      totalReviews
    : 0;
  const dashboardSearchTerm = dashboardSearchQuery.trim().toLowerCase();
  const eventsSearchTerm = eventsSearchQuery.trim().toLowerCase();
  const matchingDashboardEvents = events
    .slice()
    .sort((eventA, eventB) => {
      const dateA = new Date(eventA.date);
      const dateB = new Date(eventB.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateA.setHours(0, 0, 0, 0);
      dateB.setHours(0, 0, 0, 0);

      const timeA = dateA.getTime();
      const timeB = dateB.getTime();
      const isUpcomingA = timeA >= today.getTime();
      const isUpcomingB = timeB >= today.getTime();

      if (isUpcomingA !== isUpcomingB) {
        return isUpcomingA ? -1 : 1;
      }

      return isUpcomingA ? timeA - timeB : timeB - timeA;
    })
    .filter((event) => {
      if (!dashboardSearchTerm) {
        return true;
      }

      return event.title.toLowerCase().startsWith(dashboardSearchTerm);
    });
  const dashboardEvents = matchingDashboardEvents;
  const filteredEvents = events.filter((event) => {
    if (!eventsSearchTerm) {
      return true;
    }

    return [
      event.title,
      event.loc,
      event.clientName,
      event.projectId,
      event.attendeeName,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(eventsSearchTerm));
  });
  const publicReviewEvents = events.filter((event) => event.status !== "inactive");
  const eventsWithReviews = events.filter((event) => event.reviews.length > 0);
  const latestProjectNumber = events.reduce((maxNumber, event) => {
    const match = String(event.projectId ?? "").match(/(\d{3,})$/);
    return match ? Math.max(maxNumber, Number(match[1])) : maxNumber;
  }, 0);
  const suggestedProjectId = formatProjectId(Math.max(latestProjectNumber + 1, nextId));

  const selectedMediaEvent =
    publicReviewEvents.find((event) => String(event.id) === mediaEventId) ?? publicReviewEvents[0] ?? null;
  const selectedReviewEvent =
    eventsWithReviews.find((event) => String(event.id) === selectedReviewEventId) ?? eventsWithReviews[0] ?? null;
  const selectedReviewUsers = selectedReviewEvent ? selectedReviewEvent.reviews : [];

  const selectedEvent = events.find((event) => String(event.id) === selectedEventId) ?? events[0] ?? null;
  const selectedEventTableUsers = selectedEvent ? getReviewerSlots(selectedEvent.reviews) : [null, null, null];
  const selectedEventOverallSummary = getOverallReviewSummary(
    selectedEventTableUsers.map((review, reviewIndex) => review ?? detailDrafts[reviewIndex]),
  );
  const feedbackSelectedEvent =
    publicReviewEvents.find((event) => String(event.id) === reviewForm.eventId) ?? publicReviewEvents[0] ?? null;
  const feedbackReviewerSlots = feedbackSelectedEvent
    ? getReviewerSlots(feedbackSelectedEvent.reviews).map((review, slotIndex) => ({ review, slotIndex }))
    : EMPTY_REVIEWER_SLOTS.map((review, slotIndex) => ({ review, slotIndex }));
  const feedbackOpenReviewerSlots = feedbackReviewerSlots.filter(({ review }) => !review);
  const feedbackOverallSummary = getOverallReviewSummary(
    feedbackReviewerSlots.map(({ review, slotIndex }) => review ?? feedbackDrafts[slotIndex]),
  );
  const getFeedbackEventCondition = (event) => {
    if (event.reviews.length >= EMPTY_REVIEWER_SLOTS.length || event.status === "submitted") {
      return "Submitted";
    }

    return "Pending";
  };
  const pendingFeedbackEvents = publicReviewEvents.filter(
    (event) => getFeedbackEventCondition(event) === "Pending",
  );
  const filteredPendingFeedbackEvents = pendingFeedbackEvents.filter((event) => {
    const query = feedbackSearchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      event.projectId,
      event.title,
      event.clientName,
      event.loc,
      event.attendeeName,
      event.salesPerson,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const eventMediaItems = mediaItems
    .filter((item) => (selectedMediaEvent ? item.eventId === selectedMediaEvent.id : true))
    .sort((first, second) => String(second.id).localeCompare(String(first.id)));

  const selectedEventMediaItems = mediaItems
    .filter((item) => (selectedEvent ? item.eventId === selectedEvent.id : true))
    .sort((first, second) => String(second.id).localeCompare(String(first.id)));
  const selectedEventActivities = selectedEvent
    ? normalizeActivities(selectedEvent.activities, selectedEvent.title, selectedEvent.desc)
    : [];
  const selectedEventCompletedReviews = selectedEventTableUsers.filter(Boolean).length;
  const otherEventSuggestions = events
    .filter((event) => String(event.id) !== String(selectedEventId))
    .slice(0, 8);
  const reportSyncError = (message, options = {}) => {
    const { alertUser = true } = options;
    setSyncError(message);
    if (alertUser) {
      window.alert(message);
    }
  };

  const syncEventRecord = async (eventRecord, options = {}) => {
    if (!isSupabaseConfigured || !supabase) {
      return eventRecord;
    }

    const { includeId = true } = options;
    const optionalColumns = ["activities", "end_date", "project_title", "attendee_name", "sales_person", "setup_date", "client_name"];
    const omittedColumns = new Set();
    const runEventQuery = (payload) =>
      includeId
        ? supabase.from("events").upsert(payload, { onConflict: "id" }).select().single()
        : supabase.from("events").insert(payload).select().single();

    let payload = toEventPayload(eventRecord, includeId);
    let { data, error } = await runEventQuery(payload);

    while (error) {
      const missingColumn = getMissingSupabaseColumn(error, optionalColumns);

      if (!missingColumn || omittedColumns.has(missingColumn)) {
        break;
      }

      payload = { ...payload };
      delete payload[missingColumn];
      omittedColumns.add(missingColumn);
      ({ data, error } = await runEventQuery(payload));
    }

    if (error) {
      throw error;
    }

    const savedEvent = mapDbEvent(data);

    return {
      ...savedEvent,
      activities: omittedColumns.has("activities")
        ? normalizeActivities(eventRecord.activities, eventRecord.title, eventRecord.desc)
        : savedEvent.activities,
      endDate: omittedColumns.has("end_date") ? eventRecord.endDate || eventRecord.date : savedEvent.endDate,
      clientName: omittedColumns.has("client_name") ? eventRecord.clientName ?? "" : savedEvent.clientName,
      projectTitle: omittedColumns.has("project_title") ? eventRecord.projectTitle ?? eventRecord.title : savedEvent.projectTitle,
      attendeeName: omittedColumns.has("attendee_name") ? eventRecord.attendeeName ?? "" : savedEvent.attendeeName,
      salesPerson: omittedColumns.has("sales_person") ? eventRecord.salesPerson ?? "" : savedEvent.salesPerson,
      setupDate: omittedColumns.has("setup_date") ? eventRecord.setupDate || eventRecord.date : savedEvent.setupDate,
    };
  };

  const updateEventInState = (eventRecord) => {
    setEvents((currentEvents) => {
      const existingIndex = currentEvents.findIndex((event) => event.id === eventRecord.id);

      if (existingIndex === -1) {
        return [eventRecord, ...currentEvents];
      }

      return currentEvents.map((event) => (event.id === eventRecord.id ? eventRecord : event));
    });
  };

  const persistEventPatch = async (eventId, patch) => {
    const currentEvent = events.find((event) => event.id === eventId);

    if (!currentEvent) {
      return;
    }

    const nextEvent = { ...currentEvent, ...patch };
    updateEventInState(nextEvent);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const savedEvent = await syncEventRecord(nextEvent);
      updateEventInState(savedEvent);
      setSyncError("");
    } catch (error) {
      if (isSupabaseNetworkError(error)) {
        setSyncError(getSupabaseOfflineMessage());
        return;
      }

      reportSyncError(`Could not save event changes to Supabase: ${error.message}`);
    }
  };

  const persistUploadedFiles = async (targetEvent, files) => {
    if (!files.length) {
      return [];
    }

    if (!isSupabaseConfigured || !supabase) {
      return files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        eventId: targetEvent.id,
        event: targetEvent.title,
        date: new Date().toISOString().slice(0, 10),
        label: file.name,
        tone: MEDIA_TONES[index % MEDIA_TONES.length],
        type: file.type.startsWith("video/") ? "video" : "image",
        sourceType: "upload",
        url: URL.createObjectURL(file),
      }));
    }

    const uploadPayload = [];

    for (const [index, file] of files.entries()) {
      const filePath = `${targetEvent.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

      uploadPayload.push({
        event_id: targetEvent.id,
        event: targetEvent.title,
        date: new Date().toISOString().slice(0, 10),
        label: file.name,
        tone: MEDIA_TONES[index % MEDIA_TONES.length],
        type: file.type.startsWith("video/") ? "video" : "image",
        source_type: "upload",
        url: publicUrl,
        storage_path: filePath,
      });
    }

    const { data, error } = await supabase.from("media_items").insert(uploadPayload).select();

    if (error) {
      throw error;
    }

    return data.map(mapDbMediaItem);
  };

  const openEventDetail = (id) => {
    setSelectedEventId(String(id));
    setReviewForm({
      ...INITIAL_REVIEW_FORM,
      eventId: String(id),
    });
    setDetailDrafts(Array.from({ length: 3 }, (_, index) => createEmptyDetailDraft(index)));
    setMediaEventId(String(id));
    setPendingEventMediaFiles([]);
    setReviewSuccess("");
    setMediaSuccess("");
    setActivePage("eventDetail");
  };

  const deleteEvent = async (id) => {
    const confirmed = window.confirm("Delete this event? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    const relatedMedia = mediaItems.filter((item) => item.eventId === id);
    const storagePaths = relatedMedia.map((item) => item.storagePath).filter(Boolean);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: eventError } = await supabase.from("events").delete().eq("id", id);
        if (eventError) {
          throw eventError;
        }

        setSyncError("");
      } catch (error) {
        reportSyncError(getSupabaseActionErrorMessage("Could not delete the event from Supabase", error));
        return;
      }
    }

    const remainingEvents = events.filter((event) => event.id !== id);
    const nextSelectedEvent = remainingEvents[0];

    setEvents(remainingEvents);
    setMediaItems((currentItems) => currentItems.filter((item) => item.eventId !== id));

    if (String(selectedEventId) === String(id)) {
      setSelectedEventId(String(nextSelectedEvent?.id ?? ""));
    }

    if (String(selectedReviewEventId) === String(id)) {
      setSelectedReviewEventId(String(nextSelectedEvent?.id ?? ""));
    }

    setReviewForm((current) => ({
      ...current,
      eventId: String(current.eventId) === String(id) ? String(nextSelectedEvent?.id ?? "") : current.eventId,
    }));

    if (String(mediaEventId) === String(id)) {
      setMediaEventId(String(nextSelectedEvent?.id ?? ""));
    }

    if (isSupabaseConfigured && supabase && storagePaths.length) {
      try {
        const { error: storageError } = await supabase.storage.from(SUPABASE_BUCKET).remove(storagePaths);

        if (storageError) {
          setSyncError(getSupabaseActionErrorMessage("The event was deleted, but Supabase storage cleanup failed", storageError));
        }
      } catch (storageError) {
        setSyncError(getSupabaseActionErrorMessage("The event was deleted, but Supabase storage cleanup failed", storageError));
      }
    }
  };

  const openModal = () => {
    setForm({
      ...INITIAL_FORM,
      date: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      setupDate: new Date().toISOString().slice(0, 10),
      projectId: suggestedProjectId,
    });
    setEditingEventId(null);
    setIsModalOpen(true);
  };

  const openNewEventPage = () => {
    setForm({
      ...INITIAL_FORM,
      date: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      setupDate: new Date().toISOString().slice(0, 10),
      projectId: suggestedProjectId,
    });
    setEditingEventId(null);
    setIsModalOpen(false);
    setActivePage("newEvent");
  };

  const openEditModal = (eventToEdit) => {
    setForm({
      title: eventToEdit.title,
      desc: eventToEdit.desc,
      date: eventToEdit.date,
      endDate: eventToEdit.endDate ?? eventToEdit.date,
      setupDate:
        normalizeDateInputValue(eventToEdit.setupDate) ||
        normalizeDateInputValue(eventToEdit.date) ||
        new Date().toISOString().slice(0, 10),
      loc: eventToEdit.loc,
      clientName: eventToEdit.clientName ?? "",
      projectId: eventToEdit.projectId ?? "",
      projectTitle: eventToEdit.projectTitle ?? "",
      attendeeName: eventToEdit.attendeeName ?? "",
      salesPerson: eventToEdit.salesPerson ?? "",
    });
    setEditingEventId(eventToEdit.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
    setEditingEventId(null);
  };

  const cancelNewEventPage = () => {
    setForm(INITIAL_FORM);
    setEditingEventId(null);
    setActivePage("events");
  };

  const unlockAdmin = (event) => {
    event.preventDefault();

    if (adminPasscode !== ADMIN_PASSCODE) {
      setAdminError("Incorrect admin passcode.");
      return;
    }

    window.localStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, "true");
    setIsAdminUnlocked(true);
    setAdminPasscode("");
    setAdminError("");
  };

  const lockAdmin = () => {
    window.localStorage.removeItem(ADMIN_ACCESS_STORAGE_KEY);
    setIsAdminUnlocked(false);
    setAdminPasscode("");
    setAdminError("");
    setActivePage("dashboard");
  };

  const saveEvent = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const title = form.title.trim();
    const desc = form.desc.trim();
    const loc = form.loc.trim();
    const clientName = form.clientName.trim();
    const setupDate = normalizeDateInputValue(form.setupDate) || normalizeDateInputValue(form.date) || today;
    const projectId =
      editingEventId !== null
        ? normalizeProjectId(form.projectId, editingEventId ?? nextId)
        : normalizeProjectId(form.projectId, nextId);
    const attendeeName = form.attendeeName.trim();
    const salesPerson = form.salesPerson.trim();
    const activities = normalizeActivities(
      [
        {
          name: title,
          description: desc || "No description provided.",
          setupCount: 1,
        },
      ],
      title,
      desc || "No description provided.",
    );

    if (!title) {
      window.alert("Please enter an event title.");
      return;
    }

    if (form.date && form.endDate && form.endDate < form.date) {
      window.alert("To date cannot be earlier than From date.");
      return;
    }

    if (editingEventId !== null) {
      const currentEvent = events.find((event) => event.id === editingEventId);
      const updatedEvent = {
        ...(currentEvent ?? {}),
        id: editingEventId,
        title,
        desc: desc || "No description provided.",
        activities: currentEvent?.activities?.length ? currentEvent.activities : activities,
        date: form.date || today,
        endDate: form.endDate || form.date || today,
        setupDate,
        loc: loc || "TBD",
        clientName,
        projectId,
        projectTitle: title,
        attendeeName,
        salesPerson,
      };

      updateEventInState(updatedEvent);

      if (isSupabaseConfigured && supabase) {
        try {
          const savedEvent = await syncEventRecord(updatedEvent);
          updateEventInState(savedEvent);
          setSyncError("");
        } catch (error) {
          if (isSupabaseNetworkError(error)) {
            setSyncError(getSupabaseOfflineMessage());
            closeModal();
            setActivePage("events");
            return;
          }

          reportSyncError(`Could not update the event in Supabase: ${error.message}`);
          return;
        }
      }
    } else {
      const newEvent = {
        id: nextId,
        title,
        desc: desc || "No description provided.",
        activities,
        date: form.date || today,
        endDate: form.endDate || form.date || today,
        setupDate,
        loc: loc || "TBD",
        clientName,
        projectId,
        projectTitle: title,
        attendeeName,
        salesPerson,
        status: "active",
        photos: 0,
        reviews: [],
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const savedEvent = await syncEventRecord(newEvent, { includeId: false });
          updateEventInState(savedEvent);
          setNextId((currentId) => Math.max(currentId, savedEvent.id + 1));
          setSyncError("");
        } catch (error) {
          if (isSupabaseNetworkError(error)) {
            setEvents((currentEvents) => [newEvent, ...currentEvents]);
            setNextId((currentId) => currentId + 1);
            setSyncError(getSupabaseOfflineMessage());
            closeModal();
            setActivePage("events");
            return;
          }

          reportSyncError(`Could not create the event in Supabase: ${error.message}`);
          return;
        }
      } else {
        setEvents((currentEvents) => [newEvent, ...currentEvents]);
        setNextId((currentId) => currentId + 1);
      }
    }

    closeModal();

    if (editingEventId !== null && activePage === "eventDetail") {
      setSelectedEventId(String(editingEventId));
    } else {
      setActivePage("events");
    }
  };

  const updateSelectedEventField = (field, value) => {
    if (!selectedEvent) {
      return;
    }

    if (field === "title") {
      persistEventPatch(selectedEvent.id, { title: value, projectTitle: value });
      return;
    }

    persistEventPatch(selectedEvent.id, { [field]: value });
  };

  const updateSelectedActivityField = (activityIndex, field, value) => {
    if (!selectedEvent) {
      return;
    }

    const currentActivities = normalizeActivities(selectedEvent.activities, selectedEvent.title, selectedEvent.desc);
    const nextActivities = currentActivities.map((activity, index) =>
      index === activityIndex ? { ...activity, [field]: value } : activity,
    );

    persistEventPatch(selectedEvent.id, {
      activities: nextActivities,
      desc: nextActivities[0]?.description || "No description provided.",
    });
  };

  const adjustSelectedActivitySetupCount = (activityIndex, delta) => {
    if (!selectedEvent) {
      return;
    }

    const currentActivities = normalizeActivities(selectedEvent.activities, selectedEvent.title, selectedEvent.desc);
    const targetActivity = currentActivities[activityIndex];

    if (!targetActivity) {
      return;
    }

    updateSelectedActivityField(
      activityIndex,
      "setupCount",
      Math.max(1, Number(targetActivity.setupCount || 1) + delta),
    );
  };

  const addSelectedActivity = () => {
    if (!selectedEvent) {
      return;
    }

    setEditingActivityNameIndex(normalizeActivities(selectedEvent.activities, selectedEvent.title, selectedEvent.desc).length);
    setEditingActivityDescriptionIndex(normalizeActivities(selectedEvent.activities, selectedEvent.title, selectedEvent.desc).length);

    const nextActivities = [
      ...normalizeActivities(selectedEvent.activities, selectedEvent.title, selectedEvent.desc),
      { name: "", description: "", setupCount: 1 },
    ];

    persistEventPatch(selectedEvent.id, { activities: nextActivities });
  };

  const deleteSelectedActivity = (activityIndex) => {
    if (!selectedEvent) {
      return;
    }

    const currentActivities = normalizeActivities(selectedEvent.activities, selectedEvent.title, selectedEvent.desc);

    if (currentActivities.length <= 1) {
      window.alert("At least one activity is required.");
      return;
    }

    const nextActivities = currentActivities.filter((_, index) => index !== activityIndex);
    persistEventPatch(selectedEvent.id, {
      activities: nextActivities,
      desc: nextActivities[0]?.description || "No description provided.",
    });
  };

  const updateReviewAnswer = (index, value) => {
    setReviewForm((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => (answerIndex === index ? value : answer)),
    }));
  };

  const updateReviewQuestionRating = (index, value) => {
    setReviewForm((current) => ({
      ...current,
      questionRatings: current.questionRatings.map((rating, ratingIndex) =>
        ratingIndex === index ? value : rating,
      ),
    }));
  };

  const updateDetailDraftAnswer = (slotIndex, questionIndex, value) => {
    setDetailDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex
          ? {
              ...draft,
              answers: draft.answers.map((answer, answerIndex) =>
                answerIndex === questionIndex ? value : answer,
              ),
            }
          : draft,
      ),
    );
  };

  const updateDetailDraftRating = (slotIndex, questionIndex, value) => {
    setDetailDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex
          ? {
              ...draft,
              questionRatings: draft.questionRatings.map((rating, ratingIndex) =>
                ratingIndex === questionIndex ? value : rating,
              ),
            }
          : draft,
      ),
    );
  };

  const updateDetailDraftReviewerName = (slotIndex, value) => {
    setDetailDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex ? { ...draft, reviewerName: value } : draft,
      ),
    );
  };

  const updateDetailDraftRemark = (slotIndex, value) => {
    setDetailDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex ? { ...draft, remark: value } : draft,
      ),
    );
  };

  const updateFeedbackDraftAnswer = (slotIndex, questionIndex, value) => {
    setFeedbackDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex
          ? {
              ...draft,
              answers: draft.answers.map((answer, answerIndex) =>
                answerIndex === questionIndex ? value : answer,
              ),
            }
          : draft,
      ),
    );
  };

  const updateFeedbackDraftRating = (slotIndex, questionIndex, value) => {
    setFeedbackDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex
          ? {
              ...draft,
              questionRatings: draft.questionRatings.map((rating, ratingIndex) =>
                ratingIndex === questionIndex ? value : rating,
              ),
            }
          : draft,
      ),
    );
  };

  const updateFeedbackDraftReviewerName = (slotIndex, value) => {
    setFeedbackDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex ? { ...draft, reviewerName: value } : draft,
      ),
    );
  };

  const updateFeedbackDraftRemark = (slotIndex, value) => {
    setFeedbackDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === slotIndex ? { ...draft, remark: value } : draft,
      ),
    );
  };

  const startEditingQuestions = () => {
    setQuestionDrafts(reviewQuestions);
    setIsEditingQuestions(true);
  };

  const cancelEditingQuestions = () => {
    setQuestionDrafts(reviewQuestions);
    setIsEditingQuestions(false);
  };

  const updateQuestionDraft = (questionIndex, value) => {
    setQuestionDrafts((currentQuestions) =>
      currentQuestions.map((question, index) => (index === questionIndex ? value : question)),
    );
  };

  const saveQuestionDrafts = () => {
    const nextQuestions = questionDrafts.map((question) => question.trim());

    if (nextQuestions.some((question) => !question)) {
      window.alert("Please fill every question before saving.");
      return;
    }

    setReviewQuestions(nextQuestions);
    setQuestionDrafts(nextQuestions);
    setIsEditingQuestions(false);
  };

  const submitReview = async (overrideEventId) => {
    const author = reviewForm.author.trim() || `Anonymous Reviewer ${Date.now()}`;
    const eventId = Number(overrideEventId ?? reviewForm.eventId);
    const completedAnswers = reviewForm.answers.map((answer) => answer.trim());
    const completedRatings = reviewForm.questionRatings;

    if (!eventId) {
      window.alert("Please choose an event.");
      return;
    }

    if (completedAnswers.some((answer) => !answer)) {
      window.alert("Please answer all review questions.");
      return;
    }

    if (completedRatings.some((rating) => !rating)) {
      window.alert("Please give a star rating for every question.");
      return;
    }

    const averageQuestionRating =
      completedRatings.reduce((total, rating) => total + rating, 0) / completedRatings.length;

    const newReview = {
      author,
      initials: getInitials(author),
      avatar: getAvatarTone(author),
      rating: Math.round(averageQuestionRating),
      questionRatings: completedRatings,
      answers: completedAnswers,
    };

    const targetEvent = events.find((event) => event.id === eventId);
    if (!targetEvent) {
      window.alert("The selected event could not be found.");
      return;
    }

    const updatedEvent = {
      ...targetEvent,
      reviews: [newReview, ...targetEvent.reviews],
    };

    updateEventInState(updatedEvent);

    if (isSupabaseConfigured && supabase) {
      try {
        const savedEvent = await syncEventRecord(updatedEvent);
        updateEventInState(savedEvent);
        setSyncError("");
      } catch (error) {
        reportSyncError(`Could not save the review to Supabase: ${error.message}`);
        return;
      }
    }

    setReviewSuccess(`Thanks, ${author}. Your review has been added.`);
    setReviewForm({
      ...INITIAL_REVIEW_FORM,
      eventId: String(eventId),
    });
    if (activePage !== "eventDetail") {
      setActivePage("feedback");
    }
  };

  const submitDetailReview = async (slotIndex) => {
    if (!selectedEvent) {
      return;
    }

    const draft = detailDrafts[slotIndex];
    const reviewerLabel = REVIEWER_ROLES[slotIndex] ?? `Reviewer ${slotIndex + 1}`;
    const author = draft.reviewerName.trim() || reviewerLabel;
    const completedRatings = draft.questionRatings;
    const completedAnswers = draft.answers.map((answer) => answer.trim());
    const remark = draft.remark.trim();

    if (completedAnswers.some((answer) => !answer)) {
      window.alert(`Please answer all feedback questions for ${reviewerLabel}.`);
      return;
    }

    if (completedRatings.some((rating) => !rating)) {
      window.alert(`Please give a star rating for every question for ${reviewerLabel}.`);
      return;
    }

    const averageQuestionRating =
      completedRatings.reduce((total, rating) => total + rating, 0) / completedRatings.length;

    const newReview = {
      author,
      initials: getInitials(author),
      avatar: getAvatarTone(author),
      rating: Math.round(averageQuestionRating),
      reviewSlot: slotIndex,
      questionRatings: completedRatings,
      answers: completedAnswers,
      remark,
    };

    const nextReviews = [...selectedEvent.reviews];
    const existingReviewIndex = nextReviews.findIndex((review) => review.reviewSlot === slotIndex);

    if (existingReviewIndex >= 0) {
      nextReviews[existingReviewIndex] = newReview;
    } else {
      nextReviews.push(newReview);
    }

    const updatedEvent = { ...selectedEvent, reviews: nextReviews };
    updateEventInState(updatedEvent);

    if (isSupabaseConfigured && supabase) {
      try {
        const savedEvent = await syncEventRecord(updatedEvent);
        updateEventInState(savedEvent);
        setSyncError("");
      } catch (error) {
        reportSyncError(`Could not save ${reviewerLabel} to Supabase: ${error.message}`);
        return;
      }
    }

    setDetailDrafts((currentDrafts) =>
      currentDrafts.map((draftItem, draftIndex) =>
        draftIndex === slotIndex ? createEmptyDetailDraft(slotIndex) : draftItem,
      ),
    );
    setReviewSuccess(`${reviewerLabel} review submitted.`);
  };

  const submitFeedbackReview = async (slotIndex) => {
    if (!feedbackSelectedEvent) {
      return;
    }

    const draft = feedbackDrafts[slotIndex];
    const reviewerLabel = REVIEWER_ROLES[slotIndex] ?? `Reviewer ${slotIndex + 1}`;
    const author = draft.reviewerName.trim() || reviewerLabel;
    const completedRatings = draft.questionRatings;
    const completedAnswers = draft.answers.map((answer) => answer.trim());
    const remark = draft.remark.trim();

    if (completedAnswers.some((answer) => !answer)) {
      window.alert(`Please answer all feedback questions for ${reviewerLabel}.`);
      return;
    }

    if (completedRatings.some((rating) => !rating)) {
      window.alert(`Please give a star rating for every question for ${reviewerLabel}.`);
      return;
    }

    const averageQuestionRating =
      completedRatings.reduce((total, rating) => total + rating, 0) / completedRatings.length;

    const newReview = {
      author,
      initials: getInitials(author),
      avatar: getAvatarTone(author),
      rating: Math.round(averageQuestionRating),
      reviewSlot: slotIndex,
      questionRatings: [...completedRatings],
      answers: completedAnswers,
      remark,
    };

    const nextReviews = [...feedbackSelectedEvent.reviews];
    const existingReviewIndex = nextReviews.findIndex((review) => review.reviewSlot === slotIndex);

    if (existingReviewIndex >= 0) {
      nextReviews[existingReviewIndex] = newReview;
    } else {
      nextReviews.push(newReview);
    }

    const updatedEvent = { ...feedbackSelectedEvent, reviews: nextReviews };
    const remainingOpenSlots = getReviewerSlots(nextReviews).filter((review) => !review).length;
    updateEventInState(updatedEvent);

    if (isSupabaseConfigured && supabase) {
      try {
        const savedEvent = await syncEventRecord(updatedEvent);
        updateEventInState(savedEvent);
        setSelectedReviewEventId(String(savedEvent.id));
        setReviewForm((current) => ({ ...current, eventId: String(savedEvent.id) }));
        setSyncError("");
      } catch (error) {
        reportSyncError(`Could not save ${reviewerLabel} to Supabase: ${error.message}`);
        return;
      }
    } else {
      setSelectedReviewEventId(String(feedbackSelectedEvent.id));
    }

    setFeedbackDrafts((currentDrafts) =>
      currentDrafts.map((draftItem, draftIndex) =>
        draftIndex === slotIndex ? createEmptyDetailDraft(slotIndex) : draftItem,
      ),
    );
    setReviewSuccess("Thank you, your response is submitted.");
    setActivePage("feedback");
    setIsFeedbackFormOpen(remainingOpenSlots > 0);
  };

  const deleteReviewFromEvent = async (eventId, reviewToDelete) => {
    const targetEvent = events.find((event) => event.id === eventId);

    if (!targetEvent || !reviewToDelete) {
      return;
    }

    const confirmed = window.confirm("Delete this review?");
    if (!confirmed) {
      return;
    }

    const nextReviews = targetEvent.reviews.filter((review) => review !== reviewToDelete);
    const updatedEvent = { ...targetEvent, reviews: nextReviews };
    updateEventInState(updatedEvent);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const savedEvent = await syncEventRecord(updatedEvent);
      updateEventInState(savedEvent);
      setSyncError("");
    } catch (error) {
      if (isSupabaseNetworkError(error)) {
        setSyncError(getSupabaseOfflineMessage());
        return;
      }

      reportSyncError(`Could not delete the review: ${error.message}`);
    }
  };

  const handleMediaUpload = async (event, overrideEventId) => {
    const files = Array.from(event.target.files ?? []);
    const selectedEventId = Number(overrideEventId ?? mediaEventId);

    if (!selectedEventId) {
      window.alert("Please select an event before uploading files.");
      return;
    }

    if (!files.length) {
      return;
    }

    const targetEvent = events.find((item) => item.id === selectedEventId);
    if (!targetEvent) {
      window.alert("The selected event could not be found.");
      return;
    }

    const acceptedFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    if (!acceptedFiles.length) {
      window.alert("Please upload image or video files only.");
      return;
    }

    let uploadBatch;

    try {
      uploadBatch = await persistUploadedFiles(targetEvent, acceptedFiles);
      setSyncError("");
    } catch (error) {
      reportSyncError(getSupabaseActionErrorMessage("Could not upload files to Supabase", error));
      event.target.value = "";
      return;
    }

    setMediaItems((currentItems) => [...uploadBatch, ...currentItems]);
    await persistEventPatch(targetEvent.id, { photos: targetEvent.photos + uploadBatch.length });
    setMediaSuccess(
      `${uploadBatch.length} file${uploadBatch.length !== 1 ? "s" : ""} uploaded for ${targetEvent.title}.`,
    );
    event.target.value = "";
  };

  const queueEventDetailMedia = (event) => {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const acceptedFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    if (!acceptedFiles.length) {
      window.alert("Please upload image or video files only.");
      event.target.value = "";
      return;
    }

    setPendingEventMediaFiles(acceptedFiles);
    setMediaSuccess(
      `${acceptedFiles.length} file${acceptedFiles.length !== 1 ? "s" : ""} selected. Click Submit to upload.`,
    );
    event.target.value = "";
  };

  const submitEventDetailMedia = async () => {
    if (!selectedEvent) {
      return;
    }

    if (!pendingEventMediaFiles.length) {
      window.alert("Please add photos or videos first.");
      return;
    }

    let uploadBatch;

    try {
      uploadBatch = await persistUploadedFiles(selectedEvent, pendingEventMediaFiles);
      setSyncError("");
    } catch (error) {
      reportSyncError(getSupabaseActionErrorMessage("Could not upload files to Supabase", error));
      return;
    }

    setMediaItems((currentItems) => [...uploadBatch, ...currentItems]);
    await persistEventPatch(selectedEvent.id, { photos: selectedEvent.photos + uploadBatch.length });
    setPendingEventMediaFiles([]);
    if (eventDetailMediaInputRef.current) {
      eventDetailMediaInputRef.current.value = "";
    }
    setMediaSuccess(
      `${uploadBatch.length} file${uploadBatch.length !== 1 ? "s" : ""} uploaded for ${selectedEvent.title}.`,
    );
  };

  const queueFeedbackMedia = (event) => {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const acceptedFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    if (!acceptedFiles.length) {
      window.alert("Please upload image or video files only.");
      event.target.value = "";
      return;
    }

    setPendingFeedbackMediaFiles(acceptedFiles);
    setMediaSuccess(
      `${acceptedFiles.length} file${acceptedFiles.length !== 1 ? "s" : ""} selected. Click Submit to upload.`,
    );
    event.target.value = "";
  };

  const submitFeedbackMedia = async () => {
    if (!feedbackSelectedEvent) {
      return;
    }

    if (!pendingFeedbackMediaFiles.length) {
      window.alert("Please add photos or videos first.");
      return;
    }

    let uploadBatch;

    try {
      uploadBatch = await persistUploadedFiles(feedbackSelectedEvent, pendingFeedbackMediaFiles);
      setSyncError("");
    } catch (error) {
      reportSyncError(getSupabaseActionErrorMessage("Could not upload files to Supabase", error));
      return;
    }

    setMediaItems((currentItems) => [...uploadBatch, ...currentItems]);
    await persistEventPatch(feedbackSelectedEvent.id, {
      photos: feedbackSelectedEvent.photos + uploadBatch.length,
    });
    setPendingFeedbackMediaFiles([]);
    if (feedbackMediaInputRef.current) {
      feedbackMediaInputRef.current.value = "";
    }
    setMediaSuccess(
      `${uploadBatch.length} file${uploadBatch.length !== 1 ? "s" : ""} uploaded for ${feedbackSelectedEvent.title}.`,
    );
  };

  const deleteMediaItem = async (mediaId) => {
    const targetItem = mediaItems.find((item) => item.id === mediaId);
    if (!targetItem) {
      return;
    }

    const confirmed = window.confirm("Delete this media item?");
    if (!confirmed) {
      return;
    }

    const targetEvent = events.find((event) => event.id === targetItem.eventId);
    const nextPhotoCount = Math.max(0, Number(targetEvent?.photos ?? 0) - 1);

    setMediaItems((currentItems) => currentItems.filter((item) => item.id !== mediaId));
    setSelectedMediaIds((currentIds) => currentIds.filter((id) => String(id) !== String(mediaId)));
    if (previewMediaItem && String(previewMediaItem.id) === String(mediaId)) {
      setPreviewMediaItem(null);
    }

    if (targetEvent) {
      updateEventInState({ ...targetEvent, photos: nextPhotoCount });
    }

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error: mediaDeleteError } = await supabase.from("media_items").delete().eq("id", mediaId);
      if (mediaDeleteError) {
        throw mediaDeleteError;
      }

      if (targetItem.storagePath) {
        const { error: storageError } = await supabase.storage.from(SUPABASE_BUCKET).remove([targetItem.storagePath]);
        if (storageError) {
          throw storageError;
        }
      }

      if (targetEvent) {
        const savedEvent = await syncEventRecord({ ...targetEvent, photos: nextPhotoCount });
        updateEventInState(savedEvent);
      }

      setSyncError("");
    } catch (error) {
      if (isSupabaseNetworkError(error)) {
        setSyncError(getSupabaseOfflineMessage());
        return;
      }

      reportSyncError(`Could not delete the media item: ${error.message}`);
    }
  };

  const openMediaPreview = (photo, options = {}) => {
    if (photo.sourceType === "upload" && photo.url) {
      setPreviewMediaItem({ ...photo, allowDownload: options.allowDownload ?? true });
    }
  };

  const downloadMediaItem = (photo) => {
    if (!photo.url) {
      return;
    }

    const link = document.createElement("a");
    link.href = photo.url;
    link.download = photo.label || `${photo.type === "video" ? "video" : "photo"}-${photo.id}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadMediaItems = (items) => {
    items.filter((item) => item.url).forEach((item, index) => {
      window.setTimeout(() => downloadMediaItem(item), index * 120);
    });
  };

  const getSelectedVisibleMediaItems = (items) =>
    items.filter((item) => selectedMediaIds.includes(String(item.id)) && item.url);

  const getDownloadableMediaItems = (items) => {
    const selectedItems = getSelectedVisibleMediaItems(items);
    return selectedItems.length ? selectedItems : items.filter((item) => item.url);
  };

  const toggleMediaSelection = (mediaId) => {
    const id = String(mediaId);
    setSelectedMediaIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id],
    );
  };

  const toggleAllVisibleMedia = (items) => {
    const visibleIds = items.filter((item) => item.url).map((item) => String(item.id));
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedMediaIds.includes(id));

    setSelectedMediaIds((currentIds) => {
      if (allSelected) {
        return currentIds.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...visibleIds]));
    });
  };

  const renderMediaThumb = (photo, options = {}) => {
    const { selectable = true, allowPreviewDownload = true } = options;
    let mediaPreview;
    const isSelected = selectedMediaIds.includes(String(photo.id));

    if (photo.sourceType === "upload") {
      if (photo.type === "video") {
        mediaPreview = (
          <button
            type="button"
            className="photo-preview-button"
            onClick={() => openMediaPreview(photo, { allowDownload: allowPreviewDownload })}
            aria-label={`View ${photo.label} larger`}
          >
            <video className="photo-thumb media-preview" preload="metadata" muted>
              <source src={photo.url} />
            </video>
          </button>
        );
      } else {
        mediaPreview = (
          <button
            type="button"
            className="photo-preview-button"
            onClick={() => openMediaPreview(photo, { allowDownload: allowPreviewDownload })}
            aria-label={`View ${photo.label} larger`}
          >
            <img className="photo-thumb media-preview" src={photo.url} alt={photo.label} />
          </button>
        );
      }
    } else {
      mediaPreview = (
        <div className={`photo-thumb ${photo.tone}`}>
          <span>{photo.label}</span>
        </div>
      );
    }

    return (
      <>
        {selectable && photo.url && (
          <button
            type="button"
            className={`media-select-toggle ${isSelected ? "is-selected" : ""}`}
            aria-pressed={isSelected}
            aria-label={`${isSelected ? "Deselect" : "Select"} ${photo.label}`}
            onClick={(event) => {
              event.stopPropagation();
              toggleMediaSelection(photo.id);
            }}
          >
            {isSelected ? "✓" : ""}
          </button>
        )}
        {mediaPreview}
      </>
    );
  };

  const triggerStarBadge = (event, badgeId) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setActiveStarBadge({
      id: badgeId,
      x: `${event.clientX - bounds.left}px`,
      y: `${event.clientY - bounds.top}px`,
    });
    window.setTimeout(() => {
      setActiveStarBadge((current) =>
        current.id === badgeId ? { id: "", x: "50%", y: "50%" } : current,
      );
    }, 420);
  };

  const openFeedbackFormForEvent = (eventId, options = {}) => {
    const { returnPage = activePage === "eventDetail" ? "eventDetail" : "feedback" } = options;
    setReviewSuccess("");
    setMediaSuccess("");
    setIsEditingQuestions(false);
    setPendingFeedbackMediaFiles([]);
    if (feedbackMediaInputRef.current) {
      feedbackMediaInputRef.current.value = "";
    }
    setFeedbackDrafts(Array.from({ length: 3 }, (_, index) => createEmptyDetailDraft(index)));
    setSelectedEventId(String(eventId));
    setFeedbackReturnPage(returnPage);
    setReviewForm((current) => ({ ...current, eventId: String(eventId) }));
    setIsFeedbackFormOpen(true);
    setActivePage("feedback");
  };

  const handleDomainLogin = (event) => {
    event.preventDefault();
    const normalizedEmail = loginEmail.trim().toLowerCase();

    if (!isAllowedCompanyEmail(normalizedEmail)) {
      setLoginError(`Only ${ALLOWED_SIGNIN_EMAIL} can sign in.`);
      return;
    }

    setAccessEmail(normalizedEmail);
    setLoginEmail(normalizedEmail);
    setLoginError("");
  };

  const handleLogout = () => {
    setAccessEmail("");
    setLoginEmail("");
    setLoginError("");
    setIsAdminUnlocked(false);
    setAdminPasscode("");
    setAdminError("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_ACCESS_STORAGE_KEY);
    }
  };

  const openDatePicker = (event) => {
    const input = event.currentTarget.parentElement?.querySelector("input");
    if (!input) {
      return;
    }

    event.preventDefault();
    input.focus();
    input.click();
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  };

  if (!accessEmail) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <img className="auth-logo" src={craftechLogo} alt="Craftech360" />
          <span className="auth-kicker">Internal access</span>
          <h1>Sign in with the approved account</h1>
          <p>
            Access is limited to the approved account so the live event data stays private and controlled.
          </p>
          <form className="auth-form" onSubmit={handleDomainLogin}>
            <label htmlFor="companyEmail">Work email</label>
            <input
              id="companyEmail"
              type="email"
              value={loginEmail}
              placeholder={ALLOWED_SIGNIN_EMAIL}
              autoComplete="email"
              onChange={(loginEvent) => {
                setLoginEmail(loginEvent.target.value);
                if (loginError) {
                  setLoginError("");
                }
              }}
            />
            {loginError ? <div className="auth-error">{loginError}</div> : null}
            <button type="submit" className="btn-primary auth-submit">
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-backdrop" aria-hidden="true" />
      <aside className="sidebar-shell">
        <nav className="topbar">
          <div className="nav-logo-card">
            <img src={craftechLogo} alt="Craftech360" />
          </div>
          {!isPublicReviewMode && (
            <div className="nav-links">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.page}
                  type="button"
                  className={`nav-btn ${
                    activePage === item.page || (activePage === "eventDetail" && item.page === "events") ? "active" : ""
                  }`}
                  onClick={() => {
                    if (item.page === "feedback") {
                      setIsFeedbackFormOpen(false);
                      setReviewSuccess("");
                      setMediaSuccess("");
                    }
                    setActivePage(item.page);
                  }}
                >
                  <span className="nav-icon-tile">
                    <NavIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="session-panel">
            <span className="session-label">Signed in</span>
            <strong className="session-email">{accessEmail}</strong>
            <button type="button" className="btn-secondary session-logout" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </nav>
      </aside>

      <div className="app-content">
        {activePage === "dashboard" && (
          <main className="page dashboard-page">
          <section className="dashboard-panel glass-card">
            <div className="dashboard-panel-top">
              <div className="section-title">Recent events</div>
              <form
                className="dashboard-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setDashboardSearchQuery(dashboardSearchInput);
                }}
              >
                <input
                  type="search"
                  value={dashboardSearchInput}
                  placeholder="Search events"
                  aria-label="Search dashboard events"
                  onChange={(event) => {
                    setDashboardSearchInput(event.target.value);
                    setDashboardSearchQuery(event.target.value);
                  }}
                />
                <button
                  type="button"
                  className="btn-primary dashboard-search-btn"
                  onClick={openNewEventPage}
                >
                  <NavIcon name="plus" />
                  Add a new event
                </button>
              </form>
            </div>
            <div className="dashboard-simple-list" aria-label="Recent events list">
              <div className="dashboard-event-header" aria-hidden="true">
                <span>Project ID</span>
                <span>Event name</span>
                <span>Event executor</span>
                <span>Setup date</span>
                <span>Event date</span>
                <span>Location</span>
              </div>
              {dashboardEvents.length ? (
                dashboardEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="dashboard-event-row"
                    onClick={() => openEventDetail(event.id)}
                  >
                    <span className="dashboard-event-meta dashboard-project-id" data-label="Project ID">
                      {event.projectId || "-"}
                    </span>
                    <span className="dashboard-event-project" data-label="Event name">
                      {event.title}
                    </span>
                    <span className="dashboard-event-meta" data-label="Event executor">
                      {event.attendeeName || "-"}
                    </span>
                    <span className="dashboard-event-meta" data-label="Setup date">
                      {formatDate(event.setupDate || event.date)}
                    </span>
                    <span className="dashboard-event-meta dashboard-event-date" data-label="Event date">
                      {formatEventDateRange(event)}
                    </span>
                    <span className="dashboard-event-meta dashboard-event-location" data-label="Location">
                      {event.loc || "-"}
                    </span>
                  </button>
                ))
              ) : (
                <div className="dashboard-empty-row">No matching events found.</div>
              )}
            </div>
          </section>
          </main>
        )}

        {activePage === "newEvent" && (
          <main className="page new-event-page elevated-page">
          <div className="section-header">
            <div>
              <div className="section-title">Add new event</div>
            </div>
          </div>

          <section className="review-spread-card event-form-page-card">
            <div className="form-group">
              <label htmlFor="new-title">Event name *</label>
              <input
                id="new-title"
                type="text"
                value={form.title}
                placeholder="e.g. Annual Tech Summit"
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-desc">Description</label>
              <textarea
                id="new-desc"
                value={form.desc}
                placeholder="Brief description of the event..."
                onChange={(event) => setForm({ ...form, desc: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-projectId">Project ID</label>
              <input
                id="new-projectId"
                type="text"
                value={form.projectId}
                placeholder={`e.g. ${PROJECT_ID_PREFIX}/001`}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new-clientName">Client Name</label>
                <input
                  id="new-clientName"
                  type="text"
                  value={form.clientName}
                  placeholder="e.g. Acme Corp"
                  onChange={(event) => setForm({ ...form, clientName: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-salesPerson">Sales Person</label>
                <input
                  id="new-salesPerson"
                  type="text"
                  value={form.salesPerson}
                  placeholder="e.g. Priya Shah"
                  onChange={(event) => setForm({ ...form, salesPerson: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-setupDate">Setup Date</label>
                <input
                  id="new-setupDate"
                  type="date"
                  value={form.setupDate}
                  onChange={(event) => setForm({ ...form, setupDate: event.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new-date">From date</label>
                <input
                  id="new-date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      date: event.target.value,
                      endDate: form.endDate && form.endDate >= event.target.value ? form.endDate : event.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-endDate">To date</label>
                <input
                  id="new-endDate"
                  type="date"
                  value={form.endDate}
                  min={form.date}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new-attendeeName">Event executor</label>
                <input
                  id="new-attendeeName"
                  type="text"
                  value={form.attendeeName}
                  placeholder="e.g. Rohit Sharma"
                  onChange={(event) => setForm({ ...form, attendeeName: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-loc">Location</label>
                <input
                  id="new-loc"
                  type="text"
                  value={form.loc}
                  placeholder="e.g. Bengaluru Convention Centre"
                  onChange={(event) => setForm({ ...form, loc: event.target.value })}
                />
              </div>
            </div>
            <div className="event-form-actions">
              <button type="button" className="btn-cancel" onClick={cancelNewEventPage}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveEvent}>
                Add event
              </button>
            </div>
          </section>
          </main>
        )}

        {activePage === "events" && (
          <main className="page events-page elevated-page">
          <div className="section-header">
            <div>
              <div className="section-title">All events</div>
            </div>
            <div className="events-header-actions">
              <form
                className="dashboard-search events-search"
                role="search"
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  setEventsSearchQuery(eventsSearchInput);
                }}
              >
                <input
                  id="eventsSearchInput"
                  type="search"
                  value={eventsSearchInput}
                  placeholder="Search events"
                  aria-label="Search events"
                  onChange={(changeEvent) => {
                    const nextValue = changeEvent.target.value;
                    setEventsSearchInput(nextValue);
                    setEventsSearchQuery(nextValue);
                  }}
                />
                <button type="button" className="btn-primary dashboard-search-btn" onClick={openNewEventPage}>
                  <NavIcon name="plus" />
                  Add event
                </button>
              </form>
            </div>
          </div>
          {filteredEvents.length ? (
            <div className="card-stack events-list">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  showActions
                  onDelete={deleteEvent}
                  onEdit={openEditModal}
                  onOpen={openEventDetail}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {eventsSearchTerm ? "No events match your search." : "No events yet. Use Add event to create your first record."}
            </div>
          )}
          </main>
        )}

        {activePage === "reviews" && (
          <main className="page wide-page reviews-page elevated-page">
          <div className="section-header">
            <div>
              <div className="section-title">All reviews</div>
            </div>
          </div>

          {eventsWithReviews.length ? (
            <div className="reviews-stack">
              <section className="review-spread-card glass-card">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">Select event</div>
                    {selectedReviewEvent && (
                      <div className="reviews-selected-meta">
                        <span>{`BD: ${selectedReviewEvent.title || "-"}`}</span>
                        <span>{`Executor: ${selectedReviewEvent.attendeeName || "-"}`}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group review-event-select">
                  <select
                    id="reviewEventSelect"
                    value={selectedReviewEventId}
                    onChange={(event) => setSelectedReviewEventId(event.target.value)}
                  >
                    {eventsWithReviews.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {selectedReviewEvent && (
                <>
                  <section className="reviews-table-panel">
                    <ReadOnlyReviewSplitTables
                      event={selectedReviewEvent}
                      reviewUsers={selectedReviewUsers}
                      feedbackQuestions={FEEDBACK_QUESTIONS}
                      ratingQuestions={reviewQuestions}
                      onDeleteReview={(review) => deleteReviewFromEvent(selectedReviewEvent.id, review)}
                      activeStarBadge={activeStarBadge}
                      onActivateStarBadge={triggerStarBadge}
                    />
                  </section>
                </>
              )}
            </div>
          ) : (
            <div className="empty-state">No reviews yet.</div>
          )}
          </main>
        )}

        {activePage === "eventDetail" && selectedEvent && (
          <main className="page elevated-page event-detail-page event-detail-layout">
          <div className="event-detail-desktop-shell">
            <div className="event-detail-left-board">
              <section className="event-detail-hero">
                <div className="event-detail-hero-main">
                  <div className="event-detail-hero-top">
                    <button
                      type="button"
                      className="btn-secondary event-detail-back-btn back-nav-btn back-nav-btn-compact"
                      onClick={() => setActivePage("events")}
                      aria-label="Back to events"
                      title="Back to events"
                    >
                      <NavIcon name="arrowLeft" />
                    </button>
                    <div className="event-detail-hero-copy">
                      <h1 className="event-detail-title">{selectedEvent.title}</h1>
                    </div>
                  </div>

                <div className="event-detail-feature-card">
                  <div className="event-detail-feature-visual">
                    <div className="event-detail-feature-poster">
                      <div className="event-detail-feature-orb event-detail-feature-orb-one" />
                      <div className="event-detail-feature-orb event-detail-feature-orb-two" />
                        <div className="event-detail-feature-grid" />
                        <div className="event-detail-feature-copy">
                          <span>{selectedEvent.title}</span>
                          <strong>{new Date(selectedEvent.date || Date.now()).getFullYear()}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="event-detail-feature-body">
                      <div className="event-detail-feature-head">
                        <div className="event-detail-feature-head-copy">
                          <div className="event-detail-hero-meta">
                            <span>{selectedEvent.projectId || "Project ID pending"}</span>
                          </div>
                          <h2 className="event-detail-feature-title">{selectedEvent.title}</h2>
                          <div className="event-detail-feature-meta">
                            <span>{formatShortEventDateRange(selectedEvent)}</span>
                            <span>{`${selectedEventCompletedReviews}/3 reviews submitted`}</span>
                          </div>
                        </div>

                        <div className="event-detail-feature-actions">
                          <button
                            type="button"
                            className="btn-secondary event-detail-edit-btn"
                            onClick={() => openEditModal(selectedEvent)}
                          >
                            <NavIcon name="edit" />
                            Edit Event
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="event-detail-workspace">
                <div className="event-detail-main-panel">
                  <div className="event-detail-tabbar">
                    {[
                      { id: "overview", label: "Overview" },
                      { id: "activities", label: "Activities" },
                      { id: "reviews", label: "Reviews" },
                      { id: "media", label: "Media" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`event-detail-tab-button ${eventDetailTab === tab.id ? "is-active" : ""}`}
                        onClick={() => setEventDetailTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

              {eventDetailTab === "overview" && (
                <section className="event-detail-panel-card event-detail-overview-dashboard">
                  <article className="event-detail-dashboard-card event-detail-core-card event-detail-overview-only">
                    <div className="event-detail-section-header">
                      <div>
                        <h2 className="event-detail-section-title">Event information</h2>
                      </div>
                    </div>

                    <div className="event-detail-fields-grid event-detail-fields-grid-card">
                      {[
                        { label: "Project ID", value: selectedEvent.projectId || "Project ID pending", icon: "dashboard" },
                        { label: "Event Name", value: selectedEvent.title || "Event name pending", icon: "star" },
                        { label: "Client Name", value: selectedEvent.clientName || "Client name pending", icon: "message" },
                        { label: "Executor", value: selectedEvent.attendeeName || "Executor pending", icon: "shield" },
                        { label: "Sales Person", value: selectedEvent.salesPerson || "Sales person pending", icon: "message" },
                        { label: "Setup Date", value: selectedEvent.setupDate || selectedEvent.date ? formatDate(selectedEvent.setupDate || selectedEvent.date) : "Setup date pending", icon: "calendar" },
                        { label: "Location", value: selectedEvent.loc || "Location not added", icon: "image" },
                      ].map((item) => (
                        <div key={item.label} className="event-detail-info-card">
                          <span className="event-detail-field-label event-detail-field-label-with-icon">
                            <span className="event-detail-info-icon" aria-hidden="true">
                              <NavIcon name={item.icon} />
                            </span>
                            {item.label}
                          </span>
                          <div className="event-detail-info-value">{item.value}</div>
                        </div>
                      ))}

                      <div className="event-detail-info-card event-detail-info-card-wide">
                        <span className="event-detail-field-label event-detail-field-label-with-icon">
                          <span className="event-detail-info-icon" aria-hidden="true">
                            <NavIcon name="calendar" />
                          </span>
                          Event Date
                        </span>
                        <div className="event-detail-info-date">
                          <div className="event-detail-info-value">{selectedEvent.date ? formatDate(selectedEvent.date) : "Start date pending"}</div>
                          <span className="event-detail-date-join">to</span>
                          <div className="event-detail-info-value">{selectedEvent.endDate || selectedEvent.date ? formatDate(selectedEvent.endDate || selectedEvent.date) : "End date pending"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="event-detail-description-block">
                      <span className="event-detail-field-label">Description</span>
                      <p>{selectedEvent.desc || selectedEventActivities[0]?.description || "Add a concise event description here."}</p>
                    </div>
                  </article>
                </section>
              )}

                  {eventDetailTab === "activities" && (
                    <section className="event-detail-panel-card">
                      <div className="event-detail-section-header event-detail-section-header-split">
                        <button type="button" className="btn-primary" onClick={addSelectedActivity}>
                          Add activity
                        </button>
                      </div>

                      <div className="event-detail-activities-list">
                        {selectedEventActivities.map((activity, index) => (
                          <div
                            key={`${selectedEvent.id}-activity-${index}`}
                            className={`event-detail-activity-card ${editingActivityNameIndex === index || editingActivityDescriptionIndex === index ? "is-editing" : ""}`}
                          >
                            {(() => {
                              const isEditingActivity =
                                editingActivityNameIndex === index || editingActivityDescriptionIndex === index;

                              return (
                                <>
                                  <div className="event-top event-detail-activity-top">
                                    <div className="event-copy event-detail-activity-copy">
                                      <div className="event-card-header event-detail-activity-header">
                                        <div className="event-detail-activity-header-main">
                                          <div className="event-detail-activity-heading-row">
                                            {isEditingActivity ? (
                                              <label className="event-detail-field event-detail-activity-name-field">
                                                <span className="event-detail-field-label">Activity name</span>
                                                <input
                                                  className="event-detail-activity-input event-detail-activity-name event-title event-detail-activity-title-input"
                                                  id={`activity-name-${index}`}
                                                  type="text"
                                                  value={activity.name}
                                                  placeholder="Enter activity name"
                                                  onChange={(event) => updateSelectedActivityField(index, "name", event.target.value)}
                                                  autoFocus={editingActivityNameIndex === index}
                                                />
                                              </label>
                                            ) : (
                                              <div className="event-title event-detail-activity-heading">
                                                {activity.name || "Enter activity name"}
                                              </div>
                                            )}
                                          </div>
                                          {!isEditingActivity && (
                                            <div className="event-location-line event-detail-activity-subline">
                                              <span>{`Setup: ${activity.setupCount}`}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {isEditingActivity ? (
                                        <label className="event-detail-field">
                                          <span className="event-detail-field-label">Description</span>
                                          <textarea
                                            className="event-detail-activity-input event-detail-activity-input-tall event-detail-activity-description"
                                            id={`activity-description-${index}`}
                                            value={activity.description}
                                            placeholder="Enter activity description..."
                                            onChange={(event) => updateSelectedActivityField(index, "description", event.target.value)}
                                            autoFocus={editingActivityDescriptionIndex === index}
                                          />
                                        </label>
                                      ) : shouldUseActivityDescriptionPreview(activity.description) ? (
                                        <div className="event-detail-activity-description-block">
                                          <div className="event-detail-activity-description-label">Description:</div>
                                          <button
                                            type="button"
                                            className="event-desc event-detail-activity-description event-detail-activity-description-trigger"
                                            onClick={() =>
                                              setActivityDescriptionPreview({
                                                name: activity.name || "Activity",
                                                description: activity.description,
                                                setupCount: activity.setupCount,
                                              })
                                            }
                                          >
                                            {activity.description}
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="event-detail-activity-description-block">
                                          <div className="event-detail-activity-description-label">Description:</div>
                                          <div className="event-desc event-detail-activity-description">
                                            {activity.description || "Enter activity description..."}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="event-actions event-detail-activity-action">
                                      {isEditingActivity ? (
                                        <button
                                          type="button"
                                          className="btn-secondary event-detail-activity-edit-btn"
                                          onClick={() => {
                                            setEditingActivityNameIndex(null);
                                            setEditingActivityDescriptionIndex(null);
                                          }}
                                        >
                                          Done
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn-secondary event-detail-activity-edit-btn"
                                          onClick={() => {
                                            setEditingActivityNameIndex(index);
                                            setEditingActivityDescriptionIndex(index);
                                          }}
                                        >
                                          Edit
                                        </button>
                                      )}
                                      <button type="button" className="btn-delete" onClick={() => deleteSelectedActivity(index)}>
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {isEditingActivity && (
                                    <div className="event-detail-activity-footer">
                                      <div className="event-detail-activity-side">
                                        <label className="event-detail-field">
                                          <span className="event-detail-field-label">Number of setups</span>
                                          <div className="event-detail-setup-stepper">
                                            <button
                                              type="button"
                                              className="event-detail-setup-stepper-btn"
                                              aria-label="Decrease setups"
                                              onClick={() => adjustSelectedActivitySetupCount(index, -1)}
                                            >
                                              -
                                            </button>
                                            <input
                                              className="event-detail-activity-input event-detail-setup-input"
                                              id={`activity-setup-${index}`}
                                              type="number"
                                              min="1"
                                              value={activity.setupCount}
                                              onFocus={(event) => {
                                                if (String(event.target.value) === "1") {
                                                  updateSelectedActivityField(index, "setupCount", "");
                                                }
                                              }}
                                              onChange={(event) =>
                                                updateSelectedActivityField(
                                                  index,
                                                  "setupCount",
                                                  event.target.value === "" ? "" : Math.max(1, Number(event.target.value) || 1),
                                                )
                                              }
                                              onBlur={(event) => {
                                                if (event.target.value === "") {
                                                  updateSelectedActivityField(index, "setupCount", 1);
                                                }
                                              }}
                                            />
                                            <button
                                              type="button"
                                              className="event-detail-setup-stepper-btn"
                                              aria-label="Increase setups"
                                              onClick={() => adjustSelectedActivitySetupCount(index, 1)}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </label>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {eventDetailTab === "reviews" && (
                    <section className="event-detail-panel-card">
                      {selectedEvent.reviews.length ? (
                        <>
                          <section className="reviews-table-panel event-detail-submitted-reviews">
                            <ReadOnlyReviewSplitTables
                              event={selectedEvent}
                              reviewUsers={selectedEventTableUsers}
                              feedbackQuestions={FEEDBACK_QUESTIONS}
                              ratingQuestions={reviewQuestions}
                              onDeleteReview={(review) => deleteReviewFromEvent(selectedEvent.id, review)}
                              activeStarBadge={activeStarBadge}
                              onActivateStarBadge={triggerStarBadge}
                              plainStars
                              dashboardLayout
                            />
                          </section>
                        </>
                      ) : (
                        <div className="event-detail-review-empty">
                          <h3>No reviews submitted</h3>
                          <p>Once the team submits feedback, the overall rating, remarks, feedback table, and rating table will appear here.</p>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => openFeedbackFormForEvent(selectedEvent.id)}
                          >
                            Add reviews
                          </button>
                        </div>
                      )}
                    </section>
                  )}

                  {eventDetailTab === "media" && (
                    <section className="event-detail-panel-card">
                      <div className="event-detail-section-header">
                        <div>
                          <h2 className="event-detail-section-title">Upload photos or videos</h2>
                        </div>
                      </div>

                      {mediaSuccess && <div className="success-banner compact">{mediaSuccess}</div>}

                      <div className="event-detail-media-actions">
                        <button
                          type="button"
                          className="event-detail-upload-button"
                          onClick={() => {
                            setMediaEventId(String(selectedEvent.id));
                            eventDetailMediaInputRef.current?.click();
                          }}
                        >
                          <span className="event-detail-upload-icon">+</span>
                          <span>Add photos or videos</span>
                        </button>
                        <input
                          ref={eventDetailMediaInputRef}
                          id="event-detail-media"
                          className="hidden-file-input"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onClick={() => setMediaEventId(String(selectedEvent.id))}
                          onChange={(event) => {
                            setMediaEventId(String(selectedEvent.id));
                            queueEventDetailMedia(event);
                          }}
                        />
                        <button type="button" className="btn-primary" onClick={submitEventDetailMedia}>
                          Submit
                        </button>
                      </div>

                      {pendingEventMediaFiles.length > 0 && (
                        <div className="event-detail-pending-files">
                          {pendingEventMediaFiles.map((file) => (
                            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="event-detail-pending-file">
                              {file.name}
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedEventMediaItems.length ? (
                        <div className="event-detail-media-grid">
                          {selectedEventMediaItems.map((photo) => (
                            <div key={photo.id} className="photo-card">
                              {renderMediaThumb(photo, { selectable: false, allowPreviewDownload: false })}
                              <button
                                type="button"
                                className="btn-secondary media-delete-btn"
                                onClick={() => deleteMediaItem(photo.id)}
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="event-detail-empty-panel">
                          No photos or videos uploaded yet. Use the add option above.
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </div>
            </div>

            <aside className="event-detail-side-summary event-detail-right-rail">
                <h3>Other events</h3>
                <p>Quickly jump to another event from here.</p>
                <div className="event-detail-other-events">
                  {otherEventSuggestions.length ? (
                    otherEventSuggestions.map((event) => (
                      <div
                        key={`event-detail-side-${event.id}`}
                        className="event-detail-other-event-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => openEventDetail(event.id)}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                            keyboardEvent.preventDefault();
                            openEventDetail(event.id);
                          }
                        }}
                      >
                        <strong>{event.title}</strong>
                        <span>{event.projectId || "Project ID pending"}</span>
                        <span>{event.loc || "Location not added"}</span>
                        <span>{formatEventDateRange(event)}</span>
                        <button
                          type="button"
                          className="event-detail-other-event-open"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            openEventDetail(event.id);
                          }}
                        >
                          Full expand
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="event-detail-other-event-empty">No other events available.</div>
                  )}
                </div>
            </aside>
          </div>
          </main>
        )}

        {activePage === "feedback" && (
          <main className="page feedback-simple-page feedback-page elevated-page">
          {!isFeedbackFormOpen ? (
            <section className="review-spread-card glass-card feedback-event-picker">
              <div className="panel-heading">
                <div>
                  <div className="panel-title">Submit your review</div>
                  <div className="panel-subtitle">Choose an event and start the review from here.</div>
                </div>
                <form
                  className="dashboard-search feedback-search"
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setFeedbackSearchQuery(feedbackSearchInput);
                  }}
                >
                  <input
                    type="search"
                    value={feedbackSearchInput}
                    placeholder="Search event, project ID, location..."
                    onChange={(event) => setFeedbackSearchInput(event.target.value)}
                  />
                  <button type="submit" className="btn-primary dashboard-search-btn">
                    <NavIcon name="search" />
                    Search
                  </button>
                </form>
              </div>

              {reviewSuccess && <div className="success-banner compact">{reviewSuccess}</div>}

              {filteredPendingFeedbackEvents.length ? (
                <div className="feedback-event-list">
                  {filteredPendingFeedbackEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="feedback-event-option"
                    onClick={() => openFeedbackFormForEvent(event.id)}
                  >
                    <span className="feedback-event-name">{event.title}</span>
                    <span className={`feedback-event-condition ${getFeedbackEventCondition(event).toLowerCase()}`}>
                      {getFeedbackEventCondition(event)}
                    </span>
                  </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No pending events match your search.</div>
              )}
            </section>
          ) : (
            <>
          <section className="review-spread-card glass-card">
              <div className="panel-heading">
                <div className="feedback-event-header">
                  {feedbackSelectedEvent && (
                    <div className="feedback-selected-event-header">
                      <div className="feedback-subheader">{feedbackSelectedEvent.title}</div>
                    </div>
                  )}
                </div>
                <div className="feedback-form-actions">
                  <button
                    type="button"
                    className="btn-secondary feedback-icon-btn back-nav-btn back-nav-btn-compact"
                    onClick={() => {
                      setIsFeedbackFormOpen(false);
                      if (feedbackReturnPage === "eventDetail") {
                        setActivePage("eventDetail");
                      }
                    }}
                    aria-label="Back to events"
                    title="Back to events"
                  >
                    <NavIcon name="arrowLeft" />
                  </button>
                  {!isPublicReviewMode && (
                    <button
                      type="button"
                      className="btn-secondary feedback-icon-btn"
                      onClick={startEditingQuestions}
                      aria-label="Edit questions"
                      title="Edit questions"
                    >
                      <NavIcon name="edit" />
                    </button>
                  )}
                </div>
              </div>

              {reviewSuccess && <div className="success-banner compact">{reviewSuccess}</div>}

              {!isPublicReviewMode && isEditingQuestions && (
                <div className="question-editor-panel">
                  {questionDrafts.map((question, index) => (
                    <label key={`question-editor-${index}`} className="question-editor-field">
                      <span>{`Question ${index + 1}`}</span>
                      <textarea
                        value={question}
                        onChange={(event) => updateQuestionDraft(index, event.target.value)}
                      />
                    </label>
                  ))}
                  <div className="question-editor-actions">
                    <button type="button" className="btn-secondary" onClick={cancelEditingQuestions}>
                      Cancel
                    </button>
                    <button type="button" className="btn-primary" onClick={saveQuestionDrafts}>
                      Save questions
                    </button>
                  </div>
                </div>
              )}

              <div className="detail-review-stack">
                {reviewSuccess && <div className="success-banner compact">{reviewSuccess}</div>}
                <div className="reviews-table-wrap detail-review-table-wrap">
                  <div className="detail-table-section">
                    <div className="detail-table-heading">
                      <div className="ev-name">Feedback</div>
                    </div>
                    <table className="rev-table review-compare-table detail-split-table">
                      <thead>
                        <tr>
                          <th className="q-num" style={REVIEW_TABLE_HEADER_STYLE}>#</th>
                          <th className="question-heading" style={REVIEW_TABLE_HEADER_STYLE}>Questions</th>
                          {feedbackOpenReviewerSlots.map(({ slotIndex: reviewIndex }) => (
                            <th key={`feedback-feedback-head-${reviewIndex}`} className="reviewer-heading-cell">
                              <div className="reviewer-heading">
                                <label className="reviewer-slot-entry">
                                  <span className="reviewer-slot-label">{`${getReviewerRoleLabel(reviewIndex)}:`}</span>
                                  <input
                                    type="text"
                                    className="reviewer-slot-input reviewer-name-input"
                                    value={feedbackDrafts[reviewIndex].reviewerName}
                                    placeholder="Enter name"
                                    onChange={(event) => updateFeedbackDraftReviewerName(reviewIndex, event.target.value)}
                                  />
                                </label>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {FEEDBACK_QUESTIONS.map((question, index) => (
                          <tr key={`feedback-feedback-${question}`}>
                            <td className="q-num">{index + 1}</td>
                            <td className="q-cell">
                              <QuestionCell
                                question={question}
                                description={FEEDBACK_QUESTION_DESCRIPTIONS[index]}
                              />
                            </td>
                            {feedbackOpenReviewerSlots.map(({ slotIndex: reviewIndex }) => (
                              (() => {
                                const cellId = `feedback-feedback-${reviewIndex}-${index}`;
                                const cellValue = feedbackDrafts[reviewIndex].answers[index];

                                return (
                                  <td key={cellId} className="answer-cell">
                                    <textarea
                                      id={cellId}
                                      ref={resizeFeedbackTextarea}
                                      className="entry-answer-input detail-comment-input feedback-answer-input"
                                      value={cellValue}
                                      placeholder="Click to add feedback..."
                                      rows={1}
                                      onChange={(event) => {
                                        setReviewSuccess("");
                                        resizeFeedbackTextarea(event.target);
                                        updateFeedbackDraftAnswer(reviewIndex, index, event.target.value);
                                      }}
                                    />
                                  </td>
                                );
                              })()
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="detail-table-gap" />

                <div className="reviews-table-wrap detail-review-table-wrap">
                  <div className="detail-table-section">
                    <div className="detail-table-heading">
                      <div className="ev-name">Rating Table</div>
                    </div>
                    <table className="rev-table review-compare-table detail-split-table">
                      <thead>
                        <tr>
                          <th className="q-num" style={REVIEW_TABLE_HEADER_STYLE}>#</th>
                          <th className="question-heading" style={REVIEW_TABLE_HEADER_STYLE}>Questions</th>
                          {feedbackOpenReviewerSlots.map(({ slotIndex: reviewIndex }) => (
                            <th key={`feedback-head-${reviewIndex}`} className="reviewer-heading-cell">
                              <div className="reviewer-heading">
                                <label className="reviewer-slot-entry">
                                  <span className="reviewer-slot-label">{`${getReviewerRoleLabel(reviewIndex)}:`}</span>
                                  <input
                                    type="text"
                                    className="reviewer-slot-input reviewer-name-input"
                                    value={feedbackDrafts[reviewIndex].reviewerName}
                                    placeholder="Enter name"
                                    onChange={(event) => updateFeedbackDraftReviewerName(reviewIndex, event.target.value)}
                                  />
                                </label>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reviewQuestions.map((question, index) => (
                          <tr key={`feedback-rating-${question}`}>
                            <td className="q-num">{index + 1}</td>
                            <td className="q-cell">
                              <QuestionCell
                                question={question}
                                description={RATING_QUESTION_DESCRIPTIONS[index]}
                              />
                            </td>
                            {feedbackOpenReviewerSlots.map(({ slotIndex: reviewIndex }) => (
                              <td key={`feedback-rating-${reviewIndex}-${index}`} className="answer-cell rating-only-cell">
                                <StarRatingInput
                                  inputId={`feedback-rating-${reviewIndex}-${index}`}
                                  value={feedbackDrafts[reviewIndex].questionRatings[index]}
                                  activeStarBadge={activeStarBadge}
                                  onActivate={triggerStarBadge}
                                  onChange={(value) => {
                                    setReviewSuccess("");
                                    updateFeedbackDraftRating(reviewIndex, index, value);
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="detail-review-submit detail-review-submit-between">
                  <div className="detail-review-submit-grid feedback-submit-grid">
                    {feedbackOpenReviewerSlots.map(({ slotIndex: reviewIndex }) => (
                      <button
                        key={`feedback-submit-${reviewIndex}`}
                        type="button"
                        className={`btn-primary reviewer-submit-action reviewer-slot-${reviewIndex}`}
                        onClick={() => submitFeedbackReview(reviewIndex)}
                      >
                        Submit
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overall-remark-section">
                  <div className="detail-table-heading">
                    <div className="ev-name">Total rating</div>
                  </div>
                  <div className="overall-remark-grid">
                    {feedbackOpenReviewerSlots.map(({ slotIndex: reviewIndex }) => (
                      <article key={`feedback-total-${reviewIndex}`} className="overall-remark-card">
                        <span>{getReviewerHeaderLabel(null, reviewIndex)}</span>
                        <div className="overall-remark-summary">
                          <strong>{getTotalRatingValue(feedbackDrafts[reviewIndex].questionRatings)}</strong>
                        </div>
                      </article>
                    ))}
                    <article className="overall-remark-card overall-summary-card">
                      <span>Overall rating</span>
                      <div className="overall-remark-summary">
                        <strong>{feedbackOverallSummary.total}</strong>
                      </div>
                      <p>{feedbackOverallSummary.remark}</p>
                    </article>
                  </div>
                </div>
              </div>
          </section>

          <section className="review-spread-card glass-card">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Upload Photos or Videos</div>
              </div>
            </div>

            {mediaSuccess && <div className="success-banner compact">{mediaSuccess}</div>}

            <div className="event-upload-actions">
              <label htmlFor="feedback-media" className="upload-add-button">
                <span className="upload-add-icon">+</span>
                <span>Add photos or videos</span>
              </label>
              <input
                id="feedback-media"
                ref={feedbackMediaInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={queueFeedbackMedia}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={submitFeedbackMedia}
              >
                Submit
              </button>
            </div>

            {pendingFeedbackMediaFiles.length > 0 && (
              <div className="pending-upload-list">
                {pendingFeedbackMediaFiles.map((file) => (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="pending-upload-item">
                    {file.name}
                  </div>
                ))}
              </div>
            )}

          </section>
            </>
          )}
          </main>
        )}

        {activePage === "photos" && (
          <main className="page photos-page elevated-page">
          <div className="section-header">
            <div>
              <div className="section-title">Media library</div>
            </div>
          </div>
          <section className="media-upload-panel glass-card">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Public media upload</div>
              </div>
            </div>
            {mediaSuccess && <div className="success-banner compact">{mediaSuccess}</div>}
            <div className="media-upload-controls">
              <div className="form-group">
                <label htmlFor="mediaEvent">Event</label>
                <select
                  id="mediaEvent"
                  value={mediaEventId}
                  onChange={(uploadEvent) => {
                    setMediaSuccess("");
                    setMediaEventId(uploadEvent.target.value);
                  }}
                >
                  {publicReviewEvents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="mediaFiles">Photos or videos</label>
                <input
                  id="mediaFiles"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                />
              </div>
              {eventMediaItems.some((item) => item.url) && (
                <div className="media-download-toolbar media-download-all-btn">
                  <span>{getSelectedVisibleMediaItems(eventMediaItems).length} selected</span>
                  <button
                    type="button"
                    className="btn-secondary media-download-btn"
                    onClick={() => toggleAllVisibleMedia(eventMediaItems)}
                  >
                    {getSelectedVisibleMediaItems(eventMediaItems).length === eventMediaItems.filter((item) => item.url).length
                      ? "Clear"
                      : "Select all"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary media-download-btn"
                    onClick={() => downloadMediaItems(getDownloadableMediaItems(eventMediaItems))}
                  >
                    <NavIcon name="download" />
                    Download
                  </button>
                </div>
              )}
            </div>
          </section>
          {eventMediaItems.length ? (
            <div className="photos-grid">
              {eventMediaItems.map((photo) => (
                <div key={photo.id} className="photo-card">
                  {renderMediaThumb(photo)}
                  <button
                    type="button"
                    className="btn-secondary media-delete-btn"
                    onClick={() => deleteMediaItem(photo.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No media yet for this event. Upload the first photo or video above.</div>
          )}
          </main>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-heading">
              <span className="eyebrow">Create record</span>
              <h3>{editingEventId !== null ? "Edit event" : "Add new event"}</h3>
              <p>
                {editingEventId !== null
                  ? "Update the event name, executor, sales person, dates, and location."
                  : "Capture the event name, executor, sales person, dates, and location now."}
              </p>
            </div>
            <div className="form-group">
              <label htmlFor="title">Event name *</label>
              <input
                id="title"
                type="text"
                value={form.title}
                placeholder="e.g. Annual Tech Summit"
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="desc">Description</label>
              <textarea
                id="desc"
                value={form.desc}
                placeholder="Brief description of the event..."
                onChange={(event) => setForm({ ...form, desc: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="projectId">Project ID</label>
              <input
                id="projectId"
                type="text"
                value={form.projectId}
                placeholder={`e.g. ${PROJECT_ID_PREFIX}/001`}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="clientName">Client Name</label>
              <input
                id="clientName"
                type="text"
                value={form.clientName}
                placeholder="e.g. Acme Corp"
                onChange={(event) => setForm({ ...form, clientName: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="setupDate">Setup Date</label>
              <input
                id="setupDate"
                type="date"
                value={form.setupDate}
                onChange={(event) => setForm({ ...form, setupDate: event.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">From date</label>
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      date: event.target.value,
                      endDate: form.endDate && form.endDate >= event.target.value ? form.endDate : event.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">To date</label>
                <input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  min={form.date}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="attendeeName">Event executor</label>
              <input
                id="attendeeName"
                type="text"
                value={form.attendeeName}
                placeholder="e.g. Rohit Sharma"
                onChange={(event) => setForm({ ...form, attendeeName: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="salesPerson">Sales Person</label>
              <input
                id="salesPerson"
                type="text"
                value={form.salesPerson}
                placeholder="e.g. Abhi"
                onChange={(event) => setForm({ ...form, salesPerson: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="loc">Location</label>
              <input
                id="loc"
                type="text"
                value={form.loc}
                placeholder="e.g. Bengaluru Convention Centre"
                onChange={(event) => setForm({ ...form, loc: event.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveEvent}>
                {editingEventId !== null ? "Save changes" : "Add event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewMediaItem && (
        <div
          className="media-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={previewMediaItem.label}
          onClick={(event) => event.target === event.currentTarget && setPreviewMediaItem(null)}
        >
          <div className="media-lightbox">
            <button
              type="button"
              className="media-lightbox-close"
              onClick={() => setPreviewMediaItem(null)}
              aria-label="Close larger image"
            >
              x
            </button>
            {previewMediaItem.allowDownload !== false && (
              <button
                type="button"
                className="media-lightbox-download"
                onClick={() => downloadMediaItem(previewMediaItem)}
                aria-label={`Download ${previewMediaItem.label}`}
              >
                <NavIcon name="download" />
              </button>
            )}
            {previewMediaItem.type === "video" ? (
              <video className="media-lightbox-video" controls autoPlay>
                <source src={previewMediaItem.url} />
              </video>
            ) : (
              <img src={previewMediaItem.url} alt={previewMediaItem.label} />
            )}
            <div className="media-lightbox-caption">
              <span>{previewMediaItem.event}</span>
              <span>{formatDate(previewMediaItem.date)}</span>
            </div>
          </div>
        </div>
      )}

      {activityDescriptionPreview && (
        <div
          className="activity-description-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={activityDescriptionPreview.name}
          onClick={(event) => event.target === event.currentTarget && setActivityDescriptionPreview(null)}
        >
          <div className="activity-description-panel">
            <button
              type="button"
              className="activity-description-close"
              aria-label="Close activity description"
              onClick={() => setActivityDescriptionPreview(null)}
            >
              ×
            </button>
            <div className="activity-description-kicker">{`Setup ${activityDescriptionPreview.setupCount}`}</div>
            <h3>{activityDescriptionPreview.name}</h3>
            <p>{activityDescriptionPreview.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-topline">
        <div className="stat-label">{label}</div>
        <div className={`stat-dot ${tone}`} />
      </div>
      <div className={`stat-value ${tone}`}>{value}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  );
}

function NavIcon({ name }) {
  const iconPaths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="15" width="7" height="6" rx="1.5" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3v4" />
        <path d="M17 3v4" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M4 10h16" />
        <path d="M8 14h3" />
        <path d="M13 14h3" />
        <path d="M8 18h3" />
      </>
    ),
    star: (
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    ),
    message: (
      <>
        <path d="M5 5h14v10H8l-3 3V5Z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
      </>
    ),
    image: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m4 16 4.5-4 3.5 3 2.5-2.5L20 17" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    arrowLeft: (
      <>
        <path d="M19 12H5" />
        <path d="m12 5-7 7 7 7" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v10" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 20h14" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
        <path d="M13.5 7.5l3 3" />
      </>
    ),
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="summary-card glass-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      <div className="summary-detail">{detail}</div>
    </article>
  );
}

function EventCard({
  event,
  showActions = false,
  onDelete,
  onEdit,
  onOpen,
  compact = false,
  dashboardEditOnly = false,
}) {
  const averageRating = getAverageRating(event.reviews);
  const showDashboardSummary = dashboardEditOnly;

  return (
    <article
      className={`event-card ${onOpen ? "clickable-card" : ""}`}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Open event details for ${event.title}` : undefined}
      onClick={() => {
        onOpen?.(event.id);
      }}
      onKeyDown={(eventKey) => {
        if (!onOpen || eventKey.target !== eventKey.currentTarget) {
          return;
        }

        if (eventKey.key === "Enter" || eventKey.key === " ") {
          eventKey.preventDefault();
          onOpen(event.id);
        }
      }}
    >
      <div className="event-timeline-body">
          <div className="event-top">
            <div className="event-copy">
              <div className="event-card-header">
                <div>
                  <div className="event-title">{event.title}</div>
                  <div className="event-location-line">
                    <span>{event.loc}</span>
                    <span className="event-inline-separator">|</span>
                    <span>{formatEventDateRange(event)}</span>
                  </div>
                </div>
              </div>
            </div>
            {(showActions || dashboardEditOnly) && (
              <div className="event-actions">
                {!showActions && (
                  <span className={`event-status-chip status-${event.status}`}>
                    {formatStatusLabel(event.status)}
                  </span>
                )}
                {onEdit && (
                  <button
                    type="button"
                    className="btn-secondary event-edit-btn"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onEdit(event);
                    }}
                  >
                    Edit
                  </button>
                )}
                {showActions && (
                  <span className={`event-status-chip status-${event.status}`}>
                    {formatStatusLabel(event.status)}
                  </span>
                )}
                {showActions && onDelete && (
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onDelete(event.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
          {!compact && !showDashboardSummary && (
            <div className="event-stats-inline">
              <span className="event-stats-rating">{`Avg rating ${averageRating ? averageRating.toFixed(1) : "-"}`}</span>
            </div>
          )}
          {compact && (
            <div className="event-footer compact-footer">
              <div className="event-metric">
                <strong>{formatEventDateRange(event)}</strong>
                <span>Event date</span>
              </div>
            </div>
          )}
          {onOpen && !showDashboardSummary && <div className="event-open-hint">Open full event page</div>}
      </div>
    </article>
  );
}

function EventInfoTile({ label, value }) {
  return (
    <div className="event-info-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EventSimpleRow({ event, onDelete, onEdit, onOpen, showActions = false }) {
  const displayStatus = getEventDisplayStatus(event);
  const averageRating = getAverageRating(event.reviews);

  return (
    <article
      className="events-simple-row"
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Open event details for ${event.title}` : undefined}
      onClick={() => onOpen?.(event.id)}
      onKeyDown={(eventKey) => {
        if (!onOpen || eventKey.target !== eventKey.currentTarget) {
          return;
        }

        if (eventKey.key === "Enter" || eventKey.key === " ") {
          eventKey.preventDefault();
          onOpen(event.id);
        }
      }}
    >
      <div className="events-simple-top">
        <div className="events-simple-main">
          <strong>{event.title}</strong>
          <small>{event.projectId || "No project ID"}</small>
        </div>
        <div className="events-simple-side">
          <span className="events-simple-meta-item">
            <label>Status</label>
            <span className={`events-simple-status status-${displayStatus}`}>
              {STATUS_LABELS[displayStatus] ?? "Inactive"}
            </span>
          </span>
          {showActions && (
            <span className="events-simple-actions">
              {onEdit && (
                <button
                  type="button"
                  className="btn-secondary event-edit-btn"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEdit(event);
                  }}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="btn-delete"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onDelete(event.id);
                  }}
                >
                  Delete
                </button>
              )}
            </span>
          )}
        </div>
      </div>
      <div className="events-simple-meta">
        <span className="events-simple-meta-item">
          <label>Executor</label>
          <strong>{event.attendeeName || "-"}</strong>
        </span>
        <span className="events-simple-meta-item">
          <label>Date</label>
          <strong>{formatEventDateRange(event)}</strong>
        </span>
        <span className="events-simple-meta-item">
          <label>Location</label>
          <strong>{event.loc || "-"}</strong>
        </span>
        <span className="events-simple-meta-item">
          <label>Reviews</label>
          <strong>{event.reviews.length}</strong>
        </span>
        <span className="events-simple-meta-item">
          <label>Average</label>
          <strong>{averageRating ? averageRating.toFixed(1) : "-"}</strong>
        </span>
      </div>
      <div className="events-simple-open-note">
        Open full event page
      </div>
    </article>
  );
}

export default App;
