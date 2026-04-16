import { useState } from "react";
import "./App.css";

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
  pending: "Pending",
};

const STATUS_CYCLE = {
  active: "inactive",
  inactive: "pending",
  pending: "active",
};

const INITIAL_EVENTS = [
  {
    id: 1,
    title: "Annual Tech Summit 2024",
    desc: "A full-day conference bringing together industry leaders to discuss emerging technologies and innovation trends.",
    date: "2024-03-15",
    loc: "Bengaluru Convention Centre",
    status: "active",
    photos: 5,
    reviews: [
      {
        author: "Priya S.",
        initials: "PS",
        avatar: "a",
        rating: 5,
        answers: [
          "Outstanding - one of the best conferences I have attended.",
          "The convention centre was spacious and well-equipped.",
          "Speakers covered cutting-edge topics with great depth.",
          "Everything ran perfectly on schedule - very impressed.",
          "Absolutely, I have already told five colleagues to register.",
        ],
      },
      {
        author: "Arjun M.",
        initials: "AM",
        avatar: "b",
        rating: 4,
        answers: [
          "Very good overall, minor hiccups but nothing serious.",
          "Good facilities, though parking was a little tight.",
          "Sessions on AI and cloud were particularly insightful.",
          "Check-in was fast and staff were helpful throughout.",
          "Yes, especially for anyone working in tech or product.",
        ],
      },
      {
        author: "Divya K.",
        initials: "DK",
        avatar: "c",
        rating: 4,
        answers: [
          "Enjoyable and thought-provoking from start to finish.",
          "Clean venue with excellent AV setup and seating.",
          "A few sessions were too advanced for newcomers.",
          "Lunch breaks were a bit short, rest was well-timed.",
          "Yes - the networking alone makes it worth attending.",
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Product Design Workshop",
    desc: "Hands-on workshop covering UX research methods, prototyping techniques, and usability testing.",
    date: "2024-04-02",
    loc: "CoWork Hub, Koramangala",
    status: "active",
    photos: 3,
    reviews: [
      {
        author: "Sneha R.",
        initials: "SR",
        avatar: "a",
        rating: 5,
        answers: [
          "Exceptional - practical skills I could apply immediately.",
          "The cowork space was cosy and creatively inspiring.",
          "Hands-on exercises were the highlight of the day.",
          "Trainers were well-prepared and kept to time perfectly.",
          "Without hesitation - a must for any designer.",
        ],
      },
      {
        author: "Vikram P.",
        initials: "VP",
        avatar: "b",
        rating: 4,
        answers: [
          "Very useful workshop, exceeded my expectations.",
          "A bit cramped with 30 participants but manageable.",
          "Loved the usability testing module - very eye-opening.",
          "Could have used one more break in the afternoon.",
          "Yes, great for junior designers wanting hands-on time.",
        ],
      },
      {
        author: "Meera T.",
        initials: "MT",
        avatar: "c",
        rating: 5,
        answers: [
          "One of the best workshops I have been to this year.",
          "Venue was comfortable and well-stocked with supplies.",
          "All five topics were covered with real-world examples.",
          "Perfect pacing - never felt rushed or bored.",
          "Already recommended it to my entire design team.",
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Startup Pitch Night",
    desc: "Emerging startups present their ideas to a panel of investors and industry mentors.",
    date: "2024-04-20",
    loc: "91Springboard, HSR Layout",
    status: "pending",
    photos: 2,
    reviews: [
      {
        author: "Rohan B.",
        initials: "RB",
        avatar: "a",
        rating: 4,
        answers: [
          "Great energy and very inspiring pitches all round.",
          "Love the 91Springboard space - very startup-friendly.",
          "Pitches were diverse and the Q&A was genuinely engaging.",
          "A little overrun on time but nothing that spoiled it.",
          "Yes - brilliant if you are in the startup ecosystem.",
        ],
      },
      {
        author: "Aisha F.",
        initials: "AF",
        avatar: "b",
        rating: 3,
        answers: [
          "Good event but a few pitches felt under-rehearsed.",
          "Venue was fine, though the mic quality could improve.",
          "Some pitches lacked clarity on the business model.",
          "Registration process was smooth, seating less so.",
          "Maybe - would depend on the quality of the cohort.",
        ],
      },
      {
        author: "Kiran L.",
        initials: "KL",
        avatar: "c",
        rating: 5,
        answers: [
          "Fantastic atmosphere with genuinely exciting startups.",
          "The venue had a great vibe, perfect for the event.",
          "Very high calibre of ideas - two stood out as investable.",
          "Ran smoothly with great support from the organisers.",
          "Definitely - one of the best pitch nights in Bengaluru.",
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Cultural Evening Gala",
    desc: "An evening celebrating art, music and food from across Karnataka, featuring live performances.",
    date: "2024-02-10",
    loc: "Lalit Ashok Hotel",
    status: "inactive",
    photos: 7,
    reviews: [
      {
        author: "Kavitha N.",
        initials: "KN",
        avatar: "a",
        rating: 4,
        answers: [
          "Wonderful celebration of culture - felt very authentic.",
          "The Lalit is always a stunning venue, did not disappoint.",
          "Performances were beautiful, especially the classical dance.",
          "Seating was well-arranged and service was attentive.",
          "Yes - a perfect evening out for families and colleagues.",
        ],
      },
      {
        author: "Rahul T.",
        initials: "RT",
        avatar: "b",
        rating: 3,
        answers: [
          "Enjoyable but the crowd made it feel a bit overwhelming.",
          "Venue was grand but ventilation was an issue.",
          "The folk music segment was a highlight for me.",
          "Food queues were long - buffet layout needs rethinking.",
          "Possibly, if they manage capacity better next time.",
        ],
      },
      {
        author: "Lakshmi V.",
        initials: "LV",
        avatar: "c",
        rating: 5,
        answers: [
          "Absolutely magical - a true celebration of Karnataka.",
          "Lalit Ashok set the perfect stage for the evening.",
          "Every act was polished and culturally meaningful.",
          "Impeccably organised with excellent host communication.",
          "Yes, enthusiastically - it was a memorable experience.",
        ],
      },
    ],
  },
];

const INITIAL_FORM = {
  title: "",
  desc: "",
  date: new Date().toISOString().slice(0, 10),
  loc: "",
  status: "active",
};

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextId, setNextId] = useState(INITIAL_EVENTS.length + 1);
  const [form, setForm] = useState(INITIAL_FORM);

  const totalReviews = events.reduce((count, event) => count + event.reviews.length, 0);
  const totalPhotos = events.reduce((count, event) => count + event.photos, 0);
  const dashboardEvents = events.slice(0, 3);
  const eventsWithReviews = events.filter((event) => event.reviews.length > 0);
  const photoItems = events.flatMap((event, eventIndex) =>
    Array.from({ length: event.photos }, (_, photoIndex) => ({
      id: `${event.id}-${photoIndex}`,
      event: event.title,
      date: event.date,
      label: `Photo ${eventIndex + photoIndex + 1}`,
    })),
  );

  const cycleStatus = (id) => {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === id ? { ...event, status: STATUS_CYCLE[event.status] } : event,
      ),
    );
  };

  const deleteEvent = (id) => {
    const confirmed = window.confirm("Delete this event? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setEvents((currentEvents) => currentEvents.filter((event) => event.id !== id));
  };

  const openModal = () => {
    setForm({
      ...INITIAL_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
  };

  const addEvent = () => {
    const title = form.title.trim();
    const desc = form.desc.trim();
    const loc = form.loc.trim();

    if (!title) {
      window.alert("Please enter an event title.");
      return;
    }

    setEvents((currentEvents) => [
      {
        id: nextId,
        title,
        desc: desc || "No description provided.",
        date: form.date || new Date().toISOString().slice(0, 10),
        loc: loc || "TBD",
        status: form.status,
        photos: 0,
        reviews: [],
      },
      ...currentEvents,
    ]);
    setNextId((currentId) => currentId + 1);
    closeModal();
    setActivePage("events");
  };

  return (
    <div className="app-shell">
      <nav>
        <span className="nav-brand">EventReview</span>
        {["dashboard", "events", "reviews", "photos"].map((page) => (
          <button
            key={page}
            type="button"
            className={`nav-btn ${activePage === page ? "active" : ""}`}
            onClick={() => setActivePage(page)}
          >
            {page.charAt(0).toUpperCase() + page.slice(1)}
          </button>
        ))}
      </nav>

      {activePage === "dashboard" && (
        <main className="page active">
          <div className="stats-grid">
            <StatCard label="Total events" value={events.length} tone="blue" />
            <StatCard label="Total reviews" value={totalReviews} tone="teal" />
            <StatCard label="Function photos" value={totalPhotos} tone="amber" />
          </div>
          <div className="section-title standalone-title">Recent events</div>
          <div>
            {dashboardEvents.map((event) => (
              <EventCard key={event.id} event={event} onCycleStatus={cycleStatus} />
            ))}
          </div>
        </main>
      )}

      {activePage === "events" && (
        <main className="page active">
          <div className="section-header">
            <span className="section-title">All events</span>
            <button type="button" className="btn-primary" onClick={openModal}>
              + Add event
            </button>
          </div>
          {events.length ? (
            <div>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  showActions
                  onCycleStatus={cycleStatus}
                  onDelete={deleteEvent}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">No events yet. Click "+ Add event" to get started.</div>
          )}
        </main>
      )}

      {activePage === "reviews" && (
        <main className="page active">
          <div className="section-header">
            <span className="section-title">All reviews</span>
          </div>
          {eventsWithReviews.length ? (
            <div className="reviews-stack">
              {eventsWithReviews.map((event) => (
                <section key={event.id} className="reviews-table-wrap">
                  <div className="reviews-table-header">
                    <div>
                      <div className="ev-name">{event.title}</div>
                      <div className="ev-meta">
                        {event.date} | {event.reviews.length} reviewer
                        {event.reviews.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="reviewers-grid">
                    {event.reviews.map((review) => (
                      <article key={`${event.id}-${review.author}`} className="reviewer-col">
                        <div className="reviewer-head">
                          <div className={`avatar ${review.avatar}`}>{review.initials}</div>
                          <div>
                            <div className="reviewer-head-name">{review.author}</div>
                            <div className="reviewer-head-stars">
                              {`${review.rating}/5 rating`}
                            </div>
                          </div>
                        </div>
                        <table className="rev-table">
                          <tbody>
                            {REVIEW_QUESTIONS.map((question, index) => (
                              <tr key={`${review.author}-${question}`}>
                                <td className="q-num">{index + 1}</td>
                                <td className="q-cell">{question}</td>
                                <td>{review.answers[index] || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">No reviews yet.</div>
          )}
        </main>
      )}

      {activePage === "photos" && (
        <main className="page active">
          <div className="section-header">
            <span className="section-title">Function photos</span>
          </div>
          {photoItems.length ? (
            <div className="photos-grid">
              {photoItems.map((photo) => (
                <div key={photo.id} className="photo-card">
                  <div className="photo-thumb">{photo.label}</div>
                  <div className="photo-info">
                    <div className="photo-event">{photo.event}</div>
                    <div className="photo-date">{photo.date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No photos yet.</div>
          )}
        </main>
      )}

      {isModalOpen && (
        <div
          className="modal-overlay open"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="modal">
            <h3>Add new event</h3>
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
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={addEvent}>
                Add event
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

function EventCard({ event, showActions = false, onCycleStatus, onDelete }) {
  return (
    <div className="event-card">
      <div className="event-top">
        <div className="event-copy">
          <div className="event-title">{event.title}</div>
          <div className="event-desc">{event.desc}</div>
        </div>
        {showActions && (
          <div className="event-actions">
            <StatusBadge status={event.status} onClick={() => onCycleStatus(event.id)} />
            <button type="button" className="btn-delete" onClick={() => onDelete(event.id)}>
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="event-meta">
        <span>{event.date}</span>
        <span>{event.loc}</span>
        <span>
          {event.reviews.length} review{event.reviews.length !== 1 ? "s" : ""}
        </span>
        <span>
          {event.photos} photo{event.photos !== 1 ? "s" : ""}
        </span>
        {!showActions && <StatusBadge status={event.status} onClick={() => onCycleStatus(event.id)} />}
      </div>
    </div>
  );
}

function StatusBadge({ status, onClick }) {
  return (
    <button
      type="button"
      className={`badge ${status}`}
      title="Click to change status"
      onClick={onClick}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}

export default App;
