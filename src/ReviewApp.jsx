import { useMemo, useState } from "react";
import "./review-system.css";

const REVIEW_QUESTIONS = [
  {
    id: 1,
    title: "My Role in 1 Line",
    prompt:
      "Describe your role in one simple line (as if explaining to a 5-year-old). Also mention your top 2 responsibilities.",
  },
  {
    id: 2,
    title: "Numbers That Matter",
    prompt:
      "What measurable impact did you create? Include metrics like revenue, time saved, projects delivered, or efficiency improvements.",
  },
  {
    id: 3,
    title: "Fire You Put Out",
    prompt:
      "Describe a challenge you handled. What was the problem, what action did you take, and what was the outcome?",
  },
  {
    id: 4,
    title: "Skill Upgrade",
    prompt:
      "What new skill or tool did you learn? Where did you apply it and what difference did it make?",
  },
  {
    id: 5,
    title: "Idea You Started",
    prompt:
      "Did you introduce any idea or improvement? Explain what changed because of it.",
  },
];

const SKILLS = [
  "Technical Skills",
  "Quality & Accuracy",
  "Meeting Deadlines",
  "Adaptability",
  "Proactivity",
  "Communication",
  "Domain Knowledge",
  "Problem Solving",
  "Time Management",
  "Team Collaboration",
];

const EMPLOYEES = [
  {
    id: "demo101",
    code: "DEMO-101",
    name: "Sample User One",
    tlName: "Coach A",
    employeeResponses: [
      "This sample profile represents a fictional contributor in a demo review workflow.",
      "Example metrics only: improved turnaround by 28%, closed 41 items, and simplified 3 manual steps.",
      "Example challenge: rebuilt a broken tracker and restored missing records in the sample dataset.",
      "Example learning: tried spreadsheet automation to reduce repetitive prep work in the demo.",
      "Example initiative: started a shared tracker so sample reviewers could follow the same status.",
    ],
    tlResponses: [
      "Sample manager note: dependable follow-through and clear communication.",
      "Sample manager note: measurable outcomes are easy to understand in this demo.",
      "Sample manager note: handled the situation calmly and escalated when needed.",
      "Sample manager note: visible growth in tooling and documentation quality.",
      "Sample manager note: initiative helped keep the fictional team aligned.",
    ],
    employeeRatings: [4, 4, 5, 4, 4, 4, 4, 5, 4, 5],
    tlRatings: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    hodRatings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hodComments: ["", "", "", "", ""],
    bonus: "",
    promotion: "",
  },
  {
    id: "demo102",
    code: "DEMO-102",
    name: "Sample User Two",
    tlName: "Coach B",
    employeeResponses: ["", "", "", "", ""],
    tlResponses: ["", "", "", "", ""],
    employeeRatings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tlRatings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hodRatings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hodComments: ["", "", "", "", ""],
    bonus: "",
    promotion: "",
  },
];

function ReviewApp() {
  const [activeTab, setActiveTab] = useState("hod");
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(EMPLOYEES[0].id);

  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0];

  const employeeAverage = useMemo(
    () => getAverage(selectedEmployee.employeeRatings),
    [selectedEmployee],
  );
  const tlAverage = useMemo(() => getAverage(selectedEmployee.tlRatings), [selectedEmployee]);
  const hodAverage = useMemo(() => getAverage(selectedEmployee.hodRatings), [selectedEmployee]);

  const updateEmployee = (updater) => {
    setEmployees((currentEmployees) =>
      currentEmployees.map((employee) =>
        employee.id === selectedEmployeeId ? updater(employee) : employee,
      ),
    );
  };

  const updateHodComment = (index, value) => {
    updateEmployee((employee) => ({
      ...employee,
      hodComments: employee.hodComments.map((comment, commentIndex) =>
        commentIndex === index ? value : comment,
      ),
    }));
  };

  const updateHodRating = (index, value) => {
    updateEmployee((employee) => ({
      ...employee,
      hodRatings: employee.hodRatings.map((rating, ratingIndex) =>
        ratingIndex === index ? value : rating,
      ),
    }));
  };

  const updateDecision = (field, value) => {
    updateEmployee((employee) => ({
      ...employee,
      [field]: value,
    }));
  };

  return (
    <div className="review-app">
      <div className="page-shell">
        <div className="top-tabs">
          <button
            type="button"
            className={`top-tab ${activeTab === "hod" ? "active" : ""}`}
            onClick={() => setActiveTab("hod")}
          >
            Demo Review
          </button>
          <button
            type="button"
            className={`top-tab ${activeTab === "tl" ? "active" : ""}`}
            onClick={() => setActiveTab("tl")}
          >
            Coach View
          </button>
        </div>

        <section className="card select-card">
          <h1>Select Sample Profile</h1>
          <select
            className="employee-select"
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {`${employee.name} (${employee.code}) - ${employee.name}`}
              </option>
            ))}
          </select>
        </section>

        <section className="card">
          <div className="section-heading">Question-wise Demo Review</div>
          <div className="table-wrap">
            <table className="review-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Employee Response</th>
                  <th>TL Review</th>
                  <th>{activeTab === "hod" ? "Reviewer Notes (Demo)" : "Coach Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {REVIEW_QUESTIONS.map((question, index) => (
                  <tr key={question.id}>
                    <td className="question-cell">
                      <div className="question-title">{`${question.id}. ${question.title}`}</div>
                      <div className="question-prompt">{question.prompt}</div>
                    </td>
                    <td>
                      <ReadOnlyBox
                        value={selectedEmployee.employeeResponses[index]}
                        emptyText="No response"
                      />
                    </td>
                    <td>
                      <ReadOnlyBox
                        value={selectedEmployee.tlResponses[index]}
                        emptyText="No coach note"
                      />
                    </td>
                    <td>
                      <textarea
                        className="review-textarea"
                        placeholder={activeTab === "hod" ? "Add demo note..." : "Add coach note..."}
                        value={selectedEmployee.hodComments[index]}
                        onChange={(event) => updateHodComment(index, event.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <button type="button" className="submit-button">Submit Review</button>

        <section className="card">
          <div className="section-heading">Skill Reviews</div>
          <div className="summary-grid">
            <AverageCard
              title="Employee Skill Average"
              average={employeeAverage}
              emptyText="No employee skill ratings yet"
            />
            <AverageCard
              title="TL Skill Average"
              average={tlAverage}
              emptyText="No TL skill ratings yet"
            />
            <AverageCard
              title="Demo Reviewer Skill Average"
              average={hodAverage}
              emptyText="No demo reviewer ratings yet"
            />
          </div>

          <div className="table-wrap">
            <table className="skill-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Employee Rating</th>
                  <th>TL Rating</th>
                  <th>Reviewer Rating (Demo Input)</th>
                </tr>
              </thead>
              <tbody>
                {SKILLS.map((skill, index) => (
                  <tr key={skill}>
                    <td className="skill-name">{`${index + 1}. ${skill}`}</td>
                    <td>
                      <StarRating value={selectedEmployee.employeeRatings[index]} readOnly />
                    </td>
                    <td>
                      <StarRating value={selectedEmployee.tlRatings[index]} readOnly />
                    </td>
                    <td>
                      <StarRating
                        value={selectedEmployee.hodRatings[index]}
                        onChange={(value) => updateHodRating(index, value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">Demo Outcome</div>
          <div className="decision-grid">
            <div className="field-block">
              <label htmlFor="bonus">Recognition Tier</label>
              <select
                id="bonus"
                value={selectedEmployee.bonus}
                onChange={(event) => updateDecision("bonus", event.target.value)}
              >
                <option value="">Select recognition tier</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="field-block">
              <label htmlFor="promotion">Growth Recommendation</label>
              <select
                id="promotion"
                value={selectedEmployee.promotion}
                onChange={(event) => updateDecision("promotion", event.target.value)}
              >
                <option value="">Select growth recommendation</option>
                <option value="Strongly Recommended">Strongly Recommended</option>
                <option value="Needs More Evidence">Needs More Evidence</option>
                <option value="Not Recommended">Not Recommended</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReadOnlyBox({ value, emptyText }) {
  return <div className={`read-box ${value ? "" : "empty"}`}>{value || emptyText}</div>;
}

function AverageCard({ title, average, emptyText }) {
  return (
    <div className="average-card">
      <div className="average-title">{title}</div>
      <div className="average-value">{average ? average.toFixed(1) : "-"}</div>
      <div className="average-note">{average ? "Average across all skills" : emptyText}</div>
    </div>
  );
}

function StarRating({ value, onChange, readOnly = false }) {
  return (
    <div className={`star-row ${readOnly ? "read-only" : ""}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-button ${star <= value ? "filled" : ""}`}
          onClick={() => !readOnly && onChange?.(star)}
          disabled={readOnly}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function getAverage(ratings) {
  const validRatings = ratings.filter((rating) => rating > 0);

  if (!validRatings.length) {
    return 0;
  }

  return validRatings.reduce((total, rating) => total + rating, 0) / validRatings.length;
}

export default ReviewApp;
