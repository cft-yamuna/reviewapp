
import { useEffect, useState } from "react";
import "./App.css";
import { isSupabaseConfigured, supabase, SUPABASE_BUCKET } from "./supabaseClient";

const STAR = "\u2605";

const REVIEW_QUESTIONS = [
  "How would you rate the overall experience?",
  "How was the venue and facilities?",
  "How was the content / programme quality?",
  "How would you rate the organisation and logistics?",
  "Would you recommend this event to others?",
];

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  submitted: "Submitted",
};

const STATUS_TONES = {
  active: "green",
  inactive: "slate",
  submitted: "blue",
};

const INITIAL_EVENTS = [
  {
    id: 1,
    title: "Annual Tech Summit 2024",
    desc: "A full-day conference bringing together industry leaders to discuss emerging technologies and innovation trends.",
    date: "2024-03-15",
    loc: "Bengaluru Convention Centre",
    projectTitle: "",
    attendeeName: "",
    status: "active",
    photos: 0,
    reviews: [],
  },
  {
    id: 2,
    title: "Product Design Workshop",
    desc: "Hands-on workshop covering UX research methods, prototyping techniques, and usability testing.",
    date: "2024-04-02",
    loc: "CoWork Hub, Koramangala",
    projectTitle: "",
    attendeeName: "",
    status: "active",
    photos: 0,
    reviews: [],
  },
  {
    id: 3,
    title: "Startup Pitch Night",
    desc: "Emerging startups present their ideas to a panel of investors and industry mentors.",
    date: "2024-04-20",
    loc: "91Springboard, HSR Layout",
    projectTitle: "",
    attendeeName: "",
    status: "pending",
    photos: 0,
    reviews: [],
  },
  {
    id: 4,
    title: "Cultural Evening Gala",
    desc: "An evening celebrating art, music and food from across Karnataka, featuring live performances.",
    date: "2024-02-10",
    loc: "Lalit Ashok Hotel",
    projectTitle: "",
    attendeeName: "",
    status: "inactive",
    photos: 0,
    reviews: [],
  },
];

const INITIAL_FORM = {
  title: "",
  desc: "",
  date: new Date().toISOString().slice(0, 10),
  loc: "",
  projectTitle: "",
  attendeeName: "",
};

const INITIAL_REVIEW_FORM = {
  eventId: "",
  author: "",
  rating: 5,
  questionRatings: REVIEW_QUESTIONS.map(() => 0),
  answers: REVIEW_QUESTIONS.map(() => ""),
};

const MEDIA_TONES = ["ocean", "gold", "forest", "coral"];

function createEmptyDetailDraft() {
  return {
    questionRatings: REVIEW_QUESTIONS.map(() => 0),
    answers: REVIEW_QUESTIONS.map(() => ""),
  };
}

function createInitialMediaItems(events) {
  return [];
}

function normalizeReview(review = {}) {
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
      ? review.questionRatings.map((value) => Number(value ?? 0))
      : REVIEW_QUESTIONS.map(() => 0),
    answers: Array.isArray(review.answers)
      ? REVIEW_QUESTIONS.map((_, index) => review.answers[index] ?? "")
      : REVIEW_QUESTIONS.map(() => ""),
  };
}

function mapDbEvent(record) {
  return {
    id: Number(record.id),
    title: record.title,
    desc: record.desc ?? "No description provided.",
    date: record.date,
    loc: record.loc ?? "TBD",
    projectTitle: record.project_title ?? "",
    attendeeName: record.attendee_name ?? "",
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
    desc: event.desc ?? "",
    date: event.date,
    loc: event.loc ?? "",
    project_title: event.projectTitle ?? "",
    attendee_name: event.attendeeName ?? "",
    status: event.status ?? "active",
    photos: Number(event.photos ?? 0),
    reviews: Array.isArray(event.reviews) ? event.reviews : [],
    updated_at: new Date().toISOString(),
  };

  if (includeId) {
    payload.id = Number(event.id);
  }

  return payload;
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
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
      <span className="rating-text">{text}</span>
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
            }
          : undefined
      }
      aria-label={`${value} star${value > 1 ? "s" : ""}`}
      aria-pressed={selected}
    >
      <span className="star-input-glyph" aria-hidden="true">
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
}) {
  const [hoveredValue, setHoveredValue] = useState(0);
  const visibleValue = hoveredValue || value;

  return (
    <div
      className="star-input-group"
      role="radiogroup"
      aria-label="Select rating"
      onMouseLeave={() => setHoveredValue(0)}
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
        />
      ))}
    </div>
  );
}

function getQuestionRating(review, index) {
  return review.questionRatings?.[index] ?? review.rating ?? 0;
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
  activeStarBadge,
  onActivateStarBadge,
}) {
  return (
    <div className="reviews-table-wrap detail-review-table-wrap">
      <div className="detail-table-section">
        <div className="detail-table-heading">
          <div className="ev-name">Ratings Table</div>
          <div className="ev-meta">5 questions with 3 reviewers shown across the same row.</div>
        </div>
        <table className="rev-table review-compare-table detail-split-table">
          <thead>
            <tr>
              <th className="q-num">#</th>
              <th className="question-heading">Question</th>
              {reviewUsers.map((review, reviewIndex) => (
                <th key={`${event.id}-readonly-rating-head-${reviewIndex}`} className="reviewer-heading-cell">
                  <div className="reviewer-heading">
                    <div className={`avatar ${review?.avatar ?? "a"}`}>{review?.initials ?? `R${reviewIndex + 1}`}</div>
                    <div>
                      <div className="reviewer-head-name">{`Reviewer ${reviewIndex + 1}`}</div>
                      <div className="reviewer-label-muted">{review ? review.author : "Waiting for input"}</div>
                      {review ? (
                        <div className="reviewer-head-stars">
                          <InteractiveRatingBadge
                            badgeId={`${event.id}-readonly-head-${reviewIndex}`}
                            rating={review.rating}
                            text={`${review.rating} out of 5`}
                            activeStarBadge={activeStarBadge}
                            onActivate={onActivateStarBadge}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REVIEW_QUESTIONS.map((question, index) => (
              <tr key={`${event.id}-${question}-readonly-rating-row`}>
                <td className="q-num">{index + 1}</td>
                <td className="q-cell">{question}</td>
                {reviewUsers.map((review, reviewIndex) => (
                  <td key={`${event.id}-readonly-rating-${reviewIndex}-${index}`} className="answer-cell rating-only-cell">
                    {review ? (
                      <InteractiveRatingBadge
                        badgeId={`${event.id}-readonly-question-${reviewIndex}-${index}`}
                        rating={getQuestionRating(review, index)}
                        text={`${getQuestionRating(review, index)}/5`}
                        compact
                        activeStarBadge={activeStarBadge}
                        onActivate={onActivateStarBadge}
                      />
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

      <div className="detail-table-gap" />

      <div className="detail-table-section">
        <div className="detail-table-heading">
          <div className="ev-name">Comments Table</div>
          <div className="ev-meta">The same 5 questions and the same 3 reviewers, with comments only.</div>
        </div>
        <table className="rev-table review-compare-table detail-split-table">
          <thead>
            <tr>
              <th className="q-num">#</th>
              <th className="question-heading">Question</th>
              {reviewUsers.map((review, reviewIndex) => (
                <th key={`${event.id}-readonly-comment-head-${reviewIndex}`} className="reviewer-heading-cell">
                  <div className="reviewer-heading">
                    <div className={`avatar ${review?.avatar ?? "a"}`}>{review?.initials ?? `R${reviewIndex + 1}`}</div>
                    <div>
                      <div className="reviewer-head-name">{`Reviewer ${reviewIndex + 1}`}</div>
                      <div className="reviewer-label-muted">{review ? review.author : "Waiting for input"}</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REVIEW_QUESTIONS.map((question, index) => (
              <tr key={`${event.id}-${question}-readonly-comment-row`}>
                <td className="q-num">{index + 1}</td>
                <td className="q-cell">{question}</td>
                {reviewUsers.map((review, reviewIndex) => (
                  <td key={`${event.id}-readonly-comment-${reviewIndex}-${index}`} className="answer-cell">
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
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextId, setNextId] = useState(INITIAL_EVENTS.length + 1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingEventId, setEditingEventId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    ...INITIAL_REVIEW_FORM,
    eventId: String(INITIAL_EVENTS.find((event) => event.status === "active")?.id ?? INITIAL_EVENTS[0].id),
  });
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [selectedReviewEventId, setSelectedReviewEventId] = useState(String(INITIAL_EVENTS[0].id));
  const [selectedEventId, setSelectedEventId] = useState(String(INITIAL_EVENTS[0].id));
  const [detailDrafts, setDetailDrafts] = useState(() =>
    Array.from({ length: 3 }, () => createEmptyDetailDraft()),
  );
  const [feedbackDrafts, setFeedbackDrafts] = useState(() =>
    Array.from({ length: 3 }, () => createEmptyDetailDraft()),
  );
  const [mediaItems, setMediaItems] = useState(() => createInitialMediaItems(INITIAL_EVENTS));
  const [mediaEventId, setMediaEventId] = useState(
    String(INITIAL_EVENTS.find((event) => event.status !== "inactive")?.id ?? INITIAL_EVENTS[0].id),
  );
  const [pendingEventMediaFiles, setPendingEventMediaFiles] = useState([]);
  const [pendingFeedbackMediaFiles, setPendingFeedbackMediaFiles] = useState([]);
  const [mediaSuccess, setMediaSuccess] = useState("");
  const [activeStarBadge, setActiveStarBadge] = useState({ id: "", x: "50%", y: "50%" });
  const [syncError, setSyncError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined;
    }

    let ignore = false;

    const loadRemoteData = async () => {
      setIsSyncing(true);
      setSyncError("");

      const fetchEvents = async () =>
        supabase.from("events").select("*").order("id", { ascending: true });
      const fetchMedia = async () =>
        supabase.from("media_items").select("*").order("created_at", { ascending: false });

      let [{ data: eventRows, error: eventsError }, { data: mediaRows, error: mediaError }] =
        await Promise.all([fetchEvents(), fetchMedia()]);

      if (eventsError || mediaError) {
        if (!ignore) {
          setSyncError(
            "Supabase is connected, but the tables or storage setup are missing. Run supabase-setup.sql first.",
          );
          setIsSyncing(false);
        }
        return;
      }

      if (!eventRows.length) {
        const seedPayload = INITIAL_EVENTS.map((event) => toEventPayload(event, false));
        const { error: seedError } = await supabase.from("events").insert(seedPayload);

        if (seedError) {
          if (!ignore) {
            setSyncError("Could not seed initial events into Supabase.");
            setIsSyncing(false);
          }
          return;
        }

        [{ data: eventRows, error: eventsError }, { data: mediaRows, error: mediaError }] =
          await Promise.all([fetchEvents(), fetchMedia()]);

        if (eventsError || mediaError) {
          if (!ignore) {
            setSyncError("Supabase setup finished, but loading the new data failed.");
            setIsSyncing(false);
          }
          return;
        }
      }

      if (!ignore) {
        const mappedEvents = eventRows.map(mapDbEvent);
        const mappedMedia = mediaRows.map(mapDbMediaItem);
        setEvents(mappedEvents);
        setMediaItems(mappedMedia);
        setNextId(mappedEvents.reduce((maxId, event) => Math.max(maxId, event.id), 0) + 1);
        if (mappedEvents.length) {
          setSelectedEventId(String(mappedEvents[0].id));
          setSelectedReviewEventId(
            String(mappedEvents.find((event) => event.reviews.length > 0)?.id ?? mappedEvents[0].id),
          );
          setReviewForm((current) => ({
            ...current,
            eventId: String(mappedEvents.find((event) => event.status === "active")?.id ?? mappedEvents[0].id),
          }));
          setMediaEventId(
            String(mappedEvents.find((event) => event.status !== "inactive")?.id ?? mappedEvents[0].id),
          );
        }
        setIsSyncing(false);
      }
    };

    loadRemoteData();

    return () => {
      ignore = true;
    };
  }, []);

  const totalReviews = events.reduce((count, event) => count + event.reviews.length, 0);
  const totalPhotos = mediaItems.length;
  const dashboardEvents = events.slice(0, 3);
  const publicReviewEvents = events.filter((event) => event.status !== "inactive");
  const eventsWithReviews = events.filter((event) => event.reviews.length > 0);

  const selectedMediaEvent =
    publicReviewEvents.find((event) => String(event.id) === mediaEventId) ?? publicReviewEvents[0] ?? null;
  const selectedReviewEvent =
    eventsWithReviews.find((event) => String(event.id) === selectedReviewEventId) ?? eventsWithReviews[0] ?? null;
  const selectedReviewUsers = selectedReviewEvent ? getReviewerSlots(selectedReviewEvent.reviews) : [null, null, null];

  const selectedEvent = events.find((event) => String(event.id) === selectedEventId) ?? events[0] ?? null;
  const selectedEventTableUsers = selectedEvent ? getReviewerSlots(selectedEvent.reviews) : [null, null, null];
  const feedbackSelectedEvent =
    publicReviewEvents.find((event) => String(event.id) === reviewForm.eventId) ?? publicReviewEvents[0] ?? null;
  const feedbackTableUsers = feedbackSelectedEvent ? getReviewerSlots(feedbackSelectedEvent.reviews) : [null, null, null];

  const eventMediaItems = mediaItems
    .filter((item) => (selectedMediaEvent ? item.eventId === selectedMediaEvent.id : true))
    .sort((first, second) => String(second.id).localeCompare(String(first.id)));

  const selectedEventMediaItems = mediaItems
    .filter((item) => (selectedEvent ? item.eventId === selectedEvent.id : true))
    .sort((first, second) => String(second.id).localeCompare(String(first.id)));
  const feedbackEventMediaItems = mediaItems
    .filter((item) => (feedbackSelectedEvent ? item.eventId === feedbackSelectedEvent.id : true))
    .sort((first, second) => String(second.id).localeCompare(String(first.id)));

  const reportSyncError = (message) => {
    setSyncError(message);
    window.alert(message);
  };

  const syncEventRecord = async (eventRecord, options = {}) => {
    if (!isSupabaseConfigured || !supabase) {
      return eventRecord;
    }

    const { includeId = true } = options;
    const query = includeId
      ? supabase.from("events").upsert(toEventPayload(eventRecord, true), { onConflict: "id" }).select().single()
      : supabase.from("events").insert(toEventPayload(eventRecord, false)).select().single();

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return mapDbEvent(data);
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
    setDetailDrafts(Array.from({ length: 3 }, () => createEmptyDetailDraft()));
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

    if (isSupabaseConfigured && supabase) {
      try {
        const storagePaths = relatedMedia.map((item) => item.storagePath).filter(Boolean);

        if (storagePaths.length) {
          const { error: storageError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .remove(storagePaths);

          if (storageError) {
            throw storageError;
          }
        }

        const { error: mediaError } = await supabase.from("media_items").delete().eq("event_id", id);
        if (mediaError) {
          throw mediaError;
        }

        const { error: eventError } = await supabase.from("events").delete().eq("id", id);
        if (eventError) {
          throw eventError;
        }

        setSyncError("");
      } catch (error) {
        reportSyncError(`Could not delete the event from Supabase: ${error.message}`);
        return;
      }
    }

    setEvents((currentEvents) => currentEvents.filter((event) => event.id !== id));
    setMediaItems((currentItems) => currentItems.filter((item) => item.eventId !== id));
  };

  const openModal = () => {
    setForm({
      ...INITIAL_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setEditingEventId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (eventToEdit) => {
    setForm({
      title: eventToEdit.title,
      desc: eventToEdit.desc,
      date: eventToEdit.date,
      loc: eventToEdit.loc,
      projectTitle: eventToEdit.projectTitle ?? "",
      attendeeName: eventToEdit.attendeeName ?? "",
    });
    setEditingEventId(eventToEdit.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
    setEditingEventId(null);
  };

  const saveEvent = async () => {
    const title = form.title.trim();
    const desc = form.desc.trim();
    const loc = form.loc.trim();
    const projectTitle = form.projectTitle.trim();
    const attendeeName = form.attendeeName.trim();

    if (!title) {
      window.alert("Please enter an event title.");
      return;
    }

    if (editingEventId !== null) {
      const currentEvent = events.find((event) => event.id === editingEventId);
      const updatedEvent = {
        ...(currentEvent ?? {}),
        id: editingEventId,
        title,
        desc: desc || "No description provided.",
        date: form.date || new Date().toISOString().slice(0, 10),
        loc: loc || "TBD",
        projectTitle: projectTitle || title,
        attendeeName: attendeeName || "Not assigned",
      };

      updateEventInState(updatedEvent);

      if (isSupabaseConfigured && supabase) {
        try {
          const savedEvent = await syncEventRecord(updatedEvent);
          updateEventInState(savedEvent);
          setSyncError("");
        } catch (error) {
          reportSyncError(`Could not update the event in Supabase: ${error.message}`);
          return;
        }
      }
    } else {
      const newEvent = {
        id: nextId,
        title,
        desc: desc || "No description provided.",
        date: form.date || new Date().toISOString().slice(0, 10),
        loc: loc || "TBD",
        projectTitle: projectTitle || title,
        attendeeName: attendeeName || "Not assigned",
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
          reportSyncError(`Could not create the event in Supabase: ${error.message}`);
          return;
        }
      } else {
        setEvents((currentEvents) => [newEvent, ...currentEvents]);
        setNextId((currentId) => currentId + 1);
      }
    }

    closeModal();
    setActivePage("events");
  };

  const updateSelectedEventField = (field, value) => {
    if (!selectedEvent) {
      return;
    }

    persistEventPatch(selectedEvent.id, { [field]: value });
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
    const completedAnswers = draft.answers.map((answer) => answer.trim());
    const completedRatings = draft.questionRatings;

    if (completedAnswers.some((answer) => !answer)) {
      window.alert(`Please answer all questions for Reviewer ${slotIndex + 1}.`);
      return;
    }

    if (completedRatings.some((rating) => !rating)) {
      window.alert(`Please give a star rating for every question for Reviewer ${slotIndex + 1}.`);
      return;
    }

    const averageQuestionRating =
      completedRatings.reduce((total, rating) => total + rating, 0) / completedRatings.length;

    const newReview = {
      author: `Reviewer ${slotIndex + 1}`,
      initials: `R${slotIndex + 1}`,
      avatar: ["a", "b", "c"][slotIndex] ?? "a",
      rating: Math.round(averageQuestionRating),
      reviewSlot: slotIndex,
      questionRatings: completedRatings,
      answers: completedAnswers,
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
        reportSyncError(`Could not save Reviewer ${slotIndex + 1} to Supabase: ${error.message}`);
        return;
      }
    }

    setDetailDrafts((currentDrafts) =>
      currentDrafts.map((draftItem, draftIndex) =>
        draftIndex === slotIndex ? createEmptyDetailDraft() : draftItem,
      ),
    );
    setReviewSuccess(`Reviewer ${slotIndex + 1} review submitted.`);
  };

  const submitFeedbackReview = async (slotIndex) => {
    if (!feedbackSelectedEvent) {
      return;
    }

    const draft = feedbackDrafts[slotIndex];
    const completedAnswers = draft.answers.map((answer) => answer.trim());
    const completedRatings = draft.questionRatings;

    if (completedAnswers.some((answer) => !answer)) {
      window.alert(`Please answer all questions for Reviewer ${slotIndex + 1}.`);
      return;
    }

    if (completedRatings.some((rating) => !rating)) {
      window.alert(`Please give a star rating for every question for Reviewer ${slotIndex + 1}.`);
      return;
    }

    const averageQuestionRating =
      completedRatings.reduce((total, rating) => total + rating, 0) / completedRatings.length;

    const newReview = {
      author: `Reviewer ${slotIndex + 1}`,
      initials: `R${slotIndex + 1}`,
      avatar: ["a", "b", "c"][slotIndex] ?? "a",
      rating: Math.round(averageQuestionRating),
      reviewSlot: slotIndex,
      questionRatings: completedRatings,
      answers: completedAnswers,
    };

    const nextReviews = [...feedbackSelectedEvent.reviews];
    const existingReviewIndex = nextReviews.findIndex((review) => review.reviewSlot === slotIndex);

    if (existingReviewIndex >= 0) {
      nextReviews[existingReviewIndex] = newReview;
    } else {
      nextReviews.push(newReview);
    }

    const updatedEvent = { ...feedbackSelectedEvent, reviews: nextReviews };
    updateEventInState(updatedEvent);

    if (isSupabaseConfigured && supabase) {
      try {
        const savedEvent = await syncEventRecord(updatedEvent);
        updateEventInState(savedEvent);
        setSyncError("");
      } catch (error) {
        reportSyncError(`Could not save Reviewer ${slotIndex + 1} to Supabase: ${error.message}`);
        return;
      }
    }

    setFeedbackDrafts((currentDrafts) =>
      currentDrafts.map((draftItem, draftIndex) =>
        draftIndex === slotIndex ? createEmptyDetailDraft() : draftItem,
      ),
    );
    setReviewSuccess(`Reviewer ${slotIndex + 1} review submitted.`);
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
      reportSyncError(`Could not upload files to Supabase: ${error.message}`);
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
      reportSyncError(`Could not upload files to Supabase: ${error.message}`);
      return;
    }

    setMediaItems((currentItems) => [...uploadBatch, ...currentItems]);
    await persistEventPatch(selectedEvent.id, { photos: selectedEvent.photos + uploadBatch.length });
    setPendingEventMediaFiles([]);
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
      reportSyncError(`Could not upload files to Supabase: ${error.message}`);
      return;
    }

    setMediaItems((currentItems) => [...uploadBatch, ...currentItems]);
    await persistEventPatch(feedbackSelectedEvent.id, {
      photos: feedbackSelectedEvent.photos + uploadBatch.length,
    });
    setPendingFeedbackMediaFiles([]);
    setMediaSuccess(
      `${uploadBatch.length} file${uploadBatch.length !== 1 ? "s" : ""} uploaded for ${feedbackSelectedEvent.title}.`,
    );
  };

  const deleteMediaItem = async (mediaId) => {
    const targetItem = mediaItems.find((item) => item.id === mediaId);
    if (!targetItem) {
      return;
    }

    const confirmed = window.confirm(`Delete "${targetItem.label}" from ${targetItem.event}?`);
    if (!confirmed) {
      return;
    }

    if (!isSupabaseConfigured && targetItem.sourceType === "upload" && targetItem.url) {
      URL.revokeObjectURL(targetItem.url);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        if (targetItem.storagePath) {
          const { error: storageError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .remove([targetItem.storagePath]);

          if (storageError) {
            throw storageError;
          }
        }

        const { error: deleteError } = await supabase.from("media_items").delete().eq("id", mediaId);
        if (deleteError) {
          throw deleteError;
        }

        setSyncError("");
      } catch (error) {
        reportSyncError(`Could not delete the file from Supabase: ${error.message}`);
        return;
      }
    }

    setMediaItems((currentItems) => currentItems.filter((item) => item.id !== mediaId));
    await persistEventPatch(targetItem.eventId, {
      photos: Math.max(0, (events.find((item) => item.id === targetItem.eventId)?.photos ?? 0) - 1),
    });
    setMediaSuccess(`"${targetItem.label}" was removed from ${targetItem.event}.`);
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

  const connectionTone = syncError
    ? "warning"
    : isSyncing
      ? "loading"
      : isSupabaseConfigured
        ? "live"
        : "demo";
  const connectionMessage = syncError
    ? syncError
    : isSyncing
      ? "Syncing with Supabase..."
      : isSupabaseConfigured
        ? "Live Supabase mode is enabled. Changes here should persist across refreshes and deployments."
        : "Demo mode: Netlify is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY, so the app is showing local sample data.";

  return (
    <div className="app-shell">
      <div className="app-backdrop" aria-hidden="true" />
      <nav className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">ER</span>
          <div>
            <span className="nav-brand">EventReview</span>
            <div className="nav-subtitle">Experience intelligence dashboard</div>
          </div>
        </div>
        <div className="nav-links">
          {["dashboard", "events", "reviews", "feedback", "photos"].map((page) => (
            <button
              key={page}
              type="button"
              className={`nav-btn ${activePage === page ? "active" : ""}`}
              onClick={() => setActivePage(page)}
            >
              {page === "feedback" ? "Submit review" : page.charAt(0).toUpperCase() + page.slice(1)}
            </button>
          ))}
        </div>
        <button type="button" className="btn-primary nav-cta" onClick={openModal}>
          New event
        </button>
      </nav>

      <div className="page">
        <div className={`sync-banner ${connectionTone}`}>
          <strong>
            {connectionTone === "live" && "Supabase connected."}
            {connectionTone === "demo" && "Supabase not configured."}
            {connectionTone === "loading" && "Connecting to Supabase."}
            {connectionTone === "warning" && "Supabase needs attention."}
          </strong>
          <span>{connectionMessage}</span>
        </div>
      </div>

      {activePage === "dashboard" && (
        <main className="page">
          <div className="section-header">
            <div>
              <div className="section-title">Dashboard</div>
              <div className="section-caption">A simple summary of events, reviews, photos, and recent activity.</div>
            </div>
          </div>
          <div className="stats-grid">
            <StatCard label="Events" value={events.length} tone="blue" />
            <StatCard label="Reviews" value={totalReviews} tone="teal" />
            <StatCard label="Photos" value={totalPhotos} tone="amber" />
          </div>

          <div className="section-header">
            <div>
              <div className="section-title">Recent events</div>
              <div className="section-caption">Latest event records.</div>
            </div>
          </div>
          <div className="card-stack dashboard-card-stack">
            {dashboardEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onOpen={openEventDetail}
                compact
                dashboardEditOnly
                onEdit={openEditModal}
              />
            ))}
          </div>
        </main>
      )}

      {activePage === "events" && (
        <main className="page">
          <div className="section-header">
            <div>
              <div className="section-title">All events</div>
              <div className="section-caption">Manage programme records, status, and event-level performance.</div>
            </div>
            <button type="button" className="btn-primary" onClick={openModal}>
              Add event
            </button>
          </div>
          {events.length ? (
            <div className="card-stack">
              {events.map((event) => (
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
            <div className="empty-state">No events yet. Use Add event to create your first record.</div>
          )}
        </main>
      )}

      {activePage === "reviews" && (
        <main className="page wide-page">
          <div className="section-header">
            <div>
              <div className="section-title">All reviews</div>
              <div className="section-caption">Same two-table layout as the older accessible user view: one for ratings and one for comments.</div>
            </div>
          </div>

          {eventsWithReviews.length ? (
            <div className="reviews-stack">
              <section className="review-spread-card glass-card">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">Select event</div>
                    <div className="panel-subtitle">Choose an event to compare three reviewer responses side by side.</div>
                  </div>
                </div>
                <div className="event-chip-row">
                  {eventsWithReviews.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={`event-chip ${String(event.id) === String(selectedReviewEvent?.id) ? "active" : ""}`}
                      onClick={() => setSelectedReviewEventId(String(event.id))}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </section>

              {selectedReviewEvent && (
                <section className="reviews-row">
                  <ReadOnlyReviewSplitTables
                    event={selectedReviewEvent}
                    reviewUsers={selectedReviewUsers}
                    activeStarBadge={activeStarBadge}
                    onActivateStarBadge={triggerStarBadge}
                  />

                  <aside className="reviews-side-panel">
                    <div className="side-panel-header">
                      <div className="side-panel-title">Ratings overview</div>
                      <div className="side-panel-subtitle">Professional event summary</div>
                    </div>
                    <div className="rating-summary-card">
                      <div className="rating-summary-label">Average rating</div>
                      <div className="rating-summary-value">
                        {getAverageRating(selectedReviewEvent.reviews).toFixed(1)}
                        <span className="rating-summary-scale">/5</span>
                      </div>
                      <div className="rating-summary-note">Based on {selectedReviewEvent.reviews.length} verified reviewers</div>
                    </div>
                    <div className="side-review-list">
                      {selectedReviewUsers.filter(Boolean).map((review, reviewIndex) => (
                        <article key={`${selectedReviewEvent.id}-${reviewIndex}-old-summary`} className="side-review-card rating-card">
                          <div className="side-review-top">
                            <div className={`avatar ${review.avatar}`}>{review.initials}</div>
                            <div>
                              <div className="reviewer-head-name">{review.author}</div>
                              <div className="reviewer-head-stars">
                                <InteractiveRatingBadge
                                  badgeId={`old-reviews-summary-${selectedReviewEvent.id}-${reviewIndex}`}
                                  rating={review.rating}
                                  text={`${review.rating} out of 5`}
                                  activeStarBadge={activeStarBadge}
                                  onActivate={triggerStarBadge}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="rating-bar-track">
                            <div className="rating-bar-fill" style={{ width: `${(review.rating / 5) * 100}%` }} />
                          </div>
                          <p className="side-review-text">{review.answers[0]}</p>
                        </article>
                      ))}
                    </div>
                  </aside>
                </section>
              )}
            </div>
          ) : (
            <div className="empty-state">No reviews yet.</div>
          )}
        </main>
      )}

      {activePage === "eventDetail" && selectedEvent && (
        <main className="page">
          <div className="section-header">
            <div>
              <div className="section-title">{selectedEvent.title}</div>
              <div className="section-caption">Event details and reviewer comparison.</div>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setActivePage("dashboard")}>
              Back to dashboard
            </button>
          </div>

          <section className="review-spread-card glass-card">
            <div className="detail-header-grid">
              <div className="detail-header-item">
                <span className="detail-header-label">Date</span>
                <strong>{formatDate(selectedEvent.date)}</strong>
              </div>
              <div className="detail-header-item">
                <span className="detail-header-label">Location</span>
                <strong>{selectedEvent.loc}</strong>
              </div>
              <div className="detail-header-item">
                <span className="detail-header-label">Project Title</span>
                <textarea
                  className="detail-header-input"
                  value={selectedEvent.projectTitle || ""}
                  placeholder="Enter project title"
                  onChange={(event) => updateSelectedEventField("projectTitle", event.target.value)}
                />
              </div>
              <div className="detail-header-item">
                <span className="detail-header-label">Attender Name</span>
                <textarea
                  className="detail-header-input"
                  value={selectedEvent.attendeeName || ""}
                  placeholder="Enter attender name"
                  onChange={(event) => updateSelectedEventField("attendeeName", event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="review-spread-card glass-card">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Description</div>
                <div className="panel-subtitle">Event overview.</div>
              </div>
            </div>
            <p className="detail-description">{selectedEvent.desc}</p>
          </section>

          <section className="review-spread-card glass-card">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Reviews</div>
                <div className="panel-subtitle">A cleaner summary of ratings and submitted answers for this event.</div>
              </div>
            </div>
            <div className="detail-review-stack">
              {!selectedEvent.reviews.length && (
                <div className="detail-empty-note">
                  No reviews yet. The tables below are ready and will fill as Reviewer 1, Reviewer 2, and Reviewer 3 submit responses.
                </div>
              )}

              <div className="reviews-table-wrap detail-review-table-wrap">
                  <div className="detail-table-section">
                    <div className="detail-table-heading">
                      <div className="ev-name">Ratings Table</div>
                      <div className="ev-meta">5 questions with 3 reviewers shown across the same row.</div>
                    </div>
                    <table className="rev-table review-compare-table detail-split-table">
                      <thead>
                        <tr>
                          <th className="q-num">#</th>
                          <th className="question-heading">Question</th>
                          {selectedEventTableUsers.map((review, reviewIndex) => (
                            <th key={`${selectedEvent.id}-detail-head-${reviewIndex}`} className="reviewer-heading-cell">
                              <div className="reviewer-heading">
                                <div className={`avatar ${review?.avatar ?? "a"}`}>{review?.initials ?? `R${reviewIndex + 1}`}</div>
                                <div>
                                  <div className="reviewer-head-name">
                                    {review
                                      ? `Reviewer ${reviewIndex + 1}`
                                      : `Reviewer ${reviewIndex + 1}`}
                                  </div>
                                  <div className="reviewer-label-muted">
                                    {review
                                      ? review.author
                                      : "Waiting for input"}
                                  </div>
                                  {review ? (
                                    <div className="reviewer-head-stars">
                                      <InteractiveRatingBadge
                                        badgeId={`${selectedEvent.id}-head-${reviewIndex}`}
                                        rating={review.rating}
                                        text={`${review.rating} out of 5`}
                                        activeStarBadge={activeStarBadge}
                                        onActivate={triggerStarBadge}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {REVIEW_QUESTIONS.map((question, index) => (
                          <tr key={`${selectedEvent.id}-${question}-detail-rating-row`}>
                            <td className="q-num">{index + 1}</td>
                            <td className="q-cell">{question}</td>
                            {selectedEventTableUsers.map((review, reviewIndex) => (
                              <td key={`${selectedEvent.id}-${reviewIndex}-${index}-detail-rating-cell`} className="answer-cell rating-only-cell">
                                {review ? (
                                  <InteractiveRatingBadge
                                    badgeId={`${selectedEvent.id}-question-${reviewIndex}-${index}`}
                                    rating={getQuestionRating(review, index)}
                                    text={`${getQuestionRating(review, index)}/5`}
                                    compact
                                    activeStarBadge={activeStarBadge}
                                    onActivate={triggerStarBadge}
                                  />
                                ) : (
                                  <StarRatingInput
                                    inputId={`${selectedEvent.id}-${reviewIndex}-${index}-detail-input-rating`}
                                    value={detailDrafts[reviewIndex].questionRatings[index]}
                                    activeStarBadge={activeStarBadge}
                                    onActivate={triggerStarBadge}
                                    onChange={(value) => {
                                      setReviewSuccess("");
                                      updateDetailDraftRating(reviewIndex, index, value);
                                    }}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="detail-table-gap" />

                  <div className="detail-table-section">
                    <div className="detail-table-heading">
                      <div className="ev-name">Comments Table</div>
                      <div className="ev-meta">The same 5 questions and the same 3 reviewers, with comments only.</div>
                    </div>
                    <table className="rev-table review-compare-table detail-split-table">
                      <thead>
                        <tr>
                          <th className="q-num">#</th>
                          <th className="question-heading">Question</th>
                          {selectedEventTableUsers.map((review, reviewIndex) => (
                            <th key={`${selectedEvent.id}-detail-comment-head-${reviewIndex}`} className="reviewer-heading-cell">
                              <div className="reviewer-heading">
                                <div className={`avatar ${review?.avatar ?? "a"}`}>{review?.initials ?? `R${reviewIndex + 1}`}</div>
                                <div>
                                  <div className="reviewer-head-name">
                                    {review
                                      ? `Reviewer ${reviewIndex + 1}`
                                      : `Reviewer ${reviewIndex + 1}`}
                                  </div>
                                  <div className="reviewer-label-muted">
                                    {review
                                      ? review.author
                                      : "Waiting for input"}
                                  </div>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {REVIEW_QUESTIONS.map((question, index) => (
                          <tr key={`${selectedEvent.id}-${question}-detail-comment-row`}>
                            <td className="q-num">{index + 1}</td>
                            <td className="q-cell">{question}</td>
                            {selectedEventTableUsers.map((review, reviewIndex) => (
                              <td key={`${selectedEvent.id}-${reviewIndex}-${index}-detail-comment-cell`} className="answer-cell">
                                {review ? (
                                  <div className="question-answer-copy">{review.answers[index] || "-"}</div>
                                ) : (
                                  <textarea
                                    id={`event-detail-comment-${index}`}
                                    className="entry-answer-input detail-comment-input"
                                    value={detailDrafts[reviewIndex].answers[index]}
                                    placeholder="Enter your comment..."
                                    onChange={(event) => {
                                      setReviewSuccess("");
                                      updateDetailDraftAnswer(reviewIndex, index, event.target.value);
                                    }}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="detail-review-submit">
                {reviewSuccess && <div className="success-banner compact">{reviewSuccess}</div>}
                <div className="detail-review-submit-grid">
                  {selectedEventTableUsers.map((review, reviewIndex) =>
                    review ? (
                      <div key={`${selectedEvent.id}-submitted-${reviewIndex}`} className="detail-submit-state submitted">
                        {`Reviewer ${reviewIndex + 1} submitted`}
                      </div>
                    ) : (
                      <button
                        key={`${selectedEvent.id}-submit-${reviewIndex}`}
                        type="button"
                        className="btn-primary"
                        onClick={() => submitDetailReview(reviewIndex)}
                      >
                        {`Submit Reviewer ${reviewIndex + 1}`}
                      </button>
                    ),
                  )}
                </div>
              </div>
          </section>

          <section className="review-spread-card glass-card">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Upload Photos or Videos</div>
                <div className="panel-subtitle">Add media for this event and submit it from here.</div>
              </div>
            </div>

            {mediaSuccess && <div className="success-banner compact">{mediaSuccess}</div>}

            <div className="event-upload-actions">
              <label htmlFor="event-detail-media" className="upload-add-button">
                <span className="upload-add-icon">+</span>
                <span>Add photos or videos</span>
              </label>
              <input
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
              <button
                type="button"
                className="btn-primary"
                onClick={submitEventDetailMedia}
              >
                Submit
              </button>
            </div>

            {pendingEventMediaFiles.length > 0 && (
              <div className="pending-upload-list">
                {pendingEventMediaFiles.map((file) => (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="pending-upload-item">
                    {file.name}
                  </div>
                ))}
              </div>
            )}

            {selectedEventMediaItems.length ? (
              <div className="event-upload-preview-grid">
                {selectedEventMediaItems.map((photo) => (
                  <div key={photo.id} className="photo-card">
                    {photo.sourceType === "upload" ? (
                      photo.type === "video" ? (
                        <video className="photo-thumb media-preview" controls preload="metadata">
                          <source src={photo.url} />
                        </video>
                      ) : (
                        <img className="photo-thumb media-preview" src={photo.url} alt={photo.label} />
                      )
                    ) : (
                      <div className={`photo-thumb ${photo.tone}`}>
                        <span>{photo.label}</span>
                      </div>
                    )}
                    <div className="photo-info">
                      <div className="photo-event">{selectedEvent.title}</div>
                      <div className="photo-date">{formatDate(photo.date)}</div>
                      <div className="photo-kind">
                        {photo.type === "video" ? "Video upload" : photo.sourceType === "upload" ? "Photo upload" : "Gallery asset"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty-note">No photos or videos uploaded yet. Use the add option above.</div>
            )}
          </section>
        </main>
      )}

      {activePage === "feedback" && (
        <main className="page feedback-simple-page">
          <section className="review-spread-card glass-card">
              <div className="panel-heading">
                <div>
                  <div className="panel-title">Submit your review</div>
                  <div className="panel-subtitle">Choose an event and fill the two tables below.</div>
                </div>
              </div>

              {reviewSuccess && <div className="success-banner compact">{reviewSuccess}</div>}

              <div className="form-group">
                <label htmlFor="reviewEvent">Event</label>
                <select
                  id="reviewEvent"
                  value={reviewForm.eventId}
                  onChange={(event) => {
                    setReviewSuccess("");
                    setReviewForm((current) => ({ ...current, eventId: event.target.value }));
                  }}
                >
                  {publicReviewEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="detail-review-stack">
                <div className="reviews-table-wrap detail-review-table-wrap">
                  <div className="detail-table-section">
                    <div className="detail-table-heading">
                      <div className="ev-name">Ratings Table</div>
                      <div className="ev-meta">5 questions with 3 reviewers shown across the same row.</div>
                    </div>
                    <table className="rev-table review-compare-table detail-split-table">
                      <thead>
                        <tr>
                          <th className="q-num">#</th>
                          <th className="question-heading">Question</th>
                          {feedbackTableUsers.map((review, reviewIndex) => (
                            <th key={`feedback-head-${reviewIndex}`} className="reviewer-heading-cell">
                              <div className="reviewer-heading">
                                <div className={`avatar ${review?.avatar ?? "a"}`}>{review?.initials ?? `R${reviewIndex + 1}`}</div>
                                <div>
                                  <div className="reviewer-head-name">{`Reviewer ${reviewIndex + 1}`}</div>
                                  <div className="reviewer-label-muted">{review ? review.author : "Waiting for input"}</div>
                                  {review ? (
                                    <div className="reviewer-head-stars">
                                      <InteractiveRatingBadge
                                        badgeId={`feedback-head-${reviewIndex}`}
                                        rating={review.rating}
                                        text={`${review.rating} out of 5`}
                                        activeStarBadge={activeStarBadge}
                                        onActivate={triggerStarBadge}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {REVIEW_QUESTIONS.map((question, index) => (
                          <tr key={`feedback-rating-${question}`}>
                            <td className="q-num">{index + 1}</td>
                            <td className="q-cell">{question}</td>
                            {feedbackTableUsers.map((review, reviewIndex) => (
                              <td key={`feedback-rating-${reviewIndex}-${index}`} className="answer-cell rating-only-cell">
                                {review ? (
                                  <InteractiveRatingBadge
                                    badgeId={`feedback-question-${reviewIndex}-${index}`}
                                    rating={getQuestionRating(review, index)}
                                    text={`${getQuestionRating(review, index)}/5`}
                                    compact
                                    activeStarBadge={activeStarBadge}
                                    onActivate={triggerStarBadge}
                                  />
                                ) : (
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
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="detail-table-gap" />

                  <div className="detail-table-section">
                    <div className="detail-table-heading">
                      <div className="ev-name">Comments Table</div>
                      <div className="ev-meta">The same 5 questions and the same 3 reviewers, with comments only.</div>
                    </div>
                    <table className="rev-table review-compare-table detail-split-table">
                      <thead>
                        <tr>
                          <th className="q-num">#</th>
                          <th className="question-heading">Question</th>
                          {feedbackTableUsers.map((review, reviewIndex) => (
                            <th key={`feedback-comment-head-${reviewIndex}`} className="reviewer-heading-cell">
                              <div className="reviewer-heading">
                                <div className={`avatar ${review?.avatar ?? "a"}`}>{review?.initials ?? `R${reviewIndex + 1}`}</div>
                                <div>
                                  <div className="reviewer-head-name">{`Reviewer ${reviewIndex + 1}`}</div>
                                  <div className="reviewer-label-muted">{review ? review.author : "Waiting for input"}</div>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {REVIEW_QUESTIONS.map((question, index) => (
                          <tr key={`feedback-comment-${question}`}>
                            <td className="q-num">{index + 1}</td>
                            <td className="q-cell">{question}</td>
                            {feedbackTableUsers.map((review, reviewIndex) => (
                              <td key={`feedback-comment-${reviewIndex}-${index}`} className="answer-cell">
                                {review ? (
                                  <div className="question-answer-copy">{review.answers[index] || "-"}</div>
                                ) : (
                                  <textarea
                                    id={`feedback-comment-${reviewIndex}-${index}`}
                                    className="entry-answer-input detail-comment-input"
                                    value={feedbackDrafts[reviewIndex].answers[index]}
                                    placeholder="Enter your comment..."
                                    onChange={(event) => {
                                      setReviewSuccess("");
                                      updateFeedbackDraftAnswer(reviewIndex, index, event.target.value);
                                    }}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="detail-review-submit">
                  <div className="detail-review-submit-grid">
                    {feedbackTableUsers.map((review, reviewIndex) =>
                      review ? (
                        <div key={`feedback-submitted-${reviewIndex}`} className="detail-submit-state submitted">
                          {`Reviewer ${reviewIndex + 1} submitted`}
                        </div>
                      ) : (
                        <button
                          key={`feedback-submit-${reviewIndex}`}
                          type="button"
                          className="btn-primary"
                          onClick={() => submitFeedbackReview(reviewIndex)}
                        >
                          {`Submit Reviewer ${reviewIndex + 1}`}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
          </section>

          <section className="review-spread-card glass-card">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Upload Photos or Videos</div>
                <div className="panel-subtitle">Add media for the selected event and submit it from here.</div>
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

            {feedbackEventMediaItems.length ? (
              <div className="event-upload-preview-grid">
                {feedbackEventMediaItems.map((photo) => (
                  <div key={photo.id} className="photo-card">
                    {photo.sourceType === "upload" ? (
                      photo.type === "video" ? (
                        <video className="photo-thumb media-preview" controls preload="metadata">
                          <source src={photo.url} />
                        </video>
                      ) : (
                        <img className="photo-thumb media-preview" src={photo.url} alt={photo.label} />
                      )
                    ) : (
                      <div className={`photo-thumb ${photo.tone}`}>
                        <span>{photo.label}</span>
                      </div>
                    )}
                    <div className="photo-info">
                      <div className="photo-event">{feedbackSelectedEvent?.title}</div>
                      <div className="photo-date">{formatDate(photo.date)}</div>
                      <div className="photo-kind">
                        {photo.type === "video" ? "Video upload" : photo.sourceType === "upload" ? "Photo upload" : "Gallery asset"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty-note">No photos or videos uploaded yet for this event. Use the add option above.</div>
            )}
          </section>
        </main>
      )}

      {activePage === "photos" && (
        <main className="page">
          <div className="section-header">
            <div>
              <div className="section-title">Media library</div>
              <div className="section-caption">End users can upload photos and videos directly into the event media library.</div>
            </div>
          </div>
          <section className="media-upload-panel glass-card">
            <div className="panel-heading">
              <div>
                <div className="panel-title">Public media upload</div>
                <div className="panel-subtitle">Choose an event and add image or video files from a phone or laptop.</div>
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
            </div>
          </section>
          {eventMediaItems.length ? (
            <div className="photos-grid">
              {eventMediaItems.map((photo) => (
                <div key={photo.id} className="photo-card">
                  {photo.sourceType === "upload" ? (
                    photo.type === "video" ? (
                      <video className="photo-thumb media-preview" controls preload="metadata">
                        <source src={photo.url} />
                      </video>
                    ) : (
                      <img className="photo-thumb media-preview" src={photo.url} alt={photo.label} />
                    )
                  ) : (
                    <div className={`photo-thumb ${photo.tone}`}>
                      <span>{photo.label}</span>
                    </div>
                  )}
                  <div className="photo-info">
                    <div className="photo-event">{photo.event}</div>
                    <div className="photo-date">{formatDate(photo.date)}</div>
                    <div className="photo-kind">{photo.type === "video" ? "Video upload" : photo.sourceType === "upload" ? "Photo upload" : "Gallery asset"}</div>
                    <button type="button" className="btn-delete media-delete-btn" onClick={() => deleteMediaItem(photo.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No media yet for this event. Upload the first photo or video above.</div>
          )}
        </main>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-heading">
              <span className="eyebrow">Create record</span>
              <h3>{editingEventId !== null ? "Edit event" : "Add new event"}</h3>
              <p>
                {editingEventId !== null
                  ? "Update the event name, description, date, and location."
                  : "Capture the basics now and enrich the event with reviews or media later."}
              </p>
            </div>
            <div className="form-group">
              <label htmlFor="title">Event title *</label>
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
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
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
            <div className="form-group">
              <label htmlFor="projectTitle">Project title</label>
              <input
                id="projectTitle"
                type="text"
                value={form.projectTitle}
                placeholder="e.g. Innovation Connect Programme"
                onChange={(event) => setForm({ ...form, projectTitle: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="attendeeName">Attender name</label>
              <input
                id="attendeeName"
                type="text"
                value={form.attendeeName}
                placeholder="e.g. Rohit Sharma"
                onChange={(event) => setForm({ ...form, attendeeName: event.target.value })}
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
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone}`}>{value}</div>
    </div>
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

  return (
    <article
      className={`event-card ${onOpen ? "clickable-card" : ""}`}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => {
        onOpen?.(event.id);
      }}
      onKeyDown={(eventKey) => {
        if (!onOpen) {
          return;
        }

        if (eventKey.key === "Enter" || eventKey.key === " ") {
          eventKey.preventDefault();
          onOpen(event.id);
        }
      }}
    >
      <div className="event-top">
        <div className="event-copy">
          <div className="event-card-header">
            <div className="event-title">{event.title}</div>
          </div>
          {!compact && <div className="event-desc">{event.desc}</div>}
        </div>
        {(showActions || dashboardEditOnly) && (
          <div className="event-actions">
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
      <div className="event-meta-pills">
        <span className="meta-pill">{formatDate(event.date)}</span>
        <span className="meta-pill">{event.loc}</span>
      </div>
      {compact ? (
        <div className="event-footer compact-footer">
          <div className="event-metric">
            <strong>{formatDate(event.date)}</strong>
            <span>Date</span>
          </div>
        </div>
      ) : (
        <div className="event-footer">
          <div className="event-metric">
            <strong>{event.reviews.length}</strong>
            <span>Reviews</span>
          </div>
          <div className="event-metric">
            <strong>{event.photos}</strong>
            <span>Photos</span>
          </div>
          <div className="event-metric">
            <strong>{averageRating ? averageRating.toFixed(1) : "-"}</strong>
            <span>Avg rating</span>
          </div>
        </div>
      )}
      {onOpen && <div className="event-open-hint">Open full event page</div>}
    </article>
  );
}

export default App;
